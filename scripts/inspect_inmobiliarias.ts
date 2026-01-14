
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://acesalquiler-supabase.igc7oi.easypanel.host/"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

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
