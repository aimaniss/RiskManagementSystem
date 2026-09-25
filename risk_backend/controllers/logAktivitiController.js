import pool from "../config/db.js";

// =======================================================
// GET /api/log_aktiviti -
// =======================================================
export const senaraiLogAktiviti = async (req, res) => {
  const { tarikhMula, tarikhAkhir, peranan, syarikat, aktiviti_teks } = req.query;

  const queryParams = [];
  const whereClauses = [];
  let paramIndex = 1;

  // Dasar: jangan papar log yang di-soft-delete
  whereClauses.push(`la.is_deleted = false`);

  // Staff & Ketua Subsidiari hanya melihat log pengguna syarikat sendiri
  if (["Staff", "Ketua Subsidiari"].includes(req.user.nama_peranan)) {
    whereClauses.push(`p.syarikat_id = $${paramIndex++}`);
    queryParams.push(req.user.syarikat_id);
  }

  if (tarikhMula) {
    whereClauses.push(`la.tarikh_masa >= $${paramIndex++}`);
    queryParams.push(tarikhMula);
  }
  if (tarikhAkhir) {
    const endDay = new Date(tarikhAkhir);
    endDay.setDate(endDay.getDate() + 1);
    whereClauses.push(`la.tarikh_masa < $${paramIndex++}`);
    queryParams.push(endDay.toISOString());
  }
  if (peranan) {
    whereClauses.push(`r.nama_peranan = $${paramIndex++}`);
    queryParams.push(peranan);
  }
  if (syarikat) {
    whereClauses.push(`s.nama_syarikat = $${paramIndex++}`);
    queryParams.push(syarikat);
  }
  if (aktiviti_teks) {
    whereClauses.push(`la.aktiviti ILIKE $${paramIndex++}`);
    queryParams.push(`%${aktiviti_teks}%`);
  }

  // Query
  let sqlQuery = `
    SELECT
      la.id AS log_id,
      p.pengguna_id AS user_id,
      p.staff_id,
      p.nama_penuh AS nama_pengguna,
      r.nama_peranan AS peranan_pengguna,
      s.nama_syarikat AS syarikat,
      la.aktiviti,
      la.ringkasan,
      la.perincian,
      la.tarikh_masa
    FROM log_aktiviti la
    JOIN pengguna p ON la.pengguna_id = p.pengguna_id
    JOIN peranan r ON p.peranan_id = r.peranan_id
    JOIN syarikat s ON p.syarikat_id = s.syarikat_id
  `;

  if (whereClauses.length > 0) {
    sqlQuery += ` WHERE ${whereClauses.join(" AND ")}`;
  }
  sqlQuery += ` ORDER BY la.tarikh_masa DESC;`;

  try {
    const { rows } = await pool.query(sqlQuery, queryParams);
    res.status(200).json(rows);
  } catch (err) {
    console.error("Ralat semasa mengambil log aktiviti:", err);
    res.status(500).json({ error: "Gagal mengambil data log dari server." });
  }
};

// =======================================================
// DELETE /api/log_aktiviti/:id - (Soft-delete )
// =======================================================
// Kebenaran 'log:padam' (Admin sahaja dalam matriks)
export const padamLogAktiviti = async (req, res) => {
  const { id } = req.params;

  try {
    const { rowCount } = await pool.query(
      `UPDATE log_aktiviti SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND is_deleted = false`,
      [id]
    );

    if (rowCount === 0) {
      return res.status(404).json({ error: "Log tidak dijumpai." });
    }

    res.status(200).json({ message: "Log berjaya dipadam." });
  } catch (err) {
    console.error("Ralat semasa memadam log:", err);
    res.status(500).json({ error: "Gagal memadam log dari server." });
  }
};

// =======================================================
// DELETE /api/log_aktiviti/ (Soft-delete Julat Tarikh )
// =======================================================
export const padamLogAktivitiPukal = async (req, res) => {
  // Ambil dari 'query parameters'
  const { tarikhMula, tarikhAkhir } = req.query;

  if (!tarikhMula || !tarikhAkhir) {
    return res.status(400).json({ error: "Tarikh mula dan tarikh akhir diperlukan." });
  }

  try {
    // Sediakan tarikh akhir (+1 hari)
    const endDay = new Date(tarikhAkhir);
    endDay.setDate(endDay.getDate() + 1);

    const { rowCount } = await pool.query(
      `UPDATE log_aktiviti SET is_deleted = true, deleted_at = NOW() WHERE tarikh_masa >= $1 AND tarikh_masa < $2 AND is_deleted = false`,
      [tarikhMula, endDay.toISOString()]
    );

    res.status(200).json({ message: `Padam berjaya. ${rowCount} rekod log telah dipadam.` });
  } catch (err) {
    console.error("Ralat semasa memadam log mengikut julat:", err);
    res.status(500).json({ error: "Gagal memadam log dari server." });
  }
};
