import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side Supabase client bound to Next.js cookies, used to read the
// current portal session in Server Components/Route Handlers. Still the
// anon key, not the service-role key — this client only ever asks "who is
// signed in," never queries client/request/task data directly (that's
// getSupabaseAdmin(), same as every /admin page).
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render — cookies can't be set
          // there. Safe to ignore since the callback route and layout
          // handle the actual session writes.
        }
      },
    },
  });
}

// getUser() against an expired access token triggers Supabase's rotating
// refresh-token exchange. Refresh tokens are single-use: if two Server
// Action requests land close together while the token is expired (e.g. a
// burst of checklist clicks late in a long session), both read the same
// not-yet-rotated refresh token cookie, only one redemption succeeds, and
// the other comes back with a null user — a real "Not signed in." even
// though the session is genuinely still valid (confirmed 2026-08-21: a
// page reload recovered it instantly, since the reload picked up the
// cookie the winning request had already written). One short retry
// absorbs that race without masking a genuine logout — a truly signed-out
// user still fails on the retry.
export async function getUserWithRetry(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const first = await supabase.auth.getUser();
  if (first.data.user) return first;
  await new Promise((resolve) => setTimeout(resolve, 350));
  return supabase.auth.getUser();
}
