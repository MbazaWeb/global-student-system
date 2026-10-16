import { createClient } from "@supabase/supabase-js";
// Public project URL and publishable key are safe for browser use; never use a secret/service_role key.
const url = import.meta.env.VITE_SUPABASE_URL || "https://guqrahxasuebxpdvkslm.supabase.co";
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_3YQGHiKwDPDU50ODKml9Jw_qKcQmRgg";
export const supabase = url && key ? createClient(url, key) : null;
