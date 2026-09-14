import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { StaffIdentity } from "@/lib/auth/permissions";

export const CATALOG_NAME_MAX_LENGTH = 120;
export type CatalogEntityType = "make" | "model" | "trim";
export type CatalogActivityAction = "created" | "archived" | "restored";

type CatalogRow = { id: string; name: string };

export function normalizeCatalogName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function catalogNameError(value: unknown, label: string) {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name) return `Enter a ${label.toLowerCase()} name.`;
  if (name.length > CATALOG_NAME_MAX_LENGTH)
    return `${label} name must be ${CATALOG_NAME_MAX_LENGTH} characters or fewer.`;
  return null;
}

export async function activeCatalogDuplicate(
  table: "car_makes" | "car_models" | "car_trims",
  name: string,
  parentColumn?: "make_id" | "model_id",
  parentId?: string,
) {
  let query = getSupabaseAdmin()
    .from(table)
    .select("id, name")
    .is("archived_at", null);
  if (parentColumn && parentId) query = query.eq(parentColumn, parentId);
  let { data, error } = await query;
  if (error?.code === "42703" || error?.message.includes("archived_at")) {
    let fallback = getSupabaseAdmin().from(table).select("id, name");
    if (parentColumn && parentId)
      fallback = fallback.eq(parentColumn, parentId);
    ({ data, error } = await fallback);
  }
  if (error) return { duplicate: null, error };
  const normalized = normalizeCatalogName(name);
  return {
    duplicate:
      ((data ?? []) as CatalogRow[]).find(
        (row) => normalizeCatalogName(row.name) === normalized,
      ) ?? null,
    error: null,
  };
}

export async function recordCatalogActivity(
  identity: StaffIdentity,
  event: {
    entityType: CatalogEntityType;
    entityId: string;
    entityName: string;
    parentName?: string | null;
    action: CatalogActivityAction;
  },
) {
  // The audit entry is operational metadata. A write must not be rolled back
  // because optional audit storage is temporarily unavailable.
  await getSupabaseAdmin()
    .from("catalog_activity")
    .insert({
      entity_type: event.entityType,
      entity_id: event.entityId,
      entity_name: event.entityName,
      parent_name: event.parentName ?? null,
      action: event.action,
      actor_id: identity.userId,
      actor_name: identity.displayName,
    });
}

export function migrationRequiredMessage() {
  return "Catalog safety migration 0029 is required before archiving. Apply it in Supabase, then retry.";
}
