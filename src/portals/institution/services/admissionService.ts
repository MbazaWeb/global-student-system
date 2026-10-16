/** admissionService — typed wrappers for institution admission reads.
 *  The actual verification decision RPC is gss_decide_enrollment_verification
 *  (called directly from StudentVerification). This service collects the
 *  read helpers used by the directory and admissions list pages. */
import { supabase } from "../../../lib/supabase";

export type DirectoryRow = {
  enrollment_id: string;
  student_name: string;
  global_student_id: string | null;
  admission_number: string;
  verification_status: string;
  submitted_at: string;
};

export async function fetchDirectory(): Promise<DirectoryRow[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("gss_institution_student_directory");
  if (error) throw error;
  return (data ?? []) as DirectoryRow[];
}

export {};
