
import { createClient } from '@supabase/supabase-js'

// Hardcoded fallback since dotenv is missing in this env
const supabaseUrl = "https://acesalquiler-supabase.igc7oi.easypanel.host/"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

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
