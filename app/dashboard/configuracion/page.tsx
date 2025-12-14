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

export default async function ConfiguracionPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
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
  let usersList: Array<{ usuario: string; is_admin: boolean; activo?: boolean | null }> = []
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
      usersList = (perfilesData || []).map((p: any) => ({
        usuario: String(p?.usuario || p?.Usuario || ""),
        is_admin: p?.is_admin === true || p?.Is_admin === true,
        activo: typeof p?.activo === "boolean" ? !!p?.activo : (typeof p?.Activo === "boolean" ? !!p?.Activo : null),
      }))
      agentCount = Number((perfilesData || []).length)
    }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria data:", err)
  }
  addDebug("users_list_final_count", usersList.length)
  addDebug("agent_count_final", agentCount)

  async function createAgentAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
      redirect("/login")
    }
    const { data: perfil } = await supa
      .from("Perfiles")
      .select("is_admin, inmobiliaria")
      .eq("usuario", currentUser.email)
      .limit(1)
      .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("newEmail") || "").trim()
    const password = String(formData.get("newPassword") || "")
    const confirm = String(formData.get("confirmPassword") || "")

    let msg = ""
    if (!isAdmin) {
      msg = "Solo administradores pueden crear usuarios"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    if (!email || !password || !confirm) {
      msg = "Completa todos los campos"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    if (!emailValid) {
      msg = "El correo electrónico no es válido"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    if (password !== confirm) {
      msg = "Las contraseñas no coinciden"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    if (password.length < 6) {
      msg = "La contraseña debe tener al menos 6 caracteres"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }

    let canCreate = false
    try {
      const { data: inm } = await supa
        .from("Inmobiliarias")
        .select("idi, Plan")
        .eq("idi", idi as any)
        .limit(1)
        .maybeSingle()
      const planId = Number(inm?.Plan) || 0
      const planData = planId ? getPlanData(planId) : null
      const limit = Number(planData?.Usuarios || 0)
      const unlimited = limit >= 1000000
      let currentAgents = 0
      try {
        const { count: c1 } = await supa
          .from("Perfiles")
          .select("usuario", { count: "exact", head: true })
          .eq("inmobiliaria", idi as any)
        currentAgents = Number(c1 || 0)
      } catch {}
      if (!currentAgents) {
        try {
          const { count: c2 } = await supa
            .from("Perfiles")
            .select("usuario", { count: "exact", head: true })
            .eq("Inmobiliaria", idi as any)
          currentAgents = Number(c2 || 0)
        } catch {}
      }
      canCreate = unlimited || currentAgents < limit
      if (!canCreate) {
        msg = "Límite de agentes alcanzado para el plan contratado"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
      }
    } catch (e: any) {
      msg = e?.message || "Error verificando límites de plan"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }

    try {
      const admin = createAdminClient()
      const { data: createdUser, error: adminError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          inmobiliaria_id: Number(idi),
          role: "agente",
        },
      } as any)
      if (adminError) {
        msg = adminError.message
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
      }
      if (!createdUser?.user?.id) {
        msg = "El usuario no pudo crearse en Auth"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
      }
      const { data: fetched, error: fetchError } = await admin.auth.admin.getUserById(createdUser.user.id)
      if (fetchError || !fetched?.user?.id) {
        msg = fetchError?.message || "El usuario no figura en Auth tras la creación"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
      }
      let insertErrorMsg = ""
      {
        const { error: e1 } = await admin.from("Perfiles").insert({
          usuario: email,
          inmobiliaria: Number(idi),
          is_admin: false,
        })
        let err = e1
        if (err) {
          const { error: e2 } = await admin.from("Perfiles").insert({
            usuario: email,
            Inmobiliaria: Number(idi),
            is_admin: false,
          })
          err = e2
        }
        if (err) {
          const { error: e3 } = await admin.from("Perfiles").insert({
            Usuario: email,
            inmobiliaria: Number(idi),
            is_admin: false,
          })
          err = e3
        }
        if (err) {
          const { error: e4 } = await admin.from("Perfiles").insert({
            Usuario: email,
            Inmobiliaria: Number(idi),
            is_admin: false,
          })
          err = e4
        }
        if (err) {
          insertErrorMsg = err.message || "error"
        }
      }
      if (insertErrorMsg) {
        msg = insertErrorMsg
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
      }
      msg = "Usuario creado correctamente. Revisa el correo para confirmar"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=success&msg=${encodeURIComponent(msg)}`)
    } catch (e: any) {
      msg = e?.message || "No se pudo crear el usuario"
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
  }

  async function toggleRoleAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
      redirect("/login")
    }
    const { data: perfil } = await supa
      .from("Perfiles")
      .select("is_admin, inmobiliaria")
      .eq("usuario", currentUser.email)
      .limit(1)
      .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    if (!isAdmin) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden cambiar roles")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const toAdminRaw = formData.get("toAdmin")
    const toAdmin = String(toAdminRaw || "").toLowerCase() === "true"
    try {
      let err: any = null
      const { error: e1 } = await supa
        .from("Perfiles")
        .update({ is_admin: toAdmin })
        .eq("usuario", email)
        .eq("inmobiliaria", idi as any)
      err = e1
      if (err) {
        const { error: e2 } = await supa
          .from("Perfiles")
          .update({ is_admin: toAdmin })
          .eq("usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e2
      }
      if (err) {
        const { error: e3 } = await supa
          .from("Perfiles")
          .update({ is_admin: toAdmin })
          .eq("Usuario", email)
          .eq("inmobiliaria", idi as any)
        err = e3
      }
      if (err) {
        const { error: e4 } = await supa
          .from("Perfiles")
          .update({ is_admin: toAdmin })
          .eq("Usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e4
      }
      if (err) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(err.message)}`)
      }
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Rol actualizado correctamente")}`)
    } catch (e: any) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo actualizar el rol")}`)
    }
  }

  async function toggleActiveAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
      redirect("/login")
    }
    const { data: perfil } = await supa
      .from("Perfiles")
      .select("is_admin, inmobiliaria")
      .eq("usuario", currentUser.email)
      .limit(1)
      .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    if (!isAdmin) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden cambiar estado")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const activeRaw = formData.get("active")
    const setActive = String(activeRaw || "").toLowerCase() === "true"
    try {
      let err: any = null
      const { error: e1 } = await supa
        .from("Perfiles")
        .update({ activo: setActive })
        .eq("usuario", email)
        .eq("inmobiliaria", idi as any)
      err = e1
      if (err) {
        const { error: e2 } = await supa
          .from("Perfiles")
          .update({ activo: setActive })
          .eq("usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e2
      }
      if (err) {
        const { error: e3 } = await supa
          .from("Perfiles")
          .update({ activo: setActive })
          .eq("Usuario", email)
          .eq("inmobiliaria", idi as any)
        err = e3
      }
      if (err) {
        const { error: e4 } = await supa
          .from("Perfiles")
          .update({ activo: setActive })
          .eq("Usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e4
      }
      if (err) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(err.message)}`)
      }
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent(setActive ? "Agente activado" : "Agente desactivado")}`)
    } catch (e: any) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo actualizar el estado")}`)
    }
  }

  async function deleteAgentAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
      redirect("/login")
    }
    const { data: perfil } = await supa
      .from("Perfiles")
      .select("is_admin, inmobiliaria")
      .eq("usuario", currentUser.email)
      .limit(1)
      .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    if (!isAdmin) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden borrar usuarios")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    try {
      let err: any = null
      const { error: e1 } = await supa
        .from("Perfiles")
        .delete()
        .eq("usuario", email)
        .eq("inmobiliaria", idi as any)
      err = e1
      if (err) {
        const { error: e2 } = await supa
          .from("Perfiles")
          .delete()
          .eq("usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e2
      }
      if (err) {
        const { error: e3 } = await supa
          .from("Perfiles")
          .delete()
          .eq("Usuario", email)
          .eq("inmobiliaria", idi as any)
        err = e3
      }
      if (err) {
        const { error: e4 } = await supa
          .from("Perfiles")
          .delete()
          .eq("Usuario", email)
          .eq("Inmobiliaria", idi as any)
        err = e4
      }
      if (err) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(err.message || "No se pudo borrar el usuario")}`)
      }
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Usuario borrado correctamente")}`)
    } catch (e: any) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo borrar el usuario")}`)
    }
  }

  async function resendUserConfirmationAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const {
      data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
      redirect("/login")
    }
    const { data: perfil } = await supa
      .from("Perfiles")
      .select("is_admin")
      .eq("usuario", currentUser.email)
      .limit(1)
      .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const email = String(formData.get("email") || "").trim()
    try {
      if (!isAdmin) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden reenviar confirmación")}`)
      }
      const { error } = await supa.auth.resend({ type: "signup", email })
      if (error) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(error.message)}`)
      }
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Correo de confirmación reenviado")}`)
    } catch (e: any) {
      revalidatePath("/dashboard/configuracion")
      redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo reenviar la confirmación")}`)
    }
  }

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
                      <DialogTitle>Crear nuevo usuario</DialogTitle>
                      <DialogDescription>
                        Ingresa los datos del nuevo agente. Se enviará un correo de confirmación.
                      </DialogDescription>
                    </DialogHeader>
                    <form action={createAgentAction} className="space-y-4 py-4">
                      <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                      <div className="space-y-2">
                        <Label htmlFor="newEmail">Correo electrónico</Label>
                        <Input id="newEmail" name="newEmail" type="email" placeholder="agente@ejemplo.com" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Contraseña</Label>
                          <Input id="newPassword" name="newPassword" type="password" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirmar</Label>
                          <Input id="confirmPassword" name="confirmPassword" type="password" required />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={!canCreateAgents}>
                          Crear usuario
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
                            <td className="p-2 px-3 align-middle font-medium truncate max-w-[150px]" title={u.usuario}>{u.usuario}</td>
                            <td className="p-2 px-3 align-middle">
                              <Badge 
                                variant={u.is_admin ? "default" : "secondary"} 
                                className={`rounded-sm px-1.5 py-0 text-[10px] font-normal ${u.is_admin ? "bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200" : ""}`}
                              >
                                {u.is_admin ? "Admin" : "Agente"}
                              </Badge>
                            </td>
                            <td className="p-2 px-3 align-middle">
                              <div className="flex items-center gap-1.5">
                                <div className={`h-1.5 w-1.5 rounded-full ${u.activo !== false ? "bg-green-500" : "bg-red-500"}`} />
                                <span className="text-muted-foreground">{u.activo !== false ? "Activo" : "Inactivo"}</span>
                              </div>
                            </td>
                            <td className="p-2 px-3 align-middle text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-6 w-6 p-0">
                                    <span className="sr-only">Menú</span>
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                  <DropdownMenuItem asChild>
                                    <form action={toggleRoleAction} className="w-full cursor-pointer">
                                      <input type="hidden" name="email" value={u.usuario} />
                                      <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                                      <input type="hidden" name="toAdmin" value={String(!u.is_admin)} />
                                      <button type="submit" className="flex w-full items-center">
                                        {u.is_admin ? (
                                          <>
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            <span>Hacer agente</span>
                                          </>
                                        ) : (
                                          <>
                                            <ShieldCheck className="mr-2 h-4 w-4" />
                                            <span>Hacer admin</span>
                                          </>
                                        )}
                                      </button>
                                    </form>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <form action={toggleActiveAction} className="w-full cursor-pointer">
                                      <input type="hidden" name="email" value={u.usuario} />
                                      <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                                      <input type="hidden" name="active" value={String(!(u.activo === false))} />
                                      <button type="submit" className="flex w-full items-center">
                                        {u.activo === false ? (
                                          <>
                                            <Power className="mr-2 h-4 w-4" />
                                            <span>Activar cuenta</span>
                                          </>
                                        ) : (
                                          <>
                                            <PowerOff className="mr-2 h-4 w-4" />
                                            <span>Desactivar cuenta</span>
                                          </>
                                        )}
                                      </button>
                                    </form>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <form action={resendUserConfirmationAction} className="w-full cursor-pointer">
                                      <input type="hidden" name="email" value={u.usuario} />
                                      <button type="submit" className="flex w-full items-center">
                                        <Mail className="mr-2 h-4 w-4" />
                                        <span>Reenviar confirmación</span>
                                      </button>
                                    </form>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                    <form action={deleteAgentAction} className="w-full cursor-pointer">
                                      <input type="hidden" name="email" value={u.usuario} />
                                      <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                                      <button type="submit" className="flex w-full items-center">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar usuario</span>
                                      </button>
                                    </form>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
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
