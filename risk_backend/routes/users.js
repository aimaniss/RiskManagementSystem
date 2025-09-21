import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer(); // memory storage

// =========================================================
// GET all users (Admin only)
// =========================================================
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.subsidiari_id, p.peranan_id, p.nama_peranan,
             s.nama_subsidiari,
             encode(u.gambar_profil,'base64') as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
      ORDER BY u.pengguna_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// POST add new user (Admin only)
// =========================================================
router.post("/", verifyToken, authorizeRoles("Admin"), upload.single("gambar_profil"), async (req, res) => {
  try {
    const { staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id } = req.body;
    const profileBuffer = req.file ? req.file.buffer : null;

    const { rows } = await pool.query(
      `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, gambar_profil)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING pengguna_id`,
      [staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, profileBuffer]
    );

    const newUserId = rows[0].pengguna_id;

    const { rows: userWithJoin } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id, p.peranan_id, p.nama_peranan,
              s.nama_subsidiari,
              encode(u.gambar_profil,'base64') as profile_pic
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
       WHERE u.pengguna_id = $1`,
      [newUserId]
    );

    res.status(201).json(userWithJoin[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// PUT update user (Admin only)
// =========================================================
router.put("/:id", verifyToken, authorizeRoles("Admin"), upload.single("gambar_profil"), async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id } = req.body;
    const profileBuffer = req.file ? req.file.buffer : null;

    const { rowCount } = await pool.query(
      `UPDATE pengguna
       SET staff_id=$1, nama_penuh=$2, katalaluan=$3, peranan_id=$4, subsidiari_id=$5, gambar_profil=COALESCE($6,gambar_profil)
       WHERE pengguna_id=$7`,
      [staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, profileBuffer, id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "User not found" });

    const { rows: updatedUser } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id, p.peranan_id, p.nama_peranan,
              s.nama_subsidiari,
              encode(u.gambar_profil,'base64') as profile_pic
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
       WHERE u.pengguna_id = $1`,
      [id]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =========================================================
// DELETE user (Admin only)
// =========================================================
router.delete("/:id", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(`DELETE FROM pengguna WHERE pengguna_id=$1`, [id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
