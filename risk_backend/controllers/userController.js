// controllers/userController.js — Logik URUS PENGGUNA (CRUD + profil sendiri)
import pool from "../config/db.js";
import { dalamTransaksi } from "../utils/transaksi.js";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import {
  hashKatalaluan,
  sahkanKatalaluan,
  semakPolisiKatalaluan,
  janaKatalaluanSementara,
} from "../utils/katalaluan.js";
import { dapatkanKebenaranPeranan } from "../middleware/authMiddleware.js";
import { PERANAN_TERHAD } from "../middleware/aksesSyarikat.js";

// Query JOIN pengguna yang SERAGAM (tidak termasuk katalaluan)
const USER_SELECT = `
  SELECT u.pengguna_id, u.staff_id, u.nama_penuh,
         u.syarikat_id, p.peranan_id, p.nama_peranan,
         s.nama_syarikat, s.singkatan AS singkatan_syarikat,
         u.is_aktif, u.perlu_tukar_katalaluan, u.log_masuk_terakhir,
         u.katalaluan_dikemaskini_at,
         (u.dikunci_hingga IS NOT NULL AND u.dikunci_hingga > NOW()) AS dikunci,
         CASE WHEN u.gambar_profil IS NOT NULL THEN encode(u.gambar_profil,'base64') END AS profile_pic
  FROM pengguna u
  JOIN peranan p ON u.peranan_id = p.peranan_id
  LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
`;

const ralat = (statusCode, mesej) => Object.assign(new Error(mesej), { statusCode });

/**
 * Sahkan medan wajib borang pengguna dan kembalikan nilai yang dibersihkan.
 * Peranan terhad (Staff, Ketua Subsidiari) mesti mempunyai syarikat kerana
 * data mereka diasingkan ikut syarikat.
 */
const sahkanBorangPengguna = async (body) => {
  const staff_id = String(body.staff_id ?? "").trim();
  const nama_penuh = String(body.nama_penuh ?? "").trim();
  const peranan_id = parseInt(body.peranan_id, 10);
  const syarikat_id = body.syarikat_id ? parseInt(body.syarikat_id, 10) : null;

  if (!staff_id || !nama_penuh || !Number.isInteger(peranan_id)) {
    throw ralat(400, "ID Staf, Nama Penuh dan Peranan diperlukan.");
  }
  if (/\s/.test(staff_id)) {
    throw ralat(400, "ID Staf tidak boleh mengandungi ruang kosong.");
  }

  const { rows } = await pool.query("SELECT nama_peranan FROM peranan WHERE peranan_id = $1", [
    peranan_id,
  ]);
  if (!rows[0]) throw ralat(400, "Peranan tidak sah.");

  if (syarikat_id !== null) {
    const semak = await pool.query("SELECT 1 FROM syarikat WHERE syarikat_id = $1", [syarikat_id]);
    if (semak.rowCount === 0) throw ralat(400, "Syarikat tidak sah.");
  } else if (PERANAN_TERHAD.includes(rows[0].nama_peranan)) {
    throw ralat(400, `Syarikat diperlukan untuk peranan ${rows[0].nama_peranan}.`);
  }

  return { staff_id, nama_penuh, peranan_id, syarikat_id };
};

const hantarRalat = (res, err, mesejLalai) => {
  if (err.statusCode && err.statusCode < 500) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  if (err.code === "23505") return res.status(409).json({ error: "ID Staf ini sudah digunakan." });
  return res.status(500).json({ error: mesejLalai });
};

