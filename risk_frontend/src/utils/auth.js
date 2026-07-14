// src/utils/auth.js - Re-exports from hooks/useAuth.js for backwards compatibility
export {
  getAuthUser,
  getUserRole,
  getUserRoleTitle,
  isAdmin,
  canEditPenilaian,
  canEdit,
  hasRole,
  canViewTindakan,
  isRestrictedRole,
} from "../hooks/useAuth";
