import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { StaffIdentity } from "@/lib/auth/permissions";
import {
  migrationRequiredMessage,
  recordCatalogActivity,
  type CatalogEntityType,
} from "@/lib/server/catalog-safety";

const TABLE_BY_TYPE: Record<
  CatalogEntityType,
  "car_makes" | "car_models" | "car_trims"
> = {
  make: "car_makes",
  model: "car_models",
  trim: "car_trims",
};

function sameCatalogName(value: unknown, expected: string) {
  return typeof value === "string" && value.trim().toLocaleLowerCase() === expected.trim().toLocaleLowerCase();
}

export async function findCatalogReferences(entityType: CatalogEntityType, id: string) {
  const db = getSupabaseAdmin();
  const table = TABLE_BY_TYPE[entityType];
  const { data: entry, error: entryError } = await db.from(table).select("id, name").eq("id", id).maybeSingle();
  if (entryError || !entry) return { references: [], error: entryError ?? new Error("Catalog entry not found.") };
  const { data: leads, error: leadError } = await db.from("leads").select("full_name, make, model, trim").limit(5000);
  const { data: inventory, error: inventoryError } = await db.from("inventory").select("make, model, trim, chassis_number").limit(5000);
  if (leadError) return { references: [], error: leadError };
  if (inventoryError) return { references: [], error: inventoryError };
  const matches = (row: { make?: unknown; model?: unknown; trim?: unknown }) =>
    entityType === "make" ? sameCatalogName(row.make, entry.name) : entityType === "model" ? sameCatalogName(row.model, entry.name) : sameCatalogName(row.trim, entry.name);
  const references: string[] = [];
  for (const row of leads ?? []) if (matches(row)) references.push(`Lead: ${row.full_name ?? "Unnamed customer"}`);
  for (const row of inventory ?? []) if (matches(row)) references.push(`Inventory: ${row.make} ${row.model}${row.trim ? ` ${row.trim}` : ""}${row.chassis_number ? ` (Chassis/VIN ${row.chassis_number})` : ""}`);
  return { references: references.slice(0, 20), error: null };
}

function isMissingArchiveColumn(
  error: { code?: string; message?: string } | null,
) {
  return error?.code === "42703" || error?.message?.includes("archived_at");
}

export async function setCatalogArchived(
  entityType: CatalogEntityType,
  id: string,
  archived: boolean,
  identity: StaffIdentity,
) {
  const references = await findCatalogReferences(entityType, id);
  if (references.error) return { ok: false as const, status: 500, message: references.error.message };
  if (references.references.length) return { ok: false as const, status: 409, message: `Cannot archive this ${entityType} because it is used by existing data: ${references.references.join("; ")}.` };
  const table = TABLE_BY_TYPE[entityType];
  const { data, error } = await getSupabaseAdmin()
    .from(table)
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, name")
    .maybeSingle();

  if (isMissingArchiveColumn(error))
    return {
      ok: false as const,
      status: 503,
      message: migrationRequiredMessage(),
    };
  if (error) return { ok: false as const, status: 500, message: error.message };
  if (!data)
    return {
      ok: false as const,
      status: 404,
      message: "Catalog entry not found.",
    };

  await recordCatalogActivity(identity, {
    entityType,
    entityId: data.id,
    entityName: data.name,
    action: archived ? "archived" : "restored",
  });
  return { ok: true as const, data };
}
