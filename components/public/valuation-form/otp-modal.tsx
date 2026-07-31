"use client";

import { type ClipboardEvent, useEffect, useRef, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { PhoneVerification } from "./form.types";

type Props = {
  phone: string;
  phoneVerification: PhoneVerification;
  /** True while the verified lead is being saved — keeps this dialog on screen. */
  submitting: boolean;
  onVerify: (code: string) => Promise<{ ok: boolean }>;
  onResend: () => void;
  onClose: () => void;
};

const DEMO_CODE_HINT = "123456";

export function OtpModal({ phone, phoneVerification, submitting, onVerify, onResend, onClose }: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [shake, setShake] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Deliberately stays open through submission. Verifying used to close this
  // dialog the instant the code was accepted, leaving the screen empty while
  // the lead saved and then snapping the thank-you in — the success had no
  // visible moment of its own.
  const open =
    ["sending", "code_sent", "verifying", "error"].includes(phoneVerification.status) || submitting;
  const verifying = phoneVerification.status === "verifying";
  const succeeded = submitting || phoneVerification.status === "verified";
  const showTestCodeHint = phoneVerification.devBypass;

  // Live 60s resend countdown.
  useEffect(() => {
    if (!phoneVerification.resendAvailableAt) return;
    const id = setInterval(() => setNowMs(Date.now()), 500);
    return () => clearInterval(id);
  }, [phoneVerification.resendAvailableAt]);

  useEffect(() => {
    if (!open) {
      setDigits(Array(6).fill(""));
    }
  }, [open]);

  useEffect(() => {
    if (phoneVerification.errorMessage) {
      setShake(true);
      setDigits(Array(6).fill(""));
      inputsRef.current[0]?.focus();
      const t = setTimeout(() => setShake(false), 350);
      return () => clearTimeout(t);
    }
  }, [phoneVerification.errorMessage]);

  if (!open) return null;

  const resendRemainingSec = phoneVerification.resendAvailableAt
    ? Math.max(0, Math.ceil((phoneVerification.resendAvailableAt - nowMs) / 1000))
    : 0;

  function handleChange(i: number, v: string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) inputsRef.current[i + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("").length === 6) {
      onVerify(next.join(""));
    }
  }

  function handlePaste(e: ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      onVerify(pasted);
    }
  }

  if (succeeded) {
    // Same dialog, same position — only the contents change, so verification
    // and the thank-you read as one continuous step rather than two windows.
    //
    // No tick here on purpose: the work is still in flight, and a success mark
    // beside "sending" contradicts itself. The tick belongs to the thank-you,
    // where it is actually true. An indeterminate sweep is used rather than a
    // filling bar because the wait has no knowable length.
    return (
      <Dialog open={open} onClose={onClose} title="Almost done" hideClose>
        <div className="flex flex-col gap-5 py-2 animate-fade-in">
          <div className="flex flex-col gap-1.5">
            <p className="text-fluid-0 leading-7 text-text">Your number is confirmed.</p>
            <p className="text-fluid--1 text-text-muted" aria-live="polite">
              Sending your request to the CarVibeDubai team…
            </p>
          </div>

          {/* A band of light travelling a hairline track. The soft gradient
              edges are what keep it from reading as a mechanical block. */}
          <div
            className="relative h-[3px] w-full overflow-hidden rounded-full bg-border-gold/25"
            role="progressbar"
            aria-label="Sending your request"
          >
            <div
              aria-hidden="true"
              className={cn(
                "absolute inset-0 animate-progress-sweep",
                "bg-[linear-gradient(90deg,transparent_0%,rgba(243,222,138,.15)_25%,rgba(243,222,138,.95)_50%,rgba(243,222,138,.15)_75%,transparent_100%)]",
                // Reduced motion still gets a visible indicator, just a still one.
                "motion-reduce:animate-none motion-reduce:bg-[linear-gradient(90deg,rgba(243,222,138,.5),rgba(243,222,138,.5))]",
              )}
            />
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={onClose} title="Verify your WhatsApp number">
      <p className="mb-4 text-fluid--1 leading-6 text-text-muted">
        Enter the 6-digit code sent to <span className="text-text">{phone}</span> via WhatsApp.
      </p>
      {showTestCodeHint && (
        <p className="mb-4 rounded-card border border-gold/40 bg-gold/10 px-3 py-2 text-fluid--1 text-gold">
          Test mode: no WhatsApp message sent. Use code <span className="font-semibold">{DEMO_CODE_HINT}</span>.
        </p>
      )}
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
            disabled={verifying}
            inputMode="numeric"
            maxLength={1}
            className="h-12 w-full rounded-card border border-border-gold/45 bg-bg/45 text-center text-fluid-1 text-text outline-none transition-all focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)] disabled:opacity-60"
            aria-label={`Digit ${i + 1}`}
          />
        ))}
      </div>
      {phoneVerification.errorMessage && (
        <p className="mt-3 text-fluid--1 text-danger" role="alert" aria-live="assertive">
          {phoneVerification.errorMessage}
        </p>
      )}
      {verifying && (
        <p className="mt-3 text-fluid--1 text-text-muted" aria-live="polite">
          Verifying...
        </p>
      )}
      <div className="mt-5 flex items-center justify-between">
        {resendRemainingSec > 0 ? (
          <span className="text-fluid--1 text-text-faint">Resend available in {resendRemainingSec}s</span>
        ) : (
          <button type="button" onClick={onResend} className="text-fluid--1 text-gold hover:underline">
            Resend OTP
          </button>
        )}
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Dialog>
  );
}
