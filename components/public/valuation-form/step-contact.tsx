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
      <p className="rounded-card border border-border-gold/45 bg-bg/35 p-3 text-fluid--1 leading-6 text-text-muted">
        Start here so the CarVibeDubai team can reach you on WhatsApp before you leave the form.
      </p>
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
          placeholder="050 123 4567 or +971 50 123 4567"
          inputMode="tel"
          value={values.whatsapp}
          onChange={(e) => setField("whatsapp", e.target.value)}
          error={errors.whatsapp}
        />
      </div>
      <label className="flex items-start gap-2.5 rounded-card border border-border bg-bg/35 p-3 text-fluid--1 leading-6 text-text-muted">
        <input
          type="checkbox"
          checked={values.consent}
          onChange={(e) => setField("consent", e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border-gold bg-surface-2 accent-[--gold]"
        />
        I agree to be contacted by CarVibeDubai about my valuation and inspection request.
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
