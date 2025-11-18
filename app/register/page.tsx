"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Mail, Lock, Building2 } from "lucide-react"
import Link from "next/link"

interface Inmobiliaria {
  idi: number
  Nombre: string
}

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [selectedInmobiliaria, setSelectedInmobiliaria] = useState<string>("")
  const [inmobiliarias, setInmobiliarias] = useState<Inmobiliaria[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingInmobiliarias, setLoadingInmobiliarias] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchInmobiliarias = async () => {
      try {
        const supabase = createClient()

        console.log("[v0] Fetching inmobiliarias...")
        const { data, error } = await supabase.from("Inmobiliarias").select("idi, Nombre").order("Nombre")

        console.log("[v0] Inmobiliarias response:", { data, error })

        if (error) {
          console.error("[v0] Error fetching inmobiliarias:", error)
          setError(`Error al cargar inmobiliarias: ${error.message}`)
        } else if (data) {
          console.log("[v0] Inmobiliarias loaded:", data.length, "items")
          setInmobiliarias(data)
        }
      } catch (err) {
        console.error("[v0] Error fetching inmobiliarias:", err)
        setError("Error inesperado al cargar inmobiliarias")
      } finally {
        setLoadingInmobiliarias(false)
      }
    }

    fetchInmobiliarias()
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      setLoading(false)
      return
    }

    if (!selectedInmobiliaria) {
      setError("Por favor selecciona una inmobiliaria")
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
          data: {
            inmobiliaria_id: Number(selectedInmobiliaria),
          },
        },
      })

      if (error) {
        setError(error.message)
      } else {
        setSuccess(true)
        // If email confirmation is disabled, redirect immediately
        if (data.user && !data.user.email_confirmed_at) {
          setTimeout(() => {
            router.push("/login")
          }, 3000)
        } else {
          router.push("/dashboard")
        }
      }
    } catch (err) {
      setError("Error inesperado al registrarse")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <UserPlus className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle className="text-2xl text-green-600">¡Registro Exitoso!</CardTitle>
            <CardDescription>
              Tu cuenta ha sido creada correctamente. Serás redirigido al login en unos segundos.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserPlus className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
          <CardDescription>Regístrate para acceder al Dashboard Básico Alfa</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inmobiliaria">Inmobiliaria</Label>
              <Select
                value={selectedInmobiliaria}
                onValueChange={setSelectedInmobiliaria}
                disabled={loadingInmobiliarias}
              >
                <SelectTrigger className="w-full">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue
                    placeholder={
                      loadingInmobiliarias
                        ? "Cargando..."
                        : `Selecciona una inmobiliaria (${inmobiliarias.length} disponibles)`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {inmobiliarias.map((inmobiliaria) => (
                    <SelectItem key={inmobiliaria.idi} value={inmobiliaria.idi.toString()}>
                      {inmobiliaria.Nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading || loadingInmobiliarias}>
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
