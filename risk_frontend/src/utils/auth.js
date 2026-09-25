// src/utils/auth.js - Re-exports from hooks/useAuth.js for backwards compatibility
export {
  getAuthUser,
  refreshAuthSession,
  getUserRole,
  getUserRoleTitle,
  getKebenaran,
  hasKebenaran,
  isAdmin,
  canEditPenilaian,
  canEdit,
  hasRole,
  canViewTindakan,
  isRestrictedRole,
} from "../hooks/useAuth";
