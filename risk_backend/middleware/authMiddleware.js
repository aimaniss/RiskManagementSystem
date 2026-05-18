import jwt from "jsonwebtoken";
import pool from "../config/db.js";

/**
 * Middleware untuk mengesahkan token JWT.
 * Jika sah, ia akan menambah data pengguna (termasuk nama_penuh) ke req.user.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  // Dapatkan token dari format "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ error: "Akses ditolak. Tiada token disediakan." });
  }

  try {
    // Sahkan token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ⭐️ INI ADALAH BAHAGIAN YANG DIBETULKAN ⭐️
    // 'decoded' ialah kandungan token anda.
    // Query ini kini mengambil 'u.nama_penuh' dan 'p.nama_peranan'
    const { rows } = await pool.query(
      `SELECT 
         u.pengguna_id, 
         u.staff_id, 
         u.nama_penuh,   
         u.peranan_id, 
         p.nama_peranan, 
         u.subsidiari_id
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       WHERE u.pengguna_id = $1`,
      // ⭐️ DIUBAH: Guna 'decoded.pengguna_id' (berdasarkan struktur token anda)
      [decoded.pengguna_id] 
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "Pengguna yang dikaitkan dengan token ini tidak lagi wujud." });
    }

    // Lampirkan data pengguna penuh dari DB pada objek 'req'
    req.user = user;
    next();

  } catch (err) {
    console.error("Ralat token:", err);
    return res.status(403).json({ error: "Token tidak sah atau telah tamat tempoh." });
  }
};

/**
 * Middleware untuk membenarkan akses berdasarkan peranan.
 * Mesti digunakan SELEPAS verifyToken.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // req.user kini datang dari query DB di atas
    if (!req.user || !req.user.nama_peranan) {
      return res.status(403).json({ error: "Akses ditolak. Data pengguna tidak lengkap." });
    }

    const hasRole = allowedRoles.includes(req.user.nama_peranan);
    if (!hasRole) {
      return res.status(403).json({ error: `Akses ditolak. Anda memerlukan peranan: ${allowedRoles.join(" atau ")}` });
    }

    // Pengguna mempunyai peranan yang dibenarkan
    next();
  };
};

export { verifyToken, authorizeRoles };