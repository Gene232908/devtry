"use client";

import { useCallback, useRef, useState } from "react";
import { leadSchema } from "./lead.schema";
import { normalizeWhatsappPhone } from "@/lib/whatsapp/phone";
import {
  emptyPhoneVerification,
  emptyValues,
  FormErrors,
  FormState,
  PhoneVerification,
  ValuationFormValues,
} from "./form.types";

const RESEND_COOLDOWN_MS = 60 * 1000;
const DEMO_OTP_CODE = "123456";
const FETCH_TIMEOUT_MS = 15 * 1000;

const OTP_MESSAGES = {
  incorrect: "Incorrect verification code.",
  expired: "Verification code expired.",
  tooManyAttempts: "Too many incorrect attempts.",
  cooldown: "Please wait before requesting another code.",
  sendFailed: "Unable to send the code. Please try again.",
};

function messageForKind(kind: string | undefined): string {
  switch (kind) {
    case "otp_invalid":
      return OTP_MESSAGES.incorrect;
    case "otp_expired":
      return OTP_MESSAGES.expired;
    case "too_many_attempts":
      return OTP_MESSAGES.tooManyAttempts;
    case "resend_cooldown":
    case "rate_limited":
      return OTP_MESSAGES.cooldown;
    default:
      return OTP_MESSAGES.sendFailed;
  }
}

