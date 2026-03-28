const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const id = '2835'
  
  // mock route.ts logic
  const numeric = Number(id)
  const { data: lead, error } = await supabase.from('Clientes').select('*').eq('id', numeric).maybeSingle()
  
  const inmoId = lead?.usuario != null ? String(lead.usuario) : ""
  
  const { data: adsData } = await supabase.from('Anuncios').select('ida, Referencia, Direccion, Precio, Activacion, usuario').eq('usuario', inmoId).eq('Activacion', 'Activo')
  
  console.log('Lead Inmueble:', lead?.Inmueble)
  const selectedAd = adsData.find(ad => String(ad?.Referencia || ad?.Direccion || ad?.ida || "") === lead?.Inmueble) || {}
  console.log('Selected Ad:', selectedAd)
  console.log('Price:', selectedAd?.Precio || selectedAd?.precio || 0)
}
test()
