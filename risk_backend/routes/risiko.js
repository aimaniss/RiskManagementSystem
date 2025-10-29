import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ------------------- POST: Tambah Risiko -------------------
router.post("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko, // 'skorRisiko' kini "ST", "T", dll.
      statusRisiko, punca, kesan
    } = req.body;

    const allowedRoles = ["Admin", "Executive", "Staff", "Ketua Subsidiari"];
    if (!allowedRoles.includes(user.nama_peranan)) {
      return res.status(403).json({ error: "No permission to add risiko" });
    }

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        return res.status(403).json({ error: "No permission for other subsidiari" });
      }
    }

    // Kod di bawah ini (baris 30+ dalam ralat anda) telah dibersihkan
    const result = await pool.query(
      `INSERT INTO risiko
      (no_rujukan, tahun, separuh_tahun, subsidiari, kategori, bahagian, risiko, 
       skor_kebarangkalian, skor_impak, skor_risiko, status_risiko)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING risiko_id`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian, risiko,
       skorKebarangkalian, skorImpak, skorRisiko, statusRisiko]
    );

    const risikoId = result.rows[0].risiko_id;

    if (Array.isArray(punca)) {
      for (let p of punca) {
        if (p) await pool.query(
          `INSERT INTO punca_risiko (risiko_id, punca) VALUES ($1,$2)`,
          [risikoId, p]
        );
      }
    }

    if (Array.isArray(kesan)) {
      for (let k of kesan) {
        if (k) await pool.query(
          `INSERT INTO kesan_risiko (risiko_id, kesan) VALUES ($1,$2)`,
          [risikoId, k]
        );
      }
    }

    res.status(201).json({ message: "Risiko berjaya didaftarkan", risiko_id: risikoId });
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
        d.risiko_id, d.no_rujukan, d.tahun, d.separuh_tahun, 
        s.nama_subsidiari AS subsidiari, s.subsidiari_id,
        d.bahagian, d.kategori, d.risiko,
        d.skor_kebarangkalian, d.skor_impak, d.skor_risiko,
        d.status_risiko, 
        ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id=d.risiko_id) AS punca,
        ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id=d.risiko_id) AS kesan
      FROM risiko d
      LEFT JOIN subsidiari s ON s.subsidiari_id = d.subsidiari::integer
    `;

    const params = [];
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      query += ` WHERE d.subsidiari::integer = $1`;
      params.push(user.subsidiari_id);
    }

    query += " ORDER BY d.risiko_id DESC";

    const { rows } = await pool.query(query, params);
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
router.put("/:risiko_id", verifyToken, async (req, res) => {
  try {
    const risikoId = req.params.risiko_id;
    const user = req.user;
    const {
      noRujukan, tahun, separuhTahun, subsidiari,
      kategori, bahagian, risiko,
      skorKebarangkalian, skorImpak, skorRisiko,
      statusRisiko
    } = req.body;

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(subsidiari) !== user.subsidiari_id) {
        return res.status(403).json({ error: "No permission to update other subsidiari" });
      }
    }

    // Typo 'f' telah dibuang dari query di bawah
    await pool.query(
      `UPDATE risiko SET
        no_rujukan=$1, tahun=$2, separuh_tahun=$3, subsidiari=$4, kategori=$5, bahagian=$6,
        risiko=$7, skor_kebarangkalian=$8, skor_impak=$9, skor_risiko=$10,
        status_risiko=$11
       WHERE risiko_id=$12`,
      [noRujukan, tahun, separuhTahun, subsidiari, kategori, bahagian,
       risiko, skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, risikoId]
    );

    res.json({ message: "Risiko berjaya dikemaskini" });

  } catch (err) {
    console.error("Ralat PUT /risiko/:risiko_id:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- DELETE: Risiko -------------------
router.delete("/:risiko_id", verifyToken, async (req, res) => {
  try {
    const risikoId = req.params.risiko_id;
    const user = req.user;

    const { rows } = await pool.query(`SELECT subsidiari FROM risiko WHERE risiko_id=$1`, [risikoId]);
    if (!rows[0]) return res.status(404).json({ error: "Risiko tidak ditemui" });

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      if (parseInt(rows[0].subsidiari) !== user.subsidiari_id) {
        return res.status(403).json({ error: "No permission to delete other subsidiari" });
      }
    }

    await pool.query("DELETE FROM punca_risiko WHERE risiko_id=$1", [risikoId]);
    await pool.query("DELETE FROM kesan_risiko WHERE risiko_id=$1", [risikoId]);
    await pool.query("DELETE FROM risiko WHERE risiko_id=$1", [risikoId]);

    res.json({ message: "Risiko berjaya dipadam" });

  } catch (err) {
    console.error("Ralat DELETE /risiko/:risiko_id:", err);
    res.status(500).json({ message: err.message });
  }
});

// ------------------- GET: Check No Rujukan -------------------
router.get("/check-no-rujukan/:noRujukan", verifyToken, async (req, res) => {
  try {
    const { noRujukan } = req.params;

    const { rows } = await pool.query(
      `SELECT * FROM risiko WHERE no_rujukan=$1`,
      [noRujukan]
    );

    if (rows.length > 0) {
      return res.json({ exists: true, data: rows[0] });
    } else {
      return res.json({ exists: false });
    }
  } catch (err) {
    console.error("Ralat GET /risiko/check-no-rujukan:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;