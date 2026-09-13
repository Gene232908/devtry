"use client";

import { useEffect, useState } from "react";
import { MAKES, TRIM_FALLBACK, getTrims } from "@/config/vehicles";

// The make / model / trim catalog the valuation form is built from.
//
// This reads the live catalog so the admin's Catalog page actually controls what
// customers see. Before this existed the form was wired to the hardcoded lists
// in config/vehicles.ts, which meant adding a brand in the admin changed
// nothing on the public site — the page looked like it worked and silently did
// not.
//
// Falls back to those same hardcoded lists whenever the catalog cannot be read
// (Supabase not configured, request failed, empty table). A visitor must never
// be shown an empty Make dropdown just because the database is unreachable.

export type CatalogModel = { name: string; trims: string[] };
export type CatalogMake = { name: string; models: CatalogModel[] };
export type CatalogSpecification = { id: string; name: string };

// Kept only as a graceful fallback while a local/development database awaits
// migration 0027. In a migrated environment, Super Admin controls the options.
const FALLBACK_SPECIFICATIONS: CatalogSpecification[] = [
  { id: "gcc", name: "GCC Specs" },
  { id: "american", name: "American Specs" },
  { id: "japanese", name: "Japanese Specs" },
  { id: "european", name: "European Specs" },
];

/** The hardcoded config, reshaped to match the live payload. */
const FALLBACK: CatalogMake[] = MAKES.map((make) => ({
  name: make.name,
  models: make.models.map((model) => ({ name: model, trims: getTrims(model) })),
}));

type ApiTrim = { id: string; name: string };
type ApiModel = { id: string; name: string; trims?: ApiTrim[] };
type ApiMake = { id: string; name: string; models: ApiModel[] };
type ApiSpecification = { id: string; name: string };

export function useVehicleCatalog() {
  const [makes, setMakes] = useState<CatalogMake[]>(FALLBACK);
  const [specifications, setSpecifications] = useState<CatalogSpecification[]>(FALLBACK_SPECIFICATIONS);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/vehicles", { cache: "no-store" });
        if (!res.ok) return;
        const body = await res.json();
        if (!body.ok || !Array.isArray(body.data?.makes)) return;

        const live = (body.data.makes as ApiMake[])
          // A make with no models cannot be chosen usefully, so it is dropped
          // rather than shown as a dead end in the dropdown.
          .filter((make) => make.models.length > 0)
          .map((make) => ({
            name: make.name,
            models: make.models.map((model) => ({
              name: model.name,
              // A model with no trims configured still needs something
              // selectable, so it borrows the generic list.
              trims: model.trims?.length ? model.trims.map((trim) => trim.name) : TRIM_FALLBACK,
            })),
          }));

        // An empty catalog is treated as "not ready" rather than "no cars".
        if (!cancelled && live.length > 0) {
          setMakes(live);
          const liveSpecifications = Array.isArray(body.data?.specifications)
            ? (body.data.specifications as ApiSpecification[])
                .filter((specification) => typeof specification.id === "string" && typeof specification.name === "string")
                .map((specification) => ({ id: specification.id, name: specification.name }))
            : [];
          if (liveSpecifications.length > 0) {
            setSpecifications(liveSpecifications);
          }
          setIsLive(true);
        }
      } catch {
        // Keep the fallback — see the note at the top of this file.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { makes, specifications, isLive };
}

/** Models for the selected make. Empty when nothing is selected yet. */
export function modelsFor(makes: CatalogMake[], makeName: string): CatalogModel[] {
  if (!makeName) return [];
  return makes.find((make) => make.name === makeName)?.models ?? [];
}

/** Trims for the selected make + model. Empty when either is missing. */
export function trimsFor(makes: CatalogMake[], makeName: string, modelName: string): string[] {
  if (!modelName) return [];
  const models = modelsFor(makes, makeName);
  const model = models.find((m) => m.name === modelName);
  // Falls back by model name across every make so a lead that was captured
  // before its make was renamed still resolves to a usable trim list.
  return model?.trims ?? getTrims(modelName);
}
