import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =======================================================
    🟢 GET: Semua Rawatan Risiko
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
                rr.rawatan_id,
                rr.jenis_kawalan,
                rr.tempoh_siap AS tempoh_jangkaan_siap, -- Konsisten dengan nama di frontend
                ARRAY(
                    SELECT pelan_tindakan 
                    FROM pelan_tindakan_rawatan 
                    WHERE rawatan_id = rr.rawatan_id
                ) AS plan_tindakan,
                ARRAY(
                    SELECT nama_kakitangan 
                    FROM kakitangan_rawatan 
                    WHERE rawatan_id = rr.rawatan_id
                ) AS kakitangan_bertanggungjawab
            FROM risiko r
            LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
            LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
        `;

        const params = [];

        // 🔒 Hadkan data ikut subsidiari pengguna
        if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
            query += ` WHERE CAST(r.subsidiari AS INTEGER) = $1`;
            params.push(user.subsidiari_id);
        }

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
    🟢 POST: Tambah Rawatan Risiko (Diaktifkan bila rawatan_id tiada)
    ======================================================= */
router.post("/", verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        // Menerima tempoh_jangkaan_siap (nama seragam dari frontend)
        const { risiko_id, jenis_kawalan, tempoh_jangkaan_siap, plan_tindakan, kakitangan_bertanggungjawab } = req.body;

        if (!risiko_id || !jenis_kawalan) {
            return res.status(400).json({ message: "Maklumat risiko (risiko_id) dan Jenis Kawalan diperlukan." });
        }

        await client.query("BEGIN");

        // 1️⃣ Tambah rawatan utama (menggunakan nama lajur DDL: tempoh_siap)
        const result = await client.query(
            `INSERT INTO rawatan_risiko (risiko_id, jenis_kawalan, tempoh_siap)
             VALUES ($1, $2, $3)
             RETURNING rawatan_id`,
            [risiko_id, jenis_kawalan, tempoh_jangkaan_siap || null] // Guna value dari frontend
        );
        const rawatan_id = result.rows[0].rawatan_id;

        // 2️⃣ Masukkan pelan tindakan
        if (Array.isArray(plan_tindakan)) {
            for (const pelan of plan_tindakan) {
                if (pelan.trim() !== "") {
                    await client.query(
                        `INSERT INTO pelan_tindakan_rawatan (rawatan_id, pelan_tindakan)
                         VALUES ($1, $2)`,
                        [rawatan_id, pelan]
                    );
                }
            }
        }

        // 3️⃣ Masukkan kakitangan bertanggungjawab
        if (Array.isArray(kakitangan_bertanggungjawab)) {
            for (const kakitangan of kakitangan_bertanggungjawab) {
                if (kakitangan.trim() !== "") {
                    await client.query(
                        `INSERT INTO kakitangan_rawatan (rawatan_id, nama_kakitangan)
                         VALUES ($1, $2)`,
                        [rawatan_id, kakitangan]
                    );
                }
            }
        }

        await client.query("COMMIT");
        // PENTING: Kembalikan rawatan_id yang baru dicipta
        res.status(201).json({ message: "Rawatan risiko berjaya ditambah", rawatan_id });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Ralat POST /rawatan:", err);
        res.status(500).json({ message: "Gagal menambah rawatan: " + err.message });
    } finally {
        client.release();
    }
});

/* =======================================================
    🟡 PUT: Kemas Kini Rawatan Risiko (Diaktifkan bila rawatan_id wujud)
    ======================================================= */
router.put("/:rawatan_id", verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const { rawatan_id } = req.params;
        const { plan_tindakan, jenis_kawalan, tempoh_jangkaan_siap, kakitangan_bertanggungjawab } = req.body; // Guna tempoh_jangkaan_siap

        await client.query("BEGIN");

        // 1️⃣ Padam data lama pelan & kakitangan
        await client.query(`DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);
        await client.query(`DELETE FROM kakitangan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);

        // 2️⃣ Masukkan semula pelan tindakan
        if (Array.isArray(plan_tindakan)) {
            for (const pelan of plan_tindakan) {
                if (pelan.trim() !== "") {
                    await client.query(
                        `INSERT INTO pelan_tindakan_rawatan (rawatan_id, pelan_tindakan)
                         VALUES ($1, $2)`,
                        [rawatan_id, pelan]
                    );
                }
            }
        }

        // 3️⃣ Masukkan semula kakitangan
        if (Array.isArray(kakitangan_bertanggungjawab)) {
            for (const kakitangan of kakitangan_bertanggungjawab) {
                if (kakitangan.trim() !== "") {
                    await client.query(
                        `INSERT INTO kakitangan_rawatan (rawatan_id, nama_kakitangan)
                         VALUES ($1, $2)`,
                        [rawatan_id, kakitangan]
                    );
                }
            }
        }

        // 4️⃣ Kemas kini rawatan_risiko utama
        const updateResult = await client.query(
            `UPDATE rawatan_risiko
             SET jenis_kawalan = $1,
                 tempoh_siap = $2, -- Guna nama lajur DDL
                 updated_at = CURRENT_TIMESTAMP
             WHERE rawatan_id = $3
             RETURNING rawatan_id`,
            [jenis_kawalan, tempoh_jangkaan_siap || null, rawatan_id] // Guna tempoh_jangkaan_siap dari payload
        );
        
        if (updateResult.rowCount === 0) {
             await client.query("ROLLBACK");
             return res.status(404).json({ message: "Rekod rawatan tidak ditemui untuk dikemaskini." });
        }


        await client.query("COMMIT");
        res.json({ message: "Rawatan risiko berjaya dikemaskini" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Ralat PUT /rawatan/:rawatan_id:", err);
        res.status(500).json({ message: "Gagal mengemaskini rawatan: " + err.message });
    } finally {
        client.release();
    }
});

/* =======================================================
    🔴 DELETE: Padam Rawatan Risiko
    ======================================================= */
router.delete("/:rawatan_id", verifyToken, async (req, res) => {
    // Nota: DELETE pada rawatan_risiko akan mencetuskan CASCADE DELETE
    // pada pelan_tindakan_rawatan dan kakitangan_rawatan jika DDL anda betul.
    try {
        const { rawatan_id } = req.params;
        const result = await pool.query(`DELETE FROM rawatan_risiko WHERE rawatan_id = $1`, [rawatan_id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
        }
        res.json({ message: "Rawatan risiko berjaya dipadam" });
    } catch (err) {
        console.error("❌ Ralat DELETE /rawatan/:rawatan_id:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =======================================================
    🟢 GET: Dapatkan Rawatan Risiko Mengikut risiko_id (Digunakan oleh Modal)
    ======================================================= */
router.get("/:risiko_id", verifyToken, async (req, res) => {
    try {
        const { risiko_id } = req.params;

        const { rows } = await pool.query(`
            SELECT 
                r.risiko_id,
                r.no_rujukan,
                r.tahun,
                r.separuh_tahun,
                r.subsidiari::integer AS subsidiari_id,
                s.nama_subsidiari AS nama_subsidiari,
                r.kategori,
                r.bahagian,
                r.risiko,
                r.skor_kebarangkalian,
                r.skor_impak,
                r.skor_risiko,
                r.status_risiko,
                r.tahap_risiko,
                rr.rawatan_id,
                rr.jenis_kawalan,
                rr.tempoh_siap AS tempoh_jangkaan_siap,
                ARRAY(SELECT pelan_tindakan FROM pelan_tindakan_rawatan WHERE rawatan_id = rr.rawatan_id) AS plan_tindakan,
                ARRAY(SELECT nama_kakitangan FROM kakitangan_rawatan WHERE rawatan_id = rr.rawatan_id) AS kakitangan_bertanggungjawab,
                ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id = r.risiko_id) AS punca,
                ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id = r.risiko_id) AS kesan
            FROM risiko r
            LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
            LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
            WHERE r.risiko_id = $1
        `, [risiko_id]);

        // Jika risiko_id wujud (rows.length > 0) tetapi rawatan_id NULL (LEFT JOIN),
        // tetap kembalikan data risiko (rows[0]). Ini penting untuk modal.
        if (rows.length === 0) {
            return res.status(404).json({ message: "Risiko tidak ditemui" });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error("❌ Ralat GET /rawatan/:risiko_id:", err);
        res.status(500).json({ message: err.message });
    }
});

export default router;