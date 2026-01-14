"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function fixUserPermissionsAction() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !user.email) {
    return { success: false, error: "No autenticado" }
  }

  const userEmail = user.email
  const admin = createAdminClient()

  try {
    // 1. Find the agent record case-insensitively
    const { data: agent, error: findError } = await admin
      .from("Agentes")
      .select("idag, Email")
      .ilike("Email", userEmail)
      .maybeSingle()

    if (findError) {
      console.error("[FixPermissions] Error finding agent:", findError)
      return { success: false, error: "Error al buscar agente" }
    }

    if (!agent) {
      return { success: false, error: "No se encontró un perfil de agente asociado a tu email." }
    }

    // 2. Check if email casing matches
    if (agent.Email !== userEmail) {
      console.log(`[FixPermissions] Mismatch found. Agent: ${agent.Email}, User: ${userEmail}. Fixing...`)
      
      const { error: updateError } = await admin
        .from("Agentes")
        .update({ Email: userEmail })
        .eq("idag", agent.idag)

      if (updateError) {
        console.error("[FixPermissions] Error updating agent:", updateError)
        return { success: false, error: "Error al actualizar el perfil de agente." }
      }
      
      return { success: true, fixed: true, message: "Perfil de agente sincronizado correctamente." }
    }

    return { success: true, fixed: false, message: "El perfil ya está correcto." }

  } catch (err: any) {
    console.error("[FixPermissions] Unexpected error:", err)
    return { success: false, error: err.message || "Error inesperado" }
  }
}