// ---------------- GET /api/users (Admin sahaja) -----------------
export const senaraiPengguna = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${USER_SELECT}
       WHERE u.is_deleted = false
       ORDER BY u.pengguna_id`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

// ---------------- GET /api/users/me -----------------
export const profilSemasa = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `${USER_SELECT}
       WHERE u.staff_id = $1 AND u.is_deleted = false`,
      [req.user.staff_id]
    );

    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });
    const kebenaran = Array.from(await dapatkanKebenaranPeranan(req.user.peranan_id));
    res.json({ ...rows[0], kebenaran });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

// ---------------- PUT /api/users/me (profil sendiri) -----------------
export const kemaskiniProfilSendiri = async (req, res) => {
  try {
    const pelaku = req.user;
    const staff_id = pelaku.staff_id;
    const { katalaluan_lama, katalaluan_baru, hapus_gambar } = req.body;
    const file = req.file;

    const { rows } = await pool.query(
      "SELECT pengguna_id, katalaluan, gambar_profil FROM pengguna WHERE staff_id=$1 AND is_deleted = false",
      [staff_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });

    const pengguna_id = rows[0].pengguna_id;
    const currentPassword = rows[0].katalaluan;
    let newProfile = rows[0].gambar_profil;

    let logRingkasan = "Mengemaskini profil sendiri.";
    let logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini profil sendiri.`;
    let changes = [];

    if (hapus_gambar === "true") {
      newProfile = null;
      changes.push("gambar profil dibuang");
    } else if (file && file.buffer) {
      newProfile = file.buffer;
      changes.push("gambar profil dikemaskini");
    }

    let newPassword = null;
    if (katalaluan_baru && katalaluan_baru.trim() !== "") {
      const ralatPolisi = semakPolisiKatalaluan(katalaluan_baru);
      if (ralatPolisi) return res.status(400).json({ error: ralatPolisi });
      if (katalaluan_baru === katalaluan_lama) {
        return res
          .status(400)
          .json({ error: "Kata laluan baharu mesti berbeza daripada kata laluan semasa." });
      }
      const semak = await sahkanKatalaluan(katalaluan_lama || "", currentPassword);
      if (!semak.sah) {
        return res.status(400).json({ error: "Kata laluan lama tidak sah." });
      }
      newPassword = await hashKatalaluan(katalaluan_baru);
      changes.push("kata laluan ditukar");
    }

    if (changes.length > 0) {
      logPerincian += " Perubahan: " + changes.join(", ") + ".";
    }

    await dalamTransaksi(async (client) => {
      if (newPassword) {
        await client.query(
          `UPDATE pengguna
              SET katalaluan = $1, gambar_profil = $2, perlu_tukar_katalaluan = false,
                  katalaluan_dikemaskini_at = NOW(), tarikh_dikemaskini = NOW(),
                  token_dikemaskini_at = NOW()
            WHERE pengguna_id = $3`,
          [newPassword, newProfile, pengguna_id]
        );
      } else {
        await client.query(
          `UPDATE pengguna SET gambar_profil = $1, tarikh_dikemaskini = NOW() WHERE pengguna_id = $2`,
          [newProfile, pengguna_id]
        );
      }
    });

    await catatAktiviti(pelaku.pengguna_id, "Kemaskini Profil", logRingkasan, logPerincian);

    const { rows: updatedUser } = await pool.query(`${USER_SELECT} WHERE u.pengguna_id = $1`, [
      pengguna_id,
    ]);

    res.json(updatedUser[0]);
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Gagal kemaskini profil." });
  }
};

