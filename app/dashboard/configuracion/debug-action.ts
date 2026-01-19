'use server'

import { createClient } from '@supabase/supabase-js'

// Create admin client using service_role key (only use in server-side code)
const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

export async function debugUserCheck(email: string) {
    console.log("DEBUG: Checking user", email)
    const admin = createAdminClient()
    const results: any = {}

    // Check Perfiles
    const { data: perfiles, error: perfilesError } = await admin
        .from("Perfiles")
        .select("*")
        .ilike("usuario", email)
    results.perfiles = perfiles
    results.perfilesError = perfilesError
    console.log("DEBUG: Perfiles", perfiles)

    // Check Agentes
    const { data: agentes, error: agentesError } = await admin
        .from("Agentes")
        .select("*")
        .ilike("Email", email)
    results.agentes = agentes
    results.agentesError = agentesError
    console.log("DEBUG: Agentes", agentes)
    
    // Check Auth (Invite) - Can't fully query auth.users easily without specific RPC or admin API, 
    // but we can try to invite again to see if it says "already exists" or list users if possible
    try {
        const { data: { users }, error: authError } = await admin.auth.admin.listUsers()
        if (users) {
            const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
            results.auth = found ? { id: found.id, email: found.email, metadata: found.user_metadata } : "Not found in listUsers"
             console.log("DEBUG: Auth", results.auth)
        } else {
            results.authError = authError
             console.log("DEBUG: Auth Error", authError)
        }
    } catch (e: any) {
        results.authException = e.message
        console.log("DEBUG: Auth Exception", e.message)
    }

    return results
}
