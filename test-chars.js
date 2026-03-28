const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: lead } = await supabase.from('Clientes').select('Inmueble').eq('id', 2835).single()
  console.log('Lead Inmueble length:', lead.Inmueble.length)
  console.log('Lead Inmueble chars:', lead.Inmueble.split('').map(c => c.charCodeAt(0)))
  
  const { data: ads } = await supabase.from('Anuncios').select('Referencia').eq('Referencia', lead.Inmueble)
  console.log('Ads found with exact match:', ads.length)
}
test()
