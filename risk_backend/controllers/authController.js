import pool from "../config/db.js";
import jwt from "jsonwebtoken";
import { catatAktiviti } from "../utils/catatAktiviti.js";
import { sahkanKatalaluan, hashKatalaluan, semakPolisiKatalaluan } from "../utils/katalaluan.js";
import { dapatkanKebenaranPeranan } from "../middleware/authMiddleware.js";

// Kunci sementara selepas percubaan gagal berturut-turut (elak teka kata laluan)
export const MAKS_PERCUBAAN_GAGAL = 5;
export const TEMPOH_KUNCI_MINIT = 15;

const RALAT_KELAYAKAN = "ID Staf atau kata laluan tidak sah.";

const janaToken = (user) =>
  jwt.sign(
    {
      pengguna_id: user.pengguna_id,
      staff_id: user.staff_id,
      peranan_id: user.peranan_id,
      nama_peranan: user.nama_peranan,
      syarikat_id: user.syarikat_id,
      token_dikemaskini_at: user.token_dikemaskini_at,
      perlu_tukar_katalaluan: Boolean(user.perlu_tukar_katalaluan),
    },
    process.env.JWT_SECRET,
    { expiresIn: "5d" }
  );

const muatKebenaran = async (perananId) => {
  try {
    return Array.from(await dapatkanKebenaranPeranan(perananId));
  } catch (err) {
    console.error("Gagal memuat kebenaran:", err);
    return [];
  }
};

const binaResponsPengguna = (user, kebenaran) => ({
  nama: user.nama_penuh,
  peranan: user.nama_peranan,
  peranan_id: user.peranan_id,
  pengguna_id: user.pengguna_id,
  syarikat_id: user.syarikat_id,
  perlu_tukar_katalaluan: Boolean(user.perlu_tukar_katalaluan),
  kebenaran,
});

const PENGGUNA_AUTH_SELECT = `
  SELECT u.pengguna_id, u.staff_id, u.nama_penuh, u.katalaluan,
         u.peranan_id, u.syarikat_id, u.token_dikemaskini_at, p.nama_peranan,
         u.is_aktif, u.perlu_tukar_katalaluan, u.percubaan_gagal, u.dikunci_hingga
  FROM pengguna u
  JOIN peranan p ON u.peranan_id = p.peranan_id
`;

const bakiMinit = (hingga) => Math.max(1, Math.ceil((new Date(hingga) - Date.now()) / 60_000));

export const login = async (req, res) => {
  const { staff_id, katalaluan } = req.body;

  if (!staff_id || !katalaluan) {
    return res.status(400).json({ error: "ID Staf dan kata laluan diperlukan." });
  }

  try {
    const { rows } = await pool.query(
      `${PENGGUNA_AUTH_SELECT} WHERE u.staff_id = $1 AND u.is_deleted = false`,
      [staff_id]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ error: RALAT_KELAYAKAN });

    if (user.dikunci_hingga && new Date(user.dikunci_hingga) > new Date()) {
      return res.status(423).json({
        error: `Akaun dikunci sementara kerana terlalu banyak percubaan gagal. Cuba lagi dalam ${bakiMinit(user.dikunci_hingga)} minit atau hubungi pentadbir sistem.`,
      });
    }

    const { sah, hashBaru } = await sahkanKatalaluan(katalaluan, user.katalaluan);
    if (!sah) {
      // Kaunter dinaikkan secara atomik; bila had dicapai akaun dikunci dan
      // kaunter bermula semula supaya pengguna dapat pusingan baharu selepasnya.
      const { rows: kira } = await pool.query(
        `UPDATE pengguna
            SET dikunci_hingga = CASE WHEN percubaan_gagal + 1 >= $2
                                      THEN NOW() + make_interval(mins => $3)
                                      ELSE dikunci_hingga END,
                percubaan_gagal = CASE WHEN percubaan_gagal + 1 >= $2
                                       THEN 0 ELSE percubaan_gagal + 1 END
          WHERE pengguna_id = $1
          RETURNING percubaan_gagal, dikunci_hingga`,
        [user.pengguna_id, MAKS_PERCUBAAN_GAGAL, TEMPOH_KUNCI_MINIT]
      );

      const baruDikunci = kira[0]?.dikunci_hingga && new Date(kira[0].dikunci_hingga) > new Date();
      if (baruDikunci) {
        try {
          await catatAktiviti(
            user.pengguna_id,
            "Akaun Dikunci",
            `Akaun ${user.nama_penuh} dikunci sementara.`,
            `Akaun ${user.nama_penuh} (ID Staf: ${user.staff_id}) dikunci selama ${TEMPOH_KUNCI_MINIT} minit selepas ${MAKS_PERCUBAAN_GAGAL} percubaan log masuk gagal.`
          );
        } catch (logErr) {
          console.error("Gagal mencatat log akaun dikunci:", logErr);
        }
        return res.status(423).json({
          error: `Akaun dikunci sementara selama ${TEMPOH_KUNCI_MINIT} minit kerana terlalu banyak percubaan gagal.`,
        });
      }
      return res.status(401).json({ error: RALAT_KELAYAKAN });
    }

    // Semakan status hanya selepas kata laluan sah supaya status akaun tidak
    // didedahkan kepada pihak yang tidak tahu kata laluannya.
    if (!user.is_aktif) {
      return res
        .status(403)
        .json({ error: "Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir sistem." });
    }

    await pool.query(
      `UPDATE pengguna
          SET percubaan_gagal = 0,
              dikunci_hingga = NULL,
              log_masuk_terakhir = NOW(),
              katalaluan = COALESCE($2, katalaluan)
        WHERE pengguna_id = $1`,
      [user.pengguna_id, hashBaru]
    );

    const kebenaran = await muatKebenaran(user.peranan_id);
    const token = janaToken(user);

    try {
      await catatAktiviti(
        user.pengguna_id,
        "Log Masuk",
        `${user.nama_penuh} telah log masuk ke sistem.`,
        `${user.nama_penuh} (ID Staf: ${user.staff_id}, Peranan: ${user.nama_peranan}) telah berjaya log masuk pada ${new Date().toLocaleString("ms-MY")}.`
      );
    } catch (logErr) {
      console.error("Gagal mencatat log masuk:", logErr);
    }

    res.json({ token, user: binaResponsPengguna(user, kebenaran) });
  } catch (err) {
    console.error("Ralat login:", err);
    res.status(500).json({ error: "Ralat pelayan. Sila cuba sebentar lagi." });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user) {
      await catatAktiviti(
        req.user.pengguna_id,
        "Log Keluar",
        `${req.user.nama_penuh} telah log keluar dari sistem.`,
        `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah log keluar pada ${new Date().toLocaleString("ms-MY")}.`
      );
    }
    res.json({ message: "Log keluar berjaya." });
  } catch (err) {
    res.status(500).json({ error: "Gagal mencatat log keluar." });
  }
};

