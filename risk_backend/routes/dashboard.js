import express from "express";
import pool from "../config/db.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/dashboard?subsidiari_id=Semua OR ?subsidiari_id=<id>
router.get("/", verifyToken, async (req, res) => {
  try {
    const { subsidiari_id } = req.query;
    const user = req.user;

    // === 1. Base query untuk semua risiko dengan status pemantauan terkini ===
    const baseQuery = `
      WITH PemantauanTerkini AS (
        SELECT
          pm.risiko_id,
          pm.status_pemantauan,
          ROW_NUMBER() OVER (
            PARTITION BY pm.risiko_id
            ORDER BY pm.tahun_pemantauan DESC, pm.tarikh_pemantauan DESC
          ) AS rn
        FROM LogPemantauan pm
      )
      SELECT
        r.risiko_id,
        r.no_rujukan,
        r.risiko AS nama,
        r.subsidiari AS subsidiari_id,
        r.kategori,
        r.status_risiko AS tahap_risiko,
        rr.jenis_kawalan,
        pt.status_pemantauan,
        r.bahagian
      FROM risiko r
      LEFT JOIN PemantauanTerkini pt
        ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      LEFT JOIN rawatan_risiko rr
        ON rr.risiko_id = r.risiko_id
    `;

    // === 2. Filter berdasarkan subsidiari ===
    let whereClause = "";
    let params = [];

    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      // Staff & Ketua Subsidiari: paksa subsidiari mereka sahaja
      whereClause = " WHERE r.subsidiari::integer = $1";
      params.push(user.subsidiari_id);
    } else if (subsidiari_id && subsidiari_id !== "Semua") {
      // Admin/Exec, subsidiari spesifik
      whereClause = " WHERE r.subsidiari::integer = $1";
      params.push(subsidiari_id);
    }
    // Jika "Semua", whereClause tetap kosong (ambil semua)

    // === 3. Query risiko ===
    const { rows: risikoData } = await pool.query(baseQuery + whereClause, params);

    // === 4. Proses skor status ===
    const skor = {
      jumlahBuka: 0,
      jumlahLaksana: 0,
      jumlahPantau: 0,
      jumlahSelesai: 0,
      jumlahTutup: 0,
    };

    const tahapRisikoMap = new Map();
    const kategoriRisikoMap = new Map();
    const jenisKawalanMap = new Map();

    for (const row of risikoData) {
      switch (row.status_pemantauan) {
        case "Buka": skor.jumlahBuka++; break;
        case "Sedang Dilaksanakan": skor.jumlahLaksana++; break;
        case "Pemantauan": skor.jumlahPantau++; break;
        case "Selesai": skor.jumlahSelesai++; break;
        case "Tutup": skor.jumlahTutup++; break;
      }

      tahapRisikoMap.set(row.risiko_id, row.tahap_risiko);
      kategoriRisikoMap.set(row.risiko_id, row.kategori);
      jenisKawalanMap.set(row.risiko_id, row.jenis_kawalan);
    }

    // === 5. Data carta ===
    const tahapRisikoCount = { Tinggi: 0, Sederhana: 0, Rendah: 0, "Sangat Tinggi": 0 };
    tahapRisikoMap.forEach(t => { if (tahapRisikoCount[t] !== undefined) tahapRisikoCount[t]++; });

    const kategoriRisikoCount = { Strategik: 0, Operasi: 0, "Pematuhan / Perundangan": 0, Kewangan: 0 };
    kategoriRisikoMap.forEach(k => { if (kategoriRisikoCount[k] !== undefined) kategoriRisikoCount[k]++; });

    const jenisKawalanCount = { Berkesan: 0, "Kurang Berkesan": 0 };
    jenisKawalanMap.forEach(j => {
      if (j === "Terima") jenisKawalanCount.Berkesan++;
      if (j === "Kurang") jenisKawalanCount["Kurang Berkesan"]++;
    });

    const tahapRisikoData = Object.entries(tahapRisikoCount).map(([name, value]) => ({ name, value }));
    const kategoriRisikoData = Object.entries(kategoriRisikoCount).map(([name, value]) => ({ name, value }));
    const jenisKawalanData = Object.entries(jenisKawalanCount).map(([name, value]) => ({ name, value }));

    // === 6. Top Risks ===
    let topRisksQuery = `
      SELECT r.no_rujukan, r.risiko AS nama, r.kategori, r.bahagian
      FROM risiko r
      LEFT JOIN (
        SELECT risiko_id, status_pemantauan,
               ROW_NUMBER() OVER (PARTITION BY risiko_id ORDER BY tahun_pemantauan DESC) as rn
        FROM LogPemantauan
      ) pt ON pt.risiko_id = r.risiko_id AND pt.rn = 1
      ${whereClause}
      AND r.status_risiko IN ('Tinggi','Sangat Tinggi')
      AND (pt.status_pemantauan = 'Buka' OR pt.status_pemantauan IS NULL)
      ORDER BY r.skor_risiko DESC
      LIMIT 5
    `;
    const { rows: topRisks } = await pool.query(topRisksQuery, params);

    // === 7. Nama & logo subsidiari ===
    let namaSubsidiari = "Keseluruhan";
    let logoUrl = null;

    if (subsidiari_id && subsidiari_id !== "Semua") {
      let idToQuery = ["Staff","Ketua Subsidiari"].includes(user.nama_peranan) ? user.subsidiari_id : subsidiari_id;
      const { rows: subsidiariInfo } = await pool.query(
        "SELECT nama_subsidiari, light_logo_url FROM subsidiari WHERE subsidiari_id = $1",
        [idToQuery]
      );
      if (subsidiariInfo.length > 0) {
        namaSubsidiari = subsidiariInfo[0].nama_subsidiari;
        logoUrl = subsidiariInfo[0].light_logo_url;
      }
    }

    // === 8. Return response ===
    res.json({
      skor,
      tahapRisikoData,
      kategoriRisikoData,
      jenisKawalanData,
      topRisks,
      namaSubsidiari,
      logoUrl,
    });

  } catch (err) {
    console.error("Ralat GET /api/dashboard:", err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
