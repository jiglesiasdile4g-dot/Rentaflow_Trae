"use server"

import { createAdminClient } from "@/lib/supabase/admin"

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
             const email = (p.usuario || p.Usuario || "").toLowerCase().trim()
             const name = p.nombre || p.Nombre
             if (email && name) {
                 profileMap.set(email, name)
             }
         })
     }

     // Map to ensure backward compatibility and use updated names
     const mappedData = (agentsData || []).map((agent: any) => {
         const email = (agent.Email || "").toLowerCase().trim()
         const profileName = profileMap.get(email)
         
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
