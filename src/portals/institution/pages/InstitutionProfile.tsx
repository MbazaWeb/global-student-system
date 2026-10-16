import { useCallback, useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { institutionService, type InstitutionSelf } from "../services/institutionService";

export default function InstitutionProfile() {
  const [inst, setInst] = useState<InstitutionSelf | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setInst(await institutionService.self());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load institution profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <header className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><Building2 size={24} aria-hidden="true" /></span>
        <div>
          <h1 className="text-3xl font-bold">Institution profile</h1>
          <p className="mt-1 text-sm text-slate-500">Read-only details about your institution.</p>
        </div>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading…</p>
      ) : !inst ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No institution assigned</h3>
          <p className="mt-2 text-sm text-slate-500">A platform admin must assign you to an institution.</p>
        </div>
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
              <dd className="text-right"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold capitalize">{inst.verification_status.replaceAll("_", " ")}</span></dd>
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
          <p className="mt-4 text-xs text-slate-500">Institution details are managed by platform admins. To update name or country, contact GSS support.</p>
        </section>
      )}
    </main>
  );
}
