import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import Link from "next/link"
import { revalidatePath } from "next/cache"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ChangePassword } from "./change-password-client"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { User, Bell, Palette, Shield, Building2, UserPlus, MoreVertical, Trash2, Mail, ShieldCheck, UserCheck, UserX, Power, PowerOff } from "lucide-react"
import { AppearanceSettings } from "./appearance-client"
import { ActiveSessions } from "./sessions-client"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import { 
  createAgentAction, 
  toggleRoleAction, 
  toggleActiveAction, 
  deleteAgentAction, 
  toggleAgentFunctionsAction, 
  resendUserConfirmationAction,
  updateUserDetailsAction,
  triggerVisitReminderAction,
  onboardInmobiliariaAction,
  updateInmobiliariaAction,
  syncAgentNamesAction
} from "./actions"
import { LogoUpload } from "./logo-upload"
import { UserActions } from "./user-actions"
import { UserProfileForm } from "./user-profile-form"

export default async function ConfiguracionPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const admin = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // First get the user's profile to find their inmobiliaria ID and role
  let inmobiliariaData: any = null
  let userRoleLabel = "Usuario"
  let isSuperuser = false
  let isAdmin = false
  let agentCount = 0
  let planIdNum = 0
  let usersList: Array<{ id?: any; usuario: string; nombre?: string; telefono?: string; is_admin: boolean; role?: string; activo?: boolean | null; has_agent_record?: boolean; inmobiliariaId?: number | null; inmobiliariaNombre?: string | null }> = []
  let currentIdi: number | null = null
  let isAllInmobiliarias = false
  let debugItems: Array<{ label: string; value: string }> = []
  const addDebug = (label: string, value: any) => {
    debugItems.push({ label, value: String(value) })
  }
  const normalizeEmailKey = (value: any) => {
    const raw = String(value || "").trim().toLowerCase()
    const local = raw.includes("@") ? raw.split("@")[0] : raw
    return { raw, local }
  }
  const reminderStatus = typeof searchParams?.reminder === "string" ? searchParams.reminder : null
  const reminderMsg = typeof searchParams?.rmsg === "string" ? searchParams.rmsg : null
  const inmoStatus = typeof searchParams?.inmo === "string" ? searchParams.inmo : null
  const inmoMsg = typeof searchParams?.imsg === "string" ? searchParams.imsg : null
  async function fetchPerfilesByIdi(client: any, idi: number, log?: (label: string, value: any) => void) {
    // Standard fetch (numeric idi)
    try {
      const { data, error } = await client.from("Perfiles").select("idp, created_at, usuario, inmobiliaria, is_admin, role, es_agente, nombre, telefono").eq("inmobiliaria", idi)
      if (!error && data) {
        if (log) log("fetch_result", `found ${data.length}`)
        if (data.length > 0) {
             console.log("[DEBUG] Perfiles keys:", Object.keys(data[0]))
        }
        return data
      }
      if (error && log) log("err_fetch", error.message)
    } catch (e: any) {
      if (log) log("exc_fetch", e.message)
    }
    return []
  }
  async function fetchPerfilesAll(client: any, log?: (label: string, value: any) => void) {
    try {
      const { data, error } = await client.from("Perfiles").select("idp, created_at, usuario, inmobiliaria, is_admin, role, es_agente, nombre, telefono")
      if (!error && data) {
        if (log) log("fetch_result_all", `found ${data.length}`)
        return data
      }
      if (error && log) log("err_fetch_all", error.message)
    } catch (e: any) {
      if (log) log("exc_fetch_all", e.message)
    }
    return []
  }
  let perfil: any = null
  let perfilError: any = null

  try {
    // Use admin client to bypass RLS policies for permission check
    const result = await admin
      .from("Perfiles")
      .select("inmobiliaria, is_admin, nombre, telefono, role")
      .ilike("usuario", user.email ?? "")
      .limit(1)
      .maybeSingle()
    
    perfil = result.data
    perfilError = result.error

    if (perfilError) {
      console.log("[v0] Error fetching profile:", perfilError)
    } else if (perfil && perfil.inmobiliaria) {
      const roleStr = String(perfil.role || "").toLowerCase()
      isSuperuser = perfil.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
      isAdmin = ["administrador", "admin"].includes(roleStr) || isSuperuser
      userRoleLabel = isSuperuser ? "Superusuario" : (isAdmin ? "Administrador" : "Usuario")
      let reqIdi: number | null = null
      let isAllRequested = false
      try {
        const spIdiRaw =
          searchParams && typeof searchParams.idi === "string"
            ? String(searchParams.idi)
            : Array.isArray(searchParams?.idi) && searchParams.idi.length > 0
            ? String(searchParams.idi[0])
            : undefined
        if (spIdiRaw) {
          if (spIdiRaw === "all") {
            isAllRequested = true
          } else {
            const n = Number(spIdiRaw)
            reqIdi = Number.isFinite(n) ? n : null
          }
        }
      } catch {}
      isAllInmobiliarias = isSuperuser && isAllRequested
      currentIdi = isAllInmobiliarias ? null : reqIdi !== null ? reqIdi : Number(perfil.inmobiliaria)
      addDebug("role", userRoleLabel)
      addDebug("current_idi", currentIdi)
      if (!isAllInmobiliarias && currentIdi) {
        const { data: inmobiliaria, error: inmobiliariaError } = await supabase
          .from("Inmobiliarias")
          .select("*, pagina_web")
          .eq("idi", currentIdi as any)
          .limit(1)
          .maybeSingle()

        if (!inmobiliariaError && inmobiliaria) {
          inmobiliariaData = inmobiliaria
          const idi = Number((inmobiliaria as any).idi)
          currentIdi = idi
          planIdNum = Number((inmobiliaria as any).Plan) || 0
        }
      }
      let perfilesData: any[] = []
      if (isAdmin) {
        const admin = createAdminClient()
        addDebug("list_source", "admin")
        perfilesData = isAllInmobiliarias ? await fetchPerfilesAll(admin, addDebug) : await fetchPerfilesByIdi(admin, Number(currentIdi), addDebug)
      } else {
        addDebug("list_source", "user")
        perfilesData = await fetchPerfilesByIdi(supabase, Number(currentIdi), addDebug)
      }

      // Fetch active agents map
      const agentsClient = isAllInmobiliarias ? admin : supabase
      const agentsQuery = agentsClient.from("Agentes").select("Email, Nombre, Telefono" + (isAllInmobiliarias ? ", idi" : ""))
      const { data: activeAgents, error: activeAgentsError } = isAllInmobiliarias
        ? await agentsQuery
        : await agentsQuery.eq("idi", currentIdi as any)
      
      if (activeAgentsError) {
          console.error("[v0] Error fetching active agents:", activeAgentsError)
      } else {
          console.log("[v0] Active agents found:", activeAgents?.length, activeAgents)
      }

      // AUTO-FIX: Check for agents without profile and create them
      if (activeAgents && activeAgents.length > 0) {
        const profileEmails = new Set(perfilesData.map((p: any) => String(p.usuario || p.Usuario || "").toLowerCase()))
        
        // Deduplicate activeAgents by email first
        const uniqueActiveAgents = activeAgents.reduce((acc: any[], current: any) => {
            const email = (current.Email || "").toLowerCase()
            if (!acc.some((item: any) => (item.Email || "").toLowerCase() === email)) {
                acc.push(current)
            }
            return acc
        }, [])

        const missingAgents = uniqueActiveAgents.filter((a: any) => a.Email && !profileEmails.has(String(a.Email).toLowerCase()))
        
        if (missingAgents.length > 0) {
            console.log(`[v0] Found ${missingAgents.length} agents without profile. Attempting auto-fix...`)
            const admin = createAdminClient()
            
            for (const agent of missingAgents) {
                const email = String(agent.Email).toLowerCase()
                if (profileEmails.has(email)) continue // Skip if already processed in this loop

                const name = agent.Nombre || email.split('@')[0]
                const phone = agent.Telefono || ""
                
                try {
                    // Try insert with correct columns (es_agente instead of activo)
                    // First try lowercase standard
                    const { data: newProfile, error: insertError } = await admin.from("Perfiles").insert({
                        usuario: email,
                        inmobiliaria: currentIdi,
                        role: "agente",
                        is_admin: false,
                        es_agente: true,
                        nombre: name,
                        telefono: phone
                    }).select().single()

                    if (insertError) {
                        console.error(`[v0] Failed to auto-create profile for ${email} (lowercase):`, insertError)
                        
                        // Retry with Capitalized columns if error suggests it (or just always try as fallback)
                        if (insertError.code === '42703') { // Undefined column
                            console.log(`[v0] Retrying auto-create for ${email} with Capitalized columns...`)
                            const { data: newProfile2, error: insertError2 } = await admin.from("Perfiles").insert({
                                Usuario: email,
                                Inmobiliaria: currentIdi,
                                Role: "agente",
                                Is_admin: false,
                                Es_agente: true,
                                Nombre: name,
                                Telefono: phone
                            }).select().single()
                            
                            if (insertError2) {
                                console.error(`[v0] Failed to auto-create profile for ${email} (Capitalized):`, insertError2)
                            } else if (newProfile2) {
                                perfilesData.push(newProfile2)
                                profileEmails.add(email)
                                console.log(`[v0] Auto-created profile for ${email} (Capitalized)`)
                            }
                        }
                    } else if (newProfile) {
                        perfilesData.push(newProfile)
                        profileEmails.add(email)
                        console.log(`[v0] Auto-created profile for ${email}`)
                    }
                } catch (e) {
                    console.error(`[v0] Exception auto-creating profile for ${email}:`, e)
                }
            }
        }
      }
      
      const activeAgentEmails = new Map<string, { nombre: any; telefono: any }>()
      ;(activeAgents || []).forEach((a: any) => {
        const { raw, local } = normalizeEmailKey(a.Email)
        const value = { nombre: a.Nombre, telefono: a.Telefono }
        if (raw && !activeAgentEmails.has(raw)) activeAgentEmails.set(raw, value)
        if (local && !activeAgentEmails.has(local)) activeAgentEmails.set(local, value)
      })
      console.log("[v0] Active agent emails set:", Array.from(activeAgentEmails.keys()))

      // Deduplicate perfilesData for display
      const uniquePerfilesMap = new Map();
      (perfilesData || []).forEach((p: any) => {
          const email = normalizeEmailKey(p.usuario || p.Usuario || "").raw
          if (email && !uniquePerfilesMap.has(email)) {
              uniquePerfilesMap.set(email, p);
          }
      });
      const uniquePerfiles = Array.from(uniquePerfilesMap.values());

      const inmoIds = isAllInmobiliarias
        ? Array.from(
            new Set(
              (uniquePerfiles || [])
                .map((p: any) => Number(p?.inmobiliaria ?? p?.Inmobiliaria))
                .filter((id: number) => Number.isFinite(id))
            )
          )
        : []
      const inmoById = new Map<string, any>()
      if (isAllInmobiliarias && inmoIds.length > 0) {
        const { data: inmos } = await admin.from("Inmobiliarias").select("idi, Nombre").in("idi", inmoIds)
        if (inmos) {
          for (const inmo of inmos) {
            inmoById.set(String(inmo.idi), inmo)
          }
        }
      }

      usersList = uniquePerfiles.map((p: any) => {
        const { raw: uEmail, local: uLocal } = normalizeEmailKey(p?.usuario || p?.Usuario || "")
        const agentData = activeAgentEmails.get(uEmail) || activeAgentEmails.get(uLocal)
        const hasRecord = !!agentData
        console.log(`[v0] User: ${uEmail}, Has Agent Record: ${hasRecord}`)
        
        let nombre = String(p?.nombre || p?.Nombre || "")
        let telefono = String(p?.telefono || p?.Telefono || "")

        if (!nombre && agentData?.nombre) {
            nombre = agentData.nombre
        }
        if (!telefono && agentData?.telefono) {
            telefono = String(agentData.telefono)
        }

        const inmoIdRaw = p?.inmobiliaria ?? p?.Inmobiliaria
        const inmoId = Number.isFinite(Number(inmoIdRaw)) ? Number(inmoIdRaw) : currentIdi
        const inmoKey = String(inmoId ?? "")
        const inmoName = isAllInmobiliarias
          ? inmoById.get(inmoKey)?.Nombre || (inmoKey ? `IDI ${inmoKey}` : null)
          : inmobiliariaData?.Nombre || (currentIdi ? `IDI ${currentIdi}` : null)
        return {
            id: p?.idp || p?.id, // Get ID
            usuario: String(p?.usuario || p?.Usuario || ""),
            nombre,
            telefono,
            is_admin: p?.is_admin === true || p?.Is_admin === true,
            role: String(p?.role || p?.Role || "agente").toLowerCase(),
            activo: typeof p?.activo === "boolean" ? !!p?.activo : 
                    (typeof p?.Activo === "boolean" ? !!p?.Activo : 
                    (typeof p?.es_agente === "boolean" ? !!p?.es_agente : null)),
            has_agent_record: hasRecord,
            inmobiliariaId: inmoId ?? null,
            inmobiliariaNombre: inmoName ?? null
        }
      })
      agentCount = Number((perfilesData || []).length)
    }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria data:", err)
  }
  addDebug("users_list_final_count", usersList.length)
  addDebug("agent_count_final", agentCount)

  // Check for existing logo
  let currentLogoUrl = (inmobiliariaData as any)?.logo_url ?? null
  if (currentIdi) {
    try {
        const admin = createAdminClient()
        const { data: files } = await admin.storage.from("imagenes").list("logos", {
            search: `${currentIdi}-logo.png`
        })
        
        if (files && files.length > 0) {
            const { data: { publicUrl } } = supabase.storage.from("imagenes").getPublicUrl(`logos/${currentIdi}-logo.png`)
            currentLogoUrl = `${publicUrl}?v=${new Date(files[0].updated_at || Date.now()).getTime()}`
        }
    } catch (e) {
        console.error("Error checking logo:", e)
    }
  }

  const sp = searchParams || undefined
  const createUserStatus = typeof sp?.createUser === "string" ? sp?.createUser : undefined
  const createUserMsgRaw = typeof sp?.msg === "string" ? sp?.msg : undefined
  const manageStatus = typeof sp?.manageUser === "string" ? sp?.manageUser : undefined
  const manageMsgRaw = typeof sp?.mmsg === "string" ? sp?.mmsg : undefined
  const createUserMsg = createUserMsgRaw && createUserMsgRaw !== "NEXT_REDIRECT" ? createUserMsgRaw : undefined
  const manageMsg = manageMsgRaw && manageMsgRaw !== "NEXT_REDIRECT" ? manageMsgRaw : undefined
  const planData = !isAllInmobiliarias && planIdNum ? getPlanData(planIdNum) : null
  const limitUsers = Number(planData?.Usuarios || 0)
  const unlimited = !isAllInmobiliarias && limitUsers >= 1000000
  const canCreateAgents = !!inmobiliariaData && (unlimited || agentCount < limitUsers)
  const remainingUsers = !isAllInmobiliarias && unlimited ? 1000000 : Math.max(limitUsers - agentCount, 0)
  const userSearchRaw = typeof sp?.q === "string" ? sp.q : ""
  const userOrder = typeof sp?.orden === "string" ? sp.orden : "inmobiliaria"
  const userSearch = userSearchRaw.trim().toLowerCase()
  let visibleUsers = usersList
  if (userSearch) {
    visibleUsers = usersList.filter((u) => {
      const name = String(u.nombre || "").toLowerCase()
      const email = String(u.usuario || "").toLowerCase()
      const inmo = String(u.inmobiliariaNombre || "").toLowerCase()
      return name.includes(userSearch) || email.includes(userSearch) || inmo.includes(userSearch)
    })
  }
  const collator = new Intl.Collator("es", { sensitivity: "base" })
  visibleUsers = [...visibleUsers].sort((a, b) => {
    if (userOrder === "nombre") {
      const byName = collator.compare(String(a.nombre || ""), String(b.nombre || ""))
      if (byName !== 0) return byName
      return collator.compare(String(a.usuario || ""), String(b.usuario || ""))
    }
    if (userOrder === "correo") {
      const byEmail = collator.compare(String(a.usuario || ""), String(b.usuario || ""))
      if (byEmail !== 0) return byEmail
      return collator.compare(String(a.nombre || ""), String(b.nombre || ""))
    }
    const byInmo = collator.compare(String(a.inmobiliariaNombre || ""), String(b.inmobiliariaNombre || ""))
    if (byInmo !== 0) return byInmo
    const byName = collator.compare(String(a.nombre || ""), String(b.nombre || ""))
    if (byName !== 0) return byName
    return collator.compare(String(a.usuario || ""), String(b.usuario || ""))
  })
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
            <UserProfileForm 
                email={user.email || ""} 
                initialName={perfil?.nombre || perfil?.Nombre || ""} 
                initialPhone={perfil?.telefono || perfil?.Telefono || ""} 
                idi={Number(currentIdi)} 
                userRoleLabel={userRoleLabel}
            />
            {(!user.email_confirmed_at || String(user.email_confirmed_at || "").trim() === "") && (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertDescription>Correo no confirmado</AlertDescription>
                </Alert>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <div className="flex items-center gap-2">
                <Badge variant={userRoleLabel === "Superusuario" ? "feature" : "secondary"} className="rounded-full">
                  {userRoleLabel}
                </Badge>
                {userRoleLabel === "Superusuario" && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Superusuario
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inmobiliaria Settings */}
        {inmobiliariaData && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Información de Inmobiliaria</CardTitle>
                </div>
                {userRoleLabel === "Superusuario" && (
                  <div className="flex items-center gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" className="h-8 text-xs" variant="outline">
                          Alta completa
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Alta completa</DialogTitle>
                          <DialogDescription>Crea la inmobiliaria y el administrador inicial</DialogDescription>
                        </DialogHeader>
                        <form action={onboardInmobiliariaAction} className="space-y-4 py-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="onb-inmo-nombre">Nombre</Label>
                              <Input id="onb-inmo-nombre" name="Nombre" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-direccion">Dirección</Label>
                              <Input id="onb-inmo-direccion" name="Direccion" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-telefono">Teléfono</Label>
                              <Input id="onb-inmo-telefono" name="Telefono" type="tel" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-mail-contacto">Mail contacto</Label>
                              <Input id="onb-inmo-mail-contacto" name="Mail contacto" type="email" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-mail-sistema">Mail sistema</Label>
                              <Input id="onb-inmo-mail-sistema" name="Mail sistema" type="email" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-whatsapp">Whatsapp empresa</Label>
                              <Input id="onb-inmo-whatsapp" name="Whatsapp_empresa" type="tel" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-persona-contacto">Persona de contacto</Label>
                              <Input id="onb-inmo-persona-contacto" name="Persona de Contacto" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-plan">Plan</Label>
                              <Input id="onb-inmo-plan" name="Plan" type="number" step="1" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-plan-reset">Plan reset at</Label>
                              <Input id="onb-inmo-plan-reset" name="PlanResetAt" type="datetime-local" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-plan-next">Plan next</Label>
                              <Input id="onb-inmo-plan-next" name="PlanNext" type="number" step="1" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-plan-next-at">Plan next effective at</Label>
                              <Input id="onb-inmo-plan-next-at" name="PlanNextEffectiveAt" type="datetime-local" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-whatsapp-activo">Whatsapp activo</Label>
                              <div className="flex items-center gap-2">
                                <Input id="onb-inmo-whatsapp-activo" name="whatsapp_activo" type="checkbox" className="h-4 w-4" />
                                <span className="text-sm text-muted-foreground">Activo</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-act">Inmobiliaria act</Label>
                              <Input id="onb-inmo-act" name="inmobiliaria_act" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="onb-inmo-firma">Firma HTML</Label>
                              <Textarea id="onb-inmo-firma" name="firma_html" className="min-h-[120px]" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-web">Página web</Label>
                              <Input id="onb-inmo-web" name="pagina_web" type="url" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-logo">Logo URL</Label>
                              <Input id="onb-inmo-logo" name="logo_url" type="url" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-color-primario">Color primario</Label>
                              <Input id="onb-inmo-color-primario" name="color_primario" type="color" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-inmo-color-secundario">Color secundario</Label>
                              <Input id="onb-inmo-color-secundario" name="color_secundario" type="color" />
                            </div>
                          </div>

                          <Separator />

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="onb-admin-email">Email administrador</Label>
                              <Input id="onb-admin-email" name="admin_email" type="email" required />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-admin-nombre">Nombre administrador</Label>
                              <Input id="onb-admin-nombre" name="admin_nombre" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="onb-admin-telefono">Teléfono administrador</Label>
                              <Input id="onb-admin-telefono" name="admin_telefono" type="tel" />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button type="submit">Crear alta</Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
                {isAdmin && inmobiliariaData && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8 text-xs ml-2" variant="outline">
                        <Building2 className="mr-2 h-3 w-3" />
                        Editar inmobiliaria
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Editar inmobiliaria</DialogTitle>
                        <DialogDescription>Modificar los datos de la inmobiliaria actual</DialogDescription>
                      </DialogHeader>
                      <form action={updateInmobiliariaAction} className="space-y-4 py-2">
                        <input type="hidden" name="idi" value={inmobiliariaData.idi} />
                        <div className="space-y-2">
                          <Label htmlFor="inmobiliaria-nombre-edit">Nombre de la Inmobiliaria</Label>
                          <Input id="inmobiliaria-nombre-edit" name="Nombre" defaultValue={inmobiliariaData.Nombre || ""} required />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="inmo-color-principal-edit">Color principal</Label>
                            <Input id="inmo-color-principal-edit" name="color_primario" type="color" defaultValue={inmobiliariaData.color_primario || "#000000"} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="inmo-color-secundario-edit">Color secundario</Label>
                            <Input id="inmo-color-secundario-edit" name="color_secundario" type="color" defaultValue={inmobiliariaData.color_secundario || "#ffffff"} />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">Actualizar inmobiliaria</Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            <CardDescription>Datos de tu empresa inmobiliaria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              {inmoStatus === "success" && inmoMsg && (
                <Alert className="py-2">
                  <AlertDescription className="text-xs">{inmoMsg}</AlertDescription>
                </Alert>
              )}
              {inmoStatus === "error" && inmoMsg && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">{inmoMsg}</AlertDescription>
                </Alert>
              )}
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
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <form action={triggerVisitReminderAction}>
                    <Button type="submit" size="sm" className="h-8 text-xs" variant="outline">
                      <Bell className="mr-2 h-3 w-3" />
                      Ejecutar recordatorio
                    </Button>
                  </form>
                  <form action={syncAgentNamesAction}>
                    <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                    <Button type="submit" size="sm" className="h-8 text-xs" variant="outline">
                      <UserPlus className="mr-2 h-3 w-3" />
                      Sincronizar agentes
                    </Button>
                  </form>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="h-8 text-xs" variant="outline">
                        <UserPlus className="mr-2 h-3 w-3" />
                        Nuevo
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                          Invita a un nuevo usuario a tu equipo. Recibirá un correo para configurar su contraseña.
                        </DialogDescription>
                      </DialogHeader>
                      <form action={createAgentAction} className="space-y-4 py-4">
                        <input type="hidden" name="idi" value={String(currentIdi ?? "")} />
                        <div className="space-y-2">
                          <Label htmlFor="newEmail">Correo electrónico</Label>
                          <Input id="newEmail" name="newEmail" type="email" placeholder="agente@ejemplo.com" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newName">Nombre Completo</Label>
                          <Input id="newName" name="newName" type="text" placeholder="Juan Pérez" required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="newPhone">Teléfono</Label>
                          <Input id="newPhone" name="newPhone" type="tel" placeholder="+34 600 000 000" />
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={!canCreateAgents}>
                            Enviar invitación
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {reminderStatus === "success" && reminderMsg && (
              <Alert className="py-2">
                <AlertDescription className="text-xs">{reminderMsg}</AlertDescription>
              </Alert>
            )}
            {reminderStatus === "error" && reminderMsg && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{reminderMsg}</AlertDescription>
              </Alert>
            )}
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
            {!isAdmin && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">
                  Solo administradores pueden gestionar usuarios. <br/>
                  <span className="opacity-70 text-[10px]">
                    Debug: {user.email} | R: {perfil?.role ?? 'N/A'} | A: {String(perfil?.is_admin)} | Err: {perfilError?.message || 'None'}
                  </span>
                </AlertDescription>
              </Alert>
            )}
            {isAdmin && !isAllInmobiliarias && (
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
            {isAdmin && debugItems.length > 0 && (
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
            
            {isAdmin && (
              <form className="flex flex-wrap items-center gap-2 border-b pb-4" method="get">
                {isAllInmobiliarias ? (
                  <input type="hidden" name="idi" value="all" />
                ) : currentIdi ? (
                  <input type="hidden" name="idi" value={String(currentIdi)} />
                ) : null}
                <div className="flex items-center gap-2">
                  <Label htmlFor="user-search" className="text-xs">Buscar</Label>
                  <Input
                    id="user-search"
                    name="q"
                    defaultValue={userSearchRaw}
                    placeholder="Nombre o correo"
                    className="h-8 text-xs w-[220px]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="user-order" className="text-xs">Ordenar por</Label>
                  <select
                    id="user-order"
                    name="orden"
                    defaultValue={userOrder}
                    className="h-8 text-xs border rounded-md px-2 bg-background"
                  >
                    <option value="inmobiliaria">Inmobiliaria</option>
                    <option value="nombre">Nombre</option>
                    <option value="correo">Correo</option>
                  </select>
                </div>
                <Button type="submit" size="sm" variant="outline" className="h-8 text-xs">Aplicar</Button>
              </form>
            )}

            {isAdmin && (
              <div className="rounded-md border overflow-hidden">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr className="border-b">
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">Nombre</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">Inmobiliaria</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">Correo</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground">Teléfono</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-[100px]">Rol</th>
                        <th className="h-8 px-3 text-left align-middle font-medium text-muted-foreground w-[80px]">Estado</th>
                        <th className="h-8 px-3 text-right align-middle font-medium text-muted-foreground w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleUsers.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-3 text-center text-muted-foreground">
                            No hay usuarios
                          </td>
                        </tr>
                      ) : (
                        visibleUsers.map((u) => (
                          <tr key={u.usuario} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="p-2 px-3 align-middle font-medium max-w-[150px] truncate" title={u.nombre}>
                                {u.nombre || "-"}
                            </td>
                            <td className="p-2 px-3 align-middle font-medium max-w-[160px] truncate" title={u.inmobiliariaNombre || ""}>
                              {u.inmobiliariaNombre || "-"}
                            </td>
                            <td className="p-2 px-3 align-middle font-medium max-w-[150px]" title={u.usuario}>
                              <div className="flex flex-col gap-1">
                                <span className="truncate">
                                  {u.usuario}
                                  {u.usuario === user.email && " (Tú)"}
                                </span>
                                {(u.is_admin || u.role === "supervisor") && u.has_agent_record && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 border-blue-200 text-blue-700 bg-blue-50 flex items-center gap-1 w-fit">
                                      <UserPlus className="h-3 w-3" /> Agente Activo
                                    </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-2 px-3 align-middle font-medium whitespace-nowrap">
                                {u.telefono || "-"}
                            </td>
                            <td className="p-2 px-3 align-middle">
                              <Badge 
                                variant={u.is_admin ? "default" : "secondary"} 
                                className={`rounded-sm px-1.5 py-0 text-[10px] font-normal ${
                                  u.is_admin 
                                    ? "bg-violet-100 text-violet-700 hover:bg-violet-200 border-violet-200" 
                                    : u.role === "administrador"
                                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200"
                                      : u.role === "supervisor"
                                      ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200"
                                      : ""
                                }`}
                              >
                                {u.is_admin ? "Superusuario" : u.role === "administrador" ? "Administrador" : u.role === "supervisor" ? "Supervisor" : "Agente"}
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
                                idi={Number(u.inmobiliariaId ?? currentIdi ?? 0)}
                                toggleRoleAction={toggleRoleAction}
                                toggleActiveAction={toggleActiveAction}
                                deleteAgentAction={deleteAgentAction}
                                resendUserConfirmationAction={resendUserConfirmationAction}
                                toggleAgentFunctionsAction={toggleAgentFunctionsAction}
                                updateUserDetailsAction={updateUserDetailsAction}
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

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Comunicaciones</CardTitle>
            </div>
            <CardDescription>Gestiona las plantillas y mensajes que envías</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Crea o edita comunicaciones para distintos escenarios</div>
            <Button asChild>
              <Link href="/dashboard/comunicaciones">Abrir comunicaciones</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Appearance & Personalization Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Apariencia y Personalización</CardTitle>
            </div>
            <CardDescription>Personaliza la interfaz y la identidad visual</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {inmobiliariaData && (userRoleLabel === "Administrador" || userRoleLabel === "Supervisor") && (
               <>
                 <div className="flex flex-col gap-4">
                    <div className="space-y-0.5">
                        <Label>Logo de la empresa</Label>
                        <p className="text-sm text-muted-foreground">Sube tu logo para personalizar la barra lateral</p>
                    </div>
                    <LogoUpload inmobiliariaId={currentIdi!} currentLogoUrl={currentLogoUrl} />
                 </div>
                 <Separator />
               </>
            )}
            <AppearanceSettings 
              key={currentIdi ?? "default"}
              idi={currentIdi ?? undefined} 
              initialSignature={(inmobiliariaData as any)?.firma_html} 
              initialWebsite={(inmobiliariaData as any)?.pagina_web}
              canEdit={!!inmobiliariaData && (userRoleLabel === "Administrador" || userRoleLabel === "Supervisor")}
            />
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
              <Suspense fallback={<Button variant="outline" disabled>Cargando...</Button>}>
                <ChangePassword />
              </Suspense>
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
