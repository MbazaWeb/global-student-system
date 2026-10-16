import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { guardianService, RELATIONSHIPS, type GuardianChild, type Relationship } from "../services/guardianService";

export default function GuardianDashboard() {
  const [children, setChildren] = useState<GuardianChild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [globalId, setGlobalId] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("parent");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setChildren(await guardianService.listChildren());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your children.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await guardianService.requestLink(globalId.trim(), relationship);
      setNotice("If the Global Student ID is correct, a request has been sent. The student must approve it before you can see their details.");
      setGlobalId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold">Guardian Portal</h1>
        <p className="mt-2 text-slate-600">Link to a student with their Global Student ID. Students approve every link.</p>
      </header>

      <section className="rounded-xl border bg-white p-5">
        <h2 className="font-bold">Link a student</h2>
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px_auto] sm:items-end">
          <label className="text-sm">
            Global Student ID
            <input
              required
              value={globalId}
              onChange={(e) => setGlobalId(e.target.value)}
              placeholder="GSS-0000000001"
              className="mt-1 w-full rounded border p-2 font-mono"
            />
          </label>
          <label className="text-sm">
            Relationship
            <select value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)} className="mt-1 w-full rounded border p-2">
              {RELATIONSHIPS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting || globalId.trim().length < 5} className="min-h-11 rounded bg-[#1761c5] px-4 py-2 font-semibold text-white disabled:opacity-40">
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
        {notice && <p role="status" className="mt-4 rounded bg-blue-50 p-3 text-sm text-blue-900">{notice}</p>}
      </section>

      {error && <p role="alert" className="text-red-700">{error}</p>}

      <section>
        <h2 className="text-xl font-bold">Your children</h2>
        {loading ? (
          <p className="mt-4">Loading…</p>
        ) : children.length === 0 ? (
          <p className="mt-4 text-slate-600">No approved students yet.</p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {children.map((child) => (
              <li key={child.link_id} className="rounded-xl border bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{child.student_name}</p>
                    <p className="font-mono text-sm text-slate-600">{child.global_student_id}</p>
                    <p className="text-sm text-slate-500 capitalize">{child.relationship.replace("_", " ")}</p>
                  </div>
                  <Link to={`/guardian/children/${child.student_id}/payments`} className="inline-flex min-h-11 items-center rounded border px-3 py-2 text-sm font-semibold">
                    View payments
                  </Link>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {child.enrollments.length === 0 && <li className="text-slate-500">No enrollments recorded.</li>}
                  {child.enrollments.map((en, i) => (
                    <li key={i}>{en.institution} · <span className="capitalize">{en.status}</span></li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
