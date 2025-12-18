import axios from "axios";

function getCookie(name) {
  return document.cookie
    .split("; ")
    .find(r => r.startsWith(name + "="))
    ?.split("=")[1];
}

const apiUri = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true
});

apiUri.interceptors.request.use(
  (config) => {
    const method = config.method?.toLowerCase();
    if (["post", "put", "patch", "delete"].includes(method)) {
      const csrfToken = getCookie("csrf_token");
      if (csrfToken) {
        config.headers["X-CSRF-Token"] = csrfToken;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);



export default apiUri;
