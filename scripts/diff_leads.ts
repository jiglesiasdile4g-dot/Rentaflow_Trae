import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
async function run() { const [a, b] = await Promise.all([supabase.from('Clientes').select('*').eq('id', 2866).single(), supabase.from('Clientes').select('*').eq('id', 2769).single()]); for(let k in a.data){ if(k!=='id' && k!=='status_history' && k!=='fecha_actualizacion' && JSON.stringify(a.data[k])!==JSON.stringify(b.data[k])){ console.log(k, ':', a.data[k], '=>', b.data[k]); } } } run();