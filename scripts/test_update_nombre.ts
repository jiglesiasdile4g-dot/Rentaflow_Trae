import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
async function run() { const { data, error } = await supabase.from('Clientes').update({ Nombre: 'Juan J Iglesias Updated' }).eq('id', 2866).select('id, Estado, Nombre'); console.log('Update result:', data, error); } run();