import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import RoleLoadError from "./RoleLoadError";
import type { PortalRole } from "../types/domain";

export default function RoleGuard({ allowed }: { allowed: readonly PortalRole[] }) {
  const { roles, roleError, loading, reloadRoles } = useAuth();
  if (loading) return <p>Checking permissions…</p>;
  if (roleError) return <RoleLoadError onRetry={reloadRoles} />;
  return roles.some((role) => allowed.includes(role)) ? <Outlet /> : <Navigate to="/unauthorized" replace />;
}
