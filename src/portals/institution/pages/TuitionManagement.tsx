import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Pencil, Trash2, Banknote, X } from "lucide-react";
import { institutionService, type CatalogueRow } from "../services/institutionService";
import { formatMinor } from "../../../lib/money";

type Form = {
  id: string | null;
  label: string;
  amountMinor: string;
  currency: string;
  programmeId: string;
  academicYearId: string;
};

const emptyForm: Form = { id: null, label: "", amountMinor: "", currency: "TZS", programmeId: "", academicYearId: "" };

export default function TuitionManagement() {
  const [rows, setRows] = useState<CatalogueRow[]>([]);
  const [programmes, setProgrammes] = useState<CatalogueRow[]>([]);
  const [years, setYears] = useState<CatalogueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const all = await institutionService.listCatalogues();
      setRows(all.filter((r) => r.kind === "tuition_fee"));
      setProgrammes(all.filter((r) => r.kind === "programme"));
      setYears(all.filter((r) => r.kind === "academic_year"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load tuition fees.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openNew() { setForm(emptyForm); setFormError(""); setShowForm(true); }
  function openEdit(r: CatalogueRow) {
    setForm({
      id: r.id,
      label: r.label ?? "",
      amountMinor: r.amount_minor != null ? String(r.amount_minor) : "",
      currency: r.currency_code ?? "TZS",
      programmeId: "",
      academicYearId: "",
    });
    setFormError("");
    setShowForm(true);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.label.trim().length < 2) { setFormError("Label must be at least 2 characters."); return; }
    const amount = Number(form.amountMinor);
    if (!Number.isInteger(amount) || amount < 0) { setFormError("Amount must be a non-negative whole number (minor units)."); return; }
    if (!/^[A-Z]{3}$/.test(form.currency)) { setFormError("Currency must be 3 uppercase letters."); return; }
    setBusy(true);
    setFormError("");
    try {
      await institutionService.upsertTuitionFee(
        form.id, form.label.trim(), amount, form.currency,
        form.programmeId || null, form.academicYearId || null
      );
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save tuition fee.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this tuition fee entry?")) return;
    try {
      await institutionService.deleteTuitionFee(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete tuition fee.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Banknote size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-3xl font-bold">Tuition fees</h1>
            <p className="mt-1 text-sm text-slate-500">Publish tuition fee schedules for your students.</p>
          </div>
        </div>
        <button type="button" onClick={openNew} className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Add fee</button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No tuition fees published</h3>
          <p className="mt-2 text-sm text-slate-500">Add fee schedules so students can see what they owe.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.label}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.programme_name ? `${r.programme_name} · ` : ""}{r.academic_year ? r.academic_year : ""}
                </p>
              </div>
              <p className="font-bold">{formatMinor(r.amount_minor ?? 0, r.currency_code ?? "TZS")}</p>
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
              <h2 className="text-lg font-bold">{form.id ? "Edit fee" : "Add fee"}</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full bg-slate-100"><X size={18} aria-hidden="true" /></button>
            </div>
            {formError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <label className="block text-sm font-semibold text-slate-700">Label (2–200 chars)
              <input required minLength={2} maxLength={200} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 p-3 text-sm" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-semibold text-slate-700">Amount (minor units)
                <input required inputMode="numeric" className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 p-3 text-sm" value={form.amountMinor} onChange={(e) => setForm({ ...form, amountMinor: e.target.value.replace(/\D/g, "").slice(0, 12) })} />
              </label>
              <label className="block text-sm font-semibold text-slate-700">Currency
                <input required pattern="[A-Z]{3}" maxLength={3} className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 p-3 text-sm uppercase" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </label>
            </div>
            <label className="block text-sm font-semibold text-slate-700">Programme (optional)
              <select className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value })}>
                <option value="">No programme</option>
                {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">Academic year (optional)
              <select className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}>
                <option value="">No academic year</option>
                {years.map((y) => <option key={y.id} value={y.id}>{y.year}</option>)}
              </select>
            </label>
            <button type="submit" disabled={busy} className="min-h-12 w-full rounded-xl bg-blue-700 py-3 font-bold text-white disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
          </form>
        </div>
      )}
    </main>
  );
}
