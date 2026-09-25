import pool from "../config/db.js";

export const senaraiPeranan = async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM peranan ORDER BY peranan_id");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
