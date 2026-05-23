import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://opcuaxkndslmejhuauyq.supabase.co";

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_BdyBW7dYCg5qf4bBkRFdHQ_doLtqCsy";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
