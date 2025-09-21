import express from "express";
import pool from "../config/db.js"; // PostgreSQL pool
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- POST: Tambah Risiko -------------------
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko,
      statusRisiko, tahapRisiko, punca, kesan
    } = req.body;

    if (!noRujukan || !tahun || !subsidiari) {
      return res.status(400).json({ message: "Sila lengkapkan maklumat penting" });
    }

    const allowedRoles = ["Admin", "Executive", "Staff", "Ketua Subsidiari"];
    if (!allowedRoles.includes(user.nama_peranan)) {
      return res.status(403).json({ error: "No permission" });
    }

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        return res.status(403).json({ error: "No permission for other subsidiari" });
      }
    }

    const result = await pool.query(
      `INSERT INTO risiko
      (no_rujukan, tahun, separuh_tahun, subsidiari, kategori, bahagian, risiko, 
       skor_kebarangkalian, skor_impak, skor_risiko, status_risiko, tahap_risiko)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian, risiko,
       skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, tahapRisiko]
    );

    const risikoId = result.rows[0].id;

    if (Array.isArray(punca)) {
      for (let p of punca) {
        if (p) await pool.query(`INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1,$2)`, [risikoId, p]);
      }
    }

    if (Array.isArray(kesan)) {
      for (let k of kesan) {
        if (k) await pool.query(`INSERT INTO kesan_risiko (risiko_id, kesan) VALUES ($1,$2)`, [risikoId, k]);
      }
    }

    res.status(201).json({ message: "Risiko berjaya didaftarkan", id: risikoId });
  } catch (err) {
    console.error("Ralat POST /risiko:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- GET: Semua Risiko -------------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    let query = `
      SELECT 
        d.id, d.no_rujukan, d.tahun, d.separuh_tahun, 
        s.nama_subsidiari AS subsidiari, s.subsidiari_id,
        d.bahagian, d.kategori, d.risiko,
        d.skor_kebarangkalian, d.skor_impak, d.skor_risiko,
        d.status_risiko, d.tahap_risiko,
        ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id=d.id) AS punca,
        ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id=d.id) AS kesan
      FROM risiko d
      LEFT JOIN subsidiari s ON s.subsidiari_id = d.subsidiari::integer
    `;

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE d.subsidiari = ${user.subsidiari_id}`;
    }

    query += " ORDER BY d.id DESC";

    const { rows } = await pool.query(query);
    res.json(rows);

  } catch (err) {
    console.error("Ralat GET /risiko:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- GET: Tahun Unik -------------------
router.get("/tahun", verifyToken, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT DISTINCT tahun FROM risiko ORDER BY tahun DESC`);
    res.json(rows.map(r => r.tahun));
  } catch (err) {
    console.error("Ralat GET /risiko/tahun:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- PUT: Update Risiko -------------------
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const risikoId = req.params.id;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko,
      statusRisiko, tahapRisiko
    } = req.body;

    await pool.query(
      `UPDATE risiko SET
        no_rujukan=$1, tahun=$2, separuh_tahun=$3, subsidiari=$4, kategori=$5, bahagian=$6,
        risiko=$7, skor_kebarangkalian=$8, skor_impak=$9, skor_risiko=$10,
        status_risiko=$11, tahap_risiko=$12
       WHERE id=$13`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian,
       risiko, skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, tahapRisiko, risikoId]
    );

    res.json({ message: "Risiko berjaya dikemaskini" });

  } catch (err) {
    console.error("Ralat PUT /risiko/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- DELETE: Risiko -------------------
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const risikoId = req.params.id;

    await pool.query("DELETE FROM punca_risiko WHERE risiko_id=$1", [risikoId]);
    await pool.query("DELETE FROM kesan_risiko WHERE risiko_id=$1", [risikoId]);
    await pool.query("DELETE FROM risiko WHERE id=$1", [risikoId]);

    res.json({ message: "Risiko berjaya dipadam" });

  } catch (err) {
    console.error("Ralat DELETE /risiko/:id:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
