import { RadioGroup } from "@/components/ui/Radio";
import { Select } from "@/components/ui/Select";
import { EMIRATES } from "@/config/vehicles";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepCondition({ values, errors, setField }: Props) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-7">
      <RadioGroup
        name="condition"
        value={values.condition}
        onChange={(v) => setField("condition", v as ValuationFormValues["condition"])}
        error={errors.condition}
        options={[
          { label: "Excellent", value: "excellent" },
          { label: "Good", value: "good" },
          { label: "Fair", value: "fair" },
        ]}
      />
      <Select
        label="Inspection Area"
        placeholder="Select emirate"
        options={EMIRATES.map((emirate) => ({ label: emirate, value: emirate }))}
        value={values.emirate}
        onChange={(v) => setField("emirate", v)}
        error={errors.emirate}
      />
    </div>
  );
}
