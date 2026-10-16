import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { adminService, type InstitutionRow } from "../services/adminService";

const STATUS_STYLE: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-800",
  rejected: "bg-red-50 text-red-700",
  review_required: "bg-blue-50 text-blue-700",
};

export default function InstitutionManagement() {
  const [rows, setRows] = useState<InstitutionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRows(await adminService.listInstitutions(search, status));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institutions.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Institution management</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only list of all institutions. Approvals and admin assignments are in their own pages.</p>
        </div>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input aria-label="Search institutions" className="min-h-11 flex-1 rounded-lg border border-slate-200 p-3 text-sm min-w-48" placeholder="Search name or country" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select aria-label="Filter by status" className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "verified", "pending", "rejected", "review_required"].map((s) => <option key={s} value={s}>{s === "" ? "All statuses" : s.replaceAll("_", " ")}</option>)}
        </select>
        <button onClick={() => void load()} className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50">Refresh</button>
      </section>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No institutions</h3>
          <p className="mt-2 text-sm text-slate-500">No institutions match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Country</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3 font-mono text-xs">{r.country_code}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.verification_status] ?? ""}`}>{r.verification_status.replaceAll("_", " ")}</span></td>
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
