"use client";

import { RadioGroup } from "@/components/ui/Radio";
import { Select } from "@/components/ui/Select";
import { EMIRATES, OPTION_LEVELS, getTrims } from "@/config/vehicles";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepTrimLocation({ values, errors, setField }: Props) {
  // Trim options are connected to the selected make + model (demo catalog).
  const trimOptions = getTrims(values.model).map((t) => ({ label: t, value: t }));

  return (
    <div className="flex flex-col gap-5 border-b border-border pb-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Select
            label="Trim"
            placeholder={values.model ? "Select trim" : "Select make & model first"}
            options={trimOptions}
            value={values.trim}
            onChange={(v) => setField("trim", v)}
            disabled={!values.model}
            error={errors.trim}
          />
          {values.model && !errors.trim ? (
            <p className="mt-1.5 text-[0.72rem] font-light text-text-faint">
              Trims for your {values.make} {values.model}.
            </p>
          ) : null}
        </div>

        <Select
          label="Your Location"
          placeholder="Select your location"
          options={EMIRATES.map((emirate) => ({ label: emirate, value: emirate }))}
          value={values.location}
          onChange={(v) => setField("location", v)}
          error={errors.location}
        />
      </div>

      <RadioGroup
        name="optionLevel"
        value={values.optionLevel}
        onChange={(v) => setField("optionLevel", v as ValuationFormValues["optionLevel"])}
        error={errors.optionLevel}
        options={OPTION_LEVELS.map((level) => ({ label: level, value: level }))}
      />
    </div>
  );
}
