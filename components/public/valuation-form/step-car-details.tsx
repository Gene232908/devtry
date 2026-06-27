import { Select } from "@/components/ui/Select";
import { MAKES, MODELS, YEARS, MILEAGE_BRACKETS } from "@/config/vehicles";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepCarDetails({ values, errors, setField }: Props) {
  const modelOptions = (MODELS[values.make] ?? []).map((m) => ({ label: m, value: m }));

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-fluid-2 text-text">Step 1: Car Details</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label="Make"
          placeholder="Select make"
          options={MAKES.map((m) => ({ label: m, value: m }))}
          value={values.make}
          onChange={(v) => setField("make", v)}
          error={errors.make}
        />
        <Select
          label="Model"
          placeholder={values.make ? "Select model" : "Select make first"}
          options={modelOptions}
          value={values.model}
          onChange={(v) => setField("model", v)}
          disabled={!values.make}
          error={errors.model}
        />
        <Select
          label="Year"
          placeholder="Select year"
          options={YEARS.map((y) => ({ label: String(y), value: String(y) }))}
          value={values.year}
          onChange={(v) => setField("year", v)}
          error={errors.year}
        />
      </div>
      <Select
        label="Mileage"
        placeholder="Select mileage range"
        options={MILEAGE_BRACKETS.map((b) => ({ label: b.label, value: String(b.value) }))}
        value={values.mileageKm}
        onChange={(v) => setField("mileageKm", v)}
        error={errors.mileageKm}
      />
    </div>
  );
}
