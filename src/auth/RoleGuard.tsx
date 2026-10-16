import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import type { PortalRole } from "../types/domain";
export default function RoleGuard({allowed}:{allowed:readonly PortalRole[]}){const {roles,loading}=useAuth();if(loading)return <p>Checking permissions…</p>;return roles.some(role=>allowed.includes(role))?<Outlet/>:<Navigate to="/unauthorized" replace/>;}
