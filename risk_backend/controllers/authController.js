import pool from "../config/db.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  const { staff_id, katalaluan } = req.body;

  try {
    const { rows } = await pool.query(
      `SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan, 
              u.peranan_id, u.subsidiari_id, p.nama_peranan
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       WHERE u.staff_id = $1`,
      [staff_id]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: "Invalid Staff ID or password" });

    // Plain text check
    if (katalaluan !== user.katalaluan) 
      return res.status(401).json({ error: "Invalid Staff ID or password" });

    const token = jwt.sign(
      {
        pengguna_id: user.pengguna_id,
        staff_id: user.staff_id,
        peranan_id: user.peranan_id,
        nama_peranan: user.nama_peranan,
        subsidiari_id: user.subsidiari_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token, user: { nama: user.nama_penuh, peranan: user.nama_peranan } });
  } catch (err) {
    console.error("Login error:", err.message); // log actual error
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
