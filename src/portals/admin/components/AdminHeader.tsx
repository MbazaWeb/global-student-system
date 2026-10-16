import { useAuth } from "../../../auth/AuthProvider";

/** AdminHeader — small, real header showing the signed-in admin's email. */
export default function AdminHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-3">
      <p className="text-sm font-semibold text-slate-700">{user?.email ?? "Platform admin"}</p>
    </header>
  );
}
