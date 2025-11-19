import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { isSupabaseConfigured } from "@/lib/utils"

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/setup")
  }
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    // User is authenticated, redirect to dashboard
    redirect("/dashboard")
  } else {
    // User is not authenticated, redirect to login
    redirect("/login")
  }
}
