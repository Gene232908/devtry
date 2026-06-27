import { Input } from "@/components/ui/Input";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepContact({ values, errors, setField }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-fluid-2 text-text">Step 3: Contact Info</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Name"
          placeholder="Full name"
          value={values.fullName}
          onChange={(e) => setField("fullName", e.target.value)}
          error={errors.fullName}
        />
        <Input
          label="WhatsApp Number"
          placeholder="+971 5X XXX XXXX"
          inputMode="tel"
          value={values.whatsapp}
          onChange={(e) => setField("whatsapp", e.target.value)}
          error={errors.whatsapp}
        />
      </div>
      <label className="flex items-start gap-2.5 text-fluid--1 text-text-muted">
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(e) => setField("consent", e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border-gold bg-surface-2 accent-[--gold]"
        />
        I agree to be contacted about my valuation.
      </label>
      {errors.consent && <span className="text-fluid--1 text-danger">{errors.consent}</span>}
      <input
        type="text"
        name="company"
        autoComplete="off"
        tabIndex={-1}
        value={values.honeypot}
        onChange={(e) => setField("honeypot", e.target.value)}
        className="absolute h-0 w-0 opacity-0"
        aria-hidden="true"
      />
    </div>
  );
}
