import { supabase } from "../../../lib/supabase";

/**
 * studentVerificationService — typed wrappers around student-facing
 * verification reads. The verification queue itself is institution-scoped;
 * students only see their own requests via the student_global_ids and
 * enrollment_verification_requests RLS policies.
 */

export type VerificationRequestRow = {
  id: string;
  enrollment_id: string;
  status: string;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

export async function fetchStudentVerificationRequests(userId: string): Promise<VerificationRequestRow[]> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("enrollment_verification_requests")
    .select("id,enrollment_id,status,review_note,created_at,reviewed_at")
    .eq("student_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as VerificationRequestRow[];
}

export {};
