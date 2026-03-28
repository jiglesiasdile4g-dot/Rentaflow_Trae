const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: lead, error: err1 } = await supabase.from('Clientes').select('*').eq('id', 2835).single()
  
  if (lead) {
    const { data: anuncio, error: err2 } = await supabase.from('Anuncios').select('ida, Referencia, Precio, Activacion').eq('Referencia', lead.Inmueble).eq('usuario', lead.usuario)
    console.log('Anuncio matching lead.Inmueble:', anuncio)
  }
}
test()
