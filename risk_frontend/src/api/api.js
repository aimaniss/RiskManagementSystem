// src/api/api.js
import axios from "axios";

// Create an axios instance
const api = axios.create({
  baseURL: "http://localhost:5000/api", // <-- backend URL
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

export default api;
