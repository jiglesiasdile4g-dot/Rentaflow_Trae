"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function updatePasswordAction(formData: FormData) {
  const password = formData.get("password") as string
  const confirmPassword = formData.get("confirmPassword") as string
  const supabase = await createClient()

  if (!password || !confirmPassword) {
    return { error: "Todos los campos son obligatorios" }
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden" }
  }

  if (password.length < 6) {
    return { error: "La contraseña debe tener al menos 6 caracteres" }
  }

  // Debug: Check current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error("Update password - No user found:", userError)
    return { error: "No se pudo identificar al usuario. Por favor, solicita un nuevo enlace de recuperación." }
  }

  console.log("Updating password for user:", user.id, user.email)

  const { error } = await supabase.auth.updateUser({
    password: password,
    data: { must_change_password: false }
  })

  if (error) {
    return { error: error.message }
  }

  redirect("/dashboard?passwordUpdated=true")
}
