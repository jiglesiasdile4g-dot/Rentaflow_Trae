"use server"

import { createClient } from "@supabase/supabase-js"

export async function resetPasswordAction(formData: FormData) {
  const email = formData.get("email") as string
  
  // Use a direct client without session persistence to avoid PKCE cookie dependencies
  // This ensures the recovery link works across different browsers/devices
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      }
    }
  )

  if (!email) {
    return { error: "El correo electrónico es obligatorio" }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/update-password`,
  })

  if (error) {
    console.error("Reset password error:", error)
    return { error: "No se pudo enviar el correo de recuperación. Inténtalo de nuevo." }
  }

  return { success: "Se ha enviado un enlace de recuperación a tu correo." }
}
