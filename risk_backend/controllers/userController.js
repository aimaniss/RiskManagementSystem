// controllers/userController.js — Logik URUS PENGGUNA (CRUD + profil sendiri)
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { hashKatalaluan, sahkanKatalaluan } from "../utils/katalaluan.js";
import { dapatkanKebenaranPeranan } from "../middleware/authMiddleware.js";

// Query JOIN pengguna yang SERAGAM (tidak termasuk katalaluan)
const USER_SELECT = `
  SELECT u.pengguna_id, u.staff_id, u.nama_penuh,
         u.syarikat_id, p.peranan_id, p.nama_peranan,
         s.nama_syarikat, s.singkatan AS singkatan_syarikat,
         CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END AS profile_pic
  FROM pengguna u
  JOIN peranan p ON u.peranan_id = p.peranan_id
  LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
`;

// ---------------- GET /api/users (Admin sahaja) -----------------
export const senaraiPengguna = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${USER_SELECT}
       WHERE u.is_deleted = false
       ORDER BY u.pengguna_id`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------- GET /api/users/me -----------------
export const profilSemasa = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${USER_SELECT}
       WHERE u.staff_id = $1 AND u.is_deleted = false`,
      [req.user.staff_id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });
    const kebenaran = Array.from(await dapatkanKebenaranPeranan(req.user.peranan_id));
    res.json({ ...rows[0], kebenaran });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------- PUT /api/users/me (profil sendiri) -----------------
