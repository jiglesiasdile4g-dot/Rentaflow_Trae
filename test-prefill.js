const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const id = '2835'
  let lead = null
  let anuncios = []

  const { data, error } = await supabase.from('Clientes').select('*').eq('id', id).single()
  if (data) lead = data

  const inmoId = lead?.usuario != null ? String(lead.usuario) : ""
  if (inmoId) {
    const { data: adsData, error: adsErr } = await supabase.from('Anuncios').select('ida, Referencia, Direccion, Precio, Activacion, usuario').eq('usuario', inmoId).eq('Activacion', 'Activo')
    if (adsData) anuncios = adsData
  }

  console.log('Lead Inmueble:', lead?.Inmueble)
  console.log('Anuncios array:', anuncios)
}
test()
