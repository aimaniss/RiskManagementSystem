import { jwtDecode } from "jwt-decode";
import api from "../api/api";

// Role mapping from peranan_id to role name
const ROLE_MAPPING = {
  1: "ADMIN",
  2: "EXECUTIVE",
  3: "KETUA SUBSIDIARI",
  4: "STAFF",
  5: "VIEWER",
};

// Role mapping to title case (matching backend nama_peranan)
const ROLE_MAPPING_TITLE = {
  1: "Admin",
  2: "Executive",
  3: "Ketua Subsidiari",
  4: "Staff",
  5: "Viewer",
};

let authSnapshot = null;
let authSnapshotToken = null;

const binaAuthUser = (decoded, data = {}) => {
  const sumber = { ...decoded, ...data };
  const perananId = sumber.peranan_id || null;
  const kebenaran = Array.isArray(sumber.kebenaran) ? sumber.kebenaran : [];

  return {
    userId: sumber.id || sumber.pengguna_id || null,
    syarikatId: sumber.syarikat_id || null,
    perananId,
    role: ROLE_MAPPING[perananId] || sumber.nama_peranan || "",
    roleTitle: ROLE_MAPPING_TITLE[perananId] || sumber.nama_peranan || "",
    namaPeranan: sumber.nama_peranan || "",
    namaPenuh: sumber.nama_penuh || "",
    kebenaran,
    kebenaranDimuat: Array.isArray(sumber.kebenaran),
    perluTukarKatalaluan: Boolean(sumber.perlu_tukar_katalaluan),
    raw: sumber,
  };
};

const clearAuthSnapshot = () => {
  authSnapshot = null;
  authSnapshotToken = null;
};

/**
 * Matriks kebenaran SEPADAN dengan seed migration 020/021 backend.
 * Digunakan sebagai fallback untuk token lama (sebelum P1) yang belum
 * mempunyai snapshot `users/me`.
 */
const MATRIX_KEBENARAN = {
  "risiko:daftar": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"],
  "risiko:lihat": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF", "VIEWER"],
  "risiko:nilai": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI"],
  "risiko:lulus": ["ADMIN", "EXECUTIVE"],
  "risiko:padam": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI"],
  "rawatan:urus": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"],
  "pemantauan:urus": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"],
  "pindaan:urus": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"],
  "pindaan:lihat": ["ADMIN", "EXECUTIVE"],
  "pindaan:lulus": ["ADMIN"],
  "pengguna:urus": ["ADMIN"],
  "log:baca": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF", "VIEWER"],
  "log:padam": ["ADMIN"],
  "notifikasi:urus": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF", "VIEWER"],
  "laporan:jana": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF", "VIEWER"],
  "dashboard:lihat": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF", "VIEWER"],
  "rujukan:urus": ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"],
};

/**
 * Decode JWT token and return user info
 * Returns: { userId, syarikatId, perananId, role, namaPeranan, kebenaran[], raw }
 * Returns null if no token or invalid token
 */
export const getAuthUser = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);

    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      localStorage.removeItem("token");
      clearAuthSnapshot();
      return null;
    }

    if (authSnapshotToken === token && authSnapshot) return authSnapshot;

    const user = binaAuthUser(decoded);
    authSnapshotToken = token;
    authSnapshot = user;
    return user;
  } catch (err) {
    console.error("Invalid token:", err);
    localStorage.removeItem("token");
    clearAuthSnapshot();
    return null;
  }
};

export const refreshAuthSession = async () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const response = await api.get("/users/me");
    if (localStorage.getItem("token") !== token) return null;

    const user = binaAuthUser(decoded, response.data);
    authSnapshotToken = token;
    authSnapshot = user;
    return user;
  } catch (err) {
    if (err.response?.status === 401 || err.response?.status === 403) {
      localStorage.removeItem("token");
      clearAuthSnapshot();
    }
    throw err;
  }
};

/**
 * Pengguna wajib menukar kata laluan sementara (akaun baharu / selepas reset)
 * sebelum boleh menggunakan sistem. Backend turut menguatkuasakannya.
 */
export const perluTukarKatalaluan = () => Boolean(getAuthUser()?.perluTukarKatalaluan);

/**
 * Get user role string (uppercase: ADMIN, EXECUTIVE, etc.)
 */
export const getUserRole = () => {
  const user = getAuthUser();
  return user?.role || null;
};

/**
 * Get user role in title case
 */
export const getUserRoleTitle = () => {
  const user = getAuthUser();
  return user?.roleTitle || null;
};

/**
 * Senarai kebenaran pengguna semasa.
 * Sumber utama: `kebenaran` dalam JWT. Fallback: matriks peranan.
 * @returns {string[]}
 */
export const getKebenaran = () => {
  const user = getAuthUser();
  if (!user) return [];

  if (user.kebenaranDimuat || user.kebenaran.length > 0) return user.kebenaran;

  // Fallback token lama — bina dari matriks peranan
  const hasil = new Set();
  for (const [kunci, perananList] of Object.entries(MATRIX_KEBENARAN)) {
    if (perananList.includes(user.role)) hasil.add(kunci);
  }
  return Array.from(hasil);
};

/**
 * Semak sama ada pengguna semasa memiliki sekurang-kurangnya SATU kebenaran.
 * @param {...string} kebenaran
 * @returns {boolean}
 */
export const hasKebenaran = (...kebenaran) => {
  const miliki = getKebenaran();
  return kebenaran.some((k) => miliki.includes(k));
};

/**
 * Check if current user is admin (kebenaran `pengguna:urus` — Admin sahaja)
 */
export const isAdmin = () => {
  const role = getUserRole();
  if (!role) return false;
  return hasKebenaran("pengguna:urus");
};

/**
 * Check if current user can edit risk assessment (`risiko:nilai`)
 */
export const canEditPenilaian = () => {
  return hasKebenaran("risiko:nilai");
};

/**
 * Check if current user can edit (staff and above) — `risiko:daftar`
 */
export const canEdit = () => {
  return hasKebenaran("risiko:daftar");
};

/**
 * Check if user role is one of the specified roles
 */
export const hasRole = (...roles) => {
  const userRole = getUserRole();
  return roles.includes(userRole);
};

/**
 * Check if user can view tindakan column (Admin, Executive, Staff)
 * NOTA: kekal berasaskan peranan — ia keistimewaan paparan UI, bukan kebenaran RBAC.
 */
export const canViewTindakan = () => {
  const role = getUserRole();
  return ["ADMIN", "EXECUTIVE", "STAFF"].includes(role);
};

/**
 * Check if user is restricted (Staff or Ketua Subsidiari - limited to own syarikat)
 */
export const isRestrictedRole = () => {
  const role = getUserRole();
  return ["STAFF", "KETUA SUBSIDIARI"].includes(role);
};