// ---------------- POST /api/users (Admin sahaja) -----------------
// Kata laluan pilihan: jika kosong, sistem menjana kata laluan sementara dan
// memulangkannya SEKALI dalam respons. Kedua-dua kes memaksa pengguna menukar
// kata laluan pada log masuk pertama.
export const tambahPengguna = async (req, res) => {
  try {
    const pelaku = req.user;
    const borang = await sahkanBorangPengguna(req.body);
    const profileBuffer = req.file ? req.file.buffer : null;

    const katalaluanDiberi = String(req.body.katalaluan ?? "").trim();
    if (katalaluanDiberi) {
      const ralatPolisi = semakPolisiKatalaluan(katalaluanDiberi);
      if (ralatPolisi) throw ralat(400, ralatPolisi);
    }
    const katalaluanSementara = katalaluanDiberi ? null : janaKatalaluanSementara();
    const katalaluanHash = await hashKatalaluan(katalaluanDiberi || katalaluanSementara);

    const newUserId = await dalamTransaksi(async (client) => {
      // Semak duplikasi staff_id FIZIKAL (soft-deleted juga) supaya ID tidak diguna semula
      const semak = await client.query("SELECT pengguna_id FROM pengguna WHERE staff_id = $1", [
        borang.staff_id,
      ]);
      if (semak.rows.length > 0) throw ralat(409, "ID Staf ini sudah digunakan.");

      const result = await client.query(
        `INSERT INTO pengguna (staff_id, nama_penuh, katalaluan, peranan_id, syarikat_id,
                               gambar_profil, perlu_tukar_katalaluan, katalaluan_dikemaskini_at)
         VALUES ($1, $2, $3, $4, $5, $6, true, NOW()) RETURNING pengguna_id`,
        [
          borang.staff_id,
          borang.nama_penuh,
          katalaluanHash,
          borang.peranan_id,
          borang.syarikat_id,
          profileBuffer,
        ]
      );
      return result.rows[0].pengguna_id;
    });

    const { rows: userWithJoin } = await pool.query(`${USER_SELECT} WHERE u.pengguna_id = $1`, [
      newUserId,
    ]);

    try {
      const logRingkasan = `Menambah pengguna baru: ${borang.nama_penuh}.`;
      const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah menambah pengguna baru: ${borang.nama_penuh} (ID Staf: ${borang.staff_id}) dengan peranan ${userWithJoin[0].nama_peranan}. Kata laluan sementara perlu ditukar pada log masuk pertama.`;
      await catatAktiviti(pelaku.pengguna_id, "Tambah Pengguna", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log tambah pengguna:", logErr);
    }

    res.status(201).json({
      ...userWithJoin[0],
      ...(katalaluanSementara ? { katalaluan_sementara: katalaluanSementara } : {}),
    });
  } catch (err) {
    if (!err.statusCode) console.error("Gagal tambah pengguna:", err);
    hantarRalat(res, err, "Ralat pelayan. Sila cuba sebentar lagi.");
  }
};

// ---------------- PUT /api/users/:id (Admin sahaja) -----------------
export const kemaskiniPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const { katalaluan, hapus_gambar } = req.body;
    const file = req.file;
    const pelaku = req.user;
    const { staff_id, nama_penuh, peranan_id, syarikat_id } = await sahkanBorangPengguna(req.body);

    const { rows: originalUserRows } = await pool.query(
      `SELECT u.staff_id, u.nama_penuh, u.katalaluan, u.peranan_id, p.nama_peranan, u.syarikat_id, s.nama_syarikat, u.gambar_profil
       FROM pengguna u
       LEFT JOIN peranan p ON u.peranan_id = p.peranan_id
       LEFT JOIN syarikat s ON u.syarikat_id = s.syarikat_id
       WHERE u.pengguna_id = $1 AND u.is_deleted = false`,
      [id]
    );
    if (!originalUserRows[0]) {
      return res.status(404).json({ error: "Pengguna tidak ditemui." });
    }
    const originalUser = originalUserRows[0];

    const diriSendiri = Number(id) === Number(pelaku.pengguna_id);
    if (diriSendiri && peranan_id !== Number(originalUser.peranan_id)) {
      return res.status(400).json({ error: "Anda tidak boleh menukar peranan akaun sendiri." });
    }

    let newProfile = originalUser.gambar_profil;
    if (hapus_gambar === "true") {
      newProfile = null;
    } else if (file && file.buffer) {
      newProfile = file.buffer;
    }

    // Kata laluan yang ditetapkan pentadbir dianggap sementara (kecuali untuk
    // akaun sendiri); aliran utama ialah POST /:id/reset-katalaluan.
    let newPassword = null;
    if (katalaluan && katalaluan.trim() !== "") {
      const ralatPolisi = semakPolisiKatalaluan(katalaluan);
      if (ralatPolisi) return res.status(400).json({ error: ralatPolisi });
      newPassword = await hashKatalaluan(katalaluan);
    }
    const passwordAkhir = newPassword || originalUser.katalaluan;
    const tokenRevisionChanged =
      Boolean(newPassword) ||
      String(staff_id) !== String(originalUser.staff_id) ||
      String(peranan_id) !== String(originalUser.peranan_id) ||
      String(syarikat_id) !== String(originalUser.syarikat_id);

    await dalamTransaksi(async (client) => {
      const result = await client.query(
        `UPDATE pengguna
         SET staff_id = $1,
             nama_penuh = $2,
             katalaluan = $3,
             peranan_id = $4,
             syarikat_id = $5,
              gambar_profil = $6,
              tarikh_dikemaskini = NOW(),
              perlu_tukar_katalaluan = CASE
                WHEN $9 THEN true
                ELSE perlu_tukar_katalaluan
              END,
              katalaluan_dikemaskini_at = CASE
                WHEN $10 THEN NOW()
                ELSE katalaluan_dikemaskini_at
              END,
              token_dikemaskini_at = CASE
                WHEN $8 THEN NOW()
                ELSE token_dikemaskini_at
              END
          WHERE pengguna_id = $7 AND is_deleted = false
          RETURNING pengguna_id`,
        [
          staff_id,
          nama_penuh,
          passwordAkhir,
          peranan_id,
          syarikat_id,
          newProfile,
          id,
          tokenRevisionChanged,
          Boolean(newPassword) && !diriSendiri,
          Boolean(newPassword),
        ]
      );
      if (result.rowCount === 0) {
        const err = new Error("Pengguna tidak ditemui.");
        err.statusCode = 404;
        throw err;
      }
    });

    const { rows: updatedUserRows } = await pool.query(`${USER_SELECT} WHERE u.pengguna_id = $1`, [
      id,
    ]);
    const updatedUser = updatedUserRows[0];

    // Bina log
    let logAktiviti = "";
    let logRingkasan = "";
    let logPerincian = "";
    let changes = [];

    if (diriSendiri) {
      logAktiviti = "Kemaskini Profil";
      logRingkasan = "Mengemaskini profil sendiri.";
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini profil sendiri.`;

      if (newPassword) changes.push("kata laluan");
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
      if (nama_penuh !== originalUser.nama_penuh) changes.push("nama penuh");
    } else {
      logAktiviti = "Kemaskini Pengguna";
      logRingkasan = `Mengemaskini pengguna: ${originalUser.nama_penuh}.`;
      logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah mengemaskini maklumat pengguna: ${originalUser.nama_penuh} (ID Staf: ${staff_id}).`;

      if (staff_id !== originalUser.staff_id) changes.push(`ID Staf (kepada ${staff_id})`);
      if (nama_penuh !== originalUser.nama_penuh) changes.push(`Nama Penuh (kepada ${nama_penuh})`);
      if (newPassword) changes.push("kata laluan");
      if (peranan_id != originalUser.peranan_id)
        changes.push(`peranan (kepada ${updatedUser.nama_peranan})`);
      if (syarikat_id != originalUser.syarikat_id)
        changes.push(`syarikat (kepada ${updatedUser.nama_syarikat || "N/A"})`);
      if (newProfile !== originalUser.gambar_profil) changes.push("gambar profil");
    }

    if (changes.length > 0) {
      logPerincian += " Perubahan: " + changes.join(", ") + ".";
    } else {
      logPerincian += " Tiada perubahan data direkodkan.";
    }

    try {
      await catatAktiviti(pelaku.pengguna_id, logAktiviti, logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log kemaskini pengguna:", logErr);
    }

    res.json(updatedUser);
  } catch (err) {
    if (!err.statusCode) console.error("Error updating user:", err);
    hantarRalat(res, err, "Gagal kemaskini pengguna.");
  }
};

// ---------------- DELETE /api/users/:id (Admin, soft-delete) -----------------
export const padamPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const pelaku = req.user;

    if (parseInt(id, 10) === pelaku.pengguna_id) {
      return res.status(400).json({ error: "Anda tidak boleh memadam akaun sendiri." });
    }

    const { rows: userRows } = await pool.query(
      "SELECT nama_penuh, staff_id FROM pengguna WHERE pengguna_id = $1 AND is_deleted = false",
      [id]
    );
    if (userRows.length === 0) {
      return res.status(404).json({ error: "Pengguna tidak ditemui." });
    }
    const { nama_penuh: namaPengguna, staff_id: stafIdPengguna } = userRows[0];

    await dalamTransaksi(async (client) => {
      const result = await client.query(
        `UPDATE pengguna SET is_deleted = true, deleted_at = NOW(), tarikh_dikemaskini = NOW() WHERE pengguna_id = $1 AND is_deleted = false`,
        [id]
      );
      if (result.rowCount === 0) {
        const err = new Error("Pengguna tidak ditemui.");
        err.statusCode = 404;
        throw err;
      }
    });

    try {
      const logRingkasan = `Memadam pengguna: ${namaPengguna}.`;
      const logPerincian = `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah memadam pengguna: ${namaPengguna} (ID Staf: ${stafIdPengguna}).`;
      await catatAktiviti(pelaku.pengguna_id, "Padam Pengguna", logRingkasan, logPerincian);
    } catch (logErr) {
      console.error("Gagal mencatat log padam pengguna:", logErr);
    }

    res.json({ message: "Pengguna berjaya dipadam." });
  } catch (err) {
    console.error("Gagal padam pengguna:", err);
    if (err.statusCode === 404) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

// ---------------- POST /api/users/:id/reset-katalaluan (Admin) -----------------
// Jana kata laluan sementara baharu, buka kunci akaun dan cabut semua sesi.
// Kata laluan dipulangkan SEKALI sahaja; pengguna wajib menukarnya semasa log masuk.
export const resetKatalaluanPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const pelaku = req.user;

    if (Number(id) === Number(pelaku.pengguna_id)) {
      return res.status(400).json({
        error: "Gunakan menu Profil untuk menukar kata laluan akaun sendiri.",
      });
    }

    const katalaluanSementara = janaKatalaluanSementara();
    const hash = await hashKatalaluan(katalaluanSementara);

    const { rows } = await pool.query(
      `UPDATE pengguna
          SET katalaluan = $1,
              perlu_tukar_katalaluan = true,
              percubaan_gagal = 0,
              dikunci_hingga = NULL,
              katalaluan_dikemaskini_at = NOW(),
              token_dikemaskini_at = NOW(),
              tarikh_dikemaskini = NOW()
        WHERE pengguna_id = $2 AND is_deleted = false
        RETURNING nama_penuh, staff_id`,
      [hash, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });

    try {
      await catatAktiviti(
        pelaku.pengguna_id,
        "Reset Kata Laluan",
        `Menetapkan semula kata laluan: ${rows[0].nama_penuh}.`,
        `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah menetapkan semula kata laluan ${rows[0].nama_penuh} (ID Staf: ${rows[0].staff_id}). Kata laluan sementara perlu ditukar pada log masuk seterusnya.`
      );
    } catch (logErr) {
      console.error("Gagal mencatat log reset kata laluan:", logErr);
    }

    const { rows: pengguna } = await pool.query(`${USER_SELECT} WHERE u.pengguna_id = $1`, [id]);
    res.json({
      message: "Kata laluan sementara berjaya dijana.",
      katalaluan_sementara: katalaluanSementara,
      pengguna: pengguna[0],
    });
  } catch (err) {
    console.error("Gagal reset kata laluan:", err);
    res.status(500).json({ error: "Gagal menetapkan semula kata laluan." });
  }
};

// ---------------- PATCH /api/users/:id/status (Admin) -----------------
// Aktif / nyahaktif akaun tanpa memadam. Nyahaktif mencabut sesi serta-merta;
// aktifkan semula turut membuka kunci akaun.
export const tukarStatusPengguna = async (req, res) => {
  try {
    const { id } = req.params;
    const pelaku = req.user;
    const { is_aktif } = req.body;

    if (typeof is_aktif !== "boolean") {
      return res.status(400).json({ error: "Nilai is_aktif (true/false) diperlukan." });
    }
    if (!is_aktif && Number(id) === Number(pelaku.pengguna_id)) {
      return res.status(400).json({ error: "Anda tidak boleh menyahaktifkan akaun sendiri." });
    }

    const { rows } = await pool.query(
      `UPDATE pengguna
          SET is_aktif = $1,
              percubaan_gagal = CASE WHEN $1 THEN 0 ELSE percubaan_gagal END,
              dikunci_hingga = CASE WHEN $1 THEN NULL ELSE dikunci_hingga END,
              token_dikemaskini_at = CASE WHEN $1 THEN token_dikemaskini_at ELSE NOW() END,
              tarikh_dikemaskini = NOW()
        WHERE pengguna_id = $2 AND is_deleted = false
        RETURNING nama_penuh, staff_id`,
      [is_aktif, id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak ditemui." });

    try {
      const tindakan = is_aktif ? "mengaktifkan" : "menyahaktifkan";
      await catatAktiviti(
        pelaku.pengguna_id,
        is_aktif ? "Aktifkan Pengguna" : "Nyahaktif Pengguna",
        `${is_aktif ? "Mengaktifkan" : "Menyahaktifkan"} pengguna: ${rows[0].nama_penuh}.`,
        `${pelaku.nama_penuh} (${pelaku.nama_peranan}) telah ${tindakan} akaun ${rows[0].nama_penuh} (ID Staf: ${rows[0].staff_id}).`
      );
    } catch (logErr) {
      console.error("Gagal mencatat log status pengguna:", logErr);
    }

    const { rows: pengguna } = await pool.query(`${USER_SELECT} WHERE u.pengguna_id = $1`, [id]);
    res.json(pengguna[0]);
  } catch (err) {
    console.error("Gagal tukar status pengguna:", err);
    res.status(500).json({ error: "Gagal mengemas kini status pengguna." });
  }
};
