import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the secret / service-role key.
// This BYPASSES Row Level Security, so it must NEVER be imported into client
// ("use client") code. Only use it from Route Handlers / Server Components.

let cached: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secret) {
    throw new Error("Supabase admin is not configured (missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY).");
  }

  cached = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      /**
       * Every query goes to the database, never to Next's Data Cache.
       *
       * Next patches the global `fetch` inside Server Components and caches
       * responses by default. supabase-js sets no `cache` option of its own, so
       * admin queries were being served from that cache: `router.refresh()`
       * re-ran the render, the render "fetched" again, and Next returned the
       * stored response. The figures only moved on a hard reload, which is a
       * new process with an empty cache — exactly the symptom.
       *
       * `force-dynamic` on each page was not enough on its own, and relying on
       * it was the mistake: it governs the ROUTE, while this governs the
       * REQUEST, and this is the layer that was serving stale rows.
       *
       * There is nothing to lose by disabling it. Admin data is live by
       * definition — a cached count is not a saving, it is a wrong answer.
       */
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
