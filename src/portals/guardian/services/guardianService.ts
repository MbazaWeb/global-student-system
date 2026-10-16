import { supabase } from "../../../lib/supabase";

export type Relationship = "parent" | "legal_guardian" | "sponsor" | "other";

export const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "legal_guardian", label: "Legal guardian" },
  { value: "sponsor", label: "Sponsor" },
  { value: "other", label: "Other" },
];

export interface GuardianChild {
  link_id: string;
  student_id: string;
  student_name: string;
  global_student_id: string;
  relationship: Relationship;
  enrollments: { institution: string; status: string }[];
}

export interface ChildPayment {
  reference: string;
  amount_minor: number;
  currency_code: string;
  transaction_type: string;
  status: string;
  description: string;
  occurred_at: string;
}

function db() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function fail(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

export const guardianService = {
  async listChildren(): Promise<GuardianChild[]> {
    const { data, error } = await db().rpc("gss_guardian_children");
    fail(error);
    return (data ?? []) as GuardianChild[];
  },
  /** Resolves without an error for unknown IDs and duplicates, so the response cannot be used to find students. */
  async requestLink(globalStudentId: string, relationship: Relationship): Promise<void> {
    const { error } = await db().rpc("gss_request_guardian_link", {
      p_global_student_id: globalStudentId,
      p_relationship: relationship,
    });
    fail(error);
  },
  async childPayments(studentId: string): Promise<ChildPayment[]> {
    const { data, error } = await db().rpc("gss_guardian_child_payments", { p_student_id: studentId });
    fail(error);
    return (data ?? []) as ChildPayment[];
  },
};
