import { useCallback, useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { adminService, type StudentRow } from "../services/adminService";

export default function StudentManagement() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.listStudents(search));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load students.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><GraduationCap size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Student management</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only list of student profiles. Search by email, name or Global Student ID.</p>
        </div>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input aria-label="Search students" className="min-h-11 flex-1 rounded-lg border border-slate-200 p-3 text-sm min-w-48" placeholder="Search email, name or Global Student ID" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No students found</h3>
          <p className="mt-2 text-sm text-slate-500">Try a different search.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Global Student ID</th><th className="p-3">Created</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-t">
                  <td className="p-3 font-semibold">{r.email}</td>
                  <td className="p-3">{r.display_name}</td>
                  <td className="p-3 font-mono text-xs">{r.global_student_id ?? "—"}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
