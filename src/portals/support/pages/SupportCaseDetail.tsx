import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { supportService, type SupportCaseDetail, type RefundRequest } from "../services/supportService";
import { useAuth } from "../../../auth/AuthProvider";
import { formatMinor } from "../../../lib/money";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-700",
  awaiting_student: "bg-violet-50 text-violet-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  refunded: "bg-emerald-50 text-emerald-700",
};

const STATUSES = ["open", "in_progress", "awaiting_student", "resolved", "closed"];

export default function SupportCaseDetail() {
  const { caseId = "" } = useParams();
  const { roles } = useAuth();
  const canRequestRefund = roles.includes("support_lead") || roles.includes("platform_admin");
  const canDecideRefund = roles.includes("platform_admin");

  const [detail, setDetail] = useState<SupportCaseDetail | null>(null);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [noteBody, setNoteBody] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"internal" | "student">("internal");
  const [submittingNote, setSubmittingNote] = useState(false);

  const [statusValue, setStatusValue] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const [showRefundForm, setShowRefundForm] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [submittingDecision, setSubmittingDecision] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [d, r] = await Promise.all([
        supportService.caseDetail(caseId),
        supportService.listRefundRequests(""),
      ]);
      setDetail(d);
      setStatusValue(d?.status ?? "");
      setRefunds(r.filter((x) => x.case_id === caseId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load case.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!noteBody.trim() || submittingNote) return;
    setSubmittingNote(true);
    setError("");
    try {
      await supportService.addNote(caseId, noteBody.trim(), noteVisibility);
      setNoteBody("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add note.");
    } finally {
      setSubmittingNote(false);
    }
  }

  async function submitStatus() {
    if (!statusValue || submittingStatus || statusValue === detail?.status) return;
    setSubmittingStatus(true);
    setError("");
    try {
      await supportService.setCaseStatus(caseId, statusValue);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update status.");
    } finally {
      setSubmittingStatus(false);
    }
  }

  async function submitRefund(e: FormEvent) {
    e.preventDefault();
    if (!detail?.transaction_id || submittingRefund) return;
    const amount = Number(refundAmount);
    if (!Number.isInteger(amount) || amount <= 0) {
      setError("Enter a positive whole-number TZS amount.");
      return;
    }
    if (refundReason.trim().length < 10) {
      setError("Refund reason must be at least 10 characters.");
      return;
    }
    setSubmittingRefund(true);
    setError("");
    try {
      await supportService.requestRefund(caseId, detail.transaction_id, amount, "TZS", refundReason.trim());
      setRefundAmount("");
      setRefundReason("");
      setShowRefundForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request refund.");
    } finally {
      setSubmittingRefund(false);
    }
  }

  async function submitDecision(refundId: string, decision: "approved" | "rejected" | "processed") {
    const note = (decisionNote[refundId] ?? "").trim();
    if (note.length < 10) {
      setError("Decision note must be at least 10 characters.");
      return;
    }
    setSubmittingDecision(refundId + decision);
    setError("");
    try {
      await supportService.decideRefund(refundId, decision, note);
      setDecisionNote((m) => ({ ...m, [refundId]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decide refund.");
    } finally {
      setSubmittingDecision(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <nav>
        <Link to="/support/cases" className="text-sm font-semibold text-blue-700 underline">← All cases</Link>
      </nav>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {loading ? (
        <p role="status" className="text-slate-500">Loading case…</p>
      ) : !detail ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">Case not found</h3>
          <p className="mt-2 text-sm text-slate-500">This case may have been removed.</p>
        </div>
      ) : (
        <>
          <header className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold">{detail.subject}</h1>
                <p className="mt-1 text-xs text-slate-500">Case {detail.id}</p>
                <p className="mt-1 text-xs text-slate-500">Student: <span className="font-mono">{detail.student_id}</span></p>
                {detail.transaction_id && <p className="mt-1 text-xs text-slate-500">Transaction: <span className="font-mono">{detail.transaction_id}</span></p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[detail.status] ?? ""}`}>{detail.status.replaceAll("_", " ")}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize">{detail.priority} priority</span>
              </div>
            </div>
            <p className="mt-4 whitespace-pre-wrap break-words text-sm text-slate-700">{detail.description}</p>
          </header>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <select value={statusValue} onChange={(e) => setStatusValue(e.target.value)} className="min-h-11 rounded-lg border border-slate-200 p-3 text-sm">
                {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
              </select>
              <button
                type="button"
                disabled={submittingStatus || statusValue === detail.status}
                onClick={() => void submitStatus()}
                className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {submittingStatus ? "Saving…" : "Update status"}
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Refunded status is set automatically when a refund is processed.</p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-bold">Notes timeline</h2>
            {detail.notes.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No notes yet. Add the first reply below.</p>
            ) : (
              <ol className="mt-3 space-y-3">
                {detail.notes.map((n) => (
                  <li key={n.id} className={`rounded-lg border p-3 text-sm ${n.visibility === "internal" ? "border-slate-200 bg-slate-50" : "border-blue-200 bg-blue-50"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">{n.visibility === "internal" ? "Internal note" : "Visible to student"}</span>
                      <time className="text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-slate-700">{n.body}</p>
                    <p className="mt-2 font-mono text-[10px] text-slate-400">Author {n.author_id}</p>
                  </li>
                ))}
              </ol>
            )}

            <form onSubmit={submitNote} className="mt-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-700">Add a note
                <textarea
                  required
                  minLength={1}
                  maxLength={4000}
                  className="mt-2 block min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                  placeholder="Type your reply or internal note (1-4000 chars)"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                />
              </label>
              <fieldset className="flex flex-wrap items-end gap-4">
                <legend className="sr-only">Visibility</legend>
                <label className="text-sm font-semibold text-slate-700">Visibility
                  <select
                    value={noteVisibility}
                    onChange={(e) => setNoteVisibility(e.target.value as "internal" | "student")}
                    className="ml-2 rounded-lg border border-slate-200 p-2 text-sm"
                  >
                    <option value="internal">Internal (staff only)</option>
                    <option value="student">Visible to student</option>
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={submittingNote || !noteBody.trim()}
                  className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {submittingNote ? "Adding…" : "Add note"}
                </button>
              </fieldset>
            </form>
          </section>

          {canRequestRefund && detail.transaction_id && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">Refund request</h2>
                <button
                  type="button"
                  onClick={() => setShowRefundForm((v) => !v)}
                  className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  {showRefundForm ? "Cancel" : detail.refund_request_id ? "Request another refund" : "Request refund"}
                </button>
              </div>
              {showRefundForm && (
                <form onSubmit={submitRefund} className="mt-4 space-y-3">
                  <p className="text-xs text-slate-500">Refund amount cannot exceed the original transaction amount. Currency is TZS.</p>
                  <label className="block text-sm font-semibold text-slate-700">Amount (TZS)
                    <input
                      required
                      inputMode="numeric"
                      className="mt-2 block min-h-11 w-full rounded-lg border border-slate-200 p-3 text-sm"
                      placeholder="e.g. 30000"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value.replace(/\D/g, "").slice(0, 9))}
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">Reason (10-2000 chars)
                    <textarea
                      required
                      minLength={10}
                      maxLength={2000}
                      className="mt-2 block min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={submittingRefund}
                    className="min-h-11 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {submittingRefund ? "Submitting…" : "Submit refund request"}
                  </button>
                </form>
              )}
            </section>
          )}

          {refunds.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-bold">Refund requests on this case</h2>
              <ul className="mt-3 space-y-4">
                {refunds.map((r) => (
                  <li key={r.id} className="rounded-lg border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">{formatMinor(r.amount_minor, r.currency_code)}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                        r.status === "pending" ? "bg-amber-50 text-amber-800"
                        : r.status === "approved" ? "bg-blue-50 text-blue-700"
                        : r.status === "processed" ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                      }`}>{r.status}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{r.reason}</p>
                    {r.decision_note && <p className="mt-2 text-xs text-slate-500">Decision: {r.decision_note}</p>}
                    <p className="mt-2 text-xs text-slate-400">Requested {new Date(r.created_at).toLocaleString()}</p>

                    {canDecideRefund && r.status === "pending" && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <label className="block text-sm font-semibold text-slate-700">Decision note (10-2000 chars)
                          <textarea
                            required
                            minLength={10}
                            maxLength={2000}
                            className="mt-2 block min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
                            value={decisionNote[r.id] ?? ""}
                            onChange={(e) => setDecisionNote((m) => ({ ...m, [r.id]: e.target.value }))}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={submittingDecision === r.id + "approved"}
                            onClick={() => void submitDecision(r.id, "approved")}
                            className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                          >Approve</button>
                          <button
                            type="button"
                            disabled={submittingDecision === r.id + "rejected"}
                            onClick={() => void submitDecision(r.id, "rejected")}
                            className="min-h-11 rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-40"
                          >Reject</button>
                        </div>
                      </div>
                    )}
                    {canDecideRefund && r.status === "approved" && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                        <label className="block text-sm font-semibold text-slate-700">Processing note (10-2000 chars)
                          <textarea
                            required
                            minLength={10}
                            maxLength={2000}
                            className="mt-2 block min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
                            value={decisionNote[r.id] ?? ""}
                            onChange={(e) => setDecisionNote((m) => ({ ...m, [r.id]: e.target.value }))}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={submittingDecision === r.id + "processed"}
                          onClick={() => void submitDecision(r.id, "processed")}
                          className="min-h-11 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                        >Mark processed</button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
