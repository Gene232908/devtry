import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client using the publishable / anon key.
// Safe to use in client code: it is governed by Row Level Security.
// Uses cookie-based session storage (not localStorage) so the session is
// visible to middleware.ts and server-side Route Handlers for auth gating.

let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Supabase is not configured (missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY).");
  }

  cached = createBrowserClient(url, anon);
  return cached;
}