/** fetch() with a hard timeout — a hung request must never leave the UI stuck forever. */
async function fetchWithTimeout(input: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Flow (matches the client's spec): fill out the whole form -> click the
// final submit button -> that's what sends the OTP -> code entry modal ->
// verify -> the lead is submitted automatically right after verification
// succeeds. The phone field itself lives in Step 1, but nothing there
// triggers an OTP send on its own — only the final step's submit button does.
export function useValuationForm() {
  const [values, setValues] = useState<ValuationFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<FormState>("filling");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerification>(emptyPhoneVerification);
  const startedAtRef = useRef<number>(Date.now());

  const setField = useCallback(<K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => {
    setValues((v) => {
      // Trim is connected to make + model, so reset it when either changes.
      if (key === "make") return { ...v, make: value as string, model: "", trim: "" };
      if (key === "model") return { ...v, model: value as string, trim: "" };
      return { ...v, [key]: value };
    });
    // Skip the state update entirely when there's nothing to clear — avoids
    // a wasted re-render on every keystroke of a clean (no-error) field.
    setErrors((e) => (e[key] === undefined ? e : { ...e, [key]: undefined }));

    // Editing the phone number after it was verified immediately invalidates
    // the verified status — a new number always requires a fresh OTP.
    if (key === "whatsapp") {
      setPhoneVerification((pv) => {
        if (pv.status === "unverified" && !pv.proof) return pv;
        if (value === pv.verifiedPhone) return pv;
        return emptyPhoneVerification;
      });
    }
  }, []);

  const validate = useCallback(() => {
    const result = leadSchema.safeParse(values);
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors: FormErrors = {};
    for (const issue of result.error.issues) {
      const key = issue.path[0] as keyof ValuationFormValues;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    setErrors(fieldErrors);
    return false;
  }, [values]);

  const validateStep = useCallback(
    (fields: Array<keyof ValuationFormValues>) => {
      const result = leadSchema.safeParse(values);
      const stepIssues = result.success
        ? []
        : result.error.issues.filter((issue) => fields.includes(issue.path[0] as keyof ValuationFormValues));

      if (stepIssues.length === 0) {
        setErrors((current) => {
          const next = { ...current };
          fields.forEach((field) => {
            next[field] = undefined;
          });
          return next;
        });
        return true;
      }

      const fieldErrors: FormErrors = {};
      for (const issue of stepIssues) {
        const key = issue.path[0] as keyof ValuationFormValues;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors((current) => ({ ...current, ...fieldErrors }));
      return false;
    },
    [values],
  );

  const sendOtp = useCallback(async () => {
    const phone = normalizeWhatsappPhone(values.whatsapp);
    if (!phone) {
      // Never leave the caller (submit()) mid-flight without resetting
      // state — an early return here previously left the submit button
      // stuck showing "Submitting" forever with no visible error, since
      // this error is attached to a Step 1 field that may not be on screen.
      setState("filling");
      setErrors((e) => ({ ...e, whatsapp: "Use 0501234567 or +971501234567" }));
      return { ok: false as const, invalidPhone: true as const };
    }

    setPhoneVerification((pv) => ({ ...pv, status: "sending", errorMessage: null }));

    try {
      const res = await fetchWithTimeout("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, honeypot: values.honeypot, startedAt: startedAtRef.current }),
      });
      const body = await res.json();

      if (res.ok && body.ok) {
        setState("filling");
        setPhoneVerification({
          status: "code_sent",
          verifiedPhone: null,
          proof: null,
          devBypass: body.data?.devBypass === true,
          resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
          errorMessage: null,
        });
        return { ok: true as const };
      }

      // Backend unreachable/not configured: fall back to a client-only demo
      // so the flow is still fully testable without live WhatsApp credentials.
      if (res.status === 503) {
        setState("filling");
        setPhoneVerification({
          status: "code_sent",
          verifiedPhone: null,
          proof: null,
          devBypass: true,
          resendAvailableAt: Date.now() + RESEND_COOLDOWN_MS,
          errorMessage: null,
        });
        return { ok: true as const };
      }

      setState("filling");
      setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: messageForKind(body?.error?.kind) }));
      return { ok: false as const };
    } catch {
      setState("filling");
      setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: OTP_MESSAGES.sendFailed }));
      return { ok: false as const };
    }
  }, [values.whatsapp, values.honeypot]);

  /** Submits the lead once a proof (or demo verification) is in hand. */
  const submitLead = useCallback(
    async (proof: string | null) => {
      setState("submitting");

      // Demo-mode verification (no server proof) — the backend was never
      // reachable at all, so there's nothing real to submit; just complete
      // the demo flow client-side.
      if (!proof) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        setState("success");
        return;
      }

      try {
        const res = await fetchWithTimeout("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, proof }),
        });
        const body = await res.json();
        if (!res.ok || !body.ok) {
          setState("filling");
          setSubmitError(body?.error?.message || "Couldn't submit your details. Please try again.");
          return;
        }
        setState("success");
      } catch {
        setState("filling");
        setSubmitError("Something went wrong. Please try again.");
      }
    },
    [values],
  );

  const verifyPhoneOtp = useCallback(
    async (code: string) => {
      const phone = normalizeWhatsappPhone(values.whatsapp);
      if (!phone) return { ok: false as const };

      setPhoneVerification((pv) => ({ ...pv, status: "verifying", errorMessage: null }));

      try {
        const res = await fetchWithTimeout("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, code }),
        });

        if (res.status === 503) {
          // Backend unreachable — accept the demo code client-side only.
          if (code === DEMO_OTP_CODE) {
            setPhoneVerification((pv) => ({
              ...pv,
              status: "verified",
              verifiedPhone: values.whatsapp,
              proof: null,
              errorMessage: null,
            }));
            await submitLead(null);
            return { ok: true as const };
          }
          setPhoneVerification((pv) => ({ ...pv, status: "code_sent", errorMessage: OTP_MESSAGES.incorrect }));
          return { ok: false as const };
        }

        const body = await res.json();
        if (!res.ok || !body.ok) {
          const kind = body?.error?.kind;
          setPhoneVerification((pv) => ({
            ...pv,
            status: kind === "too_many_attempts" ? "error" : "code_sent",
            errorMessage: messageForKind(kind),
          }));
          return { ok: false as const };
        }

        setPhoneVerification((pv) => ({
          status: "verified",
          verifiedPhone: values.whatsapp,
          proof: body.data.proof,
          devBypass: pv.devBypass,
          resendAvailableAt: null,
          errorMessage: null,
        }));
        await submitLead(body.data.proof);
        return { ok: true as const };
      } catch {
        setPhoneVerification((pv) => ({ ...pv, status: "code_sent", errorMessage: OTP_MESSAGES.sendFailed }));
        return { ok: false as const };
      }
    },
    [values.whatsapp, submitLead],
  );

  const resendOtp = useCallback(() => sendOtp(), [sendOtp]);

  const cancelOtp = useCallback(() => {
    setState("filling");
    setPhoneVerification((pv) => (pv.status === "verified" ? pv : emptyPhoneVerification));
  }, []);

  // Triggered by the final step's submit button: validates the whole form,
  // then sends the OTP (opening the code-entry modal). Verification and the
  // actual lead submission happen from within the modal once the code is
  // confirmed — see verifyPhoneOtp/submitLead above.
  const submit = useCallback(async () => {
    setState("validating");
    setSubmitError(null);

    if (Date.now() - startedAtRef.current < 1500 || values.honeypot) {
      setSubmitError("Please try again.");
      setState("filling");
      return { ok: false as const };
    }

    if (!validate()) {
      setState("filling");
      return { ok: false as const };
    }

    if (phoneVerification.status === "verified" && phoneVerification.verifiedPhone === values.whatsapp) {
      await submitLead(phoneVerification.proof);
      return { ok: true as const };
    }

    return sendOtp();
  }, [validate, values.honeypot, values.whatsapp, phoneVerification, submitLead, sendOtp]);

  const reset = useCallback(() => {
    setValues(emptyValues);
    setErrors({});
    setSubmitError(null);
    setPhoneVerification(emptyPhoneVerification);
    startedAtRef.current = Date.now();
    setState("filling");
  }, []);

  return {
    values,
    errors,
    state,
    submitError,
    phoneVerification,
    setField,
    submit,
    validateStep,
    verifyPhoneOtp,
    resendOtp,
    cancelOtp,
    reset,
  };
}
