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
