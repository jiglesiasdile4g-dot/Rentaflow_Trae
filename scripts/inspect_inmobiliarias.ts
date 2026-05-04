
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and (SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY)")
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  console.log('Inspecting Inmobiliarias...')
  const { data, error } = await supabase.from('Inmobiliarias').select('*').limit(1)
  if (error) {
    console.error('Error Inmobiliarias:', error)
  } else {
    console.log('Inmobiliarias columns:', data && data.length > 0 ? Object.keys(data[0]) : 'No data')
  }
}

inspect()
