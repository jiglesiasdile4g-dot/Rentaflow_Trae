const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: adsData, error: adsErr } = await supabase.from('Anuncios').select('ida, Referencia, Direccion, Precio, Activacion, usuario').eq('usuario', '3').eq('Activacion', 'Activo')
  console.log(adsErr)
  console.log(adsData?.find(a => a.Referencia === 'IF-001-CH'))
}
test()
