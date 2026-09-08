"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/public/Logo";

import { useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "disabled"
      ? "Your account has been disabled by the owner."
      : null
  );
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // a second submit while one is in flight would spend an attempt
    setError(null);
    setLoading(true);
    try {
      // Goes through our own route rather than calling Supabase directly, so
      // the attempt passes a server-side rate limiter before any credential is
      // checked. Signing in from the browser meant no code of ours ran, and
      // eight wrong passwords in a row were all processed unimpeded.
      //
      // The route signs in with a cookie-writing server client, so the session
      // cookies arrive on this response exactly as they did before.
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        // The 429 carries a real wait; everything else is the deliberately
        // indistinguishable credential failure.
        setError(json?.error?.message ?? "Incorrect email or password.");
        setLoading(false);
        return;
      }
      // Deliberately does NOT clear `loading` — the page is on its way out, and
      // resetting it would flash an idle form during the redirect.
      setRedirecting(true);
      // Middleware decides whether this account needs /admin/set-password first.
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      {redirecting && (
        // Covers the gap between a successful sign-in and the dashboard being
        // ready, so the wait reads as progress rather than a frozen form.
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-bg animate-overlay-in">
          <Logo />
          <div className="flex items-center gap-2.5 text-fluid--1 text-text-muted">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            Signing you in…
          </div>
        </div>
      )}

      <div className="w-full max-w-sm rounded-card border border-border-gold bg-surface p-8 card-shadow animate-pop-in motion-reduce:animate-none">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-display text-fluid-2 text-text">Admin Sign In</h1>
        <p className="mb-6 text-center text-fluid--1 text-text-faint">CarVibeDubai staff access only</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-fluid--1 text-text-muted">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border border-border-gold bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-fluid--1 text-text-muted">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border border-border-gold bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          {error && <p className="text-fluid--1 text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex items-center justify-center gap-2 rounded-card bg-gold px-4 py-2 font-medium text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
