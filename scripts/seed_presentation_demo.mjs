import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

// 1. Read environment variables from .env.local
const envFile = fs.readFileSync('e:/Github/carvibe/.env.local', 'utf8');
const env = {};
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing supabaseUrl or serviceKey in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Real staff profile IDs in Supabase:
const STAFF = {
  nyash: 'ffef7d17-cafd-4b2b-8f1e-17051f7a516e',      // Sir Nyash (admin)
  dev: '7c645158-befe-4043-9b0b-605449434b27',        // Developer (test) (admin)
  agent1: '3b33fe56-6467-4b0f-a021-6464ff42ff6f',     // Agent1 (call_center)
  mat: '0a248619-bc9e-4fd0-a4b8-84696a7be67d',        // mat (call_center)
  purchaser1: '36a22df7-fa33-429e-af86-2f55409bd93a', // Purchaser1 (purchaser)
  waaa: 'eced1a6e-cdca-497f-8cb8-4c670263c2d4',       // waaa (purchaser)
};

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah'];

async function seed() {
  console.log('=== STARTING PRESENTATION DEMO SEEDING (SEPT 10 & 11 ONLY, SEPT 12 ZERO) ===');

  // Verify staff profiles exist
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, display_name, role');
  if (pErr || !profiles || profiles.length === 0) {
    console.error('Failed to load profiles:', pErr);
    process.exit(1);
  }
  console.log(`Loaded ${profiles.length} active staff profiles.`);

  // -------------------------------------------------------------
  // 1. INCOMPLETE FORMS (Exactly 5, matching Section 1 & 7 of PDFs)
  // -------------------------------------------------------------
  console.log('Seeding 5 Incomplete Forms (Sept 4 to Sept 8)...');
  const partialLeads = [
    {
      id: randomUUID(),
      phone_e164: '+971555000901',
      full_name: 'Anna',
      call_center_id: STAFF.agent1,
      make: 'BMW',
      model: '3 Series',
      year: 2022,
      mileage_km: 28000,
      furthest_step: 2,
      last_trigger: 'drop_off',
      status: 'pending',
      description: 'Customer started form, left phone number. Call Centre confirming inspection schedule for tomorrow 10 AM.',
      created_at: '2026-09-08T09:15:00.000Z',
      updated_at: '2026-09-08T09:20:00.000Z'
    },
    {
      id: randomUUID(),
      phone_e164: '+971555000902',
      full_name: 'David Miller',
      call_center_id: STAFF.mat,
      make: 'Audi',
      model: 'A6',
      year: 2021,
      mileage_km: 45000,
      furthest_step: 2,
      last_trigger: 'step_2_partial',
      status: 'pending',
      description: 'Looking for fast cash valuation.',
      created_at: '2026-09-07T11:30:00.000Z',
      updated_at: '2026-09-07T11:35:00.000Z'
    },
    {
      id: randomUUID(),
      phone_e164: '+971555000903',
      full_name: 'Fatima Al Zaabi',
      call_center_id: STAFF.agent1,
      make: 'Lexus',
      model: 'RX',
      year: 2023,
      mileage_km: 18000,
      furthest_step: 1,
      last_trigger: 'step_1_partial',
      status: 'contacted',
      description: 'Initial contact made, requested evening callback.',
      created_at: '2026-09-06T14:10:00.000Z',
      updated_at: '2026-09-06T14:15:00.000Z'
    },
    {
      id: randomUUID(),
      phone_e164: '+971555000904',
      full_name: 'Rahul Sharma',
      call_center_id: STAFF.mat,
      make: 'Toyota',
      model: 'Land Cruiser',
      year: 2020,
      mileage_km: 72000,
      furthest_step: 2,
      last_trigger: 'drop_off',
      status: 'pending',
      description: 'Pending phone follow-up.',
      created_at: '2026-09-05T16:45:00.000Z',
      updated_at: '2026-09-05T16:50:00.000Z'
    },
    {
      id: randomUUID(),
      phone_e164: '+971555000905',
      full_name: 'Elena Rostova',
      call_center_id: STAFF.agent1,
      make: 'Mercedes-Benz',
      model: 'C-Class',
      year: 2022,
      mileage_km: 31000,
      furthest_step: 1,
      last_trigger: 'step_1_partial',
      status: 'pending',
      description: 'Called once, left voicemail.',
      created_at: '2026-09-04T10:20:00.000Z',
      updated_at: '2026-09-04T10:25:00.000Z'
    }
  ];

  const { error: plErr } = await supabase.from('partial_leads').insert(partialLeads);
  if (plErr) {
    console.error('Error inserting partial_leads:', plErr.message);
    process.exit(1);
  }
  console.log('Successfully inserted 5 partial_leads.');

  // -------------------------------------------------------------
  // 2. BASE CORE LEADS (Showcases for PDF Scripts)
  // -------------------------------------------------------------
  const allLeads = [];
  const allLeadEvents = [];
  const allInventory = [];
  const allStaffCommissions = [];
  const allCompanyCommissions = [];

  // Lead 1: Noura Al Hammadi - Porsche Macan GTS (Showcase 8.1% Margin: 170k buy -> 185k sell on Sept 8)
  const lead1Id = randomUUID();
  const inv1Id = randomUUID();
  allLeads.push({
    id: lead1Id,
    full_name: 'Noura Al Hammadi',
    phone_e164: '+971555000201',
    phone_verified: true,
    email: 'noura.h@example.com',
    emirate: 'Dubai',
    make: 'Porsche',
    model: 'Macan',
    year: 2023,
    mileage_km: 19000,
    condition: 'excellent',
    status: 'deal',
    source: 'demonstration',
    call_center_id: STAFF.agent1,
    purchaser_id: STAFF.purchaser1,
    notes: 'High-spec Macan GTS. Purchase agreed at AED 170,000.',
    created_at: '2026-09-02T08:30:00.000Z'
  });
  allLeadEvents.push(
    { lead_id: lead1Id, type: 'status_change', meta: { from: 'new', to: 'contacted' }, created_at: '2026-09-02T09:00:00.000Z' },
    { lead_id: lead1Id, type: 'status_change', meta: { from: 'contacted', to: 'inspection_scheduled' }, created_at: '2026-09-02T11:00:00.000Z' },
    { lead_id: lead1Id, type: 'status_change', meta: { from: 'inspection_scheduled', to: 'inspected' }, created_at: '2026-09-03T10:00:00.000Z' },
    { lead_id: lead1Id, type: 'status_change', meta: { from: 'inspected', to: 'deal' }, created_at: '2026-09-03T14:00:00.000Z' }
  );
  allInventory.push({
    id: inv1Id,
    lead_id: lead1Id,
    make: 'Porsche',
    model: 'Macan',
    trim: 'GTS',
    year: 2023,
    mileage_km: 19000,
    status: 'sold',
    purchase_price_aed: 170000,
    purchased_at: '2026-09-03T14:00:00.000Z',
    sale_price_aed: 185000,
    sold_at: '2026-09-08T11:00:00.000Z' // 3:00 PM UAE on Sept 8
  });
  allStaffCommissions.push(
    { id: randomUUID(), inventory_id: inv1Id, staff_id: STAFF.agent1, role: 'call_center', profit_aed: 15000, rate: 0.02, commission_aed: 300, sold_at: '2026-09-08T11:00:00.000Z', paid_at: null },
    { id: randomUUID(), inventory_id: inv1Id, staff_id: STAFF.purchaser1, role: 'purchaser', profit_aed: 15000, rate: 0.10, commission_aed: 1500, sold_at: '2026-09-08T11:00:00.000Z', paid_at: null }
  );
  allCompanyCommissions.push({
    id: randomUUID(), inventory_id: inv1Id, purchase_price_aed: 170000, sale_price_aed: 185000, profit_aed: 15000, rate: 0.02, commission_aed: 300, sold_at: '2026-09-08T11:00:00.000Z'
  });

  // Lead 2: Tariq Bin Saleh - Mercedes G 63 AMG (Contacted with note on Sept 9)
  const lead2Id = randomUUID();
  allLeads.push({
    id: lead2Id,
    full_name: 'Tariq Bin Saleh',
    phone_e164: '+971555000202',
    phone_verified: true,
    email: 'tariq.s@example.com',
    emirate: 'Abu Dhabi',
    make: 'Mercedes-Benz',
    model: 'G-Class',
    year: 2022,
    mileage_km: 32000,
    condition: 'excellent',
    status: 'contacted',
    source: 'demonstration',
    call_center_id: STAFF.agent1,
    purchaser_id: STAFF.purchaser1,
    notes: 'Called seller, inspection confirmed for Friday.',
    created_at: '2026-09-09T08:00:00.000Z'
  });
  allLeadEvents.push(
    { lead_id: lead2Id, type: 'status_change', meta: { from: 'new', to: 'contacted' }, created_at: '2026-09-09T08:30:00.000Z' },
    { lead_id: lead2Id, type: 'note_added', meta: { note: 'Called seller, inspection confirmed for Friday.', staff: 'Agent1' }, created_at: '2026-09-09T10:30:00.000Z' }
  );

  // Lead 3: Sultan Al Qasimi - Bentley Continental GT (Showcase 5k Profit: 20k buy -> 25k sell on Sept 5)
  const lead3Id = randomUUID();
  const inv2Id = randomUUID();
  allLeads.push({
    id: lead3Id,
    full_name: 'Sultan Al Qasimi',
    phone_e164: '+971555000203',
    phone_verified: true,
    email: 'sultan.q@example.com',
    emirate: 'Sharjah',
    make: 'Bentley',
    model: 'Continental GT',
    year: 2021,
    mileage_km: 26000,
    condition: 'excellent',
    status: 'deal',
    source: 'demonstration',
    call_center_id: STAFF.mat,
    purchaser_id: STAFF.waaa,
    notes: 'Quick turnaround deal. Bought AED 20,000, Sold AED 25,000.',
    created_at: '2026-09-01T09:00:00.000Z'
  });
  allLeadEvents.push(
    { lead_id: lead3Id, type: 'status_change', meta: { from: 'new', to: 'contacted' }, created_at: '2026-09-01T09:30:00.000Z' },
    { lead_id: lead3Id, type: 'status_change', meta: { from: 'contacted', to: 'deal' }, created_at: '2026-09-01T15:00:00.000Z' }
  );
  allInventory.push({
    id: inv2Id,
    lead_id: lead3Id,
    make: 'Bentley',
    model: 'Continental GT',
    trim: 'V8 Mulliner',
    year: 2021,
    mileage_km: 26000,
    status: 'sold',
    purchase_price_aed: 20000,
    purchased_at: '2026-09-01T15:00:00.000Z',
    sale_price_aed: 25000,
    sold_at: '2026-09-05T12:00:00.000Z' // 4:00 PM UAE on Sept 5
  });
  allStaffCommissions.push(
    { id: randomUUID(), inventory_id: inv2Id, staff_id: STAFF.mat, role: 'call_center', profit_aed: 5000, rate: 0.02, commission_aed: 100, sold_at: '2026-09-05T12:00:00.000Z', paid_at: null },
    { id: randomUUID(), inventory_id: inv2Id, staff_id: STAFF.waaa, role: 'purchaser', profit_aed: 5000, rate: 0.10, commission_aed: 500, sold_at: '2026-09-05T12:00:00.000Z', paid_at: null }
  );
  allCompanyCommissions.push({
    id: randomUUID(), inventory_id: inv2Id, purchase_price_aed: 20000, sale_price_aed: 25000, profit_aed: 5000, rate: 0.02, commission_aed: 100, sold_at: '2026-09-05T12:00:00.000Z'
  });

  // Unsold Car 1: Nissan Patrol (Bought 20 days ago, AED 100k, in_stock)
  const lead4Id = randomUUID();
  const inv3Id = randomUUID();
  allLeads.push({
    id: lead4Id, full_name: 'Khalid Al Marzooqi', phone_e164: '+971555000204', phone_verified: true,
    email: 'khalid.m@example.com', emirate: 'Dubai', make: 'Nissan', model: 'Patrol', year: 2022,
    mileage_km: 41000, condition: 'good', status: 'deal', source: 'demonstration',
    call_center_id: STAFF.agent1, purchaser_id: STAFF.purchaser1, created_at: '2026-08-23T08:00:00.000Z'
  });
  allLeadEvents.push({ lead_id: lead4Id, type: 'status_change', meta: { from: 'new', to: 'deal' }, created_at: '2026-08-23T10:00:00.000Z' });
  allInventory.push({
    id: inv3Id, lead_id: lead4Id, make: 'Nissan', model: 'Patrol', trim: 'Platinum V8', year: 2022,
    mileage_km: 41000, status: 'in_stock', purchase_price_aed: 100000, purchased_at: '2026-08-23T10:00:00.000Z',
    sale_price_aed: null, sold_at: null
  });

  // Unsold Car 2: BMW X5 (Bought 40 days ago, AED 150k, in_stock)
  const lead5Id = randomUUID();
  const inv4Id = randomUUID();
  allLeads.push({
    id: lead5Id, full_name: 'Omar Al Shamsi', phone_e164: '+971555000205', phone_verified: true,
    email: 'omar.s@example.com', emirate: 'Dubai', make: 'BMW', model: 'X5', year: 2023,
    mileage_km: 24000, condition: 'excellent', status: 'deal', source: 'demonstration',
    call_center_id: STAFF.mat, purchaser_id: STAFF.waaa, created_at: '2026-08-03T08:00:00.000Z'
  });
  allLeadEvents.push({ lead_id: lead5Id, type: 'status_change', meta: { from: 'new', to: 'deal' }, created_at: '2026-08-03T10:00:00.000Z' });
  allInventory.push({
    id: inv4Id, lead_id: lead5Id, make: 'BMW', model: 'X5', trim: 'xDrive40i M Sport', year: 2023,
    mileage_km: 24000, status: 'in_stock', purchase_price_aed: 150000, purchased_at: '2026-08-03T10:00:00.000Z',
    sale_price_aed: null, sold_at: null
  });

  // Unsold Car 3: Mercedes E 300 (Bought 95 days ago, AED 120k, in_stock -> TRIGGERS >90 DAYS RED BADGE)
  const lead6Id = randomUUID();
  const inv5Id = randomUUID();
  allLeads.push({
    id: lead6Id, full_name: 'Mansoor Al Ketbi', phone_e164: '+971555000206', phone_verified: true,
    email: 'mansoor.k@example.com', emirate: 'Abu Dhabi', make: 'Mercedes-Benz', model: 'E-Class', year: 2020,
    mileage_km: 68000, condition: 'good', status: 'deal', source: 'demonstration',
    call_center_id: STAFF.agent1, purchaser_id: STAFF.purchaser1, created_at: '2026-06-09T08:00:00.000Z'
  });
  allLeadEvents.push({ lead_id: lead6Id, type: 'status_change', meta: { from: 'new', to: 'deal' }, created_at: '2026-06-09T10:00:00.000Z' });
  allInventory.push({
    id: inv5Id, lead_id: lead6Id, make: 'Mercedes-Benz', model: 'E-Class', trim: 'E 300 AMG', year: 2020,
    mileage_km: 68000, status: 'in_stock', purchase_price_aed: 120000, purchased_at: '2026-06-09T10:00:00.000Z',
    sale_price_aed: null, sold_at: null
  });

  // August baseline comparison deals
  const leadAug1Id = randomUUID();
  const invAug1Id = randomUUID();
  allLeads.push({
    id: leadAug1Id, full_name: 'Salem Al Kaabi', phone_e164: '+971555000211', phone_verified: true,
    email: 'salem.k@example.com', emirate: 'Dubai', make: 'Land Rover', model: 'Range Rover Sport', year: 2022,
    mileage_km: 33000, condition: 'excellent', status: 'deal', source: 'demonstration',
    call_center_id: STAFF.agent1, purchaser_id: STAFF.purchaser1, created_at: '2026-08-10T09:00:00.000Z'
  });
  allLeadEvents.push({ lead_id: leadAug1Id, type: 'status_change', meta: { from: 'new', to: 'deal' }, created_at: '2026-08-12T10:00:00.000Z' });
  allInventory.push({
    id: invAug1Id, lead_id: leadAug1Id, make: 'Land Rover', model: 'Range Rover Sport', trim: 'Dynamic SE', year: 2022,
    mileage_km: 33000, status: 'sold', purchase_price_aed: 140000, purchased_at: '2026-08-12T10:00:00.000Z',
    sale_price_aed: 155000, sold_at: '2026-08-15T11:00:00.000Z'
  });

  // -------------------------------------------------------------
  // 3. SEPTEMBER 10, 2026: 25 SUBMISSIONS / 2 COMPLETED SALES
  // Strictly within UAE Sept 10: 2026-09-10T04:00:00Z to 2026-09-10T15:00:00Z (08:00 to 19:00 UAE)
  // Revenue: AED 270,000 | Gross Profit: AED 20,000 | Margin: 7.4%
  // -------------------------------------------------------------
  console.log('Generating 25 Submissions & 2 Sales strictly on September 10, 2026 (UAE)...');
  const sep10Cars = [
    { make: 'Toyota', model: 'Land Cruiser', year: 2021, trim: 'GXR', km: 45000 },
    { make: 'Nissan', model: 'Patrol', year: 2020, trim: 'SE', km: 58000 },
    { make: 'Ford', model: 'Explorer', year: 2022, trim: 'Limited', km: 31000 },
    { make: 'Hyundai', model: 'Palisade', year: 2023, trim: 'Calligraphy', km: 22000 },
    { make: 'Mitsubishi', model: 'Pajero', year: 2019, trim: 'GLS 3.8', km: 74000 },
    { make: 'Kia', model: 'Telluride', year: 2022, trim: 'SX', km: 39000 },
    { make: 'Jeep', model: 'Grand Cherokee', year: 2021, trim: 'Overland', km: 48000 },
    { make: 'Volkswagen', model: 'Touareg', year: 2022, trim: 'R-Line', km: 29000 },
    { make: 'Mazda', model: 'CX-9', year: 2020, trim: 'Signature', km: 52000 },
    { make: 'Chevrolet', model: 'Tahoe', year: 2021, trim: 'Premier', km: 44000 },
    { make: 'GMC', model: 'Yukon', year: 2022, trim: 'SLT', km: 36000 },
    { make: 'Honda', model: 'Pilot', year: 2021, trim: 'Touring', km: 41000 },
    { make: 'Lexus', model: 'GX', year: 2020, trim: 'GX 460', km: 61000 },
    { make: 'Audi', model: 'Q5', year: 2022, trim: '45 TFSI', km: 33000 },
    { make: 'BMW', model: 'X3', year: 2021, trim: 'xDrive30i', km: 42000 },
    { make: 'Mercedes-Benz', model: 'GLC', year: 2021, trim: 'GLC 300', km: 40000 },
    { make: 'Infiniti', model: 'QX80', year: 2020, trim: 'ProACTIVE', km: 59000 },
    { make: 'Cadillac', model: 'Escalade', year: 2021, trim: 'Sport', km: 37000 },
    { make: 'Volvo', model: 'XC90', year: 2022, trim: 'B6 Inscription', km: 28000 },
    { make: 'Porsche', model: 'Macan', year: 2020, trim: 'Base', km: 49000 },
    { make: 'Land Rover', model: 'Discovery', year: 2021, trim: 'R-Dynamic', km: 43000 },
    { make: 'Jaguar', model: 'F-Pace', year: 2022, trim: 'R-Dynamic S', km: 26000 },
    { make: 'Genesis', model: 'GV80', year: 2023, trim: '3.5T Prestige', km: 19000 },
    // Deal 1 (Sold Sept 10): Toyota Prado VXL - Buy 115k, Sell 125k (Profit 10k)
    { make: 'Toyota', model: 'Prado', year: 2021, trim: 'VXL 4.0L', km: 51000, isDeal: true, isSold: true, buy: 115000, sell: 125000, soldUtcHour: 9 }, // 1:00 PM UAE
    // Deal 2 (Sold Sept 10): Lexus RX 350 - Buy 135k, Sell 145k (Profit 10k)
    { make: 'Lexus', model: 'RX', year: 2022, trim: 'RX 350 F-Sport', km: 34000, isDeal: true, isSold: true, buy: 135000, sell: 145000, soldUtcHour: 11 }, // 3:00 PM UAE
  ];

  sep10Cars.forEach((c, idx) => {
    const leadId = randomUUID();
    // Spread lead creation between 05:00 UTC (09:00 UAE) and 13:00 UTC (17:00 UAE) on Sept 10
    const hour = 5 + Math.floor((idx / sep10Cars.length) * 8);
    const minute = (idx * 17) % 60;
    const timeIso = `2026-09-10T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z`;

    let status = 'new';
    if (idx >= 5 && idx < 11) status = 'contacted';
    else if (idx >= 11 && idx < 16) status = 'inspection_scheduled';
    else if (idx >= 16 && idx < 20) status = 'inspected';
    else if (idx >= 20 && idx < 23) status = 'negotiating';
    else if (c.isDeal) status = 'deal';

    const agent = (idx % 2 === 0) ? STAFF.agent1 : STAFF.mat;
    const purchaser = (idx % 2 === 0) ? STAFF.purchaser1 : STAFF.waaa;

    allLeads.push({
      id: leadId,
      full_name: `Seller ${c.make} ${idx + 1}`,
      phone_e164: `+97155510${(idx + 1).toString().padStart(4, '0')}`,
      phone_verified: true,
      email: `seller.sep10.${idx + 1}@example.com`,
      emirate: EMIRATES[idx % EMIRATES.length],
      make: c.make,
      model: c.model,
      year: c.year,
      mileage_km: c.km,
      condition: 'good',
      status,
      source: 'demonstration',
      call_center_id: agent,
      purchaser_id: purchaser,
      notes: `September 10 submission - ${status}.`,
      created_at: timeIso
    });

    // Pipeline funnel event history strictly within Sept 10
    allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'submission', to: 'new' }, created_at: timeIso });
    if (status !== 'new') {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'new', to: 'contacted' }, created_at: `2026-09-10T${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['inspection_scheduled', 'inspected', 'negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'contacted', to: 'inspection_scheduled' }, created_at: `2026-09-10T${(hour + 2).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['inspected', 'negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'inspection_scheduled', to: 'inspected' }, created_at: `2026-09-10T${(hour + 3).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'inspected', to: 'negotiating' }, created_at: `2026-09-10T${(hour + 4).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (status === 'deal') {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'negotiating', to: 'deal' }, created_at: `2026-09-10T${(hour + 5).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }

    if (c.isSold) {
      const invId = randomUUID();
      const profit = c.sell - c.buy;
      // Fixed safe UTC hour: 09:00 UTC (13:00 UAE) and 11:00 UTC (15:00 UAE) strictly on Sept 10!
      const soldIso = `2026-09-10T${c.soldUtcHour.toString().padStart(2, '0')}:30:00.000Z`;
      allInventory.push({
        id: invId,
        lead_id: leadId,
        make: c.make,
        model: c.model,
        trim: c.trim,
        year: c.year,
        mileage_km: c.km,
        status: 'sold',
        purchase_price_aed: c.buy,
        purchased_at: timeIso,
        sale_price_aed: c.sell,
        sold_at: soldIso
      });
      allStaffCommissions.push(
        { id: randomUUID(), inventory_id: invId, staff_id: agent, role: 'call_center', profit_aed: profit, rate: 0.02, commission_aed: profit * 0.02, sold_at: soldIso, paid_at: null },
        { id: randomUUID(), inventory_id: invId, staff_id: purchaser, role: 'purchaser', profit_aed: profit, rate: 0.10, commission_aed: profit * 0.10, sold_at: soldIso, paid_at: null }
      );
      allCompanyCommissions.push({
        id: randomUUID(), inventory_id: invId, purchase_price_aed: c.buy, sale_price_aed: c.sell, profit_aed: profit, rate: 0.02, commission_aed: profit * 0.02, sold_at: soldIso
      });
    }
  });

  // -------------------------------------------------------------
  // 4. SEPTEMBER 11, 2026: 35 SUBMISSIONS / 4 COMPLETED SALES
  // Strictly within UAE Sept 11: 2026-09-11T04:00:00Z to 2026-09-11T15:00:00Z (08:00 to 19:00 UAE)
  // Revenue: AED 1,450,000 | Gross Profit: AED 200,000 | Margin: 13.8%!
  // -------------------------------------------------------------
  console.log('Generating 35 Submissions & 4 High-Margin Sales strictly on September 11, 2026 (UAE)...');
  const sep11Cars = [
    { make: 'Porsche', model: 'Cayenne', year: 2022, trim: 'Coupe', km: 28000 },
    { make: 'BMW', model: 'X7', year: 2023, trim: 'M60i', km: 19000 },
    { make: 'Mercedes-Benz', model: 'GLE', year: 2022, trim: 'GLE 450 AMG', km: 31000 },
    { make: 'Land Rover', model: 'Defender', year: 2023, trim: '110 V8', km: 15000 },
    { make: 'Audi', model: 'RSQ8', year: 2022, trim: 'Dynamic', km: 24000 },
    { make: 'Maserati', model: 'Levante', year: 2021, trim: 'Trofeo', km: 36000 },
    { make: 'Lexus', model: 'LX', year: 2023, trim: 'LX 600 VIP', km: 18000 },
    { make: 'Tesla', model: 'Model X', year: 2022, trim: 'Plaid', km: 22000 },
    { make: 'Porsche', model: 'Taycan', year: 2022, trim: '4S', km: 25000 },
    { make: 'Mercedes-Benz', model: 'S-Class', year: 2023, trim: 'S 500 AMG', km: 16000 },
    { make: 'BMW', model: '7 Series', year: 2023, trim: '740i M Sport', km: 14000 },
    { make: 'Audi', model: 'e-tron GT', year: 2022, trim: 'Quattro', km: 21000 },
    { make: 'Aston Martin', model: 'DBX', year: 2021, trim: 'V8', km: 27000 },
    { make: 'Lamborghini', model: 'Urus', year: 2021, trim: 'Nero', km: 29000 },
    { make: 'Bentley', model: 'Bentayga', year: 2021, trim: 'First Edition', km: 33000 },
    { make: 'Rolls-Royce', model: 'Ghost', year: 2021, trim: 'Extended', km: 17000 },
    { make: 'Ferrari', model: 'Roma', year: 2022, trim: 'V8 Turbo', km: 12000 },
    { make: 'McLaren', model: 'GT', year: 2021, trim: 'Luxe', km: 19000 },
    { make: 'Porsche', model: 'Panamera', year: 2022, trim: 'GTS', km: 23000 },
    { make: 'Mercedes-Benz', model: 'AMG GT', year: 2022, trim: '4-Door 63 S', km: 26000 },
    { make: 'BMW', model: 'M8', year: 2022, trim: 'Competition Gran Coupe', km: 22000 },
    { make: 'Audi', model: 'RS6', year: 2022, trim: 'Avant Dynamic', km: 25000 },
    { make: 'Nissan', model: 'GT-R', year: 2021, trim: 'Nismo Edition', km: 31000 },
    { make: 'Corvette', model: 'C8', year: 2023, trim: 'Z51 3LT', km: 14000 },
    { make: 'Jaguar', model: 'F-Type', year: 2021, trim: 'R V8 Supercharged', km: 29000 },
    { make: 'Land Rover', model: 'Range Rover Velar', year: 2022, trim: 'R-Dynamic HSE', km: 34000 },
    { make: 'Alfa Romeo', model: 'Stelvio', year: 2022, trim: 'Quadrifoglio', km: 28000 },
    { make: 'Toyota', model: 'Land Cruiser', year: 2023, trim: 'GR Sport', km: 21000 },
    { make: 'Lexus', model: 'LC 500', year: 2022, trim: 'Carbon Touring', km: 19000 },
    { make: 'Genesis', model: 'G90', year: 2023, trim: 'Royal 3.5T', km: 11000 },
    { make: 'Mercedes-Benz', model: 'Maybach S 580', year: 2022, trim: 'Night Series', km: 15000 },
    // --- 4 BIG-TICKET HIGH-MARGIN COMPLETED SALES (Strictly on Sept 11 UAE) ---
    // Deal 1 (Sold Sept 11): 2023 Porsche 911 Carrera - Buy 320k, Sell 380k (Profit: 60k, 15.8% margin!)
    { make: 'Porsche', model: '911', year: 2023, trim: 'Carrera S Cabriolet', km: 12000, isDeal: true, isSold: true, buy: 320000, sell: 380000, soldUtcHour: 8 }, // 12:00 PM UAE
    // Deal 2 (Sold Sept 11): 2022 Mercedes-AMG G 63 - Buy 410k, Sell 475k (Profit: 65k, 13.7% margin!)
    { make: 'Mercedes-Benz', model: 'G-Class', year: 2022, trim: 'AMG G 63 Magno', km: 21000, isDeal: true, isSold: true, buy: 410000, sell: 475000, soldUtcHour: 10 }, // 2:00 PM UAE
    // Deal 3 (Sold Sept 11): 2022 Range Rover Autobiography - Buy 290k, Sell 335k (Profit: 45k, 13.4% margin!)
    { make: 'Land Rover', model: 'Range Rover', year: 2022, trim: 'Autobiography LWB', km: 27000, isDeal: true, isSold: true, buy: 290000, sell: 335000, soldUtcHour: 12 }, // 4:00 PM UAE
    // Deal 4 (Sold Sept 11): 2023 BMW M4 Competition - Buy 230k, Sell 260k (Profit: 30k, 11.5% margin!)
    { make: 'BMW', model: 'M4', year: 2023, trim: 'Competition xDrive', km: 16000, isDeal: true, isSold: true, buy: 230000, sell: 260000, soldUtcHour: 14 }, // 6:00 PM UAE
  ];

  sep11Cars.forEach((c, idx) => {
    const leadId = randomUUID();
    // Spread lead creation between 05:00 UTC (09:00 UAE) and 13:00 UTC (17:00 UAE) on Sept 11
    const hour = 5 + Math.floor((idx / sep11Cars.length) * 8);
    const minute = (idx * 13) % 60;
    const timeIso = `2026-09-11T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z`;

    let status = 'new';
    if (idx >= 6 && idx < 14) status = 'contacted';
    else if (idx >= 14 && idx < 22) status = 'inspection_scheduled';
    else if (idx >= 22 && idx < 27) status = 'inspected';
    else if (idx >= 27 && idx < 31) status = 'negotiating';
    else if (c.isDeal) status = 'deal';

    const agent = (idx % 2 === 0) ? STAFF.agent1 : STAFF.mat;
    const purchaser = (idx % 2 === 0) ? STAFF.purchaser1 : STAFF.waaa;

    allLeads.push({
      id: leadId,
      full_name: `VIP Client ${c.make} ${idx + 1}`,
      phone_e164: `+97155511${(idx + 1).toString().padStart(4, '0')}`,
      phone_verified: true,
      email: `vip.sep11.${idx + 1}@example.com`,
      emirate: EMIRATES[idx % EMIRATES.length],
      make: c.make,
      model: c.model,
      year: c.year,
      mileage_km: c.km,
      condition: 'excellent',
      status,
      source: 'demonstration',
      call_center_id: agent,
      purchaser_id: purchaser,
      notes: `September 11 high-intent lead - ${status}.`,
      created_at: timeIso
    });

    // Pipeline funnel event history strictly within Sept 11
    allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'submission', to: 'new' }, created_at: timeIso });
    if (status !== 'new') {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'new', to: 'contacted' }, created_at: `2026-09-11T${(hour + 1).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['inspection_scheduled', 'inspected', 'negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'contacted', to: 'inspection_scheduled' }, created_at: `2026-09-11T${(hour + 2).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['inspected', 'negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'inspection_scheduled', to: 'inspected' }, created_at: `2026-09-11T${(hour + 3).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (['negotiating', 'deal'].includes(status)) {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'inspected', to: 'negotiating' }, created_at: `2026-09-11T${(hour + 4).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }
    if (status === 'deal') {
      allLeadEvents.push({ lead_id: leadId, type: 'status_change', meta: { from: 'negotiating', to: 'deal' }, created_at: `2026-09-11T${(hour + 5).toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00.000Z` });
    }

    if (c.isSold) {
      const invId = randomUUID();
      const profit = c.sell - c.buy;
      // Fixed safe UTC hour: 08:00 to 14:00 UTC (12:00 to 18:00 UAE) strictly on Sept 11!
      const soldIso = `2026-09-11T${c.soldUtcHour.toString().padStart(2, '0')}:30:00.000Z`;
      allInventory.push({
        id: invId,
        lead_id: leadId,
        make: c.make,
        model: c.model,
        trim: c.trim,
        year: c.year,
        mileage_km: c.km,
        status: 'sold',
        purchase_price_aed: c.buy,
        purchased_at: timeIso,
        sale_price_aed: c.sell,
        sold_at: soldIso
      });
      allStaffCommissions.push(
        { id: randomUUID(), inventory_id: invId, staff_id: agent, role: 'call_center', profit_aed: profit, rate: 0.02, commission_aed: profit * 0.02, sold_at: soldIso, paid_at: null },
        { id: randomUUID(), inventory_id: invId, staff_id: purchaser, role: 'purchaser', profit_aed: profit, rate: 0.10, commission_aed: profit * 0.10, sold_at: soldIso, paid_at: null }
      );
      allCompanyCommissions.push({
        id: randomUUID(), inventory_id: invId, purchase_price_aed: c.buy, sale_price_aed: c.sell, profit_aed: profit, rate: 0.02, commission_aed: profit * 0.02, sold_at: soldIso
      });
    }
  });

  // Batch insert leads in chunks of 50
  console.log(`Inserting ${allLeads.length} leads in batches...`);
  for (let i = 0; i < allLeads.length; i += 50) {
    const chunk = allLeads.slice(i, i + 50);
    const { error: lErr } = await supabase.from('leads').insert(chunk);
    if (lErr) {
      console.error('Error inserting leads chunk:', lErr.message);
      process.exit(1);
    }
  }
  console.log(`Successfully inserted ${allLeads.length} leads.`);

  // Batch insert lead events
  console.log(`Inserting ${allLeadEvents.length} lead events in batches...`);
  for (let i = 0; i < allLeadEvents.length; i += 100) {
    const chunk = allLeadEvents.slice(i, i + 100);
    const { error: leErr } = await supabase.from('lead_events').insert(chunk);
    if (leErr) console.warn('Warning inserting lead_events chunk:', leErr.message);
  }
  console.log(`Successfully inserted ${allLeadEvents.length} lead events.`);

  // Batch insert inventory
  console.log(`Inserting ${allInventory.length} inventory items...`);
  const { error: invErr } = await supabase.from('inventory').insert(allInventory);
  if (invErr) {
    console.error('Error inserting inventory:', invErr.message);
    process.exit(1);
  }
  console.log(`Successfully inserted ${allInventory.length} inventory items.`);

  // Batch insert staff commissions
  console.log(`Inserting ${allStaffCommissions.length} staff commissions...`);
  const { error: sceErr } = await supabase.from('staff_commission_entries').insert(allStaffCommissions);
  if (sceErr) console.warn('Warning inserting staff commissions:', sceErr.message);
  else console.log(`Successfully inserted ${allStaffCommissions.length} staff commission entries.`);

  // Batch insert company commissions
  console.log(`Inserting ${allCompanyCommissions.length} company commissions...`);
  const { error: ceErr } = await supabase.from('commission_entries').insert(allCompanyCommissions);
  if (ceErr) console.warn('Warning inserting company commissions:', ceErr.message);
  else console.log(`Successfully inserted ${allCompanyCommissions.length} company commission entries.`);

  // -------------------------------------------------------------
  // 5. WEBSITE EVENTS (August 1 to September 11 ONLY!)
  // User instruction: "pero wag mo lalagyan ng data yung september 12"
  // Strictly zero records on September 12 (cut off before 2026-09-11T20:00:00Z)
  // -------------------------------------------------------------
  console.log('Seeding Website Events (August 1 to September 11 only, ZERO for September 12)...');
  const events = [];

  // August 2026: 30 to 60 visitors per day
  for (let day = 1; day <= 31; day++) {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    const augVisitors = 30 + Math.floor(Math.sin(day) * 15 + 15);
    for (let v = 0; v < augVisitors; v++) {
      events.push({
        type: 'page_view',
        session_id: `aug-sess-${day}-${v}`,
        created_at: `2026-08-${dStr}T${(v % 12 + 6).toString().padStart(2, '0')}:${(v * 3 % 60).toString().padStart(2, '0')}:00.000Z`
      });
    }
  }

  // September 2026: Days 1 through 11 ONLY (Day 12 is ZERO / FRESH)
  for (let day = 1; day <= 11; day++) {
    const dStr = day < 10 ? `0${day}` : `${day}`;
    // September 10 has 55 visitors, September 11 has 85 visitors
    let sepVisitors = 40 + Math.floor(Math.cos(day) * 10 + 10);
    if (day === 10) sepVisitors = 55;
    if (day === 11) sepVisitors = 85;

    for (let v = 0; v < sepVisitors; v++) {
      events.push({
        type: 'page_view',
        session_id: `sep-sess-${day}-${v}`,
        // Keep strictly between 06:00 UTC and 17:00 UTC (10:00 to 21:00 UAE) so it never touches midnight!
        created_at: `2026-09-${dStr}T${(v % 11 + 6).toString().padStart(2, '0')}:${(v * 3 % 60).toString().padStart(2, '0')}:00.000Z`
      });
    }
  }

  // Insert events in chunks of 500
  for (let i = 0; i < events.length; i += 500) {
    const chunk = events.slice(i, i + 500);
    const { error: evErr } = await supabase.from('events').insert(chunk);
    if (evErr) {
      console.warn('Events chunk insert error:', evErr.message);
      break;
    }
  }
  console.log(`Successfully inserted ${events.length} website visitor events (up to Sept 11).`);
  console.log('Zero visitors on September 12 (fresh for live testing).');

  console.log('\n======================================================');
  console.log('✅ HIGH-VOLUME DEMO SEEDING COMPLETE!');
  console.log('Exact Timezone Guard: UAE (UTC+4)');
  console.log('------------------------------------------------------');
  console.log('SEPTEMBER 10, 2026 (UAE):');
  console.log('  • Submissions: 25 leads');
  console.log('  • Cars Sold: 2');
  console.log('  • Revenue: AED 270,000');
  console.log('  • Gross Profit: AED 20,000');
  console.log('  • Margin: 7.4%');
  console.log('------------------------------------------------------');
  console.log('SEPTEMBER 11, 2026 (UAE) [HIGH REVENUE, PROFIT & MARGIN]:');
  console.log('  • Submissions: 35 leads (+40% increase!)');
  console.log('  • Cars Sold: 4 (+100% increase!)');
  console.log('  • Revenue: AED 1,450,000 (+437% increase!)');
  console.log('  • Gross Profit: AED 200,000 (+900% increase!)');
  console.log('  • Margin: 13.8% (vs 7.4% on Sept 10!)');
  console.log('------------------------------------------------------');
  console.log('SEPTEMBER 12, 2026 (UAE) [COMPLETELY FRESH]:');
  console.log('  • Revenue: AED 0');
  console.log('  • Gross Profit: AED 0');
  console.log('  • Cars Sold: 0');
  console.log('  • Submissions: 0');
  console.log('  • Website Visitors: 0');
  console.log('======================================================\n');
}

seed();
