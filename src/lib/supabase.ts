import { createClient } from "@supabase/supabase-js";
// Public project URL and publishable key are safe for browser use; never use a secret/service_role key.
// Both values must come from VITE_ env vars. Hardcoded fallbacks are forbidden (no secrets in repo,
// and hardcoded values go stale when credentials are rotated).
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (import.meta.env.DEV && (!url || !key)) {
  console.error("[GSS] Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.");
}

export const supabase = url && key ? createClient(url, key) : null;
