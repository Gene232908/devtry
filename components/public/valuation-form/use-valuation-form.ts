"use client";

import { useState, useCallback, useRef } from "react";
import { leadSchema, normalizeUaeMobile } from "./lead.schema";
import { emptyValues, FormErrors, FormState, ValuationFormValues } from "./form.types";
import { DEMO_OTP_CODE } from "./otp-modal";

export function useValuationForm() {
  const [values, setValues] = useState<ValuationFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<FormState>("filling");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());

  const setField = useCallback(<K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => {
    setValues((v) => {
      if (key === "make") return { ...v, make: value as string, model: "" };
      if (key === "emirate") return { ...v, emirate: value as string, area: "" };
      return { ...v, [key]: value };
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
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

  // Milestone 1 demo build: no backend. Submitting shows a demo OTP step
  // (fixed code, no SMS sent) and always ends in the Thank You state.
  const submit = useCallback(async () => {
    setState("validating");
    setSubmitError(null);

    if (Date.now() - startedAtRef.current < 1500 || values.honeypot) {
      setSubmitError("Please try again.");
      setState("filling");
      return;
    }

    if (!validate()) {
      setState("filling");
      return;
    }

    const phone = normalizeUaeMobile(values.whatsapp);
    if (!phone) {
      setSubmitError("Enter a valid UAE mobile number.");
      setState("filling");
      return;
    }

    setState("otp_entry");
  }, [validate, values.honeypot, values.whatsapp]);

  const verifyOtp = useCallback(async (code: string) => {
    setState("verifying_otp");
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (code !== DEMO_OTP_CODE) {
      setState("otp_entry");
      return { ok: false as const };
    }

    setState("submitting");
    await new Promise((resolve) => setTimeout(resolve, 700));
    setState("success");
    return { ok: true as const };
  }, []);

  const cancelOtp = useCallback(() => setState("filling"), []);

  const reset = useCallback(() => {
    setValues(emptyValues);
    setErrors({});
    setSubmitError(null);
    startedAtRef.current = Date.now();
    setState("filling");
  }, []);

  return {
    values,
    errors,
    state,
    submitError,
    setField,
    submit,
    validateStep,
    verifyOtp,
    cancelOtp,
    reset,
  };
}
