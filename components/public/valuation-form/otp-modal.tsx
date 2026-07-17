"use client";

import { type ClipboardEvent, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export const DEMO_OTP_CODE = "123456";

type Props = {
  open: boolean;
  phone: string;
  verifying: boolean;
  onVerify: (code: string) => Promise<{ ok: boolean }>;
  onClose: () => void;
};

export function OtpModal({ open, phone, verifying, onVerify, onClose }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  async function attemptVerify(code: string) {
    setError(null);
    const res = await onVerify(code);
    if (!res.ok) {
      setError("Incorrect code. This is a demo — use the code shown above.");
      setShake(true);
      setDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
      setTimeout(() => setShake(false), 350);
    }
  }

  function handleChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      attemptVerify(next.join(""));
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      attemptVerify(pasted);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Verify your number">
      <p className="mb-4 text-fluid--1 leading-6 text-text-muted">
        Enter the 6-digit code sent to <span className="text-text">{phone}</span> via SMS.
      </p>
      <p className="mb-4 rounded-card border border-gold/40 bg-gold/10 px-3 py-2 text-fluid--1 text-gold">
        Demo mode: no SMS sent. Use code <span className="font-semibold">{DEMO_OTP_CODE}</span>.
      </p>
      <div className={cn("flex gap-2", shake && "animate-shake")} onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !d && i > 0) inputsRef.current[i - 1]?.focus();
            }}
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-full rounded-card border border-border-gold/45 bg-bg/45 text-center text-fluid-1 text-text outline-none transition-all focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)]"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-fluid--1 text-danger" role="alert" aria-live="assertive">
          {error}
        </p>
      )}
      {verifying && <p className="mt-3 text-fluid--1 text-text-muted">Verifying...</p>}
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
