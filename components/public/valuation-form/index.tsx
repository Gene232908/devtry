"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useValuationForm } from "./use-valuation-form";
import { StepCarDetails } from "./step-car-details";
import { StepCondition } from "./step-condition";
import { StepContact } from "./step-contact";
import { OtpModal } from "./otp-modal";
import { ThankYouModal } from "./thank-you-modal";

const STEPS = [
  { n: 1, label: "Step 1" },
  { n: 2, label: "Step 2" },
  { n: 3, label: "Step 3" },
];

export function ValuationForm() {
  const form = useValuationForm();
  const [mobileStep, setMobileStep] = useState(1);

  const isBusy = form.state === "validating" || form.state === "sending_otp" || form.state === "submitting";

  function goNextMobile() {
    setMobileStep((s) => Math.min(3, s + 1));
  }
  function goBackMobile() {
    setMobileStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await form.submit();
  }

  return (
    <div id="valuation" className="relative">
      {/* mobile step tabs */}
      <div className="mb-5 flex gap-6 lg:hidden">
        {STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setMobileStep(s.n)}
            className={cn(
              "border-b-2 pb-2 text-fluid--1 uppercase tracking-wider transition-colors",
              mobileStep === s.n ? "border-gold text-gold" : "border-transparent text-text-faint",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <div className={cn(mobileStep !== 1 && "hidden", "lg:!block")}>
          <StepCarDetails values={form.values} errors={form.errors} setField={form.setField} />
        </div>
        <div className={cn(mobileStep !== 2 && "hidden", "lg:!block")}>
          <StepCondition values={form.values} errors={form.errors} setField={form.setField} />
        </div>
        <div className={cn(mobileStep !== 3 && "hidden", "lg:!block")}>
          <StepContact values={form.values} errors={form.errors} setField={form.setField} />
        </div>

        {form.submitError && (
          <p className="text-fluid--1 text-danger" role="alert">
            {form.submitError}
          </p>
        )}

        {/* mobile nav */}
        <div className="flex gap-3 lg:hidden">
          {mobileStep > 1 && (
            <Button type="button" variant="outline" className="flex-1" onClick={goBackMobile}>
              Back
            </Button>
          )}
          {mobileStep < 3 ? (
            <Button type="button" className="flex-1" onClick={goNextMobile}>
              Next
            </Button>
          ) : (
            <Button type="submit" className="flex-1" loading={isBusy}>
              {isBusy ? "Submitting" : "Get Valuation"}
            </Button>
          )}
        </div>

        {/* desktop submit */}
        <Button type="submit" size="lg" className="hidden w-full lg:flex" loading={isBusy} disabled={isBusy}>
          {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {form.state === "sending_otp" ? "Sending code…" : "Get Valuation"}
        </Button>
      </form>

      <OtpModal
        open={form.state === "otp_entry" || form.state === "verifying_otp" || form.state === "submitting"}
        phone={form.values.whatsapp}
        resendIn={form.otp.resendIn}
        attemptsLeft={form.otp.attemptsLeft}
        verifying={form.state === "verifying_otp" || form.state === "submitting"}
        onVerify={form.verifyOtp}
        onResend={() => form.otp.send()}
        onClose={form.cancelOtp}
      />

      <ThankYouModal
        open={form.state === "success"}
        onClose={() => {
          form.reset();
          setMobileStep(1);
        }}
      />
    </div>
  );
}
