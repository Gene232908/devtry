import { Lead, LeadStatus } from "@/config/mock-data";

// Shape of a row from the Supabase `leads` table (snake_case).
export type DbLead = {
  id: string;
  created_at: string;
  source?: string | null;
  inquiry_type?: "valuation" | "scrap" | null;
  scrap_condition?: string | null;
  scrap_asking_price_aed?: number | string | null;
  full_name: string;
  phone_e164: string;
  email: string | null;
  make: string;
  model: string;
  trim: string | null;
  year: number;
  mileage_km: number | null;
  mileage_value?: number | null;
  mileage_unit?: "km" | "miles" | null;
  specification?: string | null;
  /** @deprecated Legacy field from before the Basic/Mid/Full Option rework. */
  condition: "excellent" | "good" | "fair" | null;
  option_level: "Basic Mode" | "Mid Mode" | "Full Option" | null;
  description: string | null;
  emirate: string | null;
  status: LeadStatus;
  estimated_value_aed: number | string | null;
  notes: string | null;
  is_duplicate: boolean | null;
  is_spam: boolean | null;
  call_center_id: string | null;
  purchaser_id: string | null;
  /** Optional: absent on databases that have not run migration 0024 yet, which
   *  both readers fall back to querying without (see GET /api/admin/leads). */
  inspection_scheduled_at?: string | null;
  arrival_status?: "not_arrived" | "arrived" | null;
};

// Maps a Supabase row to the camelCase `Lead` shape the admin UI already expects,
// so no dashboard component needs to change.
export function mapDbLead(r: DbLead): Lead {
  return {
    id: r.id,
    fullName: r.full_name,
    phoneE164: r.phone_e164,
    email: r.email ?? undefined,
    make: r.make,
    model: r.model,
    trim: r.trim ?? "",
    year: r.year,
    mileageKm: r.mileage_km ?? 0,
    mileageValue: r.mileage_value ?? r.mileage_km ?? 0,
    mileageUnit: r.mileage_unit === "miles" ? "miles" : "km",
    specification: r.specification ?? "",
    condition: r.condition ?? "good",
    optionLevel: r.option_level ?? undefined,
    description: r.description ?? "",
    location: r.emirate ?? undefined,
    status: r.status,
    estimatedValueAed: r.estimated_value_aed != null ? Number(r.estimated_value_aed) : null,
    notes: r.notes ?? "",
    createdAt: r.created_at,
    source: r.source ?? "web",
    inquiryType: r.inquiry_type === "scrap" ? "scrap" : "valuation",
    scrapCondition: r.scrap_condition ?? undefined,
    scrapAskingPriceAed: r.scrap_asking_price_aed != null ? Number(r.scrap_asking_price_aed) : null,
    isDuplicate: r.is_duplicate ?? undefined,
    isSpam: r.is_spam ?? undefined,
    callCenterId: r.call_center_id ?? null,
    purchaserId: r.purchaser_id ?? null,
    inspectionScheduledAt: r.inspection_scheduled_at ?? undefined,
    arrivalStatus: r.arrival_status ?? "not_arrived",
  };
}
