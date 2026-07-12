"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ui/Select";
import { YEARS, MILEAGE_BRACKETS } from "@/config/vehicles";
import { ValuationFormValues, FormErrors } from "./form.types";

type Props = {
  values: ValuationFormValues;
  errors: FormErrors;
  setField: <K extends keyof ValuationFormValues>(key: K, value: ValuationFormValues[K]) => void;
};

type CatalogModel = { id: string; name: string };
type CatalogMake = { id: string; name: string; models: CatalogModel[] };

export function StepCarDetails({ values, errors, setField }: Props) {
  const [makes, setMakes] = useState<CatalogMake[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vehicles", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json?.ok) setMakes(json.data.makes as CatalogMake[]);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const modelOptions = (makes.find((m) => m.name === values.make)?.models ?? []).map((m) => ({
    label: m.name,
    value: m.name,
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
          placeholder={loading ? "Loading..." : "Select make"}
          options={makes.map((m) => ({ label: m.name, value: m.name }))}
          value={values.make}
          onChange={(v) => setField("make", v)}
          disabled={loading}
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
