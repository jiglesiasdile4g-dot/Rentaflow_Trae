import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.from('Clientes').select('id, Estado, visita_propuesta, visita_completada').eq('id', 2866)
  console.log("Lead 2866 before:", data)

  const { data: updateData, error: updateError } = await supabase
    .from('Clientes')
    .update({ 
      fecha_de_visita: '2026-03-29T13:00:00+00:00',
      Estado: 'Visita Confirmada',
      visita_completada: 'visita confirmada',
      visita_propuesta: false
    })
    .eq('id', 2866)
    .select('id, Estado, visita_propuesta, visita_completada')

  console.log("Update result:", updateData, updateError)
}

run()
