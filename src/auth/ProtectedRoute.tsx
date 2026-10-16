import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
export default function ProtectedRoute(){const {user,loading}=useAuth();const location=useLocation();if(loading)return <p>Checking session…</p>;return user?<Outlet/>:<Navigate to="/login" state={{from:location.pathname}} replace/>;}
