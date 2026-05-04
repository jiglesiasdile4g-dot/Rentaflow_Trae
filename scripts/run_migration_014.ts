
import { createClient } from '@supabase/supabase-js'
declare const process: { env: Record<string, string | undefined>; cwd: () => string; exit: (code?: number) => never }
declare function require(name: string): any

const fs = require("fs") as { readFileSync: (path: string, encoding: "utf8") => string }
const path = require("path") as { join: (...parts: string[]) => string }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  const sqlPath = path.join(process.cwd(), "scripts", "014_add_logo_url_to_inmobiliarias.sql")
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  console.log('Running migration...')
  
  // Attempt 1: Try RPC exec_sql (common in some Supabase starters)
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql })
  
  if (error) {
    console.error('RPC exec_sql failed:', error.message)
    // Attempt 2: Try RPC exec (another common name)
    const { error: error2 } = await supabase.rpc('exec', { query: sql })
    if (error2) {
         console.error('RPC exec failed:', error2.message)
         console.log('Could not execute SQL via RPC. Please execute scripts/014_add_logo_url_to_inmobiliarias.sql manually in Supabase SQL Editor.')
         process.exit(1)
    } else {
        console.log('Migration successful via exec RPC')
    }
  } else {
    console.log('Migration successful via exec_sql RPC')
  }
}

runMigration().catch(console.error)
