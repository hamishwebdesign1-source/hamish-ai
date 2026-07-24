import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client for the portal login flow only (signInWithOtp).
// Uses the public anon key — never the service-role key, which stays
// server-only in src/lib/supabase.ts.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
