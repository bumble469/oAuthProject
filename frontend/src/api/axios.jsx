import axios from "axios";

const apiUri = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

export default apiUri