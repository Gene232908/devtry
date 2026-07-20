"use client";

import { type FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
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
  { n: 2, label: "Car Details", fields: ["year", "make", "model", "mileageKm", "description"] },
  { n: 3, label: "Trim & Location", fields: ["trim", "optionLevel", "location"] },
];

export function ValuationForm() {
  const form = useValuationForm();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const isBusy = form.state === "validating" || form.state === "submitting";
  const isLocked = form.state !== "filling";
  const current = STEPS[step - 1];

  function goNext() {
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
          {step === 2 && <StepCarDetails values={form.values} errors={form.errors} setField={form.setField} />}
          {step === 3 && <StepTrimLocation values={form.values} errors={form.errors} setField={form.setField} />}
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
