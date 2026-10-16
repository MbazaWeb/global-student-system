import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Pencil, Check, X, Info } from "lucide-react";
import { institutionService, type InstitutionSelf } from "../services/institutionService";

// Tanzania regions (same curated list as the onboarding form).
const TZ_REGIONS: string[] = [
  "Arusha", "Dar es Salaam", "Dodoma", "Geita", "Iringa", "Kagera",
  "Kigoma", "Kilimanjaro", "Lindi", "Manyara", "Mara", "Mbeya",
  "Morogoro", "Mtwara", "Mwanza", "Njombe", "Pemba North", "Pemba South",
  "Pwani", "Rukwa", "Ruvuma", "Shinyanga", "Simiyu", "Singida",
  "Songwe", "Tabora", "Tanga", "Unguja North", "Unguja South",
  "Unguja West", "Katavi",
];

const STATUS_STYLE: Record<string, string> = {
  verified: "bg-emerald-50 text-emerald-700",
  pending: "bg-amber-50 text-amber-800",
  rejected: "bg-red-50 text-red-700",
  review_required: "bg-blue-50 text-blue-700",
};

export default function InstitutionProfile() {
  const [inst, setInst] = useState<InstitutionSelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await institutionService.self();
      setInst(data);
      if (data) {
        setEditName(data.name);
        setEditCode(data.institution_code ?? "");
        setEditRegion(data.region ?? "");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institution profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving || !inst) return;
    setSaving(true);
    setSaveError("");
    setSaveOk(false);
    try {
      await institutionService.updateProfile(editName.trim(), editCode.trim(), editRegion.trim());
      setSaveOk(true);
      setEditing(false);
      await load();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (!inst) return;
    setEditName(inst.name);
    setEditCode(inst.institution_code ?? "");
    setEditRegion(inst.region ?? "");
    setEditing(false);
    setSaveError("");
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-base outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100";
  const labelClass = "text-sm font-semibold text-slate-700";

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={24} aria-hidden="true" /></span>
          <div>
            <h1 className="text-3xl font-bold">Institution profile</h1>
            <p className="mt-1 text-sm text-slate-500">Manage your institution details. Country and status are set by platform admins.</p>
          </div>
        </div>
        {!editing && inst && (
          <button
            type="button"
            onClick={() => { setEditing(true); setSaveOk(false); }}
            disabled={saving}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            <Pencil size={16} aria-hidden="true" /> Edit
          </button>
        )}
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {saveError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{saveError}</p>}
      {saveOk && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">Profile updated.</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : !inst ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No institution assigned</h3>
          <p className="mt-2 text-sm text-slate-500">A platform admin must assign you to an institution.</p>
        </div>
      ) : editing ? (
        <form onSubmit={save} className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Edit institution details</h2>
          <div className="mt-4 grid gap-4">
            <label className={labelClass}>Institution name
              <input required minLength={3} maxLength={200} className={fieldClass} value={editName} onChange={(e) => setEditName(e.target.value)} disabled={saving} />
            </label>
            <label className={labelClass}>Institution code
              <input required minLength={1} maxLength={50} className={fieldClass} value={editCode} onChange={(e) => setEditCode(e.target.value)} disabled={saving} />
            </label>
            <label className={labelClass}>Region / Province
              <select required className={fieldClass} value={editRegion} onChange={(e) => setEditRegion(e.target.value)} disabled={saving}>
                <option value="">Select region</option>
                {TZ_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" onClick={cancel} disabled={saving} className="flex min-h-12 items-center gap-2 rounded-xl border border-slate-200 px-4 font-semibold disabled:opacity-50">
              <X size={17} aria-hidden="true" /> Cancel
            </button>
            <button type="submit" disabled={saving} className="flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-4 font-bold text-white disabled:opacity-50">
              <Check size={17} aria-hidden="true" /> {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <dl className="divide-y divide-slate-100">
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Name</dt>
              <dd className="text-right font-semibold">{inst.name}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Country</dt>
              <dd className="text-right font-mono text-sm">{inst.country_code}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Institution code</dt>
              <dd className="text-right font-mono text-sm">{inst.institution_code ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Region / Province</dt>
              <dd className="text-right text-sm">{inst.region ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Verification status</dt>
              <dd className="text-right"><span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[inst.verification_status] ?? "bg-slate-100 text-slate-600"}`}>{inst.verification_status.replaceAll("_", " ")}</span></dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Institution ID</dt>
              <dd className="text-right font-mono text-xs">{inst.id}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-slate-500">Created</dt>
              <dd className="text-right text-sm">{new Date(inst.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
          {inst.verification_status === "pending" && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Info size={18} className="mt-0.5 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-xs leading-5 text-amber-900">
                Your institution is awaiting approval. You can edit your name, code and region while you wait.
                Students cannot see your institution or enroll until a platform admin approves it.
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-slate-500">Country and verification status are managed by platform admins. To change country, contact GSS support.</p>
        </section>
      )}
    </main>
  );
}
