import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Plus, X, LoaderCircle, Check } from "lucide-react";
import { adminService, type InstitutionRow } from "../services/adminService";

const COUNTRIES: { code: string; name: string }[] = [
  { code: "TZ", name: "Tanzania" },
  { code: "KE", name: "Kenya" },
  { code: "UG", name: "Uganda" },
  { code: "RW", name: "Rwanda" },
  { code: "BI", name: "Burundi" },
  { code: "CD", name: "DR Congo" },
  { code: "ZM", name: "Zambia" },
  { code: "MW", name: "Malawi" },
  { code: "MZ", name: "Mozambique" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "ZA", name: "South Africa" },
  { code: "EG", name: "Egypt" },
  { code: "IN", name: "India" },
  { code: "CN", name: "China" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "AE", name: "United Arab Emirates" },
];

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

  // Create-institution modal state
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cCountry, setCCountry] = useState("TZ");
  const [cCode, setCCode] = useState("");
  const [cRegion, setCRegion] = useState("");
  const [cNote, setCNote] = useState("");
  const [cBusy, setCBusy] = useState(false);
  const [cError, setCErr] = useState("");
  const [cSuccess, setCSuccess] = useState("");

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

  function openCreate() {
    setCName(""); setCCountry("TZ"); setCCode(""); setCRegion(""); setCNote("");
    setCErr(""); setCSuccess("");
    setShowCreate(true);
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    if (cBusy) return;
    if (cName.trim().length < 3) { setCErr("Institution name must be at least 3 characters."); return; }
    if (cNote.trim().length < 10) { setCErr("A note of at least 10 characters is required (audit trail)."); return; }
    setCBusy(true); setCErr(""); setCSuccess("");
    try {
      const id = await adminService.createInstitution(cName.trim(), cCountry, cCode.trim(), cRegion.trim(), cNote.trim());
      setCSuccess(`Institution created. ID: ${id}`);
      setCName(""); setCCode(""); setCRegion(""); setCNote("");
      await load();
    } catch (e) {
      setCErr(e instanceof Error ? e.message : "Could not create institution.");
    } finally {
      setCBusy(false);
    }
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  const labelClass = "text-sm font-semibold text-slate-700";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-3xl font-bold">Institution management</h1>
            <p className="mt-1 text-sm text-slate-500">All institutions. Create directly or approve applications.</p>
          </div>
        </div>
        <button type="button" onClick={openCreate} className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
          <Plus size={18} aria-hidden="true" />Create institution
        </button>
      </header>

      <section className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input aria-label="Search institutions" className="min-h-11 flex-1 rounded-lg border border-slate-200 p-3 text-sm min-w-48" placeholder="Search name, country, code or region" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <p className="mt-2 text-sm text-slate-500">No institutions match your filters. Use "Create institution" to add one directly.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Country</th>
                <th className="p-3">Code</th>
                <th className="p-3">Region</th>
                <th className="p-3">Status</th>
                <th className="p-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-semibold">{r.name}</td>
                  <td className="p-3 font-mono text-xs">{r.country_code}</td>
                  <td className="p-3 font-mono text-xs">{r.institution_code ?? "—"}</td>
                  <td className="p-3 text-xs">{r.region ?? "—"}</td>
                  <td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.verification_status] ?? ""}`}>{r.verification_status.replaceAll("_", " ")}</span></td>
                  <td className="p-3 text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div role="dialog" aria-modal="true" aria-labelledby="create-inst-title" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
          <form onSubmit={submitCreate} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 id="create-inst-title" className="text-lg font-bold">Create institution</h2>
              <button type="button" onClick={() => setShowCreate(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={18} aria-hidden="true" /></button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Creates the institution as <strong>verified</strong> immediately. A platform admin can then assign an institution admin. An audit row is written.</p>

            {cError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{cError}</p>}
            {cSuccess && (
              <div role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                <Check size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                <p>{cSuccess}</p>
              </div>
            )}

            <div className="mt-4 grid gap-4">
              <label className={labelClass}>Institution name
                <input required minLength={3} maxLength={200} className={fieldClass} placeholder="e.g. University of Dar es Salaam" value={cName} onChange={(e) => setCName(e.target.value)} disabled={cBusy} />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className={labelClass}>Country
                  <select required className={fieldClass} value={cCountry} onChange={(e) => setCCountry(e.target.value)} disabled={cBusy}>
                    {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                  </select>
                </label>
                <label className={labelClass}>Institution code <span className="font-normal text-slate-400">(optional)</span>
                  <input maxLength={50} className={fieldClass} placeholder="e.g. UDSM-2026" value={cCode} onChange={(e) => setCCode(e.target.value)} disabled={cBusy} />
                </label>
              </div>
              <label className={labelClass}>Region / Province <span className="font-normal text-slate-400">(optional)</span>
                <input maxLength={100} className={fieldClass} placeholder="e.g. Dar es Salaam" value={cRegion} onChange={(e) => setCRegion(e.target.value)} disabled={cBusy} />
              </label>
              <label className={labelClass}>Audit note <span className="font-normal text-slate-400">(10–2000 chars, required)</span>
                <textarea required minLength={10} maxLength={2000} className={`${fieldClass} min-h-24`} placeholder="Explain why this institution is being created directly (e.g. verified authority out-of-band)." value={cNote} onChange={(e) => setCNote(e.target.value)} disabled={cBusy} />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setShowCreate(false)} className="min-h-12 rounded-xl border border-slate-200 font-semibold disabled:opacity-50" disabled={cBusy}>Close</button>
              <button type="submit" disabled={cBusy} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 font-bold text-white disabled:opacity-50">
                {cBusy ? <><LoaderCircle size={18} className="animate-spin" aria-hidden="true" />Creating…</> : <><Plus size={18} aria-hidden="true" />Create institution</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
