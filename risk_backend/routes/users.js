import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();
const upload = multer(); // memory storage

// GET all users (Admin only)
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.subsidiari_id, p.peranan_id, p.nama_peranan,
             s.nama_subsidiari, s.singkatan as singkatan_subsidiari,
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

// GET current logged-in user
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.pengguna_id,
        u.staff_id,
        u.nama_penuh,
        u.peranan_id,
        p.nama_peranan,
        u.subsidiari_id,
        s.nama_subsidiari,
        s.singkatan as singkatan_subsidiari,
        encode(u.gambar_profil,'base64') as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
      WHERE u.staff_id = $1
    `, [req.user.staff_id]);

    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update current user profile
router.put("/me", verifyToken, upload.single("gambar_profil"), async (req, res) => {
  try {
    const staff_id = req.user.staff_id;
    const { katalaluan_lama, katalaluan_baru, hapus_gambar } = req.body;
    const file = req.file;

    const { rows } = await pool.query(
      "SELECT pengguna_id, katalaluan, gambar_profil FROM pengguna WHERE staff_id=$1",
      [staff_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });

    const pengguna_id = rows[0].pengguna_id;
    let currentPassword = rows[0].katalaluan;
    let newProfile = rows[0].gambar_profil;

    if (hapus_gambar === "true") newProfile = null;
    else if (file && file.buffer) newProfile = file.buffer;

    let newPassword = currentPassword; // default tak tukar
    if (katalaluan_baru && katalaluan_baru.trim() !== "") {
      if (!katalaluan_lama || katalaluan_lama !== currentPassword) {
        return res.status(400).json({ error: "Kata laluan lama tidak sah" });
      }
      newPassword = katalaluan_baru;
    }

    await pool.query(
      `UPDATE pengguna
       SET katalaluan = $1,
           gambar_profil = $2
       WHERE pengguna_id = $3`,
      [newPassword, newProfile, pengguna_id]
    );

    const { rows: updatedUser } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id, p.peranan_id, p.nama_peranan,
              s.nama_subsidiari, s.singkatan as singkatan_subsidiari,
              CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END as profile_pic
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
       WHERE u.pengguna_id=$1`,
      [pengguna_id]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Gagal kemaskini profil" });
  }
});


// POST add new user (Admin only)
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
              s.nama_subsidiari, s.singkatan as singkatan_subsidiari,
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

// PUT update user (Admin only) — dikemaskini supaya handle hapus_gambar
router.put("/:id", verifyToken, authorizeRoles("Admin"), upload.single("gambar_profil"), async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, hapus_gambar } = req.body;
    const file = req.file;

    // Ambil current user
    const { rows } = await pool.query(
      "SELECT gambar_profil FROM pengguna WHERE pengguna_id=$1",
      [id]
    );
    if (!rows[0]) return res.status(404).json({ error: "User not found" });

    let newProfile = rows[0].gambar_profil;

    if (hapus_gambar === "true") newProfile = null; // buang gambar
    else if (file && file.buffer) newProfile = file.buffer; // update gambar baru

    const { rowCount } = await pool.query(
      `UPDATE pengguna
       SET staff_id=$1,
           nama_penuh=$2,
           katalaluan=$3,
           peranan_id=$4,
           subsidiari_id=$5,
           gambar_profil=$6
       WHERE pengguna_id=$7`,
      [staff_id, nama_penuh, katalaluan, peranan_id, subsidiari_id, newProfile, id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "User not found" });

    const { rows: updatedUser } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
              u.subsidiari_id, p.peranan_id, p.nama_peranan,
              s.nama_subsidiari, s.singkatan as singkatan_subsidiari,
              CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END as profile_pic
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN subsidiari s ON u.subsidiari_id = s.subsidiari_id
       WHERE u.pengguna_id=$1`,
      [id]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Gagal kemaskini pengguna" });
  }
});

// DELETE user (Admin only)
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
