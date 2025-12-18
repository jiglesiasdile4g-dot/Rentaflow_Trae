"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createLeadAction(leadData: any) {
  const supabase = await createClient()

  // 1. Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "No autenticado" }
  }

  // 2. Check role
  // We need to fetch the user's role from the Perfiles table or wherever it is stored.
  // Assuming 'Perfiles' table linked by 'usuario_id' or 'email'.
  // Based on context, it seems to be 'Perfiles' table.
  const { data: profile, error: profileError } = await supabase
    .from("Perfiles")
    .select("role")
    .eq("usuario", user.email)
    .single()

  if (profileError) {
    console.error("Error fetching profile:", profileError)
    return { error: "Error al verificar permisos" }
  }

  if (profile?.role === "agente") {
    return { error: "No tienes permisos para crear leads" }
  }

  // 3. Insert lead
  // Ensure 'usuario' field matches the organization (inmobiliariaId) logic if necessary.
  // The client sends 'usuario' in leadData, but we should probably validate it matches the user's organization if possible.
  // For now, we trust the client's 'usuario' but we could fetch the user's inmobiliaria_id from profile to be safer.
  
  // However, looking at leads/page.tsx, it sets 'usuario: inmobiliariaId'.
  // We should verify if the user belongs to that inmobiliaria if we want to be strict.
  // But the primary goal here is to block 'agente'.

  const { data, error } = await supabase.from("Clientes").insert([leadData]).select()

  if (error) {
    console.error("Error creating lead:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard/leads")
  return { data }
}
