import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = {};
fs.readFileSync('.env.local', 'utf8').split('\n').forEach(line => {
  const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (m) env[m[1]] = (m[2] || '').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const leadId = 'eaf3892f-b874-44d1-bd83-7e5c1fe6b6a4';
  const now = new Date().toISOString();
  const agentId = '3b33fe56-6467-4b0f-a021-6464ff42ff6f'; // Agent1 (Call Centre)

  const { data: updateData, error: updateError } = await supabase
    .from('leads')
    .update({
      arrival_status: 'arrived',
      arrived_at: now,
      arrived_by: agentId,
    })
    .eq('id', leadId)
    .select('id, full_name, arrival_status, arrived_at, arrived_by')
    .single();

  if (updateError) {
    console.error('Update error:', updateError);
    return;
  }

  console.log('Lead updated successfully:', updateData);

  const { error: eventError } = await supabase
    .from('lead_events')
    .insert({
      lead_id: leadId,
      actor: agentId,
      type: 'arrival_confirmed',
      meta: {
        arrival_status: 'arrived',
        actor_name: 'Agent1',
        actor_role: 'call_center',
      },
    });

  if (eventError) {
    console.error('Event error:', eventError);
  } else {
    console.log('Arrival event recorded in lead_events');
  }
}

run();
