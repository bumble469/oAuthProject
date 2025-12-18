import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors"
import pool from "./config/db_config.js";
import { OAuth2Client } from "google-auth-library";


dotenv.config();
const app = express();
app.use(express.json())
app.use(cookieParser());
app.use(
    cors({
        origin: "http://localhost:5173",
        credentials: true
    })
)

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

app.get('/auth/google', (req, res) => {
    const redirectUrl = "http://localhost:3000/auth/google/callback";
    const url = "https://accounts.google.com/o/oauth2/v2/auth?"+
        new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: redirectUrl,
            response_type: "code",
            scope: "openid email profile",
            access_type: "offline",
            prompt: "consent"
        });
    res.redirect(url)
})

app.get("/auth/google/callback", async(req, res) => {
    const code = req.query.code
    try{
        const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: "http://localhost:3000/auth/google/callback",
            grant_type: "authorization_code"
        })

        const { id_token } = tokenRes.data

        const ticket = await googleClient.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const avatar = payload.picture;

        const {rows} = await pool.query(
            `
            INSERT INTO users (email, name, avatar, auth_provider, provider_id, created_at, last_login)
            VALUES ($1, $2, $3, 'google', $4, NOW(), NOW())
            ON CONFLICT (provider_id)
            DO UPDATE SET last_login = NOW()
            RETURNING id, email, name;
            `,
            [email, name, avatar, googleId]
        )

        const user = rows[0];

        const appToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        )

        res.cookie("access_token", appToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: 5 * 60 * 1000
        })
        res.redirect("http://localhost:5173/dashboard")
    } catch(err){
        res.status(500).json({error: `OAuth failed: ${err}`});
    }
})

function authMiddleWare(req, res, next){
    const token = req.cookies.access_token;
    if(!token) return res.status(401).json({error: "token missing!"})
    
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch(err) {
        res.status(500).json({error: "Invalid token" })
    }
}

app.get('/me', authMiddleWare, (req, res) => {
    res.json({
        user: req.user
    })
})

app.get("/protected", authMiddleWare, (req, res) => {
    res.json({
        message: "you accessed protected data",
        user: req.user
    })
})

app.post("/logout", (req, res) => {
    res.clearCookie("access_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false
    })
    res.status(200).json({message: "Logged out!"})
})

app.listen(process.env.PORT, () => {
    console.log(`Server running at port http://localhost:${process.env.PORT}`)
})

