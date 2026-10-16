/** institutionVerificationService — typed wrappers for institution-side
 *  verification reads. Mirrors enrollmentService but kept separate for
 *  future divergence (e.g. document verification vs. enrollment). */
import { supabase } from "../../../lib/supabase";

export type VerificationQueueRow = {
  request_id: string;
  student_name: string;
  admission_number: string;
  status: string;
  created_at: string;
  review_note: string | null;
};

export async function fetchQueue(): Promise<VerificationQueueRow[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("gss_institution_verification_queue");
  if (error) throw error;
  return (data ?? []) as VerificationQueueRow[];
}

export {};
