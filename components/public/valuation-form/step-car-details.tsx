"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { YEARS } from "@/config/vehicles";
import {
  type CatalogMake,
  type CatalogSpecification,
  allModelsWithMake,
  findMakeForModel,
  modelsFor,
} from "@/lib/use-vehicle-catalog";
import { ValuationFormValues, FormErrors } from "./form.types";
import type { ValuationModalMode } from "../open-valuation-modal";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  /** Live catalog from the admin's Catalog page, falling back to the bundled list. */
  makes: CatalogMake[];
  specifications: CatalogSpecification[];
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
  setMultipleFields?: (patch: Partial<ValuationFormValues>) => void;
  mode?: ValuationModalMode;
};

export function StepCarDetails({
  values,
  errors,
  makes,
  specifications,
  setField,
  setMultipleFields,
  mode = "valuation",
}: Props) {
  const allModels = useMemo(() => allModelsWithMake(makes), [makes]);

  const makeOptions = useMemo(
    () =>
      makes
        .map((m) => ({ label: m.name, value: m.name }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" })),
    [makes],
  );

  const modelOptions = useMemo(() => {
    if (values.make) {
      return modelsFor(makes, values.make)
        .map((model) => ({
          label: model.name,
          value: model.name,
          description: values.make,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    }
    // Cross-brand catalog search: lets visitors search or select any model directly
    return allModels.map((item) => ({
      label: item.modelName,
      value: item.modelName,
      description: item.makeName,
    }));
  }, [makes, values.make, allModels]);

  const handleModelChange = (modelName: string) => {
    const parentMake = findMakeForModel(makes, modelName);
    if (parentMake && parentMake !== values.make) {
      if (setMultipleFields) {
        setMultipleFields({ make: parentMake, model: modelName, trim: "" });
      } else {
        setField("make", parentMake);
        setField("model", modelName);
        setField("trim", "");
      }
    } else {
      setField("model", modelName);
    }
  };

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
          options={makeOptions}
          value={values.make}
          onChange={(v) => setField("make", v)}
          error={errors.make}
          searchable
          searchPlaceholder="Search makes (e.g. Porsche, Toyota)..."
        />
        <Select
          label="Model"
          placeholder={values.make ? "Select model" : "Search or select model"}
          options={modelOptions}
          value={values.model}
          onChange={handleModelChange}
          error={errors.model}
          searchable
          searchPlaceholder={
            values.make
              ? `Search ${values.make} models...`
              : "Search all models (e.g. Patrol, 911)..."
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="grid grid-cols-[minmax(0,1fr)_8.5rem] gap-3">
          <Input
            id="mileage"
            label="Mileage"
            type="number"
            inputMode="numeric"
            min="0"
            max="1000000"
            step="1"
            placeholder="Enter whole number"
            value={values.mileageKm}
            onChange={(event) => setField("mileageKm", event.target.value)}
            error={errors.mileageKm}
          />
          <Select
            label="Unit"
            options={[{ label: "KM", value: "km" }, { label: "Miles", value: "miles" }]}
            value={values.mileageUnit}
            onChange={(value) => setField("mileageUnit", value as "km" | "miles")}
          />
        </div>
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
      {mode === "scrap" && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="scrap-condition" className="text-fluid--1 font-medium uppercase tracking-[0.14em] text-text-faint">
            Vehicle condition
          </label>
          <textarea
            id="scrap-condition"
            rows={3}
            placeholder="For example: accident damage, not running, missing parts, or general condition."
            value={values.scrapCondition}
            onChange={(event) => setField("scrapCondition", event.target.value)}
            className="w-full resize-none rounded-card border border-border-gold/45 bg-bg/45 px-4 py-3 text-fluid-0 text-text placeholder:text-text-faint outline-none transition-all duration-150 focus:border-gold focus:bg-surface-2/80 focus:shadow-[0_0_0_3px_rgba(212,175,55,.16)]"
          />
          {errors.scrapCondition && <span className="text-fluid--1 text-danger" role="alert">{errors.scrapCondition}</span>}
        </div>
      )}
    </div>
  );
}
