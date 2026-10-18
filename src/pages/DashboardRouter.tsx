import { Navigate } from "react-router-dom";
import RoleLoadError from "../auth/RoleLoadError";
import { useAuth } from "../auth/AuthProvider";

export default function DashboardRouter() {
  const { roles, roleError, loading, reloadRoles } = useAuth();
  if (loading) return <p>Checking permissions…</p>;
  if (roleError) return <RoleLoadError onRetry={reloadRoles} />;
  if (roles.includes("platform_admin")) return <Navigate to="/admin/dashboard" replace />;
  if (roles.includes("institution_admin")) return <Navigate to="/institution/dashboard" replace />;
  if (roles.some(x => x === "bank_admin" || x === "bank_officer")) return <Navigate to="/bank/dashboard" replace />;
  if (roles.some(x => x === "support_agent" || x === "support_lead")) return <Navigate to="/support/dashboard" replace />;
  if (roles.includes("parent_guardian")) return <Navigate to="/guardian/dashboard" replace />;
  if (roles.includes("student")) return <Navigate to="/student/wallet" replace />;
  return <Navigate to="/unauthorized" replace />;
}
