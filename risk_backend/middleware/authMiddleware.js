import jwt from "jsonwebtoken";
import pool from "../config/db.js";

// Laluan yang masih boleh dicapai semasa pengguna wajib menukar kata laluan
// (akaun baharu / selepas reset oleh pentadbir).
const LALUAN_SEMASA_TUKAR_KATALALUAN = new Set([
  "GET /api/users/me",
  "PUT /api/auth/tukar-katalaluan",
  "POST /api/auth/logout",
]);

/**
 * Middleware untuk mengesahkan token JWT.
 * Jika sah, ia akan menambah data pengguna (termasuk nama_penuh) ke req.user.
 * Pengguna yang ditanda is_deleted = true tidak dibenarkan log masuk.
 * Pengguna tidak aktif ditolak; pengguna yang wajib menukar kata laluan hanya
 * boleh mencapai LALUAN_SEMASA_TUKAR_KATALALUAN.
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Akses ditolak. Tiada token disediakan." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      `SELECT
         u.pengguna_id,
         u.staff_id,
         u.nama_penuh,
         u.peranan_id,
         p.nama_peranan,
         u.syarikat_id,
         u.token_dikemaskini_at,
         u.is_aktif,
         u.perlu_tukar_katalaluan
       FROM pengguna u
       JOIN peranan p ON u.peranan_id = p.peranan_id
       WHERE u.pengguna_id = $1 AND u.is_deleted = false`,
      [decoded.pengguna_id]
    );

    const user = rows[0];

    if (!user) {
      return res.status(404).json({ error: "Akaun ini telah dipadam atau tidak lagi wujud." });
    }

    if (user.token_dikemaskini_at) {
      const tokenRevision = decoded.token_dikemaskini_at;
      const currentRevision = new Date(user.token_dikemaskini_at).getTime();
      const tokenRevisionTime = tokenRevision ? new Date(tokenRevision).getTime() : NaN;
      if (!Number.isFinite(tokenRevisionTime) || tokenRevisionTime !== currentRevision) {
        return res.status(401).json({ error: "Sesi telah tamat. Sila log masuk semula." });
      }
    }

    if (!user.is_aktif) {
      return res
        .status(401)
        .json({ error: "Akaun anda telah dinyahaktifkan. Sila hubungi pentadbir sistem." });
    }

    if (user.perlu_tukar_katalaluan) {
      const laluan = `${req.method} ${req.baseUrl}${req.path}`.replace(/\/$/, "");
      if (!LALUAN_SEMASA_TUKAR_KATALALUAN.has(laluan)) {
        return res.status(403).json({
          error: "Anda perlu menukar kata laluan sementara sebelum meneruskan.",
          kod: "PERLU_TUKAR_KATALALUAN",
        });
      }
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Ralat token:", err);
    return res.status(403).json({ error: "Token tidak sah atau telah tamat tempoh." });
  }
};

/**
 * Middleware untuk membenarkan akses berdasarkan peranan.
 * Mesti digunakan SELEPAS verifyToken.
 */
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.nama_peranan) {
      return res.status(403).json({ error: "Akses ditolak. Data pengguna tidak lengkap." });
    }

    const hasRole = allowedRoles.includes(req.user.nama_peranan);
    if (!hasRole) {
      return res
        .status(403)
        .json({ error: `Akses ditolak. Anda memerlukan peranan: ${allowedRoles.join(" atau ")}` });
    }

    next();
  };
};

/* =======================================================
   ROLE MATRIX (kebenaran) — jadual `kebenaran` / `peranan_kebenaran`
   ======================================================= */

// Cache kebenaran per peranan (elak query setiap permintaan)
const KEBENARAN_CACHE_TTL_MS = 60_000;
const kebenaranCache = new Map(); // peranan_id -> { set, tarikh }

/**
 * Dapatkan senarai kunci kebenaran untuk satu peranan (dengan cache).
 * @param {number|string} perananId
 * @returns {Promise<Set<string>>}
 */
export const dapatkanKebenaranPeranan = async (perananId) => {
  const cacheKey = `keb:${perananId}`;
  const cached = kebenaranCache.get(cacheKey);
  if (cached && Date.now() - cached.tarikh < KEBENARAN_CACHE_TTL_MS) {
    return cached.set;
  }

  const { rows } = await pool.query(
    `SELECT k.nama_kebenaran
       FROM peranan_kebenaran pk
       JOIN kebenaran k ON k.kebenaran_id = pk.kebenaran_id
      WHERE pk.peranan_id = $1`,
    [perananId]
  );

  const set = new Set(rows.map((r) => r.nama_kebenaran));
  kebenaranCache.set(cacheKey, { set, tarikh: Date.now() });
  return set;
};

/**
 * Kosongkan cache kebenaran supaya perubahan `peranan_kebenaran` berkuat kuasa
 * serta-merta (tanpa menunggu TTL). Hanya menjejaskan proses semasa.
 * @returns {number} bilangan entri yang dikosongkan
 */
export const kosongkanCacheKebenaran = () => {
  const bilangan = kebenaranCache.size;
  kebenaranCache.clear();
  return bilangan;
};

/**
 * Middleware kebenaran berasaskan role matrix.
 * Lalu jika pengguna memiliki SEKURANG-KURANGNYA satu kebenaran yang diberi.
 * Mesti digunakan SELEPAS verifyToken.
 * @param {...string} kebenaranDibolehkan - contoh: authorizeKebenaran("risiko:lihat")
 */
const authorizeKebenaran = (...kebenaranDibolehkan) => {
  return async (req, res, next) => {
    try {
      const perananId = req.user?.peranan_id;
      if (!perananId) {
        return res.status(403).json({ error: "Akses ditolak. Data pengguna tidak lengkap." });
      }

      const miliki = await dapatkanKebenaranPeranan(perananId);
      const cukup = kebenaranDibolehkan.some((k) => miliki.has(k));
      if (!cukup) {
        return res.status(403).json({
          error: "Akses ditolak. Kebenaran tidak mencukupi.",
          keperluan: kebenaranDibolehkan,
        });
      }

      next();
    } catch (err) {
      console.error("Ralat authorizeKebenaran:", err);
      res.status(500).json({ error: "Gagal mengesahkan kebenaran." });
    }
  };
};

export { verifyToken, authorizeRoles, authorizeKebenaran };
