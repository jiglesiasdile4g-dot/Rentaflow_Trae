import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ChangePassword } from "./change-password-client"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Palette, Shield, Building2, UserPlus, MoreVertical, Trash2, Mail, ShieldCheck, UserCheck, UserX, Power, PowerOff } from "lucide-react"
import { AppearanceSettings } from "./appearance-client"
import { ActiveSessions } from "./sessions-client"
import { NotificationSettings } from "./notification-settings-client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import { 
  createAgentAction, 
  updateRoleAction, 
  toggleActiveAction, 
  deleteAgentAction, 
  toggleAgentFunctionsAction, 
  resendUserConfirmationAction 
} from "./actions"

import { UserActions } from "./user-actions"

export default async function ConfiguracionPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // First get the user's profile to find their inmobiliaria ID and role
  let inmobiliariaData = null
  let userRoleLabel = "Usuario"
  let agentCount = 0
  let planIdNum = 0
  let usersList: Array<{ id?: any; usuario: string; is_admin: boolean; role?: string; activo?: boolean | null; has_agent_record?: boolean }> = []
  let currentIdi: number | null = null
  let debugItems: Array<{ label: string; value: string }> = []
  const addDebug = (label: string, value: any) => {
    debugItems.push({ label, value: String(value) })
  }
  async function fetchPerfilesByIdi(client: any, idi: number, log?: (label: string, value: any) => void) {
    // Standard fetch (numeric idi)
    try {
      const { data, error } = await client.from("Perfiles").select("*").eq("inmobiliaria", idi)
      if (!error && data) {
        if (log) log("fetch_result", `found ${data.length}`)
        return data
      }
      if (error && log) log("err_fetch", error.message)
    } catch (e: any) {
      if (log) log("exc_fetch", e.message)
    }
    return []
  }
  try {
    const { data: perfil, error: perfilError } = await supabase
      .from("Perfiles")
      .select("inmobiliaria, is_admin")
      .eq("usuario", user.email)
      .limit(1)
      .maybeSingle()

    if (perfilError) {
      console.log("[v0] Error fetching profile:", perfilError)
    } else if (perfil && perfil.inmobiliaria) {
      userRoleLabel = perfil?.is_admin === true ? "Administrador" : "Usuario"
      let reqIdi: number | null = null
      try {
        const spIdiRaw =
          searchParams && typeof searchParams.idi === "string"
            ? String(searchParams.idi)
            : Array.isArray(searchParams?.idi) && searchParams.idi.length > 0
            ? String(searchParams.idi[0])
            : undefined
        if (spIdiRaw) {
          if (spIdiRaw === "all") {
            reqIdi = null
          } else {
            const n = Number(spIdiRaw)
            reqIdi = Number.isFinite(n) ? n : null
          }
        }
      } catch {}
      currentIdi = reqIdi !== null ? reqIdi : Number(perfil.inmobiliaria)
      addDebug("role", userRoleLabel)
      addDebug("current_idi", currentIdi)
      // Now fetch the inmobiliaria details using the ID
      const { data: inmobiliaria, error: inmobiliariaError } = await supabase
        .from("Inmobiliarias")
        .select("*")
        .eq("idi", currentIdi as any)
        .limit(1)
        .maybeSingle()

      if (!inmobiliariaError && inmobiliaria) {
        inmobiliariaData = inmobiliaria
        const idi = Number((inmobiliaria as any).idi)
        currentIdi = idi
        planIdNum = Number((inmobiliaria as any).Plan) || 0
      }
      let perfilesData: any[] = []
      if (userRoleLabel === "Administrador") {
        const admin = createAdminClient()
        addDebug("list_source", "admin")
        perfilesData = await fetchPerfilesByIdi(admin, Number(currentIdi), addDebug)
      } else {
        addDebug("list_source", "user")
        perfilesData = await fetchPerfilesByIdi(supabase, Number(currentIdi), addDebug)
      }

      // Fetch active agents map
      const { data: activeAgents, error: activeAgentsError } = await supabase
        .from("Agentes")
        .select("Email")
        .eq("idi", currentIdi as any)
      
      if (activeAgentsError) {
          console.error("[v0] Error fetching active agents:", activeAgentsError)
      } else {
          console.log("[v0] Active agents found:", activeAgents?.length, activeAgents)
      }
      
      const activeAgentEmails = new Set((activeAgents || []).map((a: any) => (a.Email || "").toLowerCase()))
      console.log("[v0] Active agent emails set:", Array.from(activeAgentEmails))

      usersList = (perfilesData || []).map((p: any) => {
        const uEmail = String(p?.usuario || p?.Usuario || "").toLowerCase()
        const hasRecord = activeAgentEmails.has(uEmail)
        console.log(`[v0] User: ${uEmail}, Has Agent Record: ${hasRecord}`)
        return {
            id: p?.id, // Get ID
            usuario: String(p?.usuario || p?.Usuario || ""),
            is_admin: p?.is_admin === true || p?.Is_admin === true,
            role: String(p?.role || p?.Role || "agente").toLowerCase(),
            activo: typeof p?.activo === "boolean" ? !!p?.activo : (typeof p?.Activo === "boolean" ? !!p?.Activo : null),
            has_agent_record: hasRecord
        }
      })
      agentCount = Number((perfilesData || []).length)
    }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria data:", err)
  }
  addDebug("users_list_final_count", usersList.length)
  addDebug("agent_count_final", agentCount)







  const sp = searchParams || undefined
  const createUserStatus = typeof sp?.createUser === "string" ? sp?.createUser : undefined
  const createUserMsgRaw = typeof sp?.msg === "string" ? sp?.msg : undefined
  const manageStatus = typeof sp?.manageUser === "string" ? sp?.manageUser : undefined
  const manageMsgRaw = typeof sp?.mmsg === "string" ? sp?.mmsg : undefined
  const createUserMsg = createUserMsgRaw && createUserMsgRaw !== "NEXT_REDIRECT" ? createUserMsgRaw : undefined
  const manageMsg = manageMsgRaw && manageMsgRaw !== "NEXT_REDIRECT" ? manageMsgRaw : undefined
  const planData = planIdNum ? getPlanData(planIdNum) : null
  const limitUsers = Number(planData?.Usuarios || 0)
  const unlimited = limitUsers >= 1000000
  const canCreateAgents = !!inmobiliariaData && (unlimited || agentCount < limitUsers)
  const remainingUsers = unlimited ? 1000000 : Math.max(limitUsers - agentCount, 0)

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
            {(!user.email_confirmed_at || String(user.email_confirmed_at || "").trim() === "") && (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertDescription>Correo no confirmado</AlertDescription>
                </Alert>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Badge variant={userRoleLabel === "Administrador" ? "feature" : "secondary"} className="rounded-full">
                {userRoleLabel}
              </Badge>
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
              {(() => {
                const mailSistema = (inmobiliariaData as any)["Mail sistema"] ?? (inmobiliariaData as any).mail_sistema ?? (inmobiliariaData as any).Mail_sistema ?? (inmobiliariaData as any).MailSistema ?? (inmobiliariaData as any).mailSistema ?? (inmobiliariaData as any).EmailSistema ?? (inmobiliariaData as any).email_sistema
                return mailSistema ? (
                  <div className="space-y-2">
                    <Label htmlFor="mail-sistema">Mail sistema</Label>
                    <Input id="mail-sistema" value={mailSistema} disabled className="bg-muted" />
                  </div>
                ) : null
              })()}
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

        {/* Admin: Gestión de agentes */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Gestión de usuarios
                </CardTitle>
                <CardDescription className="text-xs">
                  Administra el equipo de tu inmobiliaria
                </CardDescription>
              </div>
              {userRoleLabel === "Administrador" && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs" variant="outline">
                      <UserPlus className="mr-2 h-3 w-3" />
                      Nuevo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Invitar nuevo usuario</DialogTitle>
                      <DialogDescription>
                        Ingresa el correo del nuevo agente. Se le enviará una invitación para unirse.
                      </DialogDescription>
                    </DialogHeader>
                    <form action={createAgentAction} className="space-y-4 py-4">
                      <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Correo electrónico</Label>
                        <Input id="newEmail" name="newEmail" type="email" placeholder="agente@ejemplo.com" required />
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={!canCreateAgents}>
                          Enviar invitación
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {manageStatus === "success" && manageMsg && (
              <Alert className="py-2">
                <AlertDescription className="text-xs">{manageMsg}</AlertDescription>
              </Alert>
            )}
            {manageStatus === "error" && manageMsg && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{manageMsg}</AlertDescription>
              </Alert>
            )}
            {createUserStatus === "success" && createUserMsg && (
              <Alert className="py-2">
                <AlertDescription className="text-xs">{createUserMsg}</AlertDescription>
              </Alert>
            )}
            {createUserStatus === "error" && createUserMsg && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{createUserMsg}</AlertDescription>
              </Alert>
            )}
            {userRoleLabel !== "Administrador" && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">Solo administradores pueden gestionar usuarios</AlertDescription>
              </Alert>
            )}
            {userRoleLabel === "Administrador" && (
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-b pb-4">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Plan:</span> {(planData as any)?.Nombre || String(planIdNum)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Usuarios:</span> {agentCount}/{formatPlanValue(limitUsers)}
                </div>
                {planData && (
                   <div className="flex items-center gap-1">
                     <span className="font-medium">Restantes:</span> {formatPlanValue(remainingUsers)}
                   </div>
                )}
                 {!canCreateAgents && (
                    <span className="text-destructive font-medium ml-auto">Límite alcanzado</span>
                )}
              </div>
            )}
            {userRoleLabel === "Administrador" && debugItems.length > 0 && (
              <div className="rounded-md bg-muted/50 p-2 text-[10px] text-muted-foreground hidden">
                {/* Debug hidden by default to save space, can be enabled if needed */}
                <div className="font-medium mb-1">Debug</div>
                <div>IDI: {String(currentIdi ?? "null")}</div>
                {debugItems.map((d, i) => (
                  <div key={i}>
                    {d.label}: {d.value}
                  </div>
                ))}
              </div>
            )}
            
            {userRoleLabel === "Administrador" && (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">Correo</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">Rol</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-[80px]">Estado</th>
                        <th className="h-8 px-3 text-right align-middle font-medium text-muted-foreground w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-3 text-center text-muted-foreground">
                            No hay usuarios
                          </td>
                        </tr>
                      ) : (
                        usersList.map((u) => (
                          <tr key={u.usuario} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-2 px-3 align-middle font-medium max-w-[150px]" title={u.usuario}>
                              <div className="flex flex-col gap-1">
                                <span className="truncate">
                                  {u.usuario}
                                  {u.usuario === user.email && " (Tú)"}
                                </span>
                                {u.is_admin && u.has_agent_record && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1 w-fit">
                                      <UserPlus className="h-3 w-3" /> Agente Activo
                                    </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2 px-3 align-middle">
                              <Badge 
                                variant={u.is_admin ? "default" : "secondary"} 
                                className={`rounded-sm px-1.5 py-0 text-[10px] font-normal ${
                                  u.is_admin 
                                    ? "bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200" 
                                    : u.role === "supervisor"
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                                      : ""
                                }`}
                              >
                                {u.is_admin ? "Admin" : u.role === "supervisor" ? "Supervisor" : "Agente"}
                              </Badge>
                            </td>
                            <td className="p-2 px-3 align-middle">
                              <div className="flex items-center gap-1.5">
                                <div className={`h-1.5 w-1.5 rounded-full ${u.activo !== false ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-muted-foreground">{u.activo !== false ? "Activo" : "Inactivo"}</span>
                              </div>
                            </td>
                            <td className="p-2 px-3 align-middle text-right">
                              <UserActions
                                user={u}
                                idi={Number(currentIdi)}
                                toggleRoleAction={updateRoleAction}
                                toggleActiveAction={toggleActiveAction}
                                deleteAgentAction={deleteAgentAction}
                                resendUserConfirmationAction={resendUserConfirmationAction}
                                toggleAgentFunctionsAction={toggleAgentFunctionsAction}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Notificaciones</CardTitle>
            </div>
            <CardDescription>Configura cómo quieres recibir notificaciones</CardDescription>
          </CardHeader>
          <CardContent>
            <NotificationSettings />
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
          <CardContent>
            <AppearanceSettings />
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
              <ChangePassword />
              <p className="text-xs text-muted-foreground">Última actualización: {user.updated_at ? new Intl.DateTimeFormat("es-ES", { dateStyle: "long", timeStyle: "short" }).format(new Date(user.updated_at)) : "Nunca"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Sesiones Activas</Label>
              <p className="text-sm text-muted-foreground">Gestiona los dispositivos con acceso a tu cuenta</p>
              <ActiveSessions />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
