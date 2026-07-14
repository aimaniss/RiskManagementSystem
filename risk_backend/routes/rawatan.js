import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";

const router = express.Router();

/* =======================================================
   🟢 GET: Semua Rawatan Risiko (KEKAL SAMA - JANGAN USIK!)
   Endpoint ni digunakan oleh RawatanRisiko.jsx, PemantauanRisiko.jsx
   ======================================================= */
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = req.user;
        let query = `
SELECT 
    r.risiko_id, r.no_rujukan, r.tahun, r.separuh_tahun,
    r.syarikat_id AS syarikat_id, s.nama_syarikat AS nama_syarikat,
    r.kategori, r.bahagian, r.status_risiko, r.risiko,
    r.skor_kebarangkalian, r.skor_impak, r.skor_risiko,
    rr.rawatan_id, rr.jenis_kawalan, rr.tempoh_siap AS tempoh_jangkaan_siap,
    ARRAY(
        SELECT pelan_tindakan 
        FROM pelan_tindakan_rawatan 
        WHERE pelan_tindakan_rawatan.rawatan_id = rr.rawatan_id
    ) AS plan_tindakan,
    ARRAY(SELECT punca FROM punca_risiko WHERE punca_risiko.risiko_id = r.risiko_id) AS punca,
    ARRAY(SELECT kesan FROM kesan_risiko WHERE kesan_risiko.risiko_id = r.risiko_id) AS kesan,
    ARRAY(
        SELECT nama_kakitangan 
        FROM kakitangan_rawatan 
        WHERE kakitangan_rawatan.rawatan_id = rr.rawatan_id
    ) AS kakitangan_bertanggungjawab
FROM risiko r
LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)`;

        const params = [];

        if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
            query += ` WHERE CAST(r.syarikat_id AS INTEGER) = $1`; 
            params.push(user.syarikat_id);
        }

        query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Ralat GET /rawatan:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =======================================================
   🆕 GET: Rawatan WITH Status Pemantauan (ENDPOINT BARU!)
   Khusus untuk PenilaianDanRawatan.jsx sahaja
   ======================================================= */
