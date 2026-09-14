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
