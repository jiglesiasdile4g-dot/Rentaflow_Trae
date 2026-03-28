const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function test() {
  const id = '2835'
  const { data, error } = await supabase.from('Clientes').select('*').eq('id', id).single()
  console.log('Lead keys:', Object.keys(data || {}))
  console.log('Inmueble:', data?.Inmueble)
}
test()
