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
import type { ValuationModalMode } from "../open-valuation-modal";
import type { PublicLeadVerificationMode } from "@/lib/server/public-lead-verification";

const RESEND_COOLDOWN_MS = 60 * 1000;
const FETCH_TIMEOUT_MS = 15 * 1000;

const OTP_MESSAGES = {
  incorrect: "Incorrect verification code.",
  expired: "Verification code expired.",
  tooManyAttempts: "Too many incorrect attempts.",
  cooldown: "Please wait before requesting another code.",
  // Distinct from `cooldown`: that one clears in 60 seconds, this one holds for
  // a rolling 24 hours, so retrying will not help and the copy must not imply
  // it will.
  // NOTE: this promises a callback. Nothing delivers on that automatically —
  // a blocked caller never completes verification, so no lead row is created
  // and they never appear in the admin dashboard. Their number is recorded in
  // whatsapp_otp_verifications, so honouring this requires someone to watch
  // that table. See the follow-up noted in docs when wiring that up.
  dailyLimit: "Too many verification requests. Our team will contact you shortly.",
  temporarilyUnavailable: "WhatsApp verification is temporarily unavailable. Please try again later.",
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
    case "daily_limit":
      return OTP_MESSAGES.dailyLimit;
    case "otp_sending_disabled":
      return OTP_MESSAGES.temporarilyUnavailable;
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
export function useValuationForm(mode: ValuationModalMode, verificationMode: PublicLeadVerificationMode) {
  const [values, setValues] = useState<ValuationFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<FormState>("filling");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerification>(emptyPhoneVerification);
  const startedAtRef = useRef<number>(Date.now());
  // Last payload sent to /api/partial-lead — suppresses repeat captures that
  // carry no new information.
  const capturedSignatureRef = useRef<string | null>(null);
  // Set the moment a real lead is created. Read synchronously by
  // capturePartial, which cannot wait for the `state` re-render.
  const submittedRef = useRef(false);
  const submissionIdRef = useRef<string | null>(null);

  const setField = useCallback(<K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => {
    submissionIdRef.current = null;
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
    if (result.success && (mode !== "scrap" || (values.scrapCondition.trim() && Number(values.scrapAskingPriceAed) >= 0))) {
      setErrors({});
      return true;
    }
    const fieldErrors: FormErrors = {};
    for (const issue of result.error?.issues ?? []) {
      const key = issue.path[0] as keyof ValuationFormValues;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    if (mode === "scrap") {
      if (!values.scrapCondition.trim()) fieldErrors.scrapCondition = "Describe the vehicle condition";
      if (!values.scrapAskingPriceAed || !Number.isFinite(Number(values.scrapAskingPriceAed)) || Number(values.scrapAskingPriceAed) < 0) {
        fieldErrors.scrapAskingPriceAed = "Enter a valid asking price";
      }
    }
    setErrors(fieldErrors);
    return false;
  }, [mode, values]);

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
        body: JSON.stringify({ phone, honeypot: values.honeypot, startedAt: startedAtRef.current, inquiryType: mode }),
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

      if (body?.error?.kind === "otp_sending_disabled") {
        setState("filling");
        setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: OTP_MESSAGES.temporarilyUnavailable }));
        return { ok: false as const };
      }

      if (res.status === 503) {
        setState("filling");
        setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: OTP_MESSAGES.temporarilyUnavailable }));
        return { ok: false as const };
      }

      // Already on file: an answer, not a failure. The modal shows the message
      // and no code box, because there is no code and nothing to retry.
      if (body?.error?.kind === "already_submitted") {
        setState("filling");
        setPhoneVerification((pv) => ({
          ...pv,
          status: "already_submitted",
          errorMessage: body?.error?.message ?? null,
        }));
        return { ok: false as const };
      }

      setState("filling");
      setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: messageForKind(body?.error?.kind) }));
      return { ok: false as const };
    } catch {
      setState("filling");
      setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: OTP_MESSAGES.sendFailed }));
      return { ok: false as const };
    }
  }, [mode, values.whatsapp, values.honeypot]);

  /** Only a persisted API response can complete either submission mode. */
  const submitLead = useCallback(
    async (proof: string | null) => {
      setState("submitting");
      if (!submissionIdRef.current) submissionIdRef.current = crypto.randomUUID();

      try {
        const res = await fetchWithTimeout("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...values, inquiryType: mode, proof, submissionId: submissionIdRef.current }),
        });
        const body = await res.json();
        if (!res.ok || !body.ok || typeof body.data?.id !== "string") {
          setState("filling");
          setSubmitError(body?.error?.message || "Couldn't submit your details. Please try again.");
          return;
        }
        submittedRef.current = true;
        setState("success");
      } catch {
        setState("filling");
        setSubmitError("Something went wrong. Please try again.");
      }
    },
    [mode, values],
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
        if (typeof body.data?.proof !== "string") {
          setPhoneVerification((pv) => ({ ...pv, status: "error", errorMessage: OTP_MESSAGES.temporarilyUnavailable }));
          return { ok: false as const };
        }
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

    if (verificationMode === "unverified") {
      await submitLead(null);
      return { ok: true as const };
    }

    if (phoneVerification.status === "verified" && phoneVerification.verifiedPhone === values.whatsapp) {
      await submitLead(phoneVerification.proof);
      return { ok: true as const };
    }

    return sendOtp();
  }, [validate, values.honeypot, values.whatsapp, verificationMode, phoneVerification, submitLead, sendOtp]);

  /**
   * Records a half-finished form so a visitor who types their name and number
   * and then leaves is still reachable. Fire-and-forget by design: it must
   * never delay, block, or fail the interaction that triggered it.
   *
   * Two guards keep this quiet. `capturedSignatureRef` skips the request
   * whenever nothing worth capturing has changed since last time, so ticking
   * consent on and off, or pressing Next twice, sends nothing. And a completed
   * submission stops capturing entirely — that person is a real lead now, and
   * the server refuses to re-open them as incomplete anyway.
   */
  const capturePartial = useCallback(
    (trigger: "close" | "consent" | "next" | "input", furthestStep: number) => {
      if (submittedRef.current || state === "success") return;

      // The phone number is the dedupe key and the only way to follow up, so
      // there is nothing to capture without a usable one.
      if (!normalizeWhatsappPhone(values.whatsapp)) return;
      if (values.honeypot.trim().length > 0) return;

      const payload = {
        fullName: values.fullName,
        whatsapp: values.whatsapp,
        consent: values.consent,
        furthestStep,
        trigger,
        honeypot: values.honeypot,
        make: values.make,
        model: values.model,
        year: values.year,
        mileageKm: values.mileageKm,
        mileageUnit: values.mileageUnit,
        specification: values.specification,
        description: values.description,
        inquiryType: mode,
        scrapCondition: values.scrapCondition,
        scrapAskingPriceAed: values.scrapAskingPriceAed,
      };

      // Trigger is excluded from the signature on purpose: the same details
      // arriving via a different trigger is not new information.
      const signature = JSON.stringify({ ...payload, trigger: undefined });
      if (signature === capturedSignatureRef.current) return;
      capturedSignatureRef.current = signature;

      try {
        void fetch("/api/partial-lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          // Lets the request survive the modal unmounting right after this.
          keepalive: true,
        }).catch(() => {
          // Ignored: a failed capture is invisible to the customer by design.
        });
      } catch {
        // Ignored — see above.
      }
    },
    [mode, state, values],
  );

  const reset = useCallback(() => {
    setValues(emptyValues);
    setErrors({});
    setSubmitError(null);
    setPhoneVerification(emptyPhoneVerification);
    startedAtRef.current = Date.now();
    capturedSignatureRef.current = null;
    submittedRef.current = false;
    submissionIdRef.current = null;
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
    capturePartial,
    reset,
  };
}
