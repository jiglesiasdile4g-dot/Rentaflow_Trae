"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createAnuncioAction(anuncioData: any) {
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
  const { data: profile, error: profileError } = await supabase
    .from("Perfiles")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (profileError) {
    console.error("Error fetching profile:", profileError)
    return { error: "Error al verificar permisos" }
  }

  if (profile?.role === "agente") {
    return { error: "No tienes permisos para crear anuncios" }
  }

  // 3. Insert anuncio
  const { data, error } = await supabase.from("Anuncios").insert([anuncioData]).select()

  if (error) {
    console.error("Error creating anuncio:", error)
    return { error: error.message }
  }

  revalidatePath("/dashboard/anuncios")
  return { data }
}

export async function duplicateAnuncioAction(anuncioData: any) {
    return createAnuncioAction(anuncioData);
}
