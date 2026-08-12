import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

// Cookie-aware Supabase client for Route Handlers / Server Components.
// Reads the signed-in admin's session from cookies (set by the browser
// client during login) - governed by RLS, NOT the service role.
// Use this to check "who is logged in", not for privileged data access.
export function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  const cookieStore = cookies();

  return createServerClient(url, anon, {
    // Same reason as the admin client: Next caches `fetch` inside Server
    // Components, and "who is logged in" must never be answered from a stored
    // response.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render - safe to ignore since
          // middleware already refreshes the session cookie on navigation.
        }
      },
    },
  });
}
