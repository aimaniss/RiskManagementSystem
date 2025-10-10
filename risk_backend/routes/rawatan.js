import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =======================================================
    🟢 GET: Semua Rawatan Risiko (sorted ikut tahun & separuh_tahun)
   ======================================================= */
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;

    let query = `
      SELECT 
        r.risiko_id,
        r.no_rujukan,
        r.tahun,
        r.separuh_tahun,
        s.nama_subsidiari AS nama_subsidiari,
        r.kategori,
        r.bahagian,
        r.risiko,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.skor_risiko,
        p.pelan_tindakan AS plan_tindakan,
        rr.jenis_kawalan,
        rr.tempoh_siap AS tempoh_jangkaan_siap,
        k.nama_kakitangan AS kakitangan_bertanggungjawab
      FROM risiko r
      LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
      LEFT JOIN pelan_tindakan_rawatan p ON p.pelan_id = rr.pelan_id
      LEFT JOIN kakitangan_rawatan k ON k.kakitangan_id = rr.kakitangan_id
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
    `;

    const params = [];

    // 🔒 Hadkan data ikut subsidiari pengguna
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE CAST(r.subsidiari AS INTEGER) = $1`;
      params.push(user.subsidiari_id);
    }

    // 📅 Sorting: Tahun DESC → Separuh Tahun DESC → No Rujukan ASC
    query += `
      ORDER BY 
        r.tahun DESC,
        r.separuh_tahun DESC,
        r.no_rujukan ASC
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Ralat GET /rawatan:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =======================================================
   🟢 POST: Tambah Rawatan Risiko
   ======================================================= */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { risiko_id, jenis_kawalan, tempoh_siap, pelan_id, kakitangan_id } = req.body;

    if (!risiko_id || !jenis_kawalan) {
      return res.status(400).json({ message: "Maklumat tidak lengkap." });
    }

    const result = await pool.query(
      `INSERT INTO rawatan_risiko (risiko_id, jenis_kawalan, tempoh_siap, pelan_id, kakitangan_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING rawatan_id`,
      [risiko_id, jenis_kawalan, tempoh_siap || null, pelan_id || null, kakitangan_id || null]
    );

    res.status(201).json({
      message: "Rawatan risiko berjaya ditambah",
      rawatan_id: result.rows[0].rawatan_id,
    });
  } catch (err) {
    console.error("❌ Ralat POST /rawatan:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =======================================================
   🟡 PUT: Kemas Kini Rawatan Risiko
   ======================================================= */
router.put("/:rawatan_id", verifyToken, async (req, res) => {
  try {
    const { rawatan_id } = req.params;
    const { jenis_kawalan, tempoh_siap, pelan_id, kakitangan_id } = req.body;

    const result = await pool.query(
      `UPDATE rawatan_risiko
       SET jenis_kawalan = $1,
           tempoh_siap = $2,
           pelan_id = $3,
           kakitangan_id = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE rawatan_id = $5`,
      [jenis_kawalan, tempoh_siap || null, pelan_id || null, kakitangan_id || null, rawatan_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
    }

    res.json({ message: "Rawatan risiko berjaya dikemaskini" });
  } catch (err) {
    console.error("❌ Ralat PUT /rawatan/:rawatan_id:", err);
    res.status(500).json({ message: err.message });
  }
});

/* =======================================================
   🔴 DELETE: Padam Rawatan Risiko
   ======================================================= */
router.delete("/:rawatan_id", verifyToken, async (req, res) => {
  try {
    const { rawatan_id } = req.params;

    const result = await pool.query(
      `DELETE FROM rawatan_risiko WHERE rawatan_id = $1`,
      [rawatan_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
    }

    res.json({ message: "Rawatan risiko berjaya dipadam" });
  } catch (err) {
    console.error("❌ Ralat DELETE /rawatan/:rawatan_id:", err);
    res.status(500).json({ message: err.message });
  }
});


// GET /rawatan/:risiko_id
router.get("/:risiko_id", verifyToken, async (req, res) => {
  try {
    const { risiko_id } = req.params;

    const { rows } = await pool.query(`
      SELECT 
        r.risiko_id,
        r.no_rujukan,
        r.tahun,
        r.separuh_tahun,
        s.nama_subsidiari AS nama_subsidiari,
        r.kategori,
        r.bahagian,
        r.risiko,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.skor_risiko,
        rr.jenis_kawalan,
        rr.tempoh_siap AS tempoh_jangkaan_siap,
        p.pelan_tindakan AS plan_tindakan,
        k.nama_kakitangan AS kakitangan_bertanggungjawab,
        ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id=r.risiko_id) AS punca,
        ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id=r.risiko_id) AS kesan
      FROM risiko r
      LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
      LEFT JOIN pelan_tindakan_rawatan p ON p.pelan_id = rr.pelan_id
      LEFT JOIN kakitangan_rawatan k ON k.kakitangan_id = rr.kakitangan_id
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      WHERE r.risiko_id = $1
    `, [risiko_id]);

    if (!rows[0]) return res.status(404).json({ message: "Rawatan tidak ditemui" });

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Ralat GET /rawatan/:risiko_id:", err);
    res.status(500).json({ message: err.message });
  }
});


export default router;
