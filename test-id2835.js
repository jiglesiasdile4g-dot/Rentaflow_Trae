const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: lead } = await supabase.from('Clientes').select('*').eq('id', 2835).single()
  console.log('Lead Inmueble:', lead.Inmueble)
  
  const { data: ad } = await supabase.from('Anuncios').select('ida, Referencia, Precio').eq('Referencia', lead.Inmueble).single()
  console.log('Ad:', ad)
}
test()
