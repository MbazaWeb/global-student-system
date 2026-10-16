import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Users } from "lucide-react";
import { fetchDirectory, type DirectoryRow } from "../services/admissionService";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800",
  verified: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
  review_required: "bg-blue-50 text-blue-700",
};

/** StudentStatus — aggregate view of enrollment status across the directory. */
export default function StudentStatus() {
  const [rows, setRows] = useState<DirectoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Supabase is not configured.");
      setRows(await fetchDirectory());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load directory.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const counts = {
    total: rows.length,
    pending: rows.filter((r) => r.verification_status === "pending").length,
    verified: rows.filter((r) => r.verification_status === "verified").length,
    rejected: rows.filter((r) => r.verification_status === "rejected").length,
    review_required: rows.filter((r) => r.verification_status === "review_required").length,
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Users size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Student status</h1>
          <p className="mt-1 text-sm text-slate-500">Enrollment status across your institution.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total", value: counts.total },
          { label: "Pending", value: counts.pending },
          { label: "Verified", value: counts.verified },
          { label: "Rejected", value: counts.rejected },
        ].map((c) => (
          <div key={c.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-600">{c.label}</p>
            <p className="mt-2 text-3xl font-bold">{loading ? "—" : c.value}</p>
          </div>
        ))}
      </section>

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No students enrolled</h3>
          <p className="mt-2 text-sm text-slate-500">Students who submit admission details will appear here.</p>
        </div>
      ) : (
        <section>
          <h2 className="text-xl font-bold">By status</h2>
          <ul className="mt-3 space-y-2">
            {Object.entries(STATUS_STYLE).map(([key, style]) => {
              const subset = rows.filter((r) => r.verification_status === key);
              if (subset.length === 0) return null;
              return (
                <li key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${style}`}>{key.replaceAll("_", " ")}</span>
                    <span className="text-sm font-semibold">{subset.length}</span>
                  </div>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {subset.map((r) => (
                      <li key={r.enrollment_id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{r.student_name}</p>
                          <p className="font-mono text-xs text-slate-500">{r.global_student_id ?? "No GSS ID"}</p>
                        </div>
                        <p className="text-xs text-slate-500">{r.admission_number}</p>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </main>
  );
}
