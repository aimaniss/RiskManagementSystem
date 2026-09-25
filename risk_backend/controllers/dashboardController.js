import pool from "../config/db.js";

// === HELPER: Mapping skor_risiko (ST/T/S/R) ke label penuh ===
const getSkorRisikoLabel = (shortCode) => {
  const mapping = {
    ST: "Sangat Tinggi",
    T: "Tinggi",
    S: "Sederhana",
    R: "Rendah",
    "N/A": "Belum Dinilai", // Untuk risiko null
  };
  return mapping[shortCode] || shortCode;
};

// GET /api/dashboard?syarikat_id=Semua OR ?syarikat_id=<id>
export const dapatkanDashboard = async (req, res) => {
  try {
    const { syarikat_id } = req.query;
    const user = req.user;

    console.log("Dashboard Request:", { syarikat_id, user_role: user.nama_peranan });

    // === 1. WHERE clause ===
    // 'whereClause' ini HANYA menapis syarikat, BUKAN status
    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Syarat asas: jangan kira risiko yang di-soft-delete
    whereConditions.push(`r.is_deleted = false`);

    // Syarat 1: Tapisan Syarikat
    if (["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)) {
      whereConditions.push(`r.syarikat_id::integer = $${paramIndex++}`);
      params.push(user.syarikat_id);
    } else if (syarikat_id && syarikat_id !== "Semua") {
      whereConditions.push(`r.syarikat_id::integer = $${paramIndex++}`);
      params.push(parseInt(syarikat_id));
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";

    // === 2. QUERY UTAMA (Untuk Carta) ===
    // Query ini mengambil SEMUA status, yang sepadan dengan logik 'whereClause'
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
        WHERE pm.is_deleted = false
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
        WHERE rr.is_deleted = false
      )
      SELECT
        r.risiko_id,
        r.no_rujukan,
        r.risiko AS nama_risiko,
        r.syarikat_id::integer AS syarikat_id,
        r.kategori,
        r.bahagian,

        r.skor_risiko AS skor_risiko_asal,
        r.skor_kebarangkalian,
        r.skor_impak,
        r.tahun,
        r.separuh_tahun,

        COALESCE(lt.status_pemantauan, 'Buka') AS status_pemantauan,
        COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko) AS skor_risiko_terkini,
        rt.jenis_kawalan,
        CASE WHEN lt.risiko_id IS NULL THEN true ELSE false END AS tiada_log

      FROM risiko r
      LEFT JOIN LogTerkini lt ON lt.risiko_id = r.risiko_id AND lt.rn = 1
      LEFT JOIN RawatanTerkini rt ON rt.risiko_id = r.risiko_id AND rt.rn = 1
      ${whereClause}
      ORDER BY r.risiko_id
    `;

    const { rows: risikoData } = await pool.query(mainQuery, params);

    console.log(`Total risiko (SEMUA STATUS): ${risikoData.length}`);

    // Debug
    const risikoTanpaLog = risikoData.filter((r) => r.tiada_log);
    if (risikoTanpaLog.length > 0) {
      console.log(`Risiko tanpa log: ${risikoTanpaLog.length}`);
      console.log("   ID:", risikoTanpaLog.map((r) => r.risiko_id).join(", "));
    }

    // === 3. Inisialisasi pengira ===
    const skor = {
      jumlahBuka: 0,
      jumlahLaksana: 0,
      jumlahPantau: 0,
      jumlahSelesai: 0,
      jumlahTutup: 0,
    };

    // 'tahapRisikoCount' dan 'kategoriRisikoCount' kini mengira SEMUA STATUS
    const tahapRisikoCount = {
      ST: 0,
      T: 0,
      S: 0,
      R: 0,
      "N/A": 0,
    };

    // Kategori diurus dalam Tetapan Sistem; termasuk yang tidak aktif supaya
    // risiko lama masih dikira dalam kategori asalnya.
    const { rows: senaraiKategori } = await pool.query(
      `SELECT nilai FROM senarai_rujukan
        WHERE jenis = 'kategori_risiko' AND is_deleted = false
        ORDER BY susunan, nilai`
    );
    const kategoriRisikoCount = Object.fromEntries(senaraiKategori.map((k) => [k.nilai, 0]));
    kategoriRisikoCount["Lain-lain / Tiada"] = 0;

    const jenisKawalanCount = {
      Terima: 0,
      Kurang: 0,
      Elak: 0,
      Pindah: 0,
      "Tiada Rawatan": 0,
    };

    // === 4. Loop pengiraan ===
    // 'risikoData' kini mengandungi SEMUA risiko
    for (const row of risikoData) {
      // 4a. Kira semua status (termasuk 'Tutup')
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
          break; // <-- Risiko 'Rendah' anda akan dikira di sini
        default:
          console.warn(`Status tidak dikenali: "${status}" (risiko ${row.risiko_id})`);
          skor.jumlahBuka++;
      }

      // 4b. Tahap Risiko (Kira semua status)
      const skorRisiko = row.skor_risiko_terkini;
      if (!skorRisiko || skorRisiko === "null") {
        tahapRisikoCount["N/A"]++;
      } else if (tahapRisikoCount[skorRisiko] !== undefined) {
        tahapRisikoCount[skorRisiko]++; // <-- Risiko 'Rendah' anda akan dikira di sini
      } else {
        console.warn(`Kod skor tidak dikenali: "${skorRisiko}" (risiko ${row.risiko_id})`);
      }

      // 4c. Kategori (Kira semua status)
      const kategori = row.kategori;
      if (kategori && kategoriRisikoCount[kategori] !== undefined) {
        kategoriRisikoCount[kategori]++;
      } else {
        kategoriRisikoCount["Lain-lain / Tiada"]++;
        if (kategori) {
          console.warn(
            `Kategori tidak dikenali: "${kategori}" (risiko ${row.risiko_id}). Dikira sebagai 'Lain-lain / Tiada'.`
          );
        }
      }

      // 4d. Jenis Kawalan (Kira semua status)
      const jenis = row.jenis_kawalan;
      if (jenis && jenisKawalanCount[jenis] !== undefined) {
        jenisKawalanCount[jenis]++;
      } else {
        jenisKawalanCount["Tiada Rawatan"]++;
      }
    }

    // === 5. Log debugging ===
    console.log("Skor Status (Semua Status):", skor);
    console.log("Tahap Risiko (Semua Status):", tahapRisikoCount);

    // === 6. Format data carta dengan label penuh ===
    const tahapRisikoData = Object.entries(tahapRisikoCount)
      .filter(([_, value]) => value > 0)
      .map(([shortCode, value]) => ({
        name: getSkorRisikoLabel(shortCode),
        value,
      }));

    const kategoriRisikoData = Object.entries(kategoriRisikoCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    const jenisKawalanData = Object.entries(jenisKawalanCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // === 6b. Data tambahan: Trend pendaftaran risiko per tahun ===
    const tahunCount = {};
    for (const row of risikoData) {
      const t = row.tahun ? String(row.tahun) : null;
      if (t) tahunCount[t] = (tahunCount[t] || 0) + 1;
    }
    const trendData = Object.entries(tahunCount)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([tahun, jumlah]) => ({ name: tahun, value: jumlah }));

    // === 6c. Risiko aktif yang perlu perhatian (skor T/ST, belum Tutup) ===
    const risikoPerhatian = risikoData.filter(
      (r) =>
        ["Buka", "Sedang Dilaksanakan", "Pemantauan"].includes(r.status_pemantauan) &&
        ["T", "ST"].includes(String(r.skor_risiko_terkini))
    ).length;

    // === 6d. Belum dinilai (aktif sahaja) ===
    const belumDinilaiAktif = risikoData.filter(
      (r) =>
        ["Buka", "Sedang Dilaksanakan", "Pemantauan"].includes(r.status_pemantauan) &&
        (!r.skor_risiko_terkini || r.skor_risiko_terkini === "null")
    ).length;

    // === 7. Top Risks (Untuk Jadual) ===
    // Query ini kini akan memaparkan SEMUA risiko, selari dengan carta
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
        WHERE pm.is_deleted = false
      )
      SELECT
        r.no_rujukan AS "noRujukan",
        r.risiko AS nama,
        r.kategori,
        r.bahagian,
        COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko) AS skor_risiko_terkini,
        COALESCE(lt.status_pemantauan, 'Buka') AS status_pemantauan
      FROM risiko r
      LEFT JOIN LogTerkini lt ON lt.risiko_id = r.risiko_id AND lt.rn = 1
      ${whereClause}

      ORDER BY
        CASE COALESCE(lt.skor_risiko_pemantauan, r.skor_risiko)
          WHEN 'ST' THEN 1
          WHEN 'T' THEN 2
          WHEN 'S' THEN 3
          WHEN 'R' THEN 4
          ELSE 5
        END,
        r.risiko_id DESC
      LIMIT 6
    `;

    const { rows: topRisks } = await pool.query(topRisksQuery, params);

    // Format skor sebelum hantar ke frontend
    const formattedTopRisks = topRisks.map((risk) => ({
      ...risk,
      skor_risiko_terkini: getSkorRisikoLabel(risk.skor_risiko_terkini),
    }));

    // === 7b. Perbandingan risiko antara syarikat (untuk admin, paparan "Semua") ===
    let risikoSyarikat = null;
    const isStaffLevel = ["Staff", "Ketua Subsidiari"].includes(user.nama_peranan);
    if (!isStaffLevel && (!syarikat_id || syarikat_id === "Semua")) {
      const perSyarikatQuery = `
        WITH LogTerkini AS (
          SELECT
            pm.risiko_id,
            pm.status_pemantauan,
            ROW_NUMBER() OVER (
              PARTITION BY pm.risiko_id
              ORDER BY pm.tahun_pemantauan DESC,
                       pm.separuh_tahun_pemantauan DESC,
                       pm.tarikh_pemantauan DESC NULLS LAST
            ) AS rn
          FROM LogPemantauan pm
          WHERE pm.is_deleted = false
        )
        SELECT
          s.syarikat_id,
          s.nama_syarikat,
          COALESCE(s.singkatan, s.nama_syarikat) AS label,
          COUNT(DISTINCT r.risiko_id)::int AS jumlah,
          COUNT(DISTINCT CASE WHEN COALESCE(lt.status_pemantauan, 'Buka') <> 'Tutup' THEN r.risiko_id END)::int AS aktif,
          COUNT(DISTINCT CASE WHEN COALESCE(lt.status_pemantauan, 'Buka') = 'Tutup' THEN r.risiko_id END)::int AS tutup
        FROM syarikat s
        LEFT JOIN risiko r ON r.syarikat_id::integer = s.syarikat_id AND r.is_deleted = false
        LEFT JOIN LogTerkini lt ON lt.risiko_id = r.risiko_id AND lt.rn = 1
        GROUP BY s.syarikat_id, s.nama_syarikat, label
        ORDER BY jumlah DESC
      `;
      const { rows: syarikatRows } = await pool.query(perSyarikatQuery);
      risikoSyarikat = syarikatRows;
    }

    // === 8. Nama & logo syarikat ===
    let namaSyarikat = "Keseluruhan";
    let logoUrl = null;

    if (syarikat_id && syarikat_id !== "Semua") {
      const idToQuery = ["Staff", "Ketua Subsidiari"].includes(user.nama_peranan)
        ? user.syarikat_id
        : parseInt(syarikat_id);

      const { rows: syarikatInfo } = await pool.query(
        "SELECT nama_syarikat, light_logo_url FROM syarikat WHERE syarikat_id = $1",
        [idToQuery]
      );

      if (syarikatInfo.length > 0) {
        namaSyarikat = syarikatInfo[0].nama_syarikat;
        logoUrl = syarikatInfo[0].light_logo_url;
      }
    }

    // === 9. Response ===
    res.json({
      skor,
      tahapRisikoData,
      kategoriRisikoData,
      jenisKawalanData,
      topRisks: formattedTopRisks,
      namaSyarikat,
      logoUrl,
      trendData,
      risikoPerhatian,
      belumDinilaiAktif,
      risikoSyarikat,
      debug: {
        totalRisiko: risikoData.length,
        risikoTanpaLog: risikoTanpaLog.length,
      },
    });
  } catch (err) {
    console.error("Ralat GET /api/dashboard:", err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};
