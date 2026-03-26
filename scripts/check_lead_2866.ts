import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

async function run() { 
  const { data, error } = await supabase.from('Clientes').select('id, "Estado", fecha_de_visita, visita_completada, visita_propuesta').eq('id', 2866); 
  console.log(data, error); 
}
run();
