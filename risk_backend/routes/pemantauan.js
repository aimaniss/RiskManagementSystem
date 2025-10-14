import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/* =======================================================
   🟢 GET: Dapatkan Semua Data Risiko Bersama Pemantauan Terkini
   ENDPOINT: /pemantauan-risiko
   ======================================================= */
router.get("/", verifyToken, async (req, res) => {
    try {
        const user = req.user;

        // CTE untuk mendapatkan rekod pemantauan TERKINI (rn=1)
        let query = `
            WITH PemantauanTerkini AS (
                SELECT
                    pm.log_id, pm.risiko_id, pm.tarikh_pemantauan, pm.tahun_pemantauan, pm.separuh_tahun_pemantauan,
                    pm.skor_kebarangkalian_selepas, pm.skor_impak_selepas, pm.status_pemantauan, pm.catatan,
                    pm.keberkesanan, pm.no_bil_kelulusan,
                    ROW_NUMBER() OVER (
                        PARTITION BY pm.risiko_id 
                        ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
                    ) as rn
                FROM LogPemantauan pm
            ),
            ButiranTerkini AS (
                -- Gabungkan butiran Pelan Tindakan dan Kakitangan dari rekod Terkini (MENGGUNAKAN subquery aggregation)
                SELECT 
                    pt.log_id,
                    ARRAY_AGG(pt.butiran_aktiviti || ' (' || pt.kekerapan_audit || ')') AS pelan_tindakan_terkini,
                    ARRAY_AGG(kp.butiran_kakitangan) AS kakitangan_terkini
                FROM PelanTindakanPemantauan pt
                JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
                GROUP BY pt.log_id
            )
            SELECT 
                r.risiko_id AS id,
                r.no_rujukan,
                r.tahun_asal, -- Anda mungkin perlu ubah ini mengikut nama kolum Risiko sebenar
                r.separuh_tahun_asal,
                s.nama_subsidiari,
                r.kategori AS kategori_risiko,
                r.nama_risiko AS risiko,
                
                -- Data Risiko Daftar (Skor Asal)
                r.skor_k_awal AS skor_kebarangkalian_sebelum,
                r.skor_i_awal AS skor_impak_sebelum,
                
                -- Data Pemantauan Terkini (rn = 1)
                pt.tahun_pemantauan,
                pt.separuh_tahun_pemantauan,
                bt.pelan_tindakan_terkini,
                bt.kakitangan_terkini,
                COALESCE(pt.status_pemantauan, 'Tiada Pemantauan') AS status_pemantauan_terkini, 
                pt.catatan,
                pt.no_bil_kelulusan,
                COALESCE(pt.skor_kebarangkalian_selepas, r.skor_k_awal) AS skor_kebarangkalian_terkini,
                COALESCE(pt.skor_impak_selepas, r.skor_i_awal) AS skor_impak_terkini
            FROM Risiko r
            -- Sila gantikan r.subsidiari dan s.subsidiari_id dengan kolum sebenar anda
            LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER) 
            LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
            LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
        `;

        const params = [];

        // 🔒 Hadkan data ikut subsidiari pengguna
        if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
            query += ` WHERE CAST(r.subsidiari AS INTEGER) = $1`;
            params.push(user.subsidiari_id);
        }

        query += `
            ORDER BY 
                r.tahun_asal DESC,
                r.separuh_tahun_asal DESC,
                r.no_rujukan ASC
        `;

        const { rows } = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("❌ Ralat GET /pemantauan-risiko:", err);
        res.status(500).json({ message: "Gagal memuatkan data pemantauan: " + err.message });
    }
});

// --------------------------------------------------------------------------------------------------

/* =======================================================
   🟢 GET: Dapatkan Sejarah Penuh Log Pemantauan untuk satu Risiko
   ENDPOINT: /pemantauan-risiko/:risiko_id/sejarah
   ======================================================= */
