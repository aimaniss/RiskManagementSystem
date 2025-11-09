import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// === HELPER: Mapping skor_risiko (ST/T/S/R) ke label penuh ===
const getSkorRisikoLabel = (shortCode) => {
  const mapping = {
    'ST': 'Sangat Tinggi',
    'T': 'Tinggi',
    'S': 'Sederhana',
    'R': 'Rendah',
    'N/A': 'Belum Dinilai' // Untuk risiko null
  };
  return mapping[shortCode] || shortCode;
};

// GET /api/dashboard?subsidiari_id=Semua OR ?subsidiari_id=<id>
router.get("/", verifyToken, async (req, res) => {
  try {
    const { subsidiari_id } = req.query;
    const user = req.user;

    console.log("📊 Dashboard Request:", { subsidiari_id, user_role: user.nama_peranan });

    // === 1. WHERE clause ===
    let whereClause = "";
    let params = [];

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      whereClause = "WHERE r.subsidiari::integer = $1";
      params.push(user.subsidiari_id);
    } else if (subsidiari_id && subsidiari_id !== "Semua") {
      whereClause = "WHERE r.subsidiari::integer = $1";
      params.push(parseInt(subsidiari_id));
    }

    // === 2. QUERY UTAMA ===
    const mainQuery = `
      WITH LogTerkini AS (
        SELECT
          pm.risiko_id,
          pm.status_pemantauan,
          pm.skor_kebarangkalian_selepas,
          pm.skor_impak_selepas,
          pm.skor_risiko_pemantauan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id
            ORDER BY pm.tahun_pemantauan DESC, 
                     pm.separuh_tahun_pemantauan DESC,
                     pm.tarikh_pemantauan DESC NULLS LAST
          ) AS rn
        FROM LogPemantauan pm
      ),
      RawatanTerkini AS (
        SELECT
          rr.risiko_id,
          rr.jenis_kawalan,
          ROW_NUMBER() OVER (
            PARTITION BY rr.risiko_id
            ORDER BY rr.rawatan_id DESC
          ) AS rn
        FROM rawatan_risiko rr
      )
      SELECT
        r.risiko_id,
        r.no_rujukan,
        r.risiko AS nama_risiko,
        r.subsidiari::integer AS subsidiari_id,
        r.kategori,
        r.bahagian,
        
        r.skor_risiko AS skor_risiko_asal,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.tahun,
        r.separuh_tahun,
        
        -- Status pemantauan (default 'Buka')
        COALESCE(lt.status_pemantauan, 'Buka') AS status_pemantauan,
        
        -- ⭐ PENTING: Ambil skor_risiko terkini (dari log jika ada, kalau tidak dari risiko)
        COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko) AS skor_risiko_terkini,
        
        -- Jenis kawalan
        rt.jenis_kawalan,
        
        -- Debug flag
        CASE WHEN lt.risiko_id IS NULL THEN true ELSE false END AS tiada_log

      FROM risiko r
      LEFT JOIN LogTerkini lt ON lt.risiko_id = r.risiko_id AND lt.rn = 1
      LEFT JOIN RawatanTerkini rt ON rt.risiko_id = r.risiko_id AND rt.rn = 1
      ${whereClause}
      ORDER BY r.risiko_id
    `;

    const { rows: risikoData } = await pool.query(mainQuery, params);

    console.log(`✅ Total risiko: ${risikoData.length}`);
    
    // Debug
    const risikoTanpaLog = risikoData.filter(r => r.tiada_log);
    if (risikoTanpaLog.length > 0) {
      console.log(`⚠️ Risiko tanpa log: ${risikoTanpaLog.length}`);
      console.log("   ID:", risikoTanpaLog.map(r => r.risiko_id).join(", "));
    }

    // === 3. Inisialisasi pengira ===
    const skor = {
      jumlahBuka: 0,
      jumlahLaksana: 0,
      jumlahPantau: 0,
      jumlahSelesai: 0,
      jumlahTutup: 0,
    };

    const tahapRisikoCount = {
      "ST": 0,  // Sangat Tinggi
      "T": 0,   // Tinggi
      "S": 0,   // Sederhana
      "R": 0,   // Rendah
      "N/A": 0  // Untuk "Belum Dinilai"
    };

    const kategoriRisikoCount = {
      "Strategik": 0,
      "Operasi": 0,
      "Pematuhan / Perundangan": 0,
      "Kewangan": 0,
      "Lain-lain / Tiada": 0 // <-- DIUBAH: Untuk kategori null
    };

    const jenisKawalanCount = {
      "Terima": 0,
      "Kurang": 0,
      "Elak": 0,
      "Pindah": 0,
      "Tiada Rawatan": 0
    };

    // === 4. Loop pengiraan ===
    for (const row of risikoData) {
      // 4a. Status Pemantauan
      const status = row.status_pemantauan;
      
      switch (status) {
        case "Buka":
          skor.jumlahBuka++;
          break;
        case "Sedang Dilaksanakan":
          skor.jumlahLaksana++;
          break;
        case "Pemantauan":
          skor.jumlahPantau++;
          break;
        case "Selesai":
          skor.jumlahSelesai++;
          break;
        case "Tutup":
          skor.jumlahTutup++;
          break;
        default:
          console.warn(`⚠️ Status tidak dikenali: "${status}" (risiko ${row.risiko_id})`);
          skor.jumlahBuka++;
      }

      // 4b. Tahap Risiko
      const skorRisiko = row.skor_risiko_terkini;
      
      if (!skorRisiko || skorRisiko === "null") {
        tahapRisikoCount["N/A"]++; 
        console.info(`ℹ️ Risiko ${row.risiko_id} dikira sebagai 'Belum Dinilai'.`);
      } else if (tahapRisikoCount[skorRisiko] !== undefined) {
        tahapRisikoCount[skorRisiko]++;
      } else {
        console.warn(`⚠️ Kod skor tidak dikenali: "${skorRisiko}" (risiko ${row.risiko_id})`);
      }

      // 4c. Kategori
      // --- BLOK INI TELAH DIBETULKAN ---
      const kategori = row.kategori;
      if (kategori && kategoriRisikoCount[kategori] !== undefined) {
        kategoriRisikoCount[kategori]++;
      } else {
        // Jika kategori null, atau tidak dikenali, kira di bawah 'Lain-lain / Tiada'
        kategoriRisikoCount["Lain-lain / Tiada"]++;
        
        if (kategori) { // Hanya log amaran jika ia nilai tidak dikenali (bukan null)
          console.warn(`⚠️ Kategori tidak dikenali: "${kategori}" (risiko ${row.risiko_id}). Dikira sebagai 'Lain-lain / Tiada'.`);
        }
      }

      // 4d. Jenis Kawalan
      const jenis = row.jenis_kawalan;
      if (jenis && jenisKawalanCount[jenis] !== undefined) {
        jenisKawalanCount[jenis]++;
      } else {
        jenisKawalanCount["Tiada Rawatan"]++;
      }
    }

    // === 5. Log debugging ===
    console.log("📊 Skor Status:", skor);
    console.log("📊 Tahap Risiko (short code):", tahapRisikoCount);
    console.log("📊 Kategori:", kategoriRisikoCount);
    console.log("📊 Jenis Kawalan:", jenisKawalanCount);

    // === 6. Format data carta dengan label penuh ===
    const tahapRisikoData = Object.entries(tahapRisikoCount)
      .filter(([_, value]) => value > 0)
      .map(([shortCode, value]) => ({
        name: getSkorRisikoLabel(shortCode),
        value
      }));

    const kategoriRisikoData = Object.entries(kategoriRisikoCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const jenisKawalanData = Object.entries(jenisKawalanCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // === 7. Top Risks ===
    const topRisksQuery = `
      WITH LogTerkini AS (
        SELECT
          pm.risiko_id,
          pm.status_pemantauan,
          pm.skor_risiko_pemantauan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id
            ORDER BY pm.tahun_pemantauan DESC,
                     pm.separuh_tahun_pemantauan DESC,
                     pm.tarikh_pemantauan DESC NULLS LAST
          ) AS rn
        FROM LogPemantauan pm
      )
      SELECT
        r.no_rujukan AS "noRujukan",
        r.risiko AS nama,
        r.kategori,
        r.bahagian,
        COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko) AS skor_risiko_terkini
      FROM risiko r
      LEFT JOIN LogTerkini lt ON lt.risiko_id = r.risiko_id AND lt.rn = 1
      ${whereClause}
        AND COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko) IN ('T', 'ST')
        AND COALESCE(lt.status_pemantauan, 'Buka') = 'Buka'
      ORDER BY 
        CASE COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko)
          WHEN 'ST' THEN 1
          WHEN 'T' THEN 2
          WHEN 'S' THEN 3
          WHEN 'R' THEN 4
          ELSE 5
        END,
        r.risiko_id DESC
      LIMIT 5
    `;

    const { rows: topRisks } = await pool.query(topRisksQuery, params);

    // === 8. Nama & logo subsidiari ===
    let namaSubsidiari = "Keseluruhan";
    let logoUrl = null;

    if (subsidiari_id && subsidiari_id !== "Semua") {
      const idToQuery = ["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)
        ? user.subsidiari_id
        : parseInt(subsidiari_id);

      const { rows: subsidiariInfo } = await pool.query(
        "SELECT nama_subsidiari, light_logo_url FROM subsidiari WHERE subsidiari_id = $1",
        [idToQuery]
      );

      if (subsidiariInfo.length > 0) {
        namaSubsidiari = subsidiariInfo[0].nama_subsidiari;
        logoUrl = subsidiariInfo[0].light_logo_url;
      }
    }

    // === 9. Response ===
    res.json({
      skor,
      tahapRisikoData,
      kategoriRisikoData,
      jenisKawalanData,
      topRisks,
      namaSubsidiari,
      logoUrl,
      debug: {
        totalRisiko: risikoData.length,
        risikoTanpaLog: risikoTanpaLog.length,
      }
    });

  } catch (err) {
    console.error("❌ Ralat GET /api/dashboard:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;