// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { getUserRole } from "../utils/auth";

export default function ProtectedRoute({ allowedRoles, children }) {
  const role = getUserRole();

  if (!role) return <Navigate to="/login" />;
  if (!allowedRoles.some(r => r.toLowerCase() === role?.toLowerCase())) return <Navigate to="/unauthorized" />;

  return children;
}
