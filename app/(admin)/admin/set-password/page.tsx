"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/public/Logo";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const MIN_LENGTH = 8;

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();

      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({ must_change_password: false }).eq("id", user.id);
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-card border border-border-gold bg-surface p-8 card-shadow">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-center font-display text-fluid-2 text-text">Set Your Password</h1>
        <p className="mb-6 text-center text-fluid--1 text-text-faint">
          First time signing in - choose a new password to continue.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="password" className="mb-1 block text-fluid--1 text-text-muted">
              New Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border border-border-gold bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="mb-1 block text-fluid--1 text-text-muted">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-card border border-border-gold bg-bg px-3 py-2 text-text focus:outline-none focus:ring-1 focus:ring-gold"
            />
          </div>

          {error && <p className="text-fluid--1 text-danger">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-card bg-gold px-4 py-2 font-medium text-bg transition hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
