import pool from "../config/db.js";

export const senaraiTahun = async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT DISTINCT tahun FROM risiko WHERE is_deleted = false ORDER BY tahun DESC"
    );
    res.json(rows.map((r) => r.tahun));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};
