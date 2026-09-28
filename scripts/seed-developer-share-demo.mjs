import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const DEMO_NOTE = "Developer Share Demo - safe test record - do not contact";

function loadEnv() {
  const raw = readFileSync(".env.local", "utf8");
  return Object.fromEntries(
    raw
      .split(/\r?\n/)
      .map((line) => line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/))
      .filter(Boolean)
      .map((match) => [match[1], match[2].replace(/^['\"]|['\"]$/g, "")]),
  );
}

function assertNoError(error, context) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

const env = loadEnv();
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase configuration in .env.local.");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: existing, error: existingError } = await supabase
  .from("leads")
  .select("id")
  .eq("notes", DEMO_NOTE)
  .limit(1);
assertNoError(existingError, "Checking for existing demo data");
if (existing?.length) {
  throw new Error("Developer Share demo data already exists. It was not duplicated.");
}

const { data: profiles, error: profilesError } = await supabase
  .from("profiles")
  .select("id, display_name, role");
assertNoError(profilesError, "Loading staff accounts");

const superAdmin = profiles?.find((profile) => profile.role === "admin");
const callCentre = profiles?.find((profile) => profile.role === "call_center");
const purchaser = profiles?.find((profile) => profile.role === "purchaser");
if (!superAdmin || !callCentre || !purchaser) {
  throw new Error("The demo requires one Super Admin, Call Centre, and Purchaser account.");
}

const demos = [
  {
    customer: "Demo Customer One",
    phone: "+971555990201",
    make: "Porsche",
    model: "Cayenne",
    year: 2024,
    mileageKm: 18000,
    purchasePrice: 100000,
    salePrice: 120000,
    expense: 2000,
    expenseLabel: "Demo preparation",
    soldAt: "2026-09-27T09:15:00+04:00",
  },
  {
    customer: "Demo Customer Two",
    phone: "+971555990202",
    make: "BMW",
    model: "X5",
    year: 2023,
    mileageKm: 26000,
    purchasePrice: 80000,
    salePrice: 95000,
    expense: 1500,
    expenseLabel: "Demo transport",
    soldAt: "2026-09-27T10:30:00+04:00",
  },
];

try {
  for (const demo of demos) {
    const leadId = randomUUID();
    const { error: leadError } = await supabase.from("leads").insert({
      id: leadId,
      full_name: demo.customer,
      phone_e164: demo.phone,
      phone_verified: true,
      make: demo.make,
      model: demo.model,
      year: demo.year,
      mileage_km: demo.mileageKm,
      condition: "excellent",
      emirate: "Dubai",
      status: "deal",
      source: "demonstration",
      notes: DEMO_NOTE,
      call_center_id: callCentre.id,
      purchaser_id: purchaser.id,
    });
    assertNoError(leadError, `Creating ${demo.customer}`);

    const { data: inventory, error: dealError } = await supabase.rpc("record_lead_deal", {
      p_lead_id: leadId,
      p_purchase_price: demo.purchasePrice,
      p_purchased_at: demo.soldAt,
    });
    assertNoError(dealError, `Recording demo purchase for ${demo.customer}`);

    const { error: saleError } = await supabase.rpc("sell_inventory_item", {
      p_inventory_id: inventory.id,
      p_sale_price: demo.salePrice,
      p_sold_at: demo.soldAt,
      p_rate: 0.02,
      p_agent_rate: 0.02,
      p_purchaser_rate: 0.1,
    });
    assertNoError(saleError, `Recording demo sale for ${demo.customer}`);

    const { error: expenseError } = await supabase.rpc("upsert_inventory_expense", {
      p_inventory_id: inventory.id,
      p_expense_id: null,
      p_description: demo.expenseLabel,
      p_amount_aed: demo.expense,
      p_actor_id: superAdmin.id,
    });
    assertNoError(expenseError, `Adding demo expense for ${demo.customer}`);

    const { data: currentInventory, error: inventoryError } = await supabase
      .from("inventory")
      .select("financial_review_version")
      .eq("id", inventory.id)
      .single();
    assertNoError(inventoryError, `Reading financial review for ${demo.customer}`);

    const { error: finalizeError } = await supabase.rpc("finalize_inventory_finances", {
      p_inventory_id: inventory.id,
      p_actor_id: superAdmin.id,
      p_expected_review_version: currentInventory.financial_review_version,
      p_rate: 0.02,
      p_agent_rate: 0.02,
      p_purchaser_rate: 0.1,
    });
    assertNoError(finalizeError, `Confirming demo finances for ${demo.customer}`);
  }

  const { data: statements, error: statementsError } = await supabase
    .from("commission_statements")
    .select("period_month, status")
    .order("period_month", { ascending: true });
  assertNoError(statementsError, "Finding an open developer statement month");

  const blockedMonths = new Set(
    (statements ?? [])
      .filter((statement) => statement.status !== "draft")
      .map((statement) => statement.period_month),
  );
  let statementMonth = "2026-09-01";
  while (blockedMonths.has(statementMonth)) {
    const date = new Date(`${statementMonth}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + 1);
    statementMonth = date.toISOString().slice(0, 10);
  }

  const { data: statement, error: statementError } = await supabase.rpc("build_commission_statement", {
    p_month: statementMonth,
  });
  assertNoError(statementError, "Building the open developer statement");

  console.log("Developer Share demo is ready.");
  console.log(`Statement: ${statement.period_month} | ${statement.entry_count} cars | AED ${statement.total_commission_aed}`);
  console.log(`Assigned staff: ${callCentre.display_name} (Call Centre), ${purchaser.display_name} (Purchaser)`);
  console.log("Open Commission > Developer Share. You should see AED 630 available to pay now from these two demo cars.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  console.error("Some demo records may have been created. Do not rerun until they have been reviewed.");
  process.exitCode = 1;
}
