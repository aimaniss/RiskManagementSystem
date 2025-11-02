// =======================================================
// 📁 routes/laporan.js
// Modul: Laporan Risiko & Data Sokongan
// =======================================================

import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// =======================================================
// ⭐️ LOGIK RISK MATRIX
// =======================================================
const riskMatrix = {
  1: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  2: {1:{label:"R"}, 2:{label:"R"}, 3:{label:"S"}, 4:{label:"S"}, 5:{label:"T"}},
  3: {1:{label:"R"}, 2:{label:"S"}, 3:{label:"S"}, 4:{label:"T"}, 5:{label:"T"}},
  4: {1:{label:"S"}, 2:{label:"S"}, 3:{label:"T"}, 4:{label:"T"}, 5:{label:"ST"}},
  5: {1:{label:"S"}, 2:{label:"T"}, 3:{label:"T"}, 4:{label:"ST"}, 5:{label:"ST"}},
};

const getRiskLevel = (k, i) => {
  const kk = parseInt(k);
  const ii = parseInt(i);
  if (kk >= 1 && kk <= 5 && ii >= 1 && ii <= 5) {
    return riskMatrix[kk][ii].label;
  }
  return null; 
};

// =======================================================
// ⭐️ 1. GET: Senarai Risiko untuk Jadual Utama (LaporanRisiko.jsx)
// ENDPOINT: /api/laporan/
// =======================================================
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = req.user;
    const { subsidiary, tahun, separuhTahun } = req.query;

    let query = `
      WITH RisikoAdaRawatan AS (
        SELECT DISTINCT risiko_id
        FROM rawatan_risiko
      ),
      PemantauanTerkini AS (
        SELECT
          pm.log_id,
          pm.risiko_id,
          pm.tarikh_pemantauan,
          pm.tahun_pemantauan,
          pm.separuh_tahun_pemantauan,
          pm.skor_kebarangkalian_selepas,
          pm.skor_impak_selepas,
          pm.skor_risiko_pemantauan,
          COALESCE(
            LAG(pm.skor_kebarangkalian_selepas) OVER (PARTITION BY pm.risiko_id ORDER BY pm.tahun_pemantauan, pm.separuh_tahun_pemantauan, pm.tarikh_pemantauan),
            r.skor_kebarangkalian
          ) AS skor_kebarangkalian_sebelum,
          COALESCE(
            LAG(pm.skor_impak_selepas) OVER (PARTITION BY pm.risiko_id ORDER BY pm.tahun_pemantauan, pm.separuh_tahun_pemantauan, pm.tarikh_pemantauan),
            r.skor_impak
          ) AS skor_impak_sebelum,
          pm.status_pemantauan,
          pm.catatan,
          pm.keberkesanan,
          pm.no_bil_kelulusan,
          pm.justifikasi_pindaan_pemantauan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id 
            ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
          ) AS rn
        FROM LogPemantauan pm
        JOIN Risiko r ON pm.risiko_id = r.risiko_id
      ),
      ButiranTerkini AS (
        SELECT 
          pt.log_id,
          ARRAY_AGG(DISTINCT pt.butiran_aktiviti) AS pelan_tindakan_terkini,
          ARRAY_AGG(DISTINCT kp.butiran_kakitangan) AS kakitangan_terkini
        FROM PelanTindakanPemantauan pt
        LEFT JOIN KakitanganPemantauan kp ON kp.log_id = pt.log_id
        GROUP BY pt.log_id
      )
      SELECT 
        r.risiko_id AS id,
        r.no_rujukan,
        r.tahun, 
        r.separuh_tahun,
        s.nama_subsidiari,
        r.kategori AS kategori_risiko,
        r.risiko AS risiko,
        r.justifikasi_pindaan_penilaian,
        
        COALESCE(pt.skor_kebarangkalian_sebelum, r.skor_kebarangkalian) AS skor_kebarangkalian_sebelum,
        COALESCE(pt.skor_impak_sebelum, r.skor_impak) AS skor_impak_sebelum,
        pt.tahun_pemantauan,
        pt.separuh_tahun_pemantauan,
        bt.pelan_tindakan_terkini,
        bt.kakitangan_terkini,
        
        COALESCE(pt.status_pemantauan, 'Buka') AS status_pemantauan_terkini, 
        pt.catatan,
        pt.no_bil_kelulusan,
        pt.justifikasi_pindaan_pemantauan,
        
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_kebarangkalian_selepas ELSE NULL END AS skor_kebarangkalian_terkini,
        CASE WHEN pt.log_id IS NOT NULL THEN pt.skor_impak_selepas ELSE NULL END AS skor_impak_terkini,
        
        COALESCE(pt.skor_risiko_pemantauan, r.skor_risiko) AS skor_risiko_terkini

      FROM Risiko r
      JOIN RisikoAdaRawatan raw ON raw.risiko_id = r.risiko_id   
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      LEFT JOIN PemantauanTerkini pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN ButiranTerkini bt ON bt.log_id = pt.log_id
    `;

    const params = [];
    let whereClause = [];

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      params.push(user.subsidiari_id);
      whereClause.push(`CAST(r.subsidiari AS INTEGER) = $${params.length}`);
    } 
    else if (subsidiary && subsidiary !== 'all') {
      params.push(subsidiary); 
      whereClause.push(`CAST(r.subsidiari AS INTEGER) = $${params.length}`);
    }
    if (tahun && tahun !== 'all') {
      params.push(parseInt(tahun, 10));
      whereClause.push(`r.tahun = $${params.length}`);
    }
    if (separuhTahun && separuhTahun !== 'all') {
      params.push(parseInt(separuhTahun, 10));
      whereClause.push(`r.separuh_tahun = $${params.length}`);
    }
    if (whereClause.length > 0) {
      query += ` WHERE ${whereClause.join(" AND ")}`;
    }
    query += ` ORDER BY r.tahun DESC, r.separuh_tahun DESC, r.no_rujukan ASC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("❌ Ralat GET /laporan:", err);
    res.status(500).json({ message: "Gagal memuatkan data laporan: " + err.message });
  }
});

// =======================================================
// ⭐️ 2. GET: Data Penuh untuk Modal PDF
// ENDPOINT: /api/laporan/:risiko_id/data-penuh
// (⭐️ INI YANG DIKEMASKINI ⭐️)
// =======================================================
router.get("/:risiko_id/data-penuh", verifyToken, async (req, res) => {
  const { risiko_id } = req.params;
  const user = req.user;

  try {
    const query = `
      WITH 
      
      -- 1. Dapatkan Pelan Tindakan (Rawatan) Asal
      RawatanAsal AS (
        SELECT 
          rr.risiko_id,
          json_agg(
            json_build_object(
              -- 'tindakan' datang dari 'pelan_tindakan_rawatan'
              'tindakan', ptr.pelan_tindakan, 
              'jenis_kawalan', rr.jenis_kawalan,
              'tempoh_jangkaan', rr.tempoh_siap, -- 'tempoh_siap' dari rawatan.js
              'kakitangan_bertanggungjawab', (
                SELECT STRING_AGG(krr.nama_kakitangan, ', ') 
                FROM kakitangan_rawatan krr
                WHERE krr.rawatan_id = rr.rawatan_id 
              )
            )
          ) AS pelan_tindakan
        FROM rawatan_risiko rr
        LEFT JOIN pelan_tindakan_rawatan ptr ON ptr.rawatan_id = rr.rawatan_id
        WHERE rr.risiko_id = $1
        GROUP BY rr.risiko_id
      ),

      -- 2. Dapatkan SEMUA log pemantauan untuk risiko ini
      LogsTerkumpul AS (
        SELECT
          lp.risiko_id,
          json_agg(
            json_build_object(
              'tahun', lp.tahun_pemantauan,
              'separuh_tahun', lp.separuh_tahun_pemantauan,
              'label', 
                CASE lp.separuh_tahun_pemantauan
                  WHEN 1 THEN 'SEPARUH TAHUN PERTAMA (JAN - JUN) '
                  WHEN 2 THEN 'SEPARUH TAHUN KEDUA (JUL - DIS) '
                  ELSE 'LOG '
                END || lp.tahun_pemantauan,
              'kelulusan_log', lp.no_bil_kelulusan,
              'pindaan_keberkesanan', lp.justifikasi_pindaan_pemantauan,
              'pelan_tindakan', (
                SELECT STRING_AGG(ptp.butiran_aktiviti, E'\n') 
                FROM PelanTindakanPemantauan ptp 
                WHERE ptp.log_id = lp.log_id
              ),
              'kekerapan', lp.kekerapan_pemantauan,
              'kakitangan_bertanggungjawab', (
                SELECT STRING_AGG(kp.butiran_kakitangan, E'\n') 
                FROM KakitanganPemantauan kp 
                WHERE kp.log_id = lp.log_id
              ),
              'keberkesanan_tindakan', json_build_object(
                'skor_kebarangkalian', lp.skor_kebarangkalian_selepas,
                
                -- =================================================================
                -- ⭐️ PERUBAHAN 1: Huraian 'kebarangkalian' (berdasarkan gambar)
                -- =================================================================
                'kebarangkalian', CASE lp.skor_kebarangkalian_selepas
                  WHEN 1 THEN 'Hampir Tiada Kemungkinan'
                  WHEN 2 THEN 'Kemungkinan Rendah'
                  WHEN 3 THEN 'Berpeluang Untuk Berlaku'
                  WHEN 4 THEN 'Kemungkinan Tinggi'
                  WHEN 5 THEN 'Hampir Pasti'
                  ELSE 'N/A'
                END,
                
                'skor_impak', lp.skor_impak_selepas,
                
                -- =================================================================
                -- ⭐️ PERUBAHAN 2: Huraian 'impak' (berdasarkan gambar)
                -- =================================================================
                'impak', CASE lp.skor_impak_selepas
                  WHEN 1 THEN 'Tidak Ketara'
                  WHEN 2 THEN 'Boleh Diukur'
                  WHEN 3 THEN 'Ketara'
                  WHEN 4 THEN 'Besar'
                  WHEN 5 THEN 'Sangat Besar'
                  ELSE 'N/A'
                END,
                
                'skor_risiko', lp.skor_risiko_pemantauan,
                'keberkesanan', lp.keberkesanan,
                'status_pemantauan', lp.status_pemantauan
              )
            )
          ORDER BY lp.tahun_pemantauan ASC, lp.separuh_tahun_pemantauan ASC
          ) AS logs
        FROM LogPemantauan lp
        -- ⭐️ PERUBAHAN 3: JOIN ke Skala... dibuang
        WHERE lp.risiko_id = $1
        GROUP BY lp.risiko_id
      )

      -- 3. Gabungkan Semua Data (Jadual Utama Risiko)
      SELECT 
        r.risiko_id,
        s.nama_subsidiari AS subsidiary,
        r.tahun AS tahun_daftar,
        r.separuh_tahun AS separuh_tahun_daftar,
        r.bahagian AS bahagian_unit, 
        r.no_rujukan,
        r.kategori AS kategori_risiko,
        r.risiko AS title,
        ARRAY(SELECT punca FROM punca_risiko WHERE risiko_id=r.risiko_id) AS punca,
        ARRAY(SELECT kesan FROM kesan_risiko WHERE risiko_id=r.risiko_id) AS kesan,
        
        r.skor_kebarangkalian AS skor_kebarangkalian_n,
        -- =================================================================
        -- ⭐️ PERUBAHAN 4: Huraian 'kebarangkalian' ASAL (berdasarkan gambar)
        -- =================================================================
        CASE r.skor_kebarangkalian
          WHEN 1 THEN 'Hampir Tiada Kemungkinan'
          WHEN 2 THEN 'Kemungkinan Rendah'
          WHEN 3 THEN 'Berpeluang Untuk Berlaku'
          WHEN 4 THEN 'Kemungkinan Tinggi'
          WHEN 5 THEN 'Hampir Pasti'
          ELSE 'N/A'
        END AS kebarangkalian_lian, 
        
        r.skor_impak AS skor_impak_risiko,
        -- =================================================================
        -- ⭐️ PERUBAHAN 5: Huraian 'impak' ASAL (berdasarkan gambar)
        -- =================================================================
        CASE r.skor_impak
          WHEN 1 THEN 'Tidak Ketara'
          WHEN 2 THEN 'Boleh Diukur'
          WHEN 3 THEN 'Ketara'
          WHEN 4 THEN 'Besar'
          WHEN 5 THEN 'Sangat Besar'
          ELSE 'N/A'
        END AS impak, 
        
        r.skor_risiko, 
        r.status_risiko, 
        r.justifikasi_pindaan_penilaian AS pindaan_penilaian,
        
        COALESCE(ra.pelan_tindakan, '[]'::json) AS pelan_tindakan,
        COALESCE(lt.logs, '[]'::json) AS logs
        
      FROM Risiko r
      
      LEFT JOIN subsidiari s ON s.subsidiari_id = CAST(r.subsidiari AS INTEGER)
      -- ⭐️ PERUBAHAN 6: JOIN ke Skala... dibuang
      
      LEFT JOIN RawatanAsal ra ON ra.risiko_id = r.risiko_id
      LEFT JOIN LogsTerkumpul lt ON lt.risiko_id = r.risiko_id
      
      WHERE r.risiko_id = $1
    `;

    const { rows } = await pool.query(query, [risiko_id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Risiko tidak dijumpai." });
    }

    const riskData = rows[0];

    // Semakan keselamatan
    if (
      user.nama_subsidiari && 
      ["Staff", "Ketua Subsidiari"].includes(user.nama_peranan) &&
      riskData.subsidiary !== user.nama_subsidiari
    ) {
      return res.status(403).json({ message: "Akses tidak dibenarkan." });
    }

    res.json(riskData);
  } catch (err) {
    console.error(`❌ Ralat GET /laporan/${risiko_id}/data-penuh:`, err);
    res
      .status(500)
      .json({ message: "Gagal memuatkan data laporan penuh: " + err.message });
  }
});

export default router;