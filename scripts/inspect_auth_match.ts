
import { createClient } from '@supabase/supabase-js'
import path from 'path'
import fs from 'fs'

// Manually load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim().replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
      process.env[key] = value
    }
  })
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('Inspecting RLS policies for Perfiles...')
  
  // We can't easily query pg_policies via Supabase JS client unless we use a specific rpc or if we have direct SQL access.
  // However, we can try to infer it by acting as a user if we had a user token, but we don't.
  // We'll rely on checking if the user exists and what fields match.
  
  // Let's check if there are any users in auth.users (requires admin client, which this is)
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()
  
  if (usersError) {
    console.error('Error fetching users:', usersError)
  } else {
    console.log(`Found ${users.length} auth users.`)
    users.forEach(u => {
      console.log(`Auth User: ${u.email} (ID: ${u.id})`)
    })
  }
  
  console.log('\nChecking Perfiles table again...')
  const { data: perfiles, error: perfilesError } = await supabase
    .from('Perfiles')
    .select('*')
  
  if (perfilesError) {
    console.error('Error fetching perfiles:', perfilesError)
  } else {
    console.log(`Found ${perfiles.length} profiles.`)
    perfiles.forEach(p => {
       console.log(`Profile: ${p.usuario || p.Usuario} (Role: ${p.role}, IsAdmin: ${p.is_admin})`)
    })
  }

  // Check for discrepancies
  if (users && perfiles) {
      console.log('\nMatching Analysis:')
      users.forEach(u => {
          const p = perfiles.find((prof: any) => 
              (prof.usuario || prof.Usuario || '').toLowerCase() === u.email?.toLowerCase()
          )
          if (p) {
              console.log(`[MATCH] Auth ${u.email} maps to Profile ${p.usuario || p.Usuario}`)
          } else {
              console.log(`[MISSING] Auth ${u.email} has NO matching Profile`)
          }
      })
  }
}

main()
