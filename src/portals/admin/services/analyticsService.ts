import { supabase } from "../../../lib/supabase";

/**
 * analyticsService — typed wrapper for the platform analytics RPC.
 * gss_admin_platform_analytics returns null for non-platform_admin callers.
 */
export async function fetchPlatformAnalytics(): Promise<Record<string, unknown> | null> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("gss_admin_platform_analytics");
  if (error) throw error;
  return (data ?? null) as Record<string, unknown> | null;
}

export {};
