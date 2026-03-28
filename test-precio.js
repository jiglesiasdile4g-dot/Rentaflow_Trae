const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const { data: ads } = await supabase.from('Anuncios').select('Precio').eq('ida', 31).single()
  console.log('Precio:', ads.Precio, 'Type:', typeof ads.Precio)
}
test()
