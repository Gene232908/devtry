import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Read .env.local
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

async function run() {
  console.log('=== WIPING DEMO DATA (PRESERVING PROFILES & SETTINGS) ===');

  // 1. Delete staff_commission_entries
  console.log('Deleting staff_commission_entries...');
  const { error: sceErr } = await supabase.from('staff_commission_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (sceErr) console.warn('sceErr:', sceErr.message);

  // 2. Delete commission_entries
  console.log('Deleting commission_entries...');
  const { error: ceErr } = await supabase.from('commission_entries').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (ceErr) console.warn('ceErr:', ceErr.message);

  // 3. Delete commission_statements
  console.log('Deleting commission_statements...');
  const { error: csErr } = await supabase.from('commission_statements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (csErr) console.warn('csErr:', csErr.message);

  // 4. Delete inventory
  console.log('Deleting inventory...');
  const { error: invErr } = await supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (invErr) console.warn('invErr:', invErr.message);

  // 5. Delete lead_events
  console.log('Deleting lead_events...');
  const { error: leErr } = await supabase.from('lead_events').delete().not('id', 'is', null);
  if (leErr) console.warn('leErr:', leErr.message);

  // 6. Delete partial_lead_events
  try {
    await supabase.from('partial_lead_events').delete().not('id', 'is', null);
  } catch (e) {}

  // 7. Delete partial_leads
  console.log('Deleting partial_leads...');
  const { error: plErr } = await supabase.from('partial_leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (plErr) console.warn('plErr:', plErr.message);

  // 8. Delete leads
  console.log('Deleting leads...');
  const { error: lErr } = await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (lErr) console.warn('lErr:', lErr.message);

  // 9. Delete events (page views / sessions)
  console.log('Deleting events...');
  const { error: evErr } = await supabase.from('events').delete().not('id', 'is', null);
  if (evErr) console.warn('evErr:', evErr.message);

  console.log('=== CLEANUP COMPLETE: All demo data wiped, profiles preserved! ===');
}

run();
