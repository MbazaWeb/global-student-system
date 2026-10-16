import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2, Building2, X } from "lucide-react";
import { institutionService, type CatalogueRow } from "../services/institutionService";

export default function Departments() {
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<CatalogueRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await institutionService.listCatalogues();
      setRows(all.filter((r) => r.kind === "department"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openNew() { setEditing(null); setName(""); setFormError(""); setShowForm(true); }
  function openEdit(r: CatalogueRow) { setEditing(r); setName(r.name); setFormError(""); setShowForm(true); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) { setFormError("Name must be at least 2 characters."); return; }
    setBusy(true);
    setFormError("");
    try {
      await institutionService.upsertDepartment(editing?.id ?? null, name.trim());
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save department.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this department?")) return;
    try {
      await institutionService.deleteDepartment(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete department.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-3xl font-bold">Departments</h1>
            <p className="mt-1 text-sm text-slate-500">Manage the departments at your institution.</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add department</button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No departments yet</h3>
          <p className="mt-2 text-sm text-slate-500">Add the departments at your institution.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <p className="min-w-0 flex-1 font-semibold">{r.name}</p>
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
              <h2 className="text-lg font-bold">{editing ? "Edit department" : "Add department"}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={18} aria-hidden="true" /></button>
            </div>
            {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <label className="block text-sm font-semibold text-slate-700">Name (2–200 chars)
              <input required minLength={2} maxLength={200} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 p-3 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
