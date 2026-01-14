import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InmobiliariaProvider } from "@/lib/contexts/inmobiliaria-context"
import SidebarLayout from "@/components/sidebar-layout"
import { Toaster } from "@/components/ui/toaster"
import { isSupabaseConfigured } from "@/lib/utils"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isSupabaseConfigured()) {
    redirect("/setup")
  }
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Fetch user profile to get the name
  const { data: profile } = await supabase
    .from("Perfiles")
    .select("nombre, Nombre")
    .eq("usuario", user.email)
    .maybeSingle()
  
  const userName = profile?.nombre || profile?.Nombre || user.email

  // Force password update if required (e.g. new invited users)
  if (user.user_metadata?.must_change_password) {
    redirect("/update-password")
  }

  return (
    <InmobiliariaProvider>
      <SidebarLayout user={{ ...user, name: userName }}>{children}</SidebarLayout>
      <Toaster />
    </InmobiliariaProvider>
  )
}
