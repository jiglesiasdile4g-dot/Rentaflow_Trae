import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
async function run() { const { data, error } = await supabase.from('Clientes').update({ Estado: 'Visita Confirmada', fecha_de_visita: '2026-03-30T13:00:00+00:00', visita_completada: 'visita confirmada', visita_propuesta: false }).eq('id', 2866).select('id, Estado, fecha_de_visita, visita_completada, visita_propuesta'); console.log('Update result:', data, error); } run();