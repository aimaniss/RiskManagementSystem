import pool from "../config/db.js";

export const senaraiSyarikat = async (req, res) => {
  try {
    const userRole = req.user.nama_peranan; // ambil nama peranan dari JWT
    const userSyarikat = req.user.syarikat_id;

    let query = "SELECT * FROM syarikat";
    let params = [];

    if (userRole === "Staff" || userRole === "Ketua Subsidiari") {
      query += " WHERE syarikat_id = $1";
      params.push(userSyarikat);
    }

    query += " ORDER BY syarikat_id";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
