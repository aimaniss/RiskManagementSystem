// src/api/api.js
import axios from "axios";

// Create an axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: attach token automatically for authenticated requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    } else if (
      error.response?.status === 403 &&
      error.response?.data?.kod === "PERLU_TUKAR_KATALALUAN" &&
      window.location.pathname !== "/tukar-katalaluan"
    ) {
      window.location.assign("/tukar-katalaluan");
    }
    return Promise.reject(error);
  }
);

export default api;
