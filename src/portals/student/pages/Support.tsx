import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

type StudentCase = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

type StudentCaseDetail = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  transaction_id: string | null;
  refund_request_id: string | null;
  created_at: string;
  updated_at: string;
  notes: { id: string; body: string; author_id: string; created_at: string }[];
};

type StudentTransaction = {
  id: string;
  reference: string;
  amount_minor: number;
  currency_code: string;
  transaction_type: string;
  status: string;
  occurred_at: string;
};

type StudentRefund = {
  id: string;
  case_id: string;
  transaction_id: string;
  amount_minor: number;
  currency_code: string;
  reason: string;
  status: string;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
};

type DetailRow = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  transaction_id: string | null;
  refund_request_id: string | null;
  created_at: string;
  updated_at: string;
  note_id: string | null;
  note_body: string | null;
  note_author: string | null;
  note_created_at: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800",
  in_progress: "bg-blue-50 text-blue-700",
  awaiting_student: "bg-violet-50 text-violet-700",
  resolved: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-600",
  refunded: "bg-emerald-50 text-emerald-700",
};

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function foldDetail(rows: DetailRow[]): StudentCaseDetail | null {
  if (!rows || rows.length === 0) return null;
  const head = rows[0];
  const notes = rows
    .filter((r) => r.note_id)
    .map((r) => ({ id: r.note_id as string, body: r.note_body as string, author_id: r.note_author as string, created_at: r.note_created_at as string }));
  return {
    id: head.id,
    subject: head.subject,
    description: head.description,
    status: head.status,
    priority: head.priority,
    transaction_id: head.transaction_id,
    refund_request_id: head.refund_request_id,
    created_at: head.created_at,
    updated_at: head.updated_at,
    notes,
  };
}