router.get("/:risiko_id/sejarah", verifyToken, async (req, res) => {
    try {
        const { risiko_id } = req.params;
        
        // Perhatian: Risiko_id kini ditetapkan sebagai INT, pastikan ianya INT atau ganti ke UUID jika perlu
        const risikoIdInt = parseInt(risiko_id, 10);

        const logQuery = `
            SELECT 
                lp.log_id,
                lp.tahun_pemantauan,
                lp.separuh_tahun_pemantauan,
                lp.skor_kebarangkalian_selepas,
                lp.skor_impak_selepas,
                lp.keberkesanan,
                lp.status_pemantauan,
                lp.catatan,
                lp.no_bil_kelulusan,
                
                -- Gabungkan butiran Pelan Tindakan (One-to-Many)
                (
                    SELECT ARRAY_AGG(pt.butiran_aktiviti || ' (' || pt.kekerapan_audit || ')') 
                    FROM PelanTindakanPemantauan pt WHERE pt.log_id = lp.log_id
                ) AS pelan_tindakan_log,
                
                -- Gabungkan butiran Kakitangan (One-to-Many)
                (
                    SELECT ARRAY_AGG(kp.butiran_kakitangan)
                    FROM KakitanganPemantauan kp WHERE kp.log_id = lp.log_id
                ) AS kakitangan_bertanggungjawab_log
            FROM LogPemantauan lp
            WHERE lp.risiko_id = $1
            ORDER BY lp.tahun_pemantauan DESC, lp.tarikh_pemantauan DESC;
        `;

        const { rows } = await pool.query(logQuery, [risikoIdInt]); // Guna risikoIdInt
        res.json(rows);
    } catch (err) {
        console.error("❌ Ralat GET /:risiko_id/sejarah:", err);
        res.status(500).json({ message: "Gagal memuatkan sejarah pemantauan." });
    }
});

// --------------------------------------------------------------------------------------------------

/* =======================================================
   ➕ POST: Tambah Log Pemantauan Baharu (Transactional)
   ENDPOINT: /pemantauan-risiko/log
   ======================================================= */
router.post("/log", verifyToken, async (req, res) => {
    const client = await pool.connect();
    try {
        const {
            risiko_id,
            tahun_pemantauan,
            separuh_tahun_pemantauan,
            skor_kebarangkalian_selepas,
            skor_impak_selepas,
            keberkesanan,
            status_pemantauan,
            catatan,
            no_bil_kelulusan,
            // Data array/senarai dari frontend untuk hubungan One-to-Many
            pelan_tindakan_list,     // Array of { butiran_aktiviti: string, kekerapan_audit: string }
            kakitangan_list          // Array of { butiran_kakitangan: string }
        } = req.body;
        
        // Perhatian: Risiko_id kini ditetapkan sebagai INT, pastikan ianya INT atau ganti ke UUID jika perlu
        const risikoIdInt = parseInt(risiko_id, 10);

        await client.query('BEGIN'); // Mulakan transaksi

        // 1. Masukkan rekod ke LogPemantauan
        const logInsertQuery = `
            INSERT INTO LogPemantauan (
                risiko_id, tahun_pemantauan, separuh_tahun_pemantauan,
                skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan, 
                status_pemantauan, catatan, no_bil_kelulusan
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING log_id;
        `;
        const logResult = await client.query(logInsertQuery, [
            risikoIdInt, tahun_pemantauan, separuh_tahun_pemantauan,
            skor_kebarangkalian_selepas, skor_impak_selepas, keberkesanan,
            status_pemantauan, catatan, no_bil_kelulusan
        ]);
        const new_log_id = logResult.rows[0].log_id; // Dapatkan log_id baharu (UUID)

        // 2. Masukkan butiran Pelan Tindakan (Loop melalui senarai)
        if (pelan_tindakan_list && pelan_tindakan_list.length > 0) {
            for (const item of pelan_tindakan_list) {
                await client.query(
                    `INSERT INTO PelanTindakanPemantauan (log_id, butiran_aktiviti, kekerapan_audit) VALUES ($1, $2, $3)`,
                    [new_log_id, item.butiran_aktiviti, item.kekerapan_audit]
                );
            }
        }

        // 3. Masukkan butiran Kakitangan Bertanggungjawab (Loop melalui senarai)
        if (kakitangan_list && kakitangan_list.length > 0) {
            for (const item of kakitangan_list) {
                await client.query(
                    `INSERT INTO KakitanganPemantauan (log_id, butiran_kakitangan) VALUES ($1, $2)`,
                    [new_log_id, item.butiran_kakitangan]
                );
            }
        }

        await client.query('COMMIT'); // Commit transaksi jika semua berjaya
        res.status(201).json({ 
            message: "Log Pemantauan berjaya ditambah.", 
            log_id: new_log_id 
        });

    } catch (err) {
        await client.query('ROLLBACK'); // Rollback jika ada ralat
        console.error("❌ Ralat POST /pemantauan-risiko/log:", err);
        res.status(500).json({ message: "Gagal menambah log pemantauan: " + err.message });
    } finally {
        client.release();
    }
});

export default router;