/**
 * Tukar kata laluan sendiri (juga aliran wajib log masuk pertama / selepas
 * reset). Menerima `katalaluan_lama`/`katalaluan_baru` atau
 * `katalaluan_semasa`/`katalaluan_baharu`. Semua token lama dicabut; token
 * baharu dipulangkan supaya pengguna tidak perlu log masuk semula.
 */
export const tukarKatalaluan = async (req, res) => {
  try {
    const { katalaluan_lama, katalaluan_semasa, katalaluan_baru, katalaluan_baharu } = req.body;
    const lama = katalaluan_lama || katalaluan_semasa;
    const baru = katalaluan_baru || katalaluan_baharu;

    if (!lama || !baru) {
      return res.status(400).json({ error: "Kata laluan lama dan baru diperlukan." });
    }

    const ralatPolisi = semakPolisiKatalaluan(baru);
    if (ralatPolisi) return res.status(400).json({ error: ralatPolisi });

    if (lama === baru) {
      return res
        .status(400)
        .json({ error: "Kata laluan baharu mesti berbeza daripada kata laluan semasa." });
    }

    const { rows } = await pool.query(
      "SELECT pengguna_id, katalaluan, perlu_tukar_katalaluan FROM pengguna WHERE pengguna_id = $1 AND is_deleted = false",
      [req.user.pengguna_id]
    );
    if (!rows[0]) return res.status(404).json({ error: "Pengguna tidak dijumpai." });

    const { sah } = await sahkanKatalaluan(lama, rows[0].katalaluan);
    if (!sah) {
      return res.status(400).json({ error: "Kata laluan semasa tidak sah." });
    }
    const pertamaKali = rows[0].perlu_tukar_katalaluan;

    const hash = await hashKatalaluan(baru);
    const { rows: dikemaskini } = await pool.query(
      `UPDATE pengguna
          SET katalaluan = $1,
              perlu_tukar_katalaluan = false,
              katalaluan_dikemaskini_at = NOW(),
              tarikh_dikemaskini = NOW(),
              token_dikemaskini_at = NOW()
        WHERE pengguna_id = $2
        RETURNING token_dikemaskini_at`,
      [hash, req.user.pengguna_id]
    );

    try {
      await catatAktiviti(
        req.user.pengguna_id,
        "Tukar Kata Laluan",
        `${req.user.nama_penuh} telah menukar kata laluan sendiri.`,
        `${req.user.nama_penuh} (ID Staf: ${req.user.staff_id}) telah menukar kata laluan sendiri${pertamaKali ? " (wajib selepas kata laluan sementara)" : ""}.`
      );
    } catch (logErr) {
      console.error("Gagal mencatat log tukar kata laluan:", logErr);
    }

    const userBaharu = {
      ...req.user,
      token_dikemaskini_at: dikemaskini[0].token_dikemaskini_at,
      perlu_tukar_katalaluan: false,
    };
    const kebenaran = await muatKebenaran(userBaharu.peranan_id);

    res.json({
      message: "Kata laluan berjaya ditukar.",
      token: janaToken(userBaharu),
      user: binaResponsPengguna(userBaharu, kebenaran),
    });
  } catch (err) {
    console.error("Gagal tukar kata laluan:", err);
    res.status(500).json({ error: "Gagal menukar kata laluan." });
  }
};
