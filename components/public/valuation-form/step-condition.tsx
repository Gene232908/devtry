import { RadioGroup } from "@/components/ui/Radio";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepCondition({ values, errors, setField }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-display text-fluid-2 text-text">Step 2: Vehicle Condition</h3>
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
    </div>
  );
}
