"use server"

import { createAdminClient } from "@/lib/supabase/admin"

export async function getAgentsByIdi(inmobiliariaId: number) {
  const supabase = createAdminClient()
  try {
    // console.log("[getAgentsByIdi] fetching for idi:", inmobiliariaId)
    const { data, error } = await supabase
      .from("Agentes")
      .select("idag, Nombre, Email")
      .eq("idi", inmobiliariaId)
      .order("Nombre")
    
    if (error) {
        console.error("Error fetching agents by idi:", error)
        return { data: [], error: error.message }
    }

    // Map to ensure backward compatibility
    const mappedData = (data || []).map((agent: any) => ({
        ...agent,
        nombre: agent.Nombre
    }))
    
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
