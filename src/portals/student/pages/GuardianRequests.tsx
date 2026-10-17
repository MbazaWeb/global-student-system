import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Clock3, ShieldCheck, UsersRound, X, UserRound, AlertTriangle } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type GuardianLink = { id: string; guardian_name: string | null; relationship: string; status: string; created_at: string };
type Action = "accept" | "decline" | "revoke";
const RELATIONSHIP_LABEL: Record<string, string> = {
  parent: "Parent", legal_guardian: "Legal guardian", sponsor: "Sponsor", other: "Other",
};
const dateLabel = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export default function GuardianRequests() {
  const { user } = useAuth();
  const [links, setLinks] = useState<GuardianLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ id: string; action: Action; label: string } | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setError("Sign in to manage family access.");
      setLoading(false);
      return;
    }
    try {
      const { data, error: fetchError } = await supabase.rpc("gss_student_guardian_requests");
      if (fetchError) throw fetchError;
      setLinks((data ?? []) as GuardianLink[]);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load family access.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function act(id: string, action: Action) {
    if (!supabase || busy) return;
    setBusy(id);
    setError("");
    setMessage("");
    try {
      const result = await supabase.rpc("gss_decide_guardian_link", { p_link_id: id, p_decision: action === "accept" ? "approved" : action === "decline" ? "rejected" : "revoked" });
      if (result.error) throw result.error;
      await load();
      setMessage(action === "accept" ? "Family access approved." : action === "decline" ? "Request declined." : "Family access revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to update access. Try again.");
    } finally {
      setBusy(null);
      setConfirmation(null);
    }
  }

  const pending = links.filter(l => l.status === "pending");
  const active = links.filter(l => l.status === "approved");

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6 pb-28">
      <Link to="/student/profile" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-blue-700"><ArrowLeft size={17} /> Back to profile</Link>

      <header className="rounded-3xl bg-gradient-to-br from-[#1761c5] to-[#123b86] p-6 text-white shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15"><UsersRound size={25} /></span>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-blue-100">Student profile</p><h1 className="text-2xl font-extrabold">Family access</h1></div>
        </div>
        <p className="mt-4 text-sm leading-6 text-blue-100">Control which parents or guardians can view your student enrollment and payment information.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">{active.length} approved</span>
          <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold">{pending.length} pending</span>
        </div>
      </header>

      <div className="flex gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <ShieldCheck size={21} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p><strong>You stay in control.</strong> Requests need your approval before access is granted. You can revoke approved access at any time.</p>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={() => void load()} className="ml-3 font-bold underline">Retry</button></div>}
      {message && <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{message}</p>}

      {loading ? <div role="status" className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading family access…</div> : (
        <>
          <section aria-labelledby="pending-heading" className="space-y-3">
            <div className="flex items-center justify-between"><h2 id="pending-heading" className="flex items-center gap-2 text-lg font-extrabold"><Clock3 size={20} className="text-amber-600" /> Pending requests</h2><span className="text-sm font-semibold text-slate-500">{pending.length}</span></div>
            {pending.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center"><CheckCircle2 size={28} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-700">You're all caught up</p><p className="mt-1 text-sm text-slate-500">New family access requests will appear here.</p></div> : (
              <ul className="space-y-3">{pending.map(link => <li key={link.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700"><UserRound size={21} /></span><div className="min-w-0"><p className="font-bold text-slate-900">{link.guardian_name || RELATIONSHIP_LABEL[link.relationship] || link.relationship}</p><p className="mt-1 text-xs text-slate-500">Requested {dateLabel(link.created_at)}</p><span className="mt-2 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Awaiting your decision</span></div></div>
                <div className="mt-4 grid grid-cols-2 gap-3"><button type="button" disabled={busy !== null} onClick={() => void act(link.id, "accept")} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 font-bold text-white disabled:opacity-50"><Check size={17} /> Approve</button><button type="button" disabled={busy !== null} onClick={() => setConfirmation({id:link.id,action:"decline",label:link.guardian_name || RELATIONSHIP_LABEL[link.relationship] || link.relationship})} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 font-semibold text-slate-700 disabled:opacity-50"><X size={17} /> Decline</button></div>
              </li>)}</ul>
            )}
          </section>

          <section aria-labelledby="approved-heading" className="space-y-3">
            <div className="flex items-center justify-between"><h2 id="approved-heading" className="flex items-center gap-2 text-lg font-extrabold"><CheckCircle2 size={20} className="text-emerald-600" /> Approved family</h2><span className="text-sm font-semibold text-slate-500">{active.length}</span></div>
            {active.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center"><UsersRound size={28} className="mx-auto text-slate-400" /><p className="mt-3 font-semibold text-slate-700">No approved family members</p><p className="mt-1 text-sm text-slate-500">Once you approve a request, it will appear here.</p></div> : (
              <ul className="space-y-3">{active.map(link => <li key={link.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><UserRound size={21} /></span><div><p className="font-bold text-slate-900">{RELATIONSHIP_LABEL[link.relationship] ?? link.relationship}</p><p className="mt-1 text-xs font-semibold text-emerald-700">Access approved</p></div></div>
                <button type="button" disabled={busy !== null} onClick={() => setConfirmation({id:link.id,action:"revoke",label:RELATIONSHIP_LABEL[link.relationship] ?? link.relationship})} className="min-h-11 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Revoke access</button>
              </li>)}</ul>
            )}
          </section>
        </>
      )}

      {confirmation && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-5" role="presentation" onMouseDown={e => {if(e.target===e.currentTarget&&!busy)setConfirmation(null);}}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="family-confirm-title" aria-describedby="family-confirm-description" className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
          <AlertTriangle size={28} className="text-amber-600" aria-hidden="true" />
          <h2 id="family-confirm-title" className="mt-3 text-xl font-extrabold">{confirmation.action === "revoke" ? "Revoke family access?" : "Decline this request?"}</h2>
          <p id="family-confirm-description" className="mt-2 text-sm leading-6 text-slate-600">{confirmation.action === "revoke" ? "This family member will no longer be able to view your student information." : "This request will be declined and no access will be granted."}</p>
          <div className="mt-6 grid grid-cols-2 gap-3"><button type="button" disabled={busy !== null} onClick={() => setConfirmation(null)} className="min-h-12 rounded-xl border border-slate-200 font-semibold disabled:opacity-50">Cancel</button><button type="button" disabled={busy !== null} onClick={() => void act(confirmation.id,confirmation.action)} className="min-h-12 rounded-xl bg-red-700 font-bold text-white disabled:opacity-50">{busy ? "Updating…" : confirmation.action === "revoke" ? "Revoke access" : "Decline"}</button></div>
        </section>
      </div>}
    </main>
  );
}
