/** enrollmentService — typed wrappers for institution enrollment reads.
 *  Enrollment intake happens student-side via gss_submit_enrollment_details.
 *  Institution admins review via gss_institution_verification_queue and
 *  decide via gss_decide_enrollment_verification. */
import { supabase } from "../../../lib/supabase";

export type QueueRow = {
  request_id: string;
  student_name: string;
  admission_number: string;
  status: string;
  created_at: string;
  review_note: string | null;
};

export async function fetchVerificationQueue(): Promise<QueueRow[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("gss_institution_verification_queue");
  if (error) throw error;
  return (data ?? []) as QueueRow[];
}

export async function decideEnrollment(
  requestId: string, decision: "verified" | "rejected", note: string
): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { error } = await supabase.rpc("gss_decide_enrollment_verification", {
    p_request_id: requestId, p_decision: decision, p_note: note,
  });
  if (error) throw error;
}

export {};
