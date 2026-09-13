"use client";

import { Select } from "@/components/ui/Select";
import { YEARS, MILEAGE_BRACKETS } from "@/config/vehicles";
import { type CatalogMake, type CatalogSpecification, modelsFor } from "@/lib/use-vehicle-catalog";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  /** Live catalog from the admin's Catalog page, falling back to the bundled list. */
  makes: CatalogMake[];
  specifications: CatalogSpecification[];
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

export function StepCarDetails({ values, errors, makes, specifications, setField }: Props) {
  const modelOptions = modelsFor(makes, values.make).map((model) => ({
    label: model.name,
    value: model.name,
  }));

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-7">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Select
          label="Year"
          placeholder="Select year"
          options={YEARS.map((y) => ({ label: String(y), value: String(y) }))}
          value={values.year}
          onChange={(v) => setField("year", v)}
          error={errors.year}
        />
        <Select
          label="Make"
          placeholder="Select make"
          options={makes.map((m) => ({ label: m.name, value: m.name }))}
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
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Mileage"
          placeholder="Select mileage range"
          options={MILEAGE_BRACKETS.map((b) => ({ label: b.label, value: String(b.value) }))}
          value={values.mileageKm}
          onChange={(v) => setField("mileageKm", v)}
          error={errors.mileageKm}
        />
        <Select
          label="Specification"
          placeholder="Select specification"
          options={specifications.map((specification) => ({ label: specification.name, value: specification.name }))}
          value={values.specification}
          onChange={(v) => setField("specification", v)}
          error={errors.specification}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="car-description"
          className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint"
        >
          Describe Your Car <span className="normal-case tracking-normal text-text-faint/70">(optional)</span>
        </label>
        <textarea
          id="car-description"
          rows={3}
          placeholder="Tell us anything about your car - service history, extras, small damage, colour, etc."
          value={values.description}
          onChange={(e) => setField("description", e.target.value)}
          className="w-full resize-none rounded-card border border-border-gold/45 bg-bg/45 px-4 py-3 text-fluid-0 text-text placeholder:text-text-faint outline-none transition-all duration-150 focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)]"
        />
        {errors.description && (
          <span className="text-fluid--1 text-danger" role="alert">
            {errors.description}
          </span>
        )}
      </div>
    </div>
  );
}
