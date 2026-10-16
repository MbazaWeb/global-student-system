import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../auth/AuthProvider";

/**
 * studentService — thin typed wrappers around student-facing reads that are
 * not yet encapsulated in a dedicated service. Kept minimal on purpose: most
 * student pages call RPCs directly through the supabase client because the
 * RPCs are simple. This module collects the few helpers that are reused.
 */

export type StudentProfileSummary = {
  display_name: string;
  phone: string | null;
  country_code: string | null;
  date_of_birth: string | null;
  avatar_path: string | null;
};

export async function fetchStudentProfile(userId: string): Promise<StudentProfileSummary | null> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase
    .from("student_profiles")
    .select("display_name,phone,country_code,date_of_birth,avatar_path")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as StudentProfileSummary | null;
}

export function useStudentProfile() {
  const { user } = useAuth();
  return { fetch: () => (user ? fetchStudentProfile(user.id) : Promise.resolve(null)) };
}

export {};
