import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================================================
// GET all users (Admin only)
// =========================================================
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.subsidiari_id,
             p.peranan_id, p.nama_peranan,
             s.subsidiari_id, s.nama_subsidiari
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
router.post("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id } = req.body;

    // insert dulu
    const { rows } = await pool.query(
      `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING pengguna_id`,
      [staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id]
    );

    const newUserId = rows[0].pengguna_id;

    // ambil balik user lengkap dengan join
    const { rows: userWithJoin } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id,
              p.peranan_id, p.nama_peranan,
              s.subsidiari_id, s.nama_subsidiari
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
router.put("/:id", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id } = req.body;

    // update dulu
    const { rowCount } = await pool.query(
      `UPDATE pengguna
       SET staff_id=$1, nama_penuh=$2, katalaluan=$3, peranan_id=$4, subsidiari_id=$5
       WHERE pengguna_id=$6`,
      [staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    // ambil balik user lengkap dengan join
    const { rows: updatedUser } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id,
              p.peranan_id, p.nama_peranan,
              s.subsidiari_id, s.nama_subsidiari
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

    const { rowCount } = await pool.query(
      `DELETE FROM pengguna WHERE pengguna_id=$1`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
