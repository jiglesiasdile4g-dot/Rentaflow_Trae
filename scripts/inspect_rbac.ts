
declare const process: { env: Record<string, string | undefined> }

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)")
}

const client = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  console.log('--- Inspecting Perfiles ---')
  const { data: perfiles, error: pError } = await client.from('Perfiles').select('*').limit(2)
  if (pError) console.error(pError)
  else console.log(JSON.stringify(perfiles, null, 2))

  console.log('\n--- Inspecting Agentes ---')
  const { data: agentes, error: aError } = await client.from('Agentes').select('*').limit(2)
  if (aError) console.error(aError)
  else console.log(JSON.stringify(agentes, null, 2))

  console.log('\n--- Inspecting Clientes (Leads) Columns ---')
  const { data: leads, error: lError } = await client.from('Clientes').select('*').limit(1)
  if (lError) console.error(lError)
  else console.log(leads && leads.length ? Object.keys(leads[0]) : 'Empty')
}

inspect()