export const kemaskiniProfilSendiri = async (req, res) => {
  try {
    const pelaku = req.user;
    const staff_id = pelaku.staff_id;
    const { katalaluan_lama, katalaluan_baru, hapus_gambar } = req.body;
    const file = req.file;

    const { rows } = await pool.query(
      "SELECT pengguna_id, katalaluan, gambar_profil FROM pengguna WHERE staff_id=$1 AND is_deleted = false",
      [staff_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });

    const pengguna_id = rows[0].pengguna_id;
    const currentPassword = rows[0].katalaluan;
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

    let newPassword = null;
    if (katalaluan_baru && katalaluan_baru.trim() !== "") {
      const semak = await sahkanKatalaluan(katalaluan_lama || "", currentPassword);
      if (!semak.sah) {
        return res.status(400).json({ error: "Kata laluan lama tidak sah." });
      }
      newPassword = await hashKatalaluan(katalaluan_baru);
      changes.push("kata laluan ditukar");
    }

    if (changes.length > 0) {
      logPerincian += " Perubahan: " + changes.join(', ') + ".";
    }

    await dalamTransaksi(async (client) => {
      if (newPassword) {
        await client.query(
          `UPDATE pengguna SET katalaluan = $1, gambar_profil = $2, tarikh_dikemaskini = NOW(), token_dikemaskini_at = NOW() WHERE pengguna_id = $3`,
          [newPassword, newProfile, pengguna_id]
        );
      } else {
        await client.query(
          `UPDATE pengguna SET gambar_profil = $1, tarikh_dikemaskini = NOW() WHERE pengguna_id = $2`,
          [newProfile, pengguna_id]
        );
      }
    });

    await catatAktiviti(pelaku.pengguna_id, "Kemaskini Profil", logRingkasan, logPerincian);

    const { rows: updatedUser } = await pool.query(
      `${USER_SELECT} WHERE u.pengguna_id = $1`,
      [pengguna_id]
    );

    res.json(updatedUser[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Gagal kemaskini profil." });
  }
};

// ---------------- POST /api/users (Admin sahaja) -----------------
export const tambahPengguna = async (req, res) => {
  try {
    const { staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id } = req.body;
    const profileBuffer = req.file ? req.file.buffer : null;
    const pelaku = req.user;

    if (!staff_id || !nama_penuh || !katalaluan || !peranan_id) {
      return res.status(400).json({ error: "Semua medan wajib (ID Staf, Nama, Kata Laluan, Peranan) diperlukan." });
    }

    const katalaluanHash = await hashKatalaluan(katalaluan);

    const newUserId = await dalamTransaksi(async (client) => {
      // Semak duplikasi staff_id FIZIKAL (soft-deleted juga) supaya ID tidak diguna semula
      const semak = await client.query(
        "SELECT pengguna_id FROM pengguna WHERE staff_id = $1",
        [staff_id]
      );
      if (semak.rows.length > 0) {
        const err = new Error("ID Staf ini sudah digunakan.");
        err.statusCode = 409;
        throw err;
      }

      const result = await client.query(
        `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id, gambar_profil)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING pengguna_id`,
        [staff_id, nama_penuh, katalaluanHash, peranan_id, syarikat_id, profileBuffer]
      );
      return result.rows[0].pengguna_id;
    });

    const { rows: userWithJoin } = await pool.query(
      `${USER_SELECT} WHERE u.pengguna_id = $1`,
      [newUserId]
    );

    try {
      const logRingkasan = `Menambah pengguna baru: ${nama_penuh}.`;
      const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah menambah pengguna baru: ${nama_penuh} (ID Staf: ${staff_id}) dengan peranan ${userWithJoin[0].nama_peranan}.`;
      await catatAktiviti(pelaku.pengguna_id, "Tambah Pengguna", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log tambah pengguna:", logErr);
    }

    res.status(201).json(userWithJoin[0]);
  } catch (err) {
    console.error("Gagal tambah pengguna:", err);
    if (err.statusCode === 409) return res.status(409).json({ error: err.message });
    if (err.code === "23505") return res.status(409).json({ error: "ID Staf ini sudah digunakan." });
    res.status(500).json({ error: err.message });
  }
};

// ---------------- PUT /api/users/:id (Admin sahaja) -----------------
export const kemaskiniPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id, hapus_gambar } = req.body;
    const file = req.file;
    const pelaku = req.user;

    const { rows: originalUserRows } = await pool.query(
      `SELECT u.staff_id, u.nama_penuh, u.katalaluan, u.peranan_id, p.nama_peranan, u.syarikat_id, s.nama_syarikat, u.gambar_profil
       FROM pengguna u
       LEFT JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
       WHERE u.pengguna_id = $1 AND u.is_deleted = false`,
      [id]
    );
    if (!originalUserRows[0]) {
      return res.status(404).json({ error: "Pengguna tidak ditemui." });
    }
    const originalUser = originalUserRows[0];

    let newProfile = originalUser.gambar_profil;
    if (hapus_gambar === "true") {
      newProfile = null;
    } else if (file && file.buffer) {
      newProfile = file.buffer;
    }

    let newPassword = null;
    if (katalaluan && katalaluan.trim() !== "") {
      newPassword = await hashKatalaluan(katalaluan);
    }
    const passwordAkhir = newPassword || originalUser.katalaluan;
    const tokenRevisionChanged = Boolean(newPassword) ||
      String(staff_id) !== String(originalUser.staff_id) ||
      String(peranan_id) !== String(originalUser.peranan_id) ||
      String(syarikat_id) !== String(originalUser.syarikat_id);

    await dalamTransaksi(async (client) => {
      const result = await client.query(
        `UPDATE pengguna
         SET staff_id = $1,
             nama_penuh = $2,
             katalaluan = $3,
             peranan_id = $4,
             syarikat_id = $5,
              gambar_profil = $6,
              tarikh_dikemaskini = NOW(),
              token_dikemaskini_at = CASE
                WHEN $8 THEN NOW()
                ELSE token_dikemaskini_at
              END
          WHERE pengguna_id = $7 AND is_deleted = false
          RETURNING pengguna_id`,
        [staff_id, nama_penuh, passwordAkhir, peranan_id, syarikat_id, newProfile, id, tokenRevisionChanged]
      );
      if (result.rowCount === 0) {
        const err = new Error("Pengguna tidak ditemui.");
        err.statusCode = 404;
        throw err;
      }
    });

    const { rows: updatedUserRows } = await pool.query(
      `${USER_SELECT} WHERE u.pengguna_id = $1`,
      [id]
    );
    const updatedUser = updatedUserRows[0];

    // Bina log
    let logAktiviti = "";
    let logRingkasan = "";
    let logPerincian = "";
    let changes = [];

    if (pelaku.pengguna_id == id) {
      logAktiviti = "Kemaskini Profil";
      logRingkasan = "Mengemaskini profil sendiri.";
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini profil sendiri.`;

      if (newPassword) changes.push("kata laluan");
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
      if (nama_penuh !== originalUser.nama_penuh) changes.push("nama penuh");
    } else {
      logAktiviti = "Kemaskini Pengguna";
      logRingkasan = `Mengemaskini pengguna: ${originalUser.nama_penuh}.`;
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini maklumat pengguna: ${originalUser.nama_penuh} (ID Staf: ${staff_id}).`;

      if (staff_id !== originalUser.staff_id) changes.push(`ID Staf (kepada ${staff_id})`);
      if (nama_penuh !== originalUser.nama_penuh) changes.push(`Nama Penuh (kepada ${nama_penuh})`);
      if (newPassword) changes.push("kata laluan");
      if (peranan_id != originalUser.peranan_id) changes.push(`peranan (kepada ${updatedUser.nama_peranan})`);
      if (syarikat_id != originalUser.syarikat_id) changes.push(`syarikat (kepada ${updatedUser.nama_syarikat || 'N/A'})`);
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
    }

    if (changes.length > 0) {
      logPerincian += " Perubahan: " + changes.join(', ') + ".";
    } else {
      logPerincian += " Tiada perubahan data direkodkan.";
    }

    try {
      await catatAktiviti(pelaku.pengguna_id, logAktiviti, logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log kemaskini pengguna:", logErr);
    }

    res.json(updatedUser);
  } catch (err) {
    console.error("Error updating user:", err);
    if (err.statusCode === 404) return res.status(404).json({ error: err.message });
    if (err.code === "23505") return res.status(409).json({ error: "ID Staf ini sudah digunakan." });
    res.status(500).json({ error: "Gagal kemaskini pengguna." });
  }
};

// ---------------- DELETE /api/users/:id (Admin, soft-delete) -----------------
export const padamPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const pelaku = req.user;

    if (parseInt(id, 10) === pelaku.pengguna_id) {
      return res.status(400).json({ error: "Anda tidak boleh memadam akaun sendiri." });
    }

    const { rows: userRows } = await pool.query(
      "SELECT nama_penuh, staff_id FROM pengguna WHERE pengguna_id = $1 AND is_deleted = false",
      [id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "Pengguna tidak ditemui." });
    }
    const { nama_penuh: namaPengguna, staff_id: stafIdPengguna } = userRows[0];

    await dalamTransaksi(async (client) => {
      const result = await client.query(
        `UPDATE pengguna SET is_deleted = true, deleted_at = NOW(), tarikh_dikemaskini = NOW() WHERE pengguna_id = $1 AND is_deleted = false`,
        [id]
      );
      if (result.rowCount === 0) {
        const err = new Error("Pengguna tidak ditemui.");
        err.statusCode = 404;
        throw err;
      }
    });

    try {
      const logRingkasan = `Memadam pengguna: ${namaPengguna}.`;
      const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah memadam pengguna: ${namaPengguna} (ID Staf: ${stafIdPengguna}).`;
      await catatAktiviti(pelaku.pengguna_id, "Padam Pengguna", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log padam pengguna:", logErr);
    }

    res.json({ message: "Pengguna berjaya dipadam." });
  } catch (err) {
    console.error("Gagal padam pengguna:", err);
    if (err.statusCode === 404) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};