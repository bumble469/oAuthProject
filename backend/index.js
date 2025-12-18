import express from "express";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors"
import pool from "./config/db_config.js";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";

const dummy_data = "this is private data"

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

    const state = crypto.randomBytes(16).toString("hex");
    res.cookie("oauth_state", state, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false
    })

    const url = "https://accounts.google.com/o/oauth2/v2/auth?"+
        new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: redirectUrl,
            response_type: "code",
            scope: "openid email profile",
            access_type: "offline",
            prompt: "consent",
            state
        });
    res.redirect(url)
})

app.get("/auth/google/callback", async(req, res) => {
    if(req.query.state !== req.cookies.oauth_state){
        return res.status(401).json({message: "Invalid OAuth State"});
    }
    res.clearCookie("oauth_state")
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

        const refreshToken = jwt.sign(
            { userId: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: "7d" }
        )

        const csrfToken = crypto.randomBytes(32).toString("hex");

        const access_csrf_age = 15 * 60 * 1000;
        const refresh_age = 7 * 24 * 60 * 60 * 1000;

        res.cookie("csrf_token", csrfToken, {
            httpOnly: false,
            sameSite: 'lax',
            secure: false,
            maxAge: access_csrf_age
        })

        res.cookie("access_token", appToken, {
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            maxAge: access_csrf_age
        });

        res.cookie("refresh_token", refreshToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: refresh_age
        })

        res.redirect("http://localhost:5173/dashboard")
    } catch(err){
        res.status(500).json({error: `OAuth failed: ${err}`});
    }
})


function csrfProtection(req, res, next){
    const csrfCookie = req.cookies.csrf_token;
    const csrfHeader = req.headers["x-csrf-token"];

    if(!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader){
        return res.status(403).json({message: "CSRF validation failed!"})
    }

    next();
}

function authMiddleWare(req, res, next) {
    const token = req.cookies.access_token;
    if (!token) return res.status(401).json({ error: "token missing" });

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

app.post("/auth/refresh", (req, res) => {
    const refreshToken = req.cookies.refresh_token;
    if(!refreshToken) return res.status(401)
    
    try{
        const payload = jwt.verify(
            refreshToken, process.env.JWT_REFRESH_SECRET
        )

        const newAccessToken = jwt.sign(
            { userId: payload.userId},
            process.env.JWT_SECRET,
            { expiresIn: "15m" }
        )

        const newCsrfToken = crypto.randomBytes(32).toString("hex");

        res.cookie("access_token", newAccessToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: false,
            maxAge: 15 * 60 * 1000
        });

        res.cookie("csrf_token", newCsrfToken, {
            httpOnly: false,
            sameSite: "lax",
            secure: false,
            maxAge: 15 * 60 * 1000
        });

        res.status(200).json({message: "tokens refreshed!"});

    } catch(err){
        return res.status(401);
    }
})

app.get('/me', authMiddleWare, (req, res) => {
    res.json({
        user: req.user
    })
})

app.get('/protected_data_get', authMiddleWare, (req, res) => {
    return res.json({data: dummy_data})
})

app.get("/protected", authMiddleWare, (req, res) => {
    res.json({
        message: "you accessed protected data",
        user: req.user
    })
})

app.post("/logout", authMiddleWare, csrfProtection, (req, res) => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie("csrf_token");
    res.status(200).json({message: "Logged out!"})
})

app.listen(process.env.PORT, () => {
    console.log(`Server running at port http://localhost:${process.env.PORT}`)
})

