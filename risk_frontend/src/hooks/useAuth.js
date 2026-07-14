import { jwtDecode } from "jwt-decode";

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

/**
 * Decode JWT token and return user info
 * Returns: { userId, syarikatId, perananId, role, namaPeranan, raw }
 * Returns null if no token or invalid token
 */
export const getAuthUser = () => {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const decoded = jwtDecode(token);
    const perananId = decoded.peranan_id;
    return {
      userId: decoded.id || decoded.pengguna_id || null,
      syarikatId: decoded.syarikat_id || null,
      perananId: perananId || null,
      role: ROLE_MAPPING[perananId] || decoded.nama_peranan || "",
      roleTitle: ROLE_MAPPING_TITLE[perananId] || decoded.nama_peranan || "",
      namaPeranan: decoded.nama_peranan || "",
      namaPenuh: decoded.nama_penuh || "",
      raw: decoded,
    };
  } catch (err) {
    console.error("Invalid token:", err);
    return null;
  }
};

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
 * Check if current user is admin
 */
export const isAdmin = () => {
  const role = getUserRole();
  return role === "ADMIN";
};

/**
 * Check if current user can edit risk assessment
 */
export const canEditPenilaian = () => {
  const role = getUserRole();
  return ["ADMIN", "EXECUTIVE"].includes(role);
};

/**
 * Check if current user can edit (staff and above)
 */
export const canEdit = () => {
  const role = getUserRole();
  return ["ADMIN", "EXECUTIVE", "KETUA SUBSIDIARI", "STAFF"].includes(role);
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