router.get("/with-status", verifyToken, async (req, res) => {
    try {
        const user = req.user;
        let query = `
SELECT 
    r.risiko_id, r.no_rujukan, r.tahun, r.separuh_tahun,
    r.syarikat_id AS syarikat_id, s.nama_syarikat AS nama_syarikat,
    r.kategori, r.bahagian, r.status_risiko, r.risiko,
    r.skor_kebarangkalian, r.skor_impak, r.skor_risiko,
    rr.rawatan_id, rr.jenis_kawalan, rr.tempoh_siap AS tempoh_jangkaan_siap,
    COALESCE(lp.status_pemantauan, 'Buka') AS status_pemantauan,
    ARRAY(
        SELECT pelan_tindakan 
        FROM pelan_tindakan_rawatan 
        WHERE pelan_tindakan_rawatan.rawatan_id = rr.rawatan_id
    ) AS plan_tindakan,
    ARRAY(SELECT punca FROM punca_risiko WHERE punca_risiko.risiko_id = r.risiko_id) AS punca,
    ARRAY(SELECT kesan FROM kesan_risiko WHERE kesan_risiko.risiko_id = r.risiko_id) AS kesan,
    ARRAY(
        SELECT nama_kakitangan 
        FROM kakitangan_rawatan 
        WHERE kakitangan_rawatan.rawatan_id = rr.rawatan_id
    ) AS kakitangan_bertanggungjawab
FROM risiko r
LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)
LEFT JOIN LogPemantauan lp 
    ON lp.risiko_id = r.risiko_id 
    AND lp.tahun_pemantauan = r.tahun 
    AND lp.separuh_tahun_pemantauan = r.separuh_tahun`;

        const params = [];

        if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
            query += ` WHERE CAST(r.syarikat_id AS INTEGER) = $1`; 
            params.push(user.syarikat_id);
        }

        query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC`;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Ralat GET /rawatan/with-status:", err);
        res.status(500).json({ message: err.message });
    }
});

/* =======================================================
   🆕 PUT: UPDATE PENILAIAN + STATUS PEMANTAUAN (FIXED!)
   ======================================================= */
router.put("/penilaian/:risiko_id", verifyToken, async (req, res) => {
    const client = await pool.connect();
    const user = req.user;

    try {
        const { risiko_id } = req.params;
        const {
            skorKebarangkalian,
            skorImpak,
            skorRisiko,
            statusRisiko,
            // tahapRisiko - JANGAN GUNA, column tak wujud!
        } = req.body;

        await client.query("BEGIN");

        // 1. Get risiko data
        const { rows: riskRows } = await client.query(
            "SELECT no_rujukan, tahun, separuh_tahun FROM risiko WHERE risiko_id = $1",
            [risiko_id]
        );

        if (riskRows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            return res.status(404).json({ message: "Risiko tidak ditemui." });
        }

        const { no_rujukan, tahun, separuh_tahun } = riskRows[0];

        // 🌟 2. UPDATE RISIKO - BUANG tahap_risiko!
        await client.query(
            `UPDATE risiko
             SET skor_kebarangkalian = $1,
                 skor_impak = $2,
                 skor_risiko = $3,
                 status_risiko = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE risiko_id = $5`,
            [skorKebarangkalian, skorImpak, skorRisiko, statusRisiko, risiko_id]
        );

        // 3. UPDATE STATUS PEMANTAUAN
        try {
            await client.query(
                `UPDATE LogPemantauan
                 SET status_pemantauan = $1,
                     tarikh_kemaskini = CURRENT_TIMESTAMP
                 WHERE risiko_id = $2 
                 AND tahun_pemantauan = $3 
                 AND separuh_tahun_pemantauan = $4`,
                ["Sedang Dilaksanakan", risiko_id, tahun, separuh_tahun]
            );
        } catch (logErr) {
            console.warn("⚠️ Gagal update LogPemantauan:", logErr.message);
        }

        await client.query("COMMIT");

        // 4. Log aktiviti
        try {
            const logRingkasan = `Menilai risiko: ${no_rujukan}`;
            const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah membuat penilaian untuk risiko ${no_rujukan}. Status pemantauan dikemaskini kepada: Sedang Dilaksanakan.`;
            await catatAktiviti(user.pengguna_id, "Penilaian Risiko", logRingkasan, logPerincian);
        } catch (logErr) {
            console.error("Gagal mencatat log aktiviti:", logErr);
        }

        res.json({ 
            message: "Penilaian risiko berjaya dikemaskini", 
            status_pemantauan: "Sedang Dilaksanakan" 
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Ralat PUT /rawatan/penilaian/:risiko_id:", err);
        res.status(500).json({ message: "Gagal mengemaskini penilaian: " + err.message });
    } finally {
        client.release();
    }
});

/* =======================================================
   🟢 POST: Tambah Rawatan + Update Status (SEDIKIT MODIFY)
   ======================================================= */
