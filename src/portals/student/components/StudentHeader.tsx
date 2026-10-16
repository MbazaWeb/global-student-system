import { useAuth } from "../../../auth/AuthProvider";

/**
 * StudentHeader — small, real header showing the signed-in student's email.
 * Not currently mounted (PortalNavigation renders the global header), but
 * kept as a usable component for any future student-only layout.
 */
export default function StudentHeader() {
  const { user } = useAuth();
  return (
    <header className="border-b border-slate-200 bg-white px-5 py-3">
      <p className="text-sm font-semibold text-slate-700">{user?.email ?? "Student"}</p>
    </header>
  );
}
