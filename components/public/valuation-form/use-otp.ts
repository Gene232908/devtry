"use client";

import { useCallback, useRef, useState } from "react";

const MOCK_CODE = "123456";
const RESEND_COOLDOWN = 60;
const MAX_ATTEMPTS = 5;

export function useOtp() {
  const [resendIn, setResendIn] = useState(0);
  const [attemptsLeft, setAttemptsLeft] = useState(MAX_ATTEMPTS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setResendIn(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  const send = useCallback(async () => {
    // mocked: no real Twilio Verify call in front-end-only build
    await new Promise((r) => setTimeout(r, 700));
    startCooldown();
    return { ok: true as const };
  }, [startCooldown]);

  const verify = useCallback(async (code: string) => {
    await new Promise((r) => setTimeout(r, 600));
    if (code === MOCK_CODE || /^\d{6}$/.test(code)) {
      return { ok: true as const };
    }
    setAttemptsLeft((a) => Math.max(0, a - 1));
    return { ok: false as const, attemptsLeft: attemptsLeft - 1 };
  }, [attemptsLeft]);

  return { send, verify, resendIn, attemptsLeft, mockCode: MOCK_CODE };
}
