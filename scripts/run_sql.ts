import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
async function run() { const sql = fs.readFileSync('scripts/999_fix_visita_confirmada_reversion.sql', 'utf8'); const { data, error } = await supabase.rpc('execute_sql', { sql_query: sql }); console.log('Result:', data, error); } run();