"use server"

import { createAdminClient } from "@/lib/supabase/admin"

function normalizeEmailKey(value: any) {
  const raw = String(value || "").trim().toLowerCase()
  const local = raw.includes("@") ? raw.split("@")[0] : raw
  return { raw, local }
}

export async function getAgentsByIdi(inmobiliariaId: number) {
  const supabase = createAdminClient()
  try {
    // console.log("[getAgentsByIdi] fetching for idi:", inmobiliariaId)
    // 1. Fetch Agentes (legacy table, still used for agenda linking)
    const { data: agentsData, error: agentsError } = await supabase
      .from("Agentes")
      .select("idag, Nombre, Email")
      .eq("idi", inmobiliariaId)
      .order("Nombre")
    
    if (agentsError) {
        console.error("Error fetching agents by idi:", agentsError)
        return { data: [], error: agentsError.message }
    }

    // 2. Fetch Perfiles (modern user table with updated names)
    // We fetch profiles for this inmobiliaria to get the most up-to-date names
    const { data: profilesData } = await supabase
        .from("Perfiles")
        .select("usuario, nombre, Nombre")
        .eq("inmobiliaria", inmobiliariaId)
    
    // Create a map for quick lookup: email -> name
     const profileMap = new Map<string, string>()
     if (profilesData) {
         profilesData.forEach((p: any) => {
             const { raw, local } = normalizeEmailKey(p.usuario || p.Usuario || "")
             const name = p.nombre || p.Nombre
             if (name && String(name).trim()) {
                 const v = String(name).trim()
                 if (raw) profileMap.set(raw, v)
                 if (local) profileMap.set(local, v)
             }
         })
     }

    // Fallback: attempt to resolve missing names by querying Perfiles for the agents' emails/local-parts
    const missingKeys: string[] = []
    ;(agentsData || []).forEach((agent: any) => {
      const { raw, local } = normalizeEmailKey(agent.Email)
      if (!profileMap.has(raw) && !profileMap.has(local)) {
        if (raw) missingKeys.push(raw)
        if (local) missingKeys.push(local)
      }
    })
    if (missingKeys.length > 0) {
      const uniqueMissing = Array.from(new Set(missingKeys))
      const { data: extraProfiles } = await supabase
        .from("Perfiles")
        .select("usuario, nombre, Nombre")
        .in("usuario", uniqueMissing)
      if (extraProfiles) {
        extraProfiles.forEach((p: any) => {
          const { raw, local } = normalizeEmailKey(p.usuario || p.Usuario || "")
          const name = p.nombre || p.Nombre
          if (name && String(name).trim()) {
            const v = String(name).trim()
            if (raw) profileMap.set(raw, v)
            if (local) profileMap.set(local, v)
          }
        })
      }
    }

     // Map to ensure backward compatibility and use updated names
     const mappedData = (agentsData || []).map((agent: any) => {
         const { raw: email, local } = normalizeEmailKey(agent.Email)
         const profileName = profileMap.get(email) || profileMap.get(local)
         
         // Use profile name if available, otherwise fallback to agent name, then email prefix
         let displayName = profileName || agent.Nombre || email.split('@')[0]
         
         // If the name looks like an email, try to prettify it if we have nothing else
         if (displayName.includes('@')) {
             displayName = displayName.split('@')[0]
         }
         
         // Log for debugging specific cases
         if (email.includes('dana.apolaya')) {
             console.log(`[getAgentsByIdi] Processing Dana: Email=${email}, ProfileName=${profileName}, FinalDisplay=${displayName}`)
         }

         return {
             ...agent,
             Nombre: displayName, // Update the main display field
             nombre: displayName  // lowercase variant
         }
     })
    
    return { data: mappedData, error: null }
  } catch (err: any) {
      console.error("Exception fetching agents:", err)
      return { data: [], error: err.message }
  }
}

export async function getAgentByEmail(email: string) {
    const supabase = createAdminClient()
    try {
        const { data, error } = await supabase
            .from("Agentes")
            .select("idag, Nombre, Email, idi")
            .ilike("Email", email)
            .maybeSingle()
            
        if (error) {
             console.error("Error fetching agent by email:", error)
             return { data: null, error: error.message }
        }

        if (data) {
            return { 
                data: {
                    ...data, 
                    nombre: data.Nombre
                }, 
                error: null 
            }
        }
        return { data: null, error: null }
    } catch (err: any) {
        return { data: null, error: err.message }
    }
}

export async function resolveUserName(email: string) {
    const supabase = createAdminClient()
    try {
        let debugInfo = ""
        
        // 1. Try Perfiles (Try multiple casing variations to be safe)
        // Note: PostgREST error "column X does not exist" means we are requesting a column that isn't there.
        // We will try to select * to inspect available columns or just try lowercase/uppercase separately if needed.
        // But safer is to try standard columns we know exist or catch the error.
        
        // Let's try a safer query first for Perfiles
        const { data: profile, error: profileError } = await supabase
            .from("Perfiles")
            .select("*") // Fetch all to avoid column error
            .ilike("usuario", email)
            .maybeSingle()
            
        if (profileError) debugInfo += `PerfilesErr:${profileError.message};`
        
        if (profile) {
            // Check variations manually
            const name = profile.nombre || profile.Nombre || profile.name || profile.Name
            if (name && name.trim()) return { name: name.trim(), source: "Perfiles (Admin)" }
            debugInfo += "Perfiles:FoundButNoName;"
        } else {
            debugInfo += "Perfiles:NotFound;"
        }

        // 2. Try Agentes (Legacy)
        const { data: agent, error: agentError } = await supabase
            .from("Agentes")
            .select("*") // Fetch all to avoid column error
            .ilike("Email", email)
            .maybeSingle()
            
        if (agentError) debugInfo += `AgentesErr:${agentError.message};`

        if (agent) {
            const name = agent.Nombre || agent.nombre || agent.name || agent.Name
            if (name && name.trim()) return { name: name.trim(), source: "Agentes (Admin)" }
            debugInfo += "Agentes:FoundButNoName;"
        } else {
            debugInfo += "Agentes:NotFound;"
        }

        return { name: null, source: `Not Found (${debugInfo})` }
    } catch (err: any) {
        console.error("Error resolving user name:", err)
        return { name: null, source: `Exception: ${err.message}` }
    }
}
