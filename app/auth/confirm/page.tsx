"use client"

import { useEffect, useState, Suspense } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

function AuthConfirmContent() {
  const [status, setStatus] = useState("Iniciando verificación...")
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/dashboard"

  useEffect(() => {
    // Check for error in searchParams
    const errorParam = searchParams.get("error")
    const errorDesc = searchParams.get("error_description")
    if (errorParam) {
      setError(errorDesc || errorParam)
      return
    }

    const handleAuth = async () => {
      const supabase = createClient()
      
      // 1. Check if we already have a session
      setStatus("Buscando sesión existente...")
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session) {
        setStatus("Sesión encontrada. Sincronizando...")
        router.refresh() // Sync server components with new session
        await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for cookie propagation
        router.push(next)
        return
      }

      // 2. Try to parse hash manually if session not found
      const hash = window.location.hash
      if (hash && hash.includes("access_token")) {
        setStatus("Token detectado. Validando...")
        try {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get("access_token")
          const refreshToken = params.get("refresh_token")
          
          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })

            if (setSessionError) {
              throw setSessionError
            }

            setStatus("Autenticación correcta. Entrando...")
            
            // Verify session is active
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Force a hard refresh/router refresh to ensure cookies are seen by middleware
                router.refresh() 
                await new Promise(resolve => setTimeout(resolve, 1000))
                router.push(next)
                return
            }
          }
        } catch (e: any) {
          console.error("Error manual parsing hash:", e)
          setError(e.message || "Error procesando el token de invitación")
          return
        }
      }

      // 3. Fallback: Listen for auth state changes
      setStatus("Esperando respuesta del servidor...")
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session) {
          setStatus("Acceso concedido. Redirigiendo...")
          router.refresh()
          await new Promise(resolve => setTimeout(resolve, 500))
          router.push(next)
        }
      })

      // Timeout safety
      setTimeout(() => {
        supabase.auth.getSession().then(({ data }) => {
          if (!data.session) {
             if (!error) {
                // Check if we are stuck
                const currentHash = window.location.hash
                if (!currentHash) {
                    setError("No se detectó el token de invitación. Asegúrate de copiar el enlace completo.")
                } else {
                    setError("El enlace parece haber expirado o es inválido.")
                }
             }
          }
        })
      }, 8000) // Increased timeout

      return () => {
        subscription.unsubscribe()
      }
    }

    handleAuth()
  }, [router, next, searchParams, error])

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="text-red-500">Error de Enlace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{error}</p>
            <p className="text-xs text-muted-foreground">
              Si el problema persiste, solicita una nueva invitación al administrador.
            </p>
            <Button onClick={() => router.push("/login")} variant="outline" className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-[400px]">
        <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
             <p className="font-medium text-lg">Verificando acceso</p>
             <p className="text-sm text-gray-500 mt-2 animate-pulse">{status}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Card className="w-[400px]">
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
               <p className="font-medium text-lg">Cargando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <AuthConfirmContent />
    </Suspense>
  )
}
