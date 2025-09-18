// src/utils/auth.js
import { jwtDecode } from "jwt-decode"; // v4 named import

export function getUserRole() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    if (decoded && decoded.nama_peranan) {
      return decoded.nama_peranan; 
    }
    return null;
  } catch (err) {
    console.error("Invalid token:", err.message);
    return null;
  }
}
