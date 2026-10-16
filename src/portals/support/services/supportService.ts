import { supabase } from "../../../lib/supabase";

export type SupportCaseListItem = {
  id: string;
  student_id: string;
  subject: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

export type SupportNoteRow = {
  note_id: string | null;
  note_body: string | null;
  note_author: string | null;
  note_visibility: string | null;
  note_created_at: string | null;
};

export type SupportCaseDetail = {
  id: string;
  student_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  transaction_id: string | null;
  refund_request_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  notes: { id: string; body: string; author_id: string; visibility: string; created_at: string }[];
};

export type SupportTransaction = {
  id: string;
  reference: string;
  student_id: string;
  global_student_id: string | null;
  amount_minor: number;
  currency_code: string;
  transaction_type: string;
  status: string;
  description: string;
  occurred_at: string;
};

export type RefundRequest = {
  id: string;
  case_id: string;
  transaction_id: string;
  student_id: string;
  amount_minor: number;
  currency_code: string;
  reason: string;
  status: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_by: string;
  created_at: string;
};

function db() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

/** Reduces the wide RPC row shape (one row per note) into a case + notes array. */
type SupportCaseDetailRow = {
  id: string;
  student_id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  transaction_id: string | null;
  refund_request_id: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  note_id: string | null;
  note_body: string | null;
  note_author: string | null;
  note_visibility: string | null;
  note_created_at: string | null;
};

function foldCaseDetail(rows: SupportCaseDetailRow[]): SupportCaseDetail | null {
  if (!rows || rows.length === 0) return null;
  const head = rows[0];
  const notes = rows
    .filter((r) => r.note_id)
    .map((r) => ({
      id: r.note_id as string,
      body: r.note_body as string,
      author_id: r.note_author as string,
      visibility: r.note_visibility as string,
      created_at: r.note_created_at as string,
    }));
  return {
    id: head.id,
    student_id: head.student_id,
    subject: head.subject,
    description: head.description,
    status: head.status,
    priority: head.priority,
    transaction_id: head.transaction_id,
    refund_request_id: head.refund_request_id,
    assigned_to: head.assigned_to,
    created_at: head.created_at,
    updated_at: head.updated_at,
    notes,
  };
}

export const supportService = {
  async listCases(status: string, search: string): Promise<SupportCaseListItem[]> {
    const { data, error } = await db().rpc("gss_support_list_cases", {
      p_status: status || null,
      p_search: search.trim() || null,
    });
    fail(error);
    return (data ?? []) as SupportCaseListItem[];
  },

  async caseDetail(caseId: string): Promise<SupportCaseDetail | null> {
    const { data, error } = await db().rpc("gss_support_case_detail", { p_case_id: caseId });
    fail(error);
    return foldCaseDetail((data ?? []) as SupportCaseDetailRow[]);
  },

  async addNote(caseId: string, body: string, visibility: "internal" | "student"): Promise<void> {
    const { error } = await db().rpc("gss_support_add_note", {
      p_case_id: caseId,
      p_body: body,
      p_visibility: visibility,
    });
    fail(error);
  },

  async setCaseStatus(caseId: string, status: string, assignTo?: string): Promise<void> {
    const { error } = await db().rpc("gss_support_set_case_status", {
      p_case_id: caseId,
      p_status: status,
      p_assign_to: assignTo ?? null,
    });
    fail(error);
  },

  async searchTransactions(query: string): Promise<SupportTransaction[]> {
    if (!query.trim()) return [];
    const { data, error } = await db().rpc("gss_support_search_transactions", { p_query: query.trim() });
    fail(error);
    return (data ?? []) as SupportTransaction[];
  },

  async requestRefund(
    caseId: string,
    transactionId: string,
    amountMinor: number,
    currencyCode: string,
    reason: string
  ): Promise<string> {
    const { data, error } = await db().rpc("gss_support_request_refund", {
      p_case_id: caseId,
      p_transaction_id: transactionId,
      p_amount_minor: amountMinor,
      p_currency_code: currencyCode,
      p_reason: reason,
    });
    fail(error);
    return data as string;
  },

  async listRefundRequests(status: string): Promise<RefundRequest[]> {
    const { data, error } = await db().rpc("gss_support_list_refund_requests", { p_status: status || null });
    fail(error);
    return (data ?? []) as RefundRequest[];
  },

  async decideRefund(refundId: string, decision: "approved" | "rejected" | "processed", note: string): Promise<void> {
    const { error } = await db().rpc("gss_admin_decide_refund", {
      p_refund_id: refundId,
      p_decision: decision,
      p_note: note,
    });
    fail(error);
  },
};
