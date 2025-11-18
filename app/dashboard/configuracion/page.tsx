import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Palette, Shield, Building2 } from "lucide-react"

export default async function ConfiguracionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // First get the user's profile to find their inmobiliaria ID
  let inmobiliariaData = null
  try {
    const { data: perfil, error: perfilError } = await supabase
      .from("Perfiles")
      .select("inmobiliaria")
      .eq("usuario", user.email)
      .maybeSingle()

    if (perfilError) {
      console.log("[v0] Error fetching profile:", perfilError)
    } else if (perfil && perfil.inmobiliaria) {
      // Now fetch the inmobiliaria details using the ID
      const { data: inmobiliaria, error: inmobiliariaError } = await supabase
        .from("Inmobiliarias")
        .select("*")
        .eq("idi", perfil.inmobiliaria)
        .single()

      if (!inmobiliariaError && inmobiliaria) {
        inmobiliariaData = inmobiliaria
      } else if (inmobiliariaError) {
        console.log("[v0] Error fetching inmobiliaria:", inmobiliariaError)
      }
    }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria data:", err)
  }

  return (
    <div className="p-8">
      <div className="space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-foreground">Configuración</h2>
          <p className="text-muted-foreground mt-2">Administra tu cuenta y preferencias del sistema</p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Perfil de Usuario</CardTitle>
            </div>
            <CardDescription>Información básica de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input id="email" type="email" value={user.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-id">ID de Usuario</Label>
              <Input id="user-id" value={user.id} disabled className="bg-muted font-mono text-xs" />
            </div>
          </CardContent>
        </Card>

        {/* Inmobiliaria Settings */}
        {inmobiliariaData && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Información de Inmobiliaria</CardTitle>
              </div>
              <CardDescription>Datos de tu empresa inmobiliaria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inmobiliaria-nombre">Nombre de la Inmobiliaria</Label>
                <Input id="inmobiliaria-nombre" value={inmobiliariaData.Nombre || ""} disabled className="bg-muted" />
              </div>
              {inmobiliariaData.telefono && (
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input id="telefono" value={inmobiliariaData.telefono} disabled className="bg-muted" />
                </div>
              )}
              {inmobiliariaData.direccion && (
                <div className="space-y-2">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input id="direccion" value={inmobiliariaData.direccion} disabled className="bg-muted" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>Configura cómo quieres recibir notificaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                <p className="text-sm text-muted-foreground">Recibe alertas de nuevos leads por correo</p>
              </div>
              <Switch id="email-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lead-notifications">Alertas de Leads</Label>
                <p className="text-sm text-muted-foreground">Notificación cuando un lead completa sus datos</p>
              </div>
              <Switch id="lead-notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="weekly-report">Reporte Semanal</Label>
                <p className="text-sm text-muted-foreground">Resumen semanal de actividad y métricas</p>
              </div>
              <Switch id="weekly-report" />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Apariencia</CardTitle>
            </div>
            <CardDescription>Personaliza la interfaz del dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Modo Oscuro</Label>
                <p className="text-sm text-muted-foreground">Activa el tema oscuro de la interfaz</p>
              </div>
              <Switch id="dark-mode" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-view">Vista Compacta</Label>
                <p className="text-sm text-muted-foreground">Reduce el espaciado en las tablas</p>
              </div>
              <Switch id="compact-view" />
            </div>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Seguridad</CardTitle>
            </div>
            <CardDescription>Gestiona la seguridad de tu cuenta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Contraseña</Label>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Cambiar Contraseña
              </Button>
              <p className="text-xs text-muted-foreground">Última actualización: Nunca</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Sesiones Activas</Label>
              <p className="text-sm text-muted-foreground">Gestiona los dispositivos con acceso a tu cuenta</p>
              <Button variant="outline" className="w-full sm:w-auto bg-transparent">
                Ver Sesiones
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Button variant="outline">Cancelar</Button>
          <Button>Guardar Cambios</Button>
        </div>
      </div>
    </div>
  )
}
