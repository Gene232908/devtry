"use client";

import { useMemo } from "react";
import { RadioGroup } from "@/components/ui/Radio";
import { Select } from "@/components/ui/Select";
import { EMIRATES, OPTION_LEVELS } from "@/config/vehicles";
import { type CatalogMake, trimsFor } from "@/lib/use-vehicle-catalog";
import { ValuationFormValues, FormErrors } from "./form.types";
import type { ValuationModalMode } from "../open-valuation-modal";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  /** Live catalog from the admin's Catalog page, falling back to the bundled list. */
  makes: CatalogMake[];
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
  mode?: ValuationModalMode;
};

export function StepTrimLocation({ values, errors, makes, setField, mode = "valuation" }: Props) {
  // Trims come from the admin catalog, narrowed to the selected make + model, sorted A-Z.
  const trimOptions = useMemo(() => {
    return trimsFor(makes, values.make, values.model)
      .map((t) => ({ label: t, value: t }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  }, [makes, values.make, values.model]);

  return (
    <div className="flex flex-col gap-5 border-b border-border pb-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <Select
            label="Trim (Optional)"
            placeholder={values.model ? "Select trim (optional)" : "Select make & model first"}
            options={trimOptions}
            value={values.trim}
            onChange={(v) => setField("trim", v)}
            disabled={!values.model}
            error={errors.trim}
            searchable={trimOptions.length > 5}
            searchPlaceholder="Search trims..."
          />
          {values.model && !errors.trim ? (
            <p className="mt-1.5 text-[0.72rem] font-light text-text-faint">
              Trims for your {values.make} {values.model} (optional).
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
      {mode === "scrap" && (
        <div className="max-w-sm">
          <label htmlFor="scrap-asking-price" className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">
            Asking price (AED)
          </label>
          <input
            id="scrap-asking-price"
            type="number"
            min="0"
            inputMode="decimal"
            value={values.scrapAskingPriceAed}
            onChange={(event) => setField("scrapAskingPriceAed", event.target.value)}
            placeholder="Enter the amount you expect"
            className="mt-1.5 min-h-11 w-full rounded-card border border-border-gold/45 bg-bg/45 px-4 text-fluid-0 text-text placeholder:text-text-faint outline-none focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)]"
          />
          {errors.scrapAskingPriceAed && <span className="mt-1 block text-fluid--1 text-danger" role="alert">{errors.scrapAskingPriceAed}</span>}
        </div>
      )}
    </div>
  );
}
