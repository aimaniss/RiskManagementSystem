// middleware/aksesSyarikat.js — Pengasingan data syarikat untuk peranan terhad.
// Staff & Ketua Subsidiari hanya boleh membaca/menulis rekod risiko syarikat
// sendiri. Admin, Executive & Viewer tidak disekat di sini.
// Guna SELEPAS verifyToken + authorizeKebenaran:
//   router.put("/:rawatan_id", verifyToken, authorizeKebenaran("rawatan:urus"),
//     hadSyarikat(["rawatan", (req) => req.params.rawatan_id]), handler);
import pool from "../config/db.js";

const PERANAN_TERHAD = ["Staff", "Ketua Subsidiari"];

// Setiap jenis rekod dipetakan kepada syarikat_id risiko induknya
const QUERY_SYARIKAT = {
  risiko: "SELECT syarikat_id FROM risiko WHERE risiko_id = $1 AND is_deleted = false",
  rawatan: `SELECT r.syarikat_id FROM rawatan_risiko rr
              JOIN risiko r ON r.risiko_id = rr.risiko_id
             WHERE rr.rawatan_id = $1 AND rr.is_deleted = false`,
  log: `SELECT r.syarikat_id FROM LogPemantauan lp
          JOIN risiko r ON r.risiko_id = lp.risiko_id
         WHERE lp.log_id = $1 AND lp.is_deleted = false`,
};

// 22P02 = format ID tidak sah (cth. UUID rosak) -> anggap rekod tiada
const KOD_ID_TIDAK_SAH = "22P02";

/**
 * @param {...[keyof QUERY_SYARIKAT, (req) => any]} semakan
 *   Pasangan [jenis rekod, fungsi mengambil ID]. Semua mesti lulus.
 *   ID kosong atau rekod tidak wujud dilepaskan supaya handler memulangkan
 *   400/404 seperti biasa.
 */
export const hadSyarikat = (...semakan) => {
  return async (req, res, next) => {
    if (!PERANAN_TERHAD.includes(req.user?.nama_peranan)) return next();

    try {
      for (const [jenis, ambilId] of semakan) {
        const id = ambilId(req);
        if (id === undefined || id === null || id === "") continue;

        let rows;
        try {
          ({ rows } = await pool.query(QUERY_SYARIKAT[jenis], [id]));
        } catch (err) {
          if (err.code === KOD_ID_TIDAK_SAH) continue;
          throw err;
        }
        if (rows[0] && Number(rows[0].syarikat_id) !== Number(req.user.syarikat_id)) {
          return res.status(403).json({ error: "Akses ditolak. Rekod ini milik syarikat lain." });
        }
      }
      next();
    } catch (err) {
      console.error("Ralat semakan akses syarikat:", err);
      res.status(500).json({ error: "Gagal mengesahkan akses syarikat." });
    }
  };
};
