import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2, Calendar, X } from "lucide-react";
import { institutionService, type CatalogueRow } from "../services/institutionService";

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 9 }, (_, i) => {
  const y = currentYear + 2 - i;
  return `${y}/${y + 1}`;
});

export default function AcademicYears() {
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CatalogueRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await institutionService.listCatalogues();
      setRows(all.filter((r) => r.kind === "academic_year"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load academic years.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openNew() { setEditing(null); setYear(""); setActive(false); setFormError(""); setShowForm(true); }
  function openEdit(r: CatalogueRow) { setEditing(r); setYear(r.year ?? ""); setActive(r.active ?? false); setFormError(""); setShowForm(true); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!year) { setFormError("Select an academic year."); return; }
    setBusy(true);
    setFormError("");
    try {
      await institutionService.upsertAcademicYear(editing?.id ?? null, year, active);
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save academic year.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this academic year? Tuition fees referencing it will keep their amount but lose the link.")) return;
    try {
      await institutionService.deleteAcademicYear(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete academic year.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Calendar size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-3xl font-bold">Academic years</h1>
            <p className="mt-1 text-sm text-slate-500">Manage the academic years at your institution.</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add year</button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No academic years yet</h3>
          <p className="mt-2 text-sm text-slate-500">Add the academic years your institution uses.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.year}</p>
                {r.active && <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>}
              </div>
              <button type="button" aria-label="Edit" onClick={() => openEdit(r)} className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><Pencil size={16} aria-hidden="true" /></button>
              <button type="button" aria-label="Delete" onClick={() => void remove(r.id)} className="grid h-11 w-11 place-items-center rounded-full bg-red-50 text-red-700"><Trash2 size={16} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4">
          <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-t-3xl bg-white p-6 shadow-xl sm:rounded-3xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editing ? "Edit academic year" : "Add academic year"}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={18} aria-hidden="true" /></button>
            </div>
            {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <label className="block text-sm font-semibold text-slate-700">Year
              <select required value={year} onChange={(e) => setYear(e.target.value)} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <option value="">Select year</option>
                {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Mark as active
            </label>
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