export default function Support() {
  const { user } = useAuth();
  const [cases, setCases] = useState<StudentCase[]>([]);
  const [refunds, setRefunds] = useState<StudentRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [transactionId, setTransactionId] = useState("");
  const [transactions, setTransactions] = useState<StudentTransaction[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentCaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [c, r, t] = await Promise.all([
        supabase.rpc("gss_student_support_cases"),
        supabase.rpc("gss_student_refund_requests"),
        supabase.from("gss_transactions").select("id,reference,amount_minor,currency_code,transaction_type,status,occurred_at").order("occurred_at", { ascending: false }).limit(50),
      ]);
      if (c.error) throw c.error;
      if (r.error) throw r.error;
      if (t.error) throw t.error;
      setCases((c.data ?? []) as StudentCase[]);
      setRefunds((r.data ?? []) as StudentRefund[]);
      setTransactions((t.data ?? []) as StudentTransaction[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load your support cases.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function loadDetail(caseId: string) {
    if (!supabase) return;
    setDetailLoading(true);
    setDetailError("");
    try {
      const { data, error } = await supabase.rpc("gss_student_support_case_detail", { p_case_id: caseId });
      if (error) throw error;
      setDetail(foldDetail((data ?? []) as DetailRow[]));
      setOpenCaseId(caseId);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Unable to load case.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!supabase || submitting) return;
    if (subject.trim().length < 3) { setFormError("Subject must be at least 3 characters."); return; }
    if (description.trim().length < 10) { setFormError("Description must be at least 10 characters."); return; }
    setSubmitting(true);
    setFormError("");
    try {
      const { error } = await supabase.rpc("gss_student_open_support_case", {
        p_subject: subject.trim(),
        p_description: description.trim(),
        p_transaction_id: transactionId || null,
        p_priority: priority,
      });
      if (error) throw error;
      setSubject("");
      setDescription("");
      setPriority("normal");
      setTransactionId("");
      setShowForm(false);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not open case.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitReply() {
    if (!supabase || !openCaseId || reply.trim().length < 1 || replying) return;
    setReplying(true);
    setDetailError("");
    try {
      const { error } = await supabase.rpc("gss_student_add_support_note", { p_case_id: openCaseId, p_body: reply.trim() });
      if (error) throw error;
      setReply("");
      await loadDetail(openCaseId);
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Could not add reply.");
    } finally {
      setReplying(false);
    }
  }

  async function closeCase() {
    if (!supabase || !openCaseId) return;
    if (!window.confirm("Close this support case? You can still view it afterwards.")) return;
    setDetailError("");
    try {
      const { error } = await supabase.rpc("gss_student_close_support_case", { p_case_id: openCaseId });
      if (error) throw error;
      await loadDetail(openCaseId);
      await load();
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : "Could not close case.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 px-5 py-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Support</h1>
          <p className="mt-1 text-sm text-slate-500">Open a case from a transaction or a general question.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="min-h-11 rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
        >
          {showForm ? "Cancel" : "Open a case"}
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      {showForm && (
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-bold">New support case</h2>
          <label className="block text-sm font-semibold text-slate-700">Subject (3–200 chars)
            <input
              required
              minLength={3}
              maxLength={200}
              className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 p-3 text-sm"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief summary of your issue"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Description (10–4000 chars)
            <textarea
              required
              minLength={10}
              maxLength={4000}
              className="mt-2 block min-h-32 w-full rounded-xl border border-slate-200 p-3 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened and what you need"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Related transaction (optional)
            <select
              className="mt-2 block min-h-12 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            >
              <option value="">No specific transaction</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.reference} · {t.currency_code} {(t.amount_minor / 100).toFixed(2)} · {new Date(t.occurred_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="text-sm font-semibold text-slate-700">
            <legend>Priority</legend>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={priority === p.value}
                  onClick={() => setPriority(p.value)}
                  className={`min-h-11 rounded-xl border px-2 py-2 text-sm font-semibold ${priority === p.value ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-700"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>
          {formError && <p role="alert" className="text-sm text-red-700">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-xl bg-blue-700 px-4 py-3 font-bold text-white disabled:opacity-40"
          >
            {submitting ? "Opening…" : "Submit case"}
          </button>
        </form>
      )}

      {loading ? (
        <p role="status" className="text-slate-500">Loading your cases…</p>
      ) : cases.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
          <h3 className="font-bold">No support cases yet</h3>
          <p className="mt-2 text-sm text-slate-500">Tap "Open a case" to start a conversation with support.</p>
        </div>
      ) : (
        <section>
          <h2 className="text-lg font-bold">Your cases</h2>
          <ul className="mt-3 space-y-3">
            {cases.map((c) => (
              <li key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <button type="button" onClick={() => void loadDetail(c.id)} className="block w-full text-left">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-bold">{c.subject}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[c.status] ?? ""}`}>{c.status.replaceAll("_", " ")}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Opened {new Date(c.created_at).toLocaleDateString()} · {c.priority} priority</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {refunds.length > 0 && (
        <section>
          <h2 className="text-lg font-bold">Refund requests</h2>
          <ul className="mt-3 space-y-3">
            {refunds.map((r) => (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{r.currency_code} {(r.amount_minor / 100).toFixed(2)}</p>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{r.reason}</p>
                {r.decision_note && <p className="mt-2 text-xs text-slate-500">Decision: {r.decision_note}</p>}
                <p className="mt-2 text-xs text-slate-400">Requested {new Date(r.created_at).toLocaleDateString()}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {openCaseId && (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5">
          {detailLoading ? (
            <p role="status" className="text-sm text-slate-600">Loading case…</p>
          ) : detailError ? (
            <p role="alert" className="text-sm text-red-700">{detailError}</p>
          ) : detail ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-bold">{detail.subject}</h2>
                <button type="button" onClick={() => { setOpenCaseId(null); setDetail(null); }} className="text-xs font-semibold text-blue-700 underline">Close</button>
              </div>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{detail.description}</p>
              <p className="mt-2 text-xs text-slate-500">Status: <span className="font-semibold capitalize">{detail.status.replaceAll("_", " ")}</span> · Priority: <span className="capitalize">{detail.priority}</span></p>

              {detail.notes.length > 0 && (
                <ol className="mt-4 space-y-2">
                  {detail.notes.map((n) => (
                    <li key={n.id} className="rounded-lg bg-white p-3 text-sm">
                      <p className="whitespace-pre-wrap break-words text-slate-700">{n.body}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(n.created_at).toLocaleString()}</p>
                    </li>
                  ))}
                </ol>
              )}

              {detail.status !== "closed" && detail.status !== "resolved" && (
                <div className="mt-4 space-y-2 border-t border-blue-200 pt-4">
                  <label className="block text-sm font-semibold text-slate-700">Add a reply
                    <textarea
                      required
                      minLength={1}
                      maxLength={4000}
                      className="mt-2 block min-h-24 w-full rounded-lg border border-slate-200 p-3 text-sm"
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={replying || !reply.trim()}
                      onClick={() => void submitReply()}
                      className="min-h-11 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                    >
                      {replying ? "Sending…" : "Send reply"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void closeCase()}
                      className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                    >
                      Close case
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </section>
      )}
    </main>
  );
}