router.post("/", verifyToken, async (req, res) => {
    const client = await pool.connect();
    const user = req.user;

    try {
        const { 
            risiko_id, 
            jenis_kawalan, 
            tempoh_jangkaan_siap, 
            plan_tindakan, 
            kakitangan_bertanggungjawab 
        } = req.body;

        if (!risiko_id || !jenis_kawalan) {
            client.release();
            return res.status(400).json({ message: "Maklumat risiko (risiko_id) dan Jenis Kawalan diperlukan." });
        }

        await client.query("BEGIN");

        // Get risiko data
        const { rows: riskRows } = await client.query(
            "SELECT no_rujukan, tahun, separuh_tahun FROM risiko WHERE risiko_id = $1",
            [risiko_id]
        );
        if (riskRows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            return res.status(404).json({ message: "Risiko induk tidak ditemui." });
        }
        const { no_rujukan, tahun, separuh_tahun } = riskRows[0];

        // 1️⃣ Tambah rawatan utama
        const result = await client.query(
            `INSERT INTO rawatan_risiko (risiko_id, jenis_kawalan, tempoh_siap)
             VALUES ($1, $2, $3)
             RETURNING rawatan_id`,
            [risiko_id, jenis_kawalan, tempoh_jangkaan_siap || null]
        );
        const rawatan_id = result.rows[0].rawatan_id;

        // 2️⃣ Masukkan pelan tindakan
        if (Array.isArray(plan_tindakan)) {
            for (const pelan of plan_tindakan) {
                if (pelan && pelan.trim() !== "") {
                    await client.query(
                        `INSERT INTO pelan_tindakan_rawatan (rawatan_id, pelan_tindakan)
                         VALUES ($1, $2)`,
                        [rawatan_id, pelan]
                    );
                }
            }
        }

        // 3️⃣ Masukkan kakitangan
        if (Array.isArray(kakitangan_bertanggungjawab)) {
            for (const kakitangan of kakitangan_bertanggungjawab) {
                if (kakitangan && kakitangan.trim() !== "") {
                    await client.query(
                        `INSERT INTO kakitangan_rawatan (rawatan_id, nama_kakitangan)
                         VALUES ($1, $2)`,
                        [rawatan_id, kakitangan]
                    );
                }
            }
        }

        // 🌟 4️⃣ UPDATE STATUS PEMANTAUAN (macam DaftarRisiko.jsx pattern)
        try {
            await client.query(
                `UPDATE LogPemantauan
                 SET status_pemantauan = $1,
                     tarikh_kemaskini = CURRENT_TIMESTAMP
                 WHERE risiko_id = $2 
                 AND tahun_pemantauan = $3 
                 AND separuh_tahun_pemantauan = $4`,
                ["Pemantauan", risiko_id, tahun, separuh_tahun]
            );
        } catch (logErr) {
            console.warn("⚠️ Gagal update LogPemantauan:", logErr.message);
        }

        await client.query("COMMIT");

        // Log aktiviti
        try {
            const logRingkasan = `Menambah rawatan untuk risiko: ${no_rujukan}.`;
            const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah menambah rawatan (Jenis: ${jenis_kawalan}) untuk risiko No. Rujukan: ${no_rujukan}. Status pemantauan dikemaskini kepada: Pemantauan.`;
            await catatAktiviti(user.pengguna_id, "Tambah Rawatan", logRingkasan, logPerincian);
        } catch (logErr) {
            console.error("Gagal mencatat log:", logErr);
        }

        res.status(201).json({ 
            message: "Rawatan risiko berjaya ditambah", 
            rawatan_id,
            status_pemantauan: "Pemantauan"
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Ralat POST /rawatan:", err);
        res.status(500).json({ message: "Gagal menambah rawatan: " + err.message });
    } finally {
        client.release();
    }
});

/* =======================================================
   🟡 PUT, DELETE, GET/:risiko_id - KEKAL SAMA (EXISTING CODE)
   ======================================================= */
router.put("/:rawatan_id", verifyToken, async (req, res) => {
    const client = await pool.connect();
    const user = req.user;

    try {
        const { rawatan_id } = req.params;
        const { plan_tindakan, jenis_kawalan, tempoh_jangkaan_siap, kakitangan_bertanggungjawab } = req.body;

        await client.query("BEGIN");

        const { rows: riskRows } = await client.query(
            "SELECT r.no_rujukan FROM risiko r JOIN rawatan_risiko rr ON r.risiko_id = rr.risiko_id WHERE rr.rawatan_id = $1",
            [rawatan_id]
        );
        if (riskRows.length === 0) {
            await client.query("ROLLBACK");
            client.release();
            return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
        }
        const noRujukanUntukLog = riskRows[0].no_rujukan;

        await client.query(`DELETE FROM pelan_tindakan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);
        await client.query(`DELETE FROM kakitangan_rawatan WHERE rawatan_id = $1`, [rawatan_id]);

        if (Array.isArray(plan_tindakan)) {
            for (const pelan of plan_tindakan) {
                if (pelan && pelan.trim() !== "") {
                    await client.query(
                        `INSERT INTO pelan_tindakan_rawatan (rawatan_id, pelan_tindakan)
                         VALUES ($1, $2)`,
                        [rawatan_id, pelan]
                    );
                }
            }
        }

        if (Array.isArray(kakitangan_bertanggungjawab)) {
            for (const kakitangan of kakitangan_bertanggungjawab) {
                if (kakitangan && kakitangan.trim() !== "") {
                    await client.query(
                        `INSERT INTO kakitangan_rawatan (rawatan_id, nama_kakitangan)
                         VALUES ($1, $2)`,
                        [rawatan_id, kakitangan]
                    );
                }
            }
        }

        const updateResult = await client.query(
            `UPDATE rawatan_risiko
             SET jenis_kawalan = $1,
                 tempoh_siap = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE rawatan_id = $3
             RETURNING rawatan_id`,
            [jenis_kawalan, tempoh_jangkaan_siap || null, rawatan_id]
        );
        
        if (updateResult.rowCount === 0) {
             await client.query("ROLLBACK");
             client.release();
             return res.status(404).json({ message: "Rekod rawatan tidak ditemui untuk dikemaskini." });
        }

        await client.query("COMMIT");

        try {
            const logRingkasan = `Mengemaskini rawatan untuk risiko: ${noRujukanUntukLog}.`;
            const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah mengemaskini rawatan (Jenis: ${jenis_kawalan}) untuk risiko No. Rujukan: ${noRujukanUntukLog}.`;
            await catatAktiviti(
                user.pengguna_id,
                "Kemaskini Rawatan",
                logRingkasan,
                logPerincian
            );
        } catch (logErr) {
            console.error("Gagal mencatat log selepas KEMASKINI rawatan:", logErr);
        }

        res.json({ message: "Rawatan risiko berjaya dikemaskini" });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Ralat PUT /rawatan/:rawatan_id:", err);
        res.status(500).json({ message: "Gagal mengemaskini rawatan: " + err.message });
    } finally {
        client.release();
    }
});

router.delete("/:rawatan_id", verifyToken, async (req, res) => {
    const user = req.user;
    
    try {
        const { rawatan_id } = req.params;

        const { rows: riskRows } = await pool.query(
            "SELECT r.no_rujukan FROM risiko r JOIN rawatan_risiko rr ON r.risiko_id = rr.risiko_id WHERE rr.rawatan_id = $1",
            [rawatan_id]
        );

        if (riskRows.length === 0) {
            return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
        }
        const noRujukanUntukLog = riskRows[0].no_rujukan;

        const result = await pool.query(`DELETE FROM rawatan_risiko WHERE rawatan_id = $1`, [rawatan_id]);
        
        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Rekod rawatan tidak ditemui." });
        }

        try {
            const logRingkasan = `Memadam rawatan untuk risiko: ${noRujukanUntukLog}.`;
            const logPerincian = `${user.nama_penuh} (ID Staf: ${user.staff_id}) telah memadam rawatan untuk risiko No. Rujukan: ${noRujukanUntukLog}.`;
            await catatAktiviti(
                user.pengguna_id,
                "Padam Rawatan",
                logRingkasan,
                logPerincian
            );
        } catch (logErr) {
            console.error("Gagal mencatat log selepas PADAM rawatan:", logErr);
        }

        res.json({ message: "Rawatan risiko berjaya dipadam" });
    } catch (err) {
        console.error("❌ Ralat DELETE /rawatan/:rawatan_id:", err);
        res.status(500).json({ message: err.message });
    }
});

router.get("/:risiko_id", verifyToken, async (req, res) => {
    try {
        const { risiko_id } = req.params;

        const { rows } = await pool.query(`
            SELECT 
                r.risiko_id,
                r.no_rujukan,
                r.tahun,
                r.separuh_tahun,
                r.syarikat_id AS syarikat_id,
                s.nama_syarikat AS nama_syarikat,
                r.kategori,
                r.bahagian,
                r.risiko,
                r.skor_kebarangkalian,
                r.skor_impak,
                r.skor_risiko,
                rr.rawatan_id,
                rr.jenis_kawalan,
                rr.tempoh_siap AS tempoh_jangkaan_siap,
                ARRAY(SELECT pelan_tindakan FROM pelan_tindakan_rawatan WHERE rawatan_id = rr.rawatan_id) AS plan_tindakan,
                ARRAY(SELECT nama_kakitangan FROM kakitangan_rawatan WHERE rawatan_id = rr.rawatan_id) AS kakitangan_bertanggungjawab,
                ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id = r.risiko_id) AS punca,
                ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id = r.risiko_id) AS kesan
            FROM risiko r
            LEFT JOIN rawatan_risiko rr ON rr.risiko_id = r.risiko_id
            LEFT JOIN syarikat s ON s.syarikat_id = CAST(r.syarikat_id AS INTEGER)
            WHERE r.risiko_id = $1
        `, [risiko_id]);

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