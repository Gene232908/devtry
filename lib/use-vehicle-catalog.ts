"use client";

import { useEffect, useState } from "react";
import { MAKES, getTrims } from "@/config/vehicles";

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

/** The hardcoded config, reshaped and alphabetized to match the live payload. */
const FALLBACK: CatalogMake[] = MAKES.map((make) => ({
  name: make.name,
  models: make.models
    .map((model) => ({ name: model, trims: getTrims(model) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
})).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

type ApiTrim = { id: string; name: string };
type ApiModel = { id: string; name: string; trims?: ApiTrim[] };
type ApiMake = { id: string; name: string; models: ApiModel[] };
type ApiSpecification = { id: string; name: string };

export type ModelWithMake = {
  modelName: string;
  makeName: string;
  trims: string[];
};

export function useVehicleCatalog() {
  const [makes, setMakes] = useState<CatalogMake[]>(FALLBACK);
  const [allMakes, setAllMakes] = useState<string[]>(() => FALLBACK.map((m) => m.name));
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

        const rawMakes = (body.data.makes as ApiMake[])
          .map((m) => m.name?.trim())
          .filter(Boolean);

        if (!cancelled && rawMakes.length > 0) {
          const sorted = Array.from(new Set(rawMakes)).sort((a, b) =>
            a.localeCompare(b, undefined, { sensitivity: "base" }),
          );
          setAllMakes(sorted);
        }

        const live = (body.data.makes as ApiMake[])
          // A make with no models cannot be chosen usefully on the public form
          .filter((make) => Array.isArray(make.models) && make.models.length > 0)
          .map((make) => ({
            name: make.name,
            models: make.models
              .map((model) => {
                const liveTrims = Array.isArray(model.trims)
                  ? model.trims.map((trim) => trim.name).filter(Boolean)
                  : [];
                return {
                  name: model.name,
                  // If a model was newly added in super admin without specific trims yet,
                  // fall back to default trims so landing page visitors always have options.
                  trims: liveTrims.length > 0 ? liveTrims : getTrims(model.name),
                };
              })
              .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

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

  return { makes, specifications, isLive, allMakes };
}

/** Models for the selected make. Empty when nothing is selected yet. */
export function modelsFor(makes: CatalogMake[], makeName: string): CatalogModel[] {
  if (!makeName) return [];
  const found = makes.find((make) => make.name.toLowerCase() === makeName.toLowerCase());
  return found?.models ?? [];
}

/** Flattened list of every model paired with its parent make name, sorted A-Z. */
export function allModelsWithMake(makes: CatalogMake[]): ModelWithMake[] {
  const list: ModelWithMake[] = [];
  const seen = new Set<string>();
  for (const make of makes) {
    for (const model of make.models) {
      const key = `${model.name.toLowerCase()}|${make.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          modelName: model.name,
          makeName: make.name,
          trims: model.trims,
        });
      }
    }
  }
  return list.sort((a, b) =>
    a.modelName.localeCompare(b.modelName, undefined, { sensitivity: "base" }),
  );
}

/** Finds the parent make for a given model name. */
export function findMakeForModel(makes: CatalogMake[], modelName: string): string | null {
  if (!modelName) return null;
  const q = modelName.trim().toLowerCase();
  for (const make of makes) {
    if (make.models.some((m) => m.name.toLowerCase() === q)) {
      return make.name;
    }
  }
  return null;
}

/** Trims for the selected make + model. Empty when model is missing. */
export function trimsFor(makes: CatalogMake[], makeName: string, modelName: string): string[] {
  if (!modelName) return [];
  const models = makeName ? modelsFor(makes, makeName) : makes.flatMap((m) => m.models);
  const model = models.find((m) => m.name.toLowerCase() === modelName.toLowerCase());
  if (model?.trims && model.trims.length > 0) {
    return model.trims;
  }
  const fallback = getTrims(modelName);
  if (fallback && fallback.length > 0) {
    return fallback;
  }
  return ["Standard", "Mid", "Top of the Range"];
}
