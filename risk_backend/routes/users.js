import express from "express";
import pool from "../config/db.js";
import { verifyToken, authorizeRoles } from "../middleware/authMiddleware.js";
import multer from "multer";
import { catatAktiviti } from "../utils/catatAktiviti.js";

const router = express.Router();
const upload = multer(); // memory storage

// GET all users (Admin only) - (Kekal Sama)
router.get("/", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.syarikat_id, p.peranan_id, p.nama_peranan,
             s.nama_syarikat, s.singkatan as singkatan_syarikat,
             encode(u.gambar_profil,'base64') as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
      ORDER BY u.pengguna_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET current logged-in user - (Kekal Sama)
router.get("/me", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        u.pengguna_id,
        u.staff_id,
        u.nama_penuh,
        u.peranan_id,
        p.nama_peranan,
        u.syarikat_id,
        s.nama_syarikat,
        s.singkatan as singkatan_syarikat,
        encode(u.gambar_profil,'base64') as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
      WHERE u.staff_id = $1
    `, [req.user.staff_id]);

    if (!rows[0]) return res.status(404).json({ error: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT update current user profile - (Kekal Sama)
router.put("/me", verifyToken, upload.single("gambar_profil"), async (req, res) => {
  try {
    const pelaku = req.user;
    const staff_id = pelaku.staff_id;
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

    let logRingkasan = "Mengemaskini profil sendiri.";
    let logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini profil sendiri.`;
    let changes = [];
    
    if (hapus_gambar === "true") {
      newProfile = null;
      changes.push("gambar profil dibuang");
    } else if (file && file.buffer) {
      newProfile = file.buffer;
      changes.push("gambar profil dikemaskini");
    }

    let newPassword = currentPassword;
    if (katalaluan_baru && katalaluan_baru.trim() !== "") {
      if (!katalaluan_lama || katalaluan_lama !== currentPassword) {
        return res.status(400).json({ error: "Kata laluan lama tidak sah" });
      }
      newPassword = katalaluan_baru;
      changes.push("kata laluan ditukar");
    }

    if (changes.length > 0) {
        logPerincian += " Perubahan: " + changes.join(', ') + ".";
    }

    await pool.query(
      `UPDATE pengguna SET katalaluan = $1, gambar_profil = $2 WHERE pengguna_id = $3`,
      [newPassword, newProfile, pengguna_id]
    );

    await catatAktiviti(pelaku.pengguna_id, "Kemaskini Profil", logRingkasan, logPerincian);

    const { rows: updatedUser } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.syarikat_id, p.peranan_id, p.nama_peranan,
             s.nama_syarikat, s.singkatan as singkatan_syarikat,
             CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
      WHERE u.pengguna_id=$1`,
      [pengguna_id]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Gagal kemaskini profil" });
  }
});


// POST add new user (Admin only) - (Kekal Sama)
router.post("/", verifyToken, authorizeRoles("Admin"), upload.single("gambar_profil"), async (req, res) => {
  try {
    const { staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id } = req.body;
    const profileBuffer = req.file ? req.file.buffer : null;
    const pelaku = req.user;

    const { rows } = await pool.query(
      `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id, gambar_profil)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING pengguna_id`,
      [staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id, profileBuffer]
    );

    const newUserId = rows[0].pengguna_id;

    const { rows: userWithJoin } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.syarikat_id, p.peranan_id, p.nama_peranan,
             s.nama_syarikat, s.singkatan as singkatan_syarikat,
             encode(u.gambar_profil,'base64') as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
      WHERE u.pengguna_id = $1`,
      [newUserId]
    );

    const logRingkasan = `Menambah pengguna baru: ${nama_penuh}.`;
    const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah menambah pengguna baru: ${nama_penuh} (ID Staf: ${staff_id}) dengan peranan ${userWithJoin[0].nama_peranan}.`;
    
    await catatAktiviti(pelaku.pengguna_id, "Tambah Pengguna", logRingkasan, logPerincian);

    res.status(201).json(userWithJoin[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update user (Admin only) - (⭐️ DIKEMASKINI ⭐️)
router.put("/:id", verifyToken, authorizeRoles("Admin"), upload.single("gambar_profil"), async (req, res) => {
  try {
    const { id } = req.params; // ID pengguna yang di-edit
    const { staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id, hapus_gambar } = req.body;
    const file = req.file;
    const pelaku = req.user; // Pentadbir yang sedang log masuk

    // 1. Dapatkan data asal pengguna SEBELUM kemaskini
    const { rows: originalUserRows } = await pool.query(
      `SELECT u.staff_id, u.nama_penuh, u.katalaluan, u.peranan_id, p.nama_peranan, u.syarikat_id, s.nama_syarikat, u.gambar_profil
       FROM pengguna u
       LEFT JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
       WHERE u.pengguna_id = $1`,
      [id]
    );
    if (!originalUserRows[0]) {
      return res.status(404).json({ error: "User not found" });
    }
    const originalUser = originalUserRows[0];

    // 2. Tentukan nilai baru untuk gambar dan kata laluan
    let newProfile = originalUser.gambar_profil;
    if (hapus_gambar === "true") {
      newProfile = null;
    } else if (file && file.buffer) {
      newProfile = file.buffer;
    }

    const newPassword = (katalaluan && katalaluan.trim() !== "") ? katalaluan : originalUser.katalaluan;

    // 3. Lakukan UPDATE
    const { rowCount } = await pool.query(
      `UPDATE pengguna
       SET staff_id=$1,
           nama_penuh=$2,
           katalaluan=$3,
           peranan_id=$4,
           syarikat_id=$5,
           gambar_profil=$6
       WHERE pengguna_id=$7`,
      [staff_id, nama_penuh, newPassword, peranan_id, syarikat_id, newProfile, id]
    );

    if (rowCount === 0) return res.status(404).json({ error: "User not found" });

    // 4. Dapatkan data yang telah dikemaskini
    const { rows: updatedUserRows } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
             u.syarikat_id, p.peranan_id, p.nama_peranan,
             s.nama_syarikat, s.singkatan as singkatan_syarikat,
             CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END as profile_pic
      FROM pengguna u
      JOIN peranan p ON u.peranan_id = p.peranan_id
      LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
      WHERE u.pengguna_id=$1`,
      [id]
    );
    const updatedUser = updatedUserRows[0];
    
    // 5. Bina log aktiviti yang terperinci
    let logAktiviti = "";
    let logRingkasan = "";
    let logPerincian = "";
    let changes = []; 

    if (pelaku.pengguna_id == id) {
      logAktiviti = "Kemaskini Profil";
      logRingkasan = "Mengemaskini profil sendiri.";
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini profil sendiri.`;
      
      if (newPassword !== originalUser.katalaluan) changes.push("kata laluan");
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
      if (nama_penuh !== originalUser.nama_penuh) changes.push("nama penuh");

    } else {
      // Jika Pentadbir mengemaskini pengguna lain
      logAktiviti = "Kemaskini Pengguna";
      logRingkasan = `Mengemaskini pengguna: ${originalUser.nama_penuh}.`;
      
      // ⭐️⭐️ DIUBAH: Guna 'staff_id' (dari req.body) dan bukannya 'id' (pengguna_id) ⭐️⭐️
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini maklumat pengguna: ${originalUser.nama_penuh} (ID Staf: ${staff_id}).`;
      
      if (staff_id !== originalUser.staff_id) changes.push(`ID Staf (kepada ${staff_id})`);
      if (nama_penuh !== originalUser.nama_penuh) changes.push(`Nama Penuh (kepada ${nama_penuh})`);
      if (newPassword !== originalUser.katalaluan) changes.push("kata laluan");
      if (peranan_id != originalUser.peranan_id) changes.push(`peranan (kepada ${updatedUser.nama_peranan})`);
      if (syarikat_id != originalUser.syarikat_id) changes.push(`syarikat (kepada ${updatedUser.nama_syarikat || 'N/A'})`);
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
    }

    if (changes.length > 0) {
      logPerincian += " Perubahan: " + changes.join(', ') + ".";
    } else {
      logPerincian += " Tiada perubahan data direkodkan.";
    }

    await catatAktiviti(pelaku.pengguna_id, logAktiviti, logRingkasan, logPerincian);

    // 6. Hantar respons
    res.json(updatedUser);
    
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Gagal kemaskini pengguna" });
  }
});

// DELETE user (Admin only) - (⭐️ DIKEMASKINI ⭐️)
router.delete("/:id", verifyToken, authorizeRoles("Admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const pelaku = req.user;
    
    // ⭐️ DIUBAH: Dapatkan 'nama_penuh' DAN 'staff_id'
    const { rows: userRows } = await pool.query(
      "SELECT nama_penuh, staff_id FROM pengguna WHERE pengguna_id=$1", 
      [id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }
    const { nama_penuh: namaPengguna, staff_id: stafIdPengguna } = userRows[0]; // Ambil kedua-dua nilai

    const { rowCount } = await pool.query(`DELETE FROM pengguna WHERE pengguna_id=$1`, [id]);
    if (rowCount === 0) return res.status(404).json({ error: "User not found" });

    const logRingkasan = `Memadam pengguna: ${namaPengguna}.`;
    // ⭐️ DIUBAH: Guna 'stafIdPengguna' dan bukannya 'id'
    const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah memadam pengguna: ${namaPengguna} (ID Staf: ${stafIdPengguna}).`;
    
    await catatAktiviti(pelaku.pengguna_id, "Padam Pengguna", logRingkasan, logPerincian);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;