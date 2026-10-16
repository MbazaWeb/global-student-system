import { useAuth } from "../../../auth/AuthProvider";

/** InstitutionHeader — small, real header showing the signed-in admin's email. */
export default function InstitutionHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-3">
      <p className="text-sm font-semibold text-slate-700">{user?.email ?? "Institution admin"}</p>
    </header>
  );
}
