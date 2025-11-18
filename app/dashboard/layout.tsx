import type React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InmobiliariaProvider } from "@/lib/contexts/inmobiliaria-context"
import SidebarLayout from "@/components/sidebar-layout"
import { Toaster } from "@/components/ui/toaster"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <InmobiliariaProvider>
      <SidebarLayout user={user}>{children}</SidebarLayout>
      <Toaster />
    </InmobiliariaProvider>
  )
}
