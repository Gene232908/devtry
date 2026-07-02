"use client";

import { useState, useCallback, useRef } from "react";
import { leadSchema } from "./lead.schema";
import { emptyValues, FormErrors, FormState, ValuationFormValues } from "./form.types";
import { useOtp } from "./use-otp";

export function useValuationForm() {
  const [values, setValues] = useState<ValuationFormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [state, setState] = useState<FormState>("filling");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const otp = useOtp();

  const setField = useCallback(<K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => {
    setValues((v) => {
      if (key === "make") return { ...v, make: value as string, model: "" };
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

    setState("sending_otp");
    const res = await otp.send();
    if (!res.ok) {
      setSubmitError("Couldn't send code, try again.");
      setState("filling");
      return;
    }
    setState("otp_entry");
  }, [validate, values.honeypot, otp]);

  const verifyOtp = useCallback(
    async (code: string) => {
      setState("verifying_otp");
      const res = await otp.verify(code);
      if (!res.ok) {
        setState("otp_entry");
        return { ok: false as const, attemptsLeft: res.attemptsLeft };
      }
      setState("submitting");
      await new Promise((r) => setTimeout(r, 700));
      setState("success");
      return { ok: true as const };
    },
    [otp],
  );

  const reset = useCallback(() => {
    setValues(emptyValues);
    setErrors({});
    setSubmitError(null);
    startedAtRef.current = Date.now();
    setState("filling");
  }, []);

  const cancelOtp = useCallback(() => setState("filling"), []);

  return {
    values,
    errors,
    state,
    submitError,
    setField,
    submit,
    validateStep,
    verifyOtp,
    reset,
    cancelOtp,
    otp,
  };
}
