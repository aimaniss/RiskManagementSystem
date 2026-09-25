import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { sahkanKatalaluan, hashKatalaluan } from "../utils/katalaluan.js";
import { dapatkanKebenaranPeranan } from "../middleware/authMiddleware.js";

export const login = async (req, res) => {
  const { staff_id, katalaluan } = req.body;

  console.log("===============================");
  console.log("ADA CUBAAN LOGIN DARI FRONTEND!");
  console.log("Staff ID yang dihantar:", staff_id);

  try {
    const { rows } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan, 
              u.peranan_id, u.syarikat_id, p.nama_peranan
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       WHERE u.staff_id = $1 AND u.is_deleted = false`,
      [staff_id]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: "ID Staf atau kata laluan tidak sah" });

    // Sahkan kata laluan (bcrypt, dengan fallback plain-text lama)
    const { sah, hashBaru } = await sahkanKatalaluan(katalaluan, user.katalaluan);
    if (!sah) {
      return res.status(401).json({ error: "ID Staf atau kata laluan tidak sah" });
    }

    // Rehash-on-login: naik taraf pengguna plain-text kepada bcrypt secara automatik
    if (hashBaru) {
      await pool.query(
        "UPDATE pengguna SET katalaluan = $1 WHERE pengguna_id = $2",
        [hashBaru, user.pengguna_id]
      );
    }

    // Muat kebenaran peranan untuk role matrix (dikemas dalam JWT)
    let kebenaran = [];
    try {
      const set = await dapatkanKebenaranPeranan(user.peranan_id);
      kebenaran = Array.from(set);
    } catch (err) {
      console.error("Gagal memuat kebenaran:", err.message);
    }

    const token = jwt.sign(
      {
        pengguna_id: user.pengguna_id,
        staff_id: user.staff_id,
        peranan_id: user.peranan_id,
        nama_peranan: user.nama_peranan,
        syarikat_id: user.syarikat_id,
        kebenaran,
      },
      process.env.JWT_SECRET,
      { expiresIn: "5d" }
    );

    try {
      await catatAktiviti(
        user.pengguna_id,
        "Log Masuk",
        `${user.nama_penuh} telah log masuk ke sistem.`,
        `${user.nama_penuh} (ID Staf: ${user.staff_id}, Peranan: ${user.nama_peranan}) telah berjaya log masuk pada ${new Date().toLocaleString('ms-MY')}.`
      );
    } catch (logErr) {
      console.error("Gagal mencatat log masuk:", logErr);
    }

    res.json({
      token,
      user: {
        nama: user.nama_penuh,
        peranan: user.nama_peranan,
        peranan_id: user.peranan_id,
        pengguna_id: user.pengguna_id,
        syarikat_id: user.syarikat_id,
        kebenaran,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi.", details: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await catatAktiviti(
        req.user.pengguna_id,
        "Log Keluar",
        `${req.user.nama_penuh} telah log keluar dari sistem.`,
        `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah log keluar pada ${new Date().toLocaleString('ms-MY')}.`
      );
    }
    res.json({ message: "Log keluar berjaya." });
  } catch (err) {
    res.status(500).json({ error: "Gagal mencatat log keluar." });
  }
};

/**
 * Tukar kata laluan sendiri (pilih label: guna `katalaluan_lama`/`katalaluan_baru`
 * atau `katalaluan_semasa`/`katalaluan_baharu`).
 */
export const tukarKatalaluan = async (req, res) => {
  try {
    const { katalaluan_lama, katalaluan_semasa, katalaluan_baru, katalaluan_baharu } = req.body;
    const lama = katalaluan_lama || katalaluan_semasa;
    const baru = katalaluan_baru || katalaluan_baharu;

    if (!lama || !baru) {
      return res.status(400).json({ error: "Kata laluan lama dan baru diperlukan." });
    }

    const { rows } = await pool.query(
      "SELECT pengguna_id, katalaluan FROM pengguna WHERE pengguna_id = $1 AND is_deleted = false",
      [req.user.pengguna_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak dijumpai." });

    const { sah } = await sahkanKatalaluan(lama, rows[0].katalaluan);
    if (!sah) {
      return res.status(400).json({ error: "Kata laluan lama tidak sah." });
    }

    const hash = await hashKatalaluan(baru);
    await pool.query(
      "UPDATE pengguna SET katalaluan = $1, tarikh_dikemaskini = NOW() WHERE pengguna_id = $2",
      [hash, req.user.pengguna_id]
    );

    await catatAktiviti(
      req.user.pengguna_id,
      "Tukar Kata Laluan",
      `${req.user.nama_penuh} telah menukar kata laluan sendiri.`,
      `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah menukar kata laluan sendiri.`
    );

    res.json({ message: "Kata laluan berjaya ditukar." });
  } catch (err) {
    console.error("Gagal tukar kata laluan:", err);
    res.status(500).json({ error: "Gagal menukar kata laluan." });
  }
};