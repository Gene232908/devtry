"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useVehicleCatalog } from "@/lib/use-vehicle-catalog";
import { useValuationForm } from "./use-valuation-form";
import { StepCarDetails } from "./step-car-details";
import { StepTrimLocation } from "./step-trim-location";
import { StepContact } from "./step-contact";
import { OtpModal } from "./otp-modal";
import { ThankYouModal } from "./thank-you-modal";
import { ValuationFormValues } from "./form.types";

const STEPS: Array<{
  n: 1 | 2 | 3;
  label: string;
  fields: Array<keyof ValuationFormValues>;
}> = [
  { n: 1, label: "Contact Info", fields: ["fullName", "whatsapp", "consent"] },
  { n: 2, label: "Car Details", fields: ["year", "make", "model", "mileageKm", "specification", "description"] },
  { n: 3, label: "Trim & Location", fields: ["trim", "optionLevel", "location"] },
];

export function ValuationForm({ registerCapture }: { registerCapture?: (capture: () => void) => void } = {}) {
  const form = useValuationForm();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  // Make / model / trim options come from the admin's Catalog page, so what the
  // client adds there is what a customer actually sees here.
  const { makes, specifications } = useVehicleCatalog();

  const isBusy = form.state === "validating" || form.state === "submitting";
  const isLocked = form.state !== "filling";
  const current = STEPS[step - 1];

  // Hands the modal a way to capture an abandoned form on its way out. Kept in
  // a ref by the parent, so closing the modal records what was typed before
  // this component unmounts. Re-registered whenever the captured data or the
  // current step changes, so the closure never captures stale values.
  const { capturePartial } = form;
  useEffect(() => {
    registerCapture?.(() => capturePartial("close", step));
  }, [registerCapture, capturePartial, step]);

  // Ticking the consent box is a strong signal of intent, so it captures too.
  // Driven from an effect rather than the click handler because setField is
  // asynchronous — reading values in the handler would send the pre-click
  // consent value. The ref check means only a real change fires a capture, so
  // re-renders and step changes do not.
  const consent = form.values.consent;
  const prevConsentRef = useRef(consent);
  useEffect(() => {
    if (prevConsentRef.current === consent) return;
    prevConsentRef.current = consent;
    capturePartial("consent", step);
  }, [consent, capturePartial, step]);

  // Step 1 is already enough to recover a visitor: name plus a usable phone
  // number. Save automatically after the visitor pauses, even if they never
  // tick consent, press Next, or close the form.
  const fullName = form.values.fullName;
  const whatsapp = form.values.whatsapp;
  useEffect(() => {
    if (!fullName.trim() || !whatsapp.trim()) return;
    const timer = window.setTimeout(() => capturePartial("input", step), 700);
    return () => window.clearTimeout(timer);
  }, [fullName, whatsapp, capturePartial, step]);

  function goNext() {
    // Captured before validation so a visitor who filled in their name and
    // number but left a later field blank is still recorded — pressing Next is
    // intent to continue, whether or not the step actually passes.
    form.capturePartial("next", step);
    if (!form.validateStep(current.fields)) return;
    setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3);
  }

  function goBack() {
    setStep((s) => Math.max(1, s - 1) as 1 | 2 | 3);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.validateStep(current.fields)) return;
    const result = await form.submit();
    // If the phone number turned out invalid at final-submit time, jump back
    // to Step 1 so the error (attached to that field) is actually visible.
    if (!result.ok && "invalidPhone" in result && result.invalidPhone) {
      setStep(1);
    }
  }

  return (
    <div className="relative">
      <div className="mb-6">
        <h2 className="mb-5 font-display text-fluid-2 font-light leading-tight text-text">
          Step {step}: {current.label}
        </h2>
        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="text-fluid--1 font-medium uppercase text-gold">
            Step {step} of {STEPS.length}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {STEPS.map((item) => (
            <div key={item.n} className="h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-300",
                  step >= item.n ? "w-full bg-gold" : "w-0 bg-gold",
                )}
              />
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div key={step} className="min-h-[250px] animate-step-in">
          {step === 1 && (
            <StepContact
              values={form.values}
              errors={form.errors}
              phoneVerification={form.phoneVerification}
              setField={form.setField}
            />
          )}
          {step === 2 && (
            <StepCarDetails
              values={form.values}
              errors={form.errors}
              makes={makes}
              specifications={specifications}
              setField={form.setField}
            />
          )}
          {step === 3 && (
            <StepTrimLocation values={form.values} errors={form.errors} makes={makes} setField={form.setField} />
          )}
        </div>

        {form.submitError && (
          <p className="text-fluid--1 text-danger" role="alert">
            {form.submitError}
          </p>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <Button type="button" variant="outline" className="min-w-28" onClick={goBack}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button type="button" className="flex-1" onClick={goNext}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" className="flex-1 uppercase" loading={isBusy} disabled={isLocked}>
              {isBusy ? "Submitting" : "Get Your Free Valuation"}
            </Button>
          )}
        </div>
      </form>

      <OtpModal
        phone={form.values.whatsapp}
        phoneVerification={form.phoneVerification}
        submitting={form.state === "submitting"}
        onVerify={form.verifyPhoneOtp}
        onResend={form.resendOtp}
        onClose={form.cancelOtp}
      />

      <ThankYouModal
        open={form.state === "success"}
        onClose={() => {
          form.reset();
          setStep(1);
        }}
      />
    </div>
  );
}
