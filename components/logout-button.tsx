"use client"

import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useState } from "react"
import { logClientEventAction } from "@/app/actions/audit"

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.auth.signOut()
      
      if (user) {
        await logClientEventAction(
          "LOGOUT",
          "AUTHENTICATION",
          "SUCCESS",
          user.email,
          user.email,
          user.id
        )
      }
      
      window.location.href = "/login"
    } catch (error) {
      console.error("Error logging out:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center gap-2 bg-transparent"
    >
      <LogOut className="h-4 w-4" />
      {loading ? "Saliendo..." : "Cerrar Sesión"}
    </Button>
  )
}
