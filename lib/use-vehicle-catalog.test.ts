import { describe, expect, it } from "vitest";
import {
  allModelsWithMake,
  findMakeForModel,
  modelsFor,
  trimsFor,
  type CatalogMake,
} from "./use-vehicle-catalog";

describe("use-vehicle-catalog helpers", () => {
  const sampleMakes: CatalogMake[] = [
    {
      name: "Toyota",
      models: [
        { name: "Camry", trims: ["LE", "SE", "XSE"] },
        { name: "Land Cruiser", trims: ["GXR", "VXR"] },
      ],
    },
    {
      name: "Nissan",
      models: [
        { name: "Altima", trims: ["S", "SV"] },
        { name: "Patrol", trims: [] }, // No custom trims in DB
      ],
    },
    {
      name: "Porsche",
      models: [
        { name: "911", trims: ["Carrera", "Turbo"] },
        { name: "Taycan", trims: [] },
      ],
    },
  ];

  it("returns models for selected make in correct order", () => {
    const models = modelsFor(sampleMakes, "Toyota");
    expect(models.map((m) => m.name)).toEqual(["Camry", "Land Cruiser"]);
  });

  it("finds the make for any given model name case-insensitively", () => {
    expect(findMakeForModel(sampleMakes, "Patrol")).toBe("Nissan");
    expect(findMakeForModel(sampleMakes, "patrol")).toBe("Nissan");
    expect(findMakeForModel(sampleMakes, "911")).toBe("Porsche");
    expect(findMakeForModel(sampleMakes, "Camry")).toBe("Toyota");
    expect(findMakeForModel(sampleMakes, "Unknown")).toBeNull();
  });

  it("returns all models with their parent make sorted alphabetically A-Z", () => {
    const all = allModelsWithMake(sampleMakes);
    expect(all.map((item) => item.modelName)).toEqual([
      "911",
      "Altima",
      "Camry",
      "Land Cruiser",
      "Patrol",
      "Taycan",
    ]);
    const patrol = all.find((item) => item.modelName === "Patrol");
    expect(patrol?.makeName).toBe("Nissan");
  });

  it("returns trims when defined on the model", () => {
    const trims = trimsFor(sampleMakes, "Toyota", "Camry");
    expect(trims).toEqual(["LE", "SE", "XSE"]);
  });

  it("gracefully falls back to default trims when a newly inserted model has empty trims in DB", () => {
    const patrolTrims = trimsFor(sampleMakes, "Nissan", "Patrol");
    expect(patrolTrims.length).toBeGreaterThan(0);
    // Should resolve config/vehicles or standard trims rather than returning empty []
    expect(patrolTrims).toContain("XE");

    const taycanTrims = trimsFor(sampleMakes, "Porsche", "Taycan");
    expect(taycanTrims.length).toBeGreaterThan(0);
    expect(taycanTrims).toEqual(["Standard", "Mid", "Top of the Range"]);
  });

  it("handles brands with fallback models correctly", () => {
    const brandWithFallback: CatalogMake = {
      name: "Volvo",
      models: [
        { name: "Volvo (All Models)", trims: ["Standard", "Mid", "Top of the Range"] },
        { name: "Standard", trims: ["Standard", "Mid", "Top of the Range"] },
      ],
    };
    expect(findMakeForModel([brandWithFallback], "Volvo (All Models)")).toBe("Volvo");
    expect(modelsFor([brandWithFallback], "Volvo").map((m) => m.name)).toEqual([
      "Volvo (All Models)",
      "Standard",
    ]);
  });
});
