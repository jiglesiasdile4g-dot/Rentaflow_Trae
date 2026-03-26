import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_triggers')
  console.log("RPC get_triggers:", data, error)
  
  const { data: d2, error: e2 } = await supabase.from('pg_trigger').select('*').limit(5)
  console.log("pg_trigger query:", d2, e2)
}

run()
