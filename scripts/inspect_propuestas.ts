
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://acesalquiler-supabase.igc7oi.easypanel.host/"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  console.log('Inspecting PropuestasVisita table columns...')

  const { data, error } = await supabase
    .from('PropuestasVisita')
    .select('*')
    .limit(1)

  if (error) {
    console.error('Error fetching PropuestasVisita:', error)
    return
  }

  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]))
  } else {
    // If empty, we can't see keys. But we can try to insert dummy to see error or use a known technique?
    // Actually, if it's empty, we can't see keys.
    // We can try to select a non-existent column to get a hint? No.
    // We can try to read the Types definition if available in the codebase.
    console.log('Table is empty.')
  }
}

inspect()
