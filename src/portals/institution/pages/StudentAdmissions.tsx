import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { fetchDirectory, type DirectoryRow } from "../services/admissionService";

/** StudentAdmissions — institution-scoped list of submitted admissions.
 *  Redirects the user to the verification queue to act on pending ones. */
export default function StudentAdmissions() {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await fetchDirectory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load admissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pending = rows.filter((r) => r.verification_status === "pending");

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><UserPlus size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Student admissions</h1>
          <p className="mt-1 text-sm text-slate-500">All enrollment submissions to your institution.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {pending.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-900"><strong>{pending.length}</strong> pending review.</p>
          <Link to="/institution/verification" className="mt-2 inline-block font-semibold text-amber-900 underline">Open verification queue →</Link>
        </section>
      )}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No admissions submitted</h3>
          <p className="mt-2 text-sm text-slate-500">Students submit admissions from their student portal.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Student</th>
                <th className="p-3">Global ID</th>
                <th className="p-3">Admission</th>
                <th className="p-3">Status</th>
                <th className="p-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.enrollment_id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{r.student_name}</td>
                  <td className="p-3 font-mono text-xs">{r.global_student_id ?? "—"}</td>
                  <td className="p-3">{r.admission_number}</td>
                  <td className="p-3 capitalize">{r.verification_status.replaceAll("_", " ")}</td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.submitted_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
