import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const leadId = 2769

  console.log("Updating lead 2769 with a new date...")
  const { data: updateData, error: updateError } = await supabase
    .from('Clientes')
    .update({ 
      fecha_de_visita: '2026-03-24T19:00:00+00:00', // New date
      Estado: 'Visita Confirmada',
      visita_propuesta: false,
      visita_completada: 'visita confirmada'
    })
    .eq('id', leadId)
    .select('id, Estado, visita_propuesta, visita_completada, fecha_de_visita')

  console.log("Update result:", updateData, updateError)

  // Verify immediately
  const { data: verifyData, error: verifyError } = await supabase
    .from('Clientes')
    .select('id, Estado, visita_propuesta, visita_completada, fecha_de_visita')
    .eq('id', leadId)

  console.log("Verify result:", verifyData, verifyError)
}

run()
