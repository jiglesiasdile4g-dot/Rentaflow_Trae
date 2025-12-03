import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Database, User, Package, Sparkles, Mail, CalendarClock, Calendar, Building2 } from "lucide-react"
import { getPlanData, formatPlanValue, PLAN_DATA } from "@/lib/plan-data"
import fs from "node:fs"
import path from "node:path"

type WhatsNewBlock = { title: string; subitems: string[] }
type WhatsNewGroup = { heading: string; blocks: WhatsNewBlock[] }
type WhatsNewSection = { version: string; groups: WhatsNewGroup[] }
import ChangePlanButton from "@/components/change-plan-button"

export default async function InformacionPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  let inmobiliariaInfo: any = null
  let planInfo: any = null
  let availablePlans: any[] = []

  try {
    const spRaw = searchParams ? await searchParams : undefined
    const spIdiRaw = spRaw?.idi
    const spIdiNum = Array.isArray(spIdiRaw) ? Number(spIdiRaw[0]) : Number(spIdiRaw as any)
    const spIdi = Number.isFinite(spIdiNum) ? spIdiNum : undefined

    const { data: perfil } = await supabase.from("Perfiles").select("inmobiliaria, is_admin").eq("usuario", user.email).limit(1).maybeSingle()

    const targetIdi = perfil?.is_admin === true && spIdi ? spIdi : perfil?.inmobiliaria

    if (targetIdi) {
      const { data: inmobiliaria } = await supabase
        .from("Inmobiliarias")
        .select("idi, Nombre, Plan, PlanResetAt, PlanNextEffectiveAt, whatsapp_activo")
        .eq("idi", String(targetIdi))
        .limit(1)
        .maybeSingle()

      inmobiliariaInfo = inmobiliaria

      if (inmobiliaria?.Plan) {
        const { data: planesData, error: planesError } = await supabase.from("Planes").select("*")

        if (planesError || !planesData || planesData.length === 0) {
          availablePlans = Object.values(PLAN_DATA)
          planInfo = getPlanData(inmobiliaria.Plan)
        } else {
          const normalize = (p: any) => ({
            ...p,
            ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
            Anuncios: p?.Anuncios ?? p?.anuncios_activos ?? p?.AnunciosActivos ?? 0,
            Precio: p?.Precio ?? p?.precio ?? 0,
            WhatsappConf:
              p?.WhatsappConf ??
              p?.Whatsapp_conf ??
              (typeof p === "object" && p ? (p as any)["Whatsapp-conf"] : undefined) ??
              p?.Whatsapp ??
              p?.whatsapp,
          })
          const normalizedPlans = (planesData || []).map(normalize)
          availablePlans = normalizedPlans
          planInfo = normalizedPlans.find((p: any) => p.idp === inmobiliaria.Plan || (p as any).id === inmobiliaria.Plan) || getPlanData(inmobiliaria.Plan)
        }
      }
  }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria/plan info:", err)
  }

  async function changePlanAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const rawPlanId = formData.get("planId")
    const planIdNum = Number(rawPlanId)
    const planId = Number.isFinite(planIdNum) ? planIdNum : (() => {
      const s = String(rawPlanId || "").trim()
      const m = s.match(/\d+/)
      return m ? Number(m[0]) : NaN
    })()
    const idi = Number(formData.get("idi"))
    console.log("[v0] changePlanAction", { planId, idi })
    if (!planId || !idi) {
      revalidatePath("/dashboard/informacion")
      redirect(`/dashboard/informacion?planUpdate=error&msg=${encodeURIComponent("Parámetros inválidos")}`)
    }
    let ok = false
    let msg = ""
    try {
      const apiRes = await fetch(`/api/inmobiliarias/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, idi }),
        cache: "no-store",
      })
      const payload = await apiRes.json().catch(() => ({}))
      ok = !!payload?.ok
      if (!ok) {
        msg = payload?.error || "No se pudo actualizar el plan"
      } else {
        msg = "Plan actualizado correctamente"
      }
    } catch (e: any) {
      ok = false
      msg = e?.message || "No se pudo actualizar el plan"
    }
    console.log("[v0] changePlanAction via API result", { ok, msg })
    revalidatePath("/dashboard/informacion")
    redirect(`/dashboard/informacion?planUpdate=${ok ? "success" : "error"}&planId=${planId}&msg=${encodeURIComponent(msg)}`)
  }

  async function disableWhatsappAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const idiRaw = formData.get("idi")
    const idi = Number(idiRaw)
    let ok = false
    let msg = ""
    try {
      const { error } = await supa
        .from("Inmobiliarias")
        .update({ whatsapp_activo: false })
        .eq("idi", idi)
      ok = !error
      msg = ok ? "Envíos de WhatsApp desactivados" : (error?.message || "No se pudo desactivar WhatsApp")
    } catch (e: any) {
      ok = false
      msg = e?.message || "No se pudo desactivar WhatsApp"
    }
    revalidatePath("/dashboard/informacion")
    redirect(`/dashboard/informacion?planUpdate=${ok ? "whatsapp-disabled" : "error"}&msg=${encodeURIComponent(msg)}`)
  }

  async function enableWhatsappAction(formData: FormData) {
    "use server"
    const supa = await createClient()
    const idiRaw = formData.get("idi")
    const idi = Number(idiRaw)
    let ok = false
    let msg = ""
    try {
      const { error } = await supa
        .from("Inmobiliarias")
        .update({ whatsapp_activo: true })
        .eq("idi", idi)
      ok = !error
      msg = ok ? "Envíos de WhatsApp reactivados" : (error?.message || "No se pudo reactivar WhatsApp")
    } catch (e: any) {
      ok = false
      msg = e?.message || "No se pudo reactivar WhatsApp"
    }
    revalidatePath("/dashboard/informacion")
    redirect(`/dashboard/informacion?planUpdate=${ok ? "whatsapp-enabled" : "error"}&msg=${encodeURIComponent(msg)}`)
  }

  let tables: any[] = []
  let tablesError: string | null = null

  try {
    const { data: viewData, error: viewError } = await supabase.from("available_tables").select("table_name").limit(10)

    if (!viewError && viewData) {
      tables = viewData
    } else {
      tablesError = "No se pudieron cargar las tablas"
    }
  } catch (err) {
    tablesError = "Error al conectar con la base de datos"
  }
  const dbConnected = !tablesError

  const pkgPath = path.join(process.cwd(), "package.json")
  let appVersion: string = ""
  const appChannel: string = process.env.NEXT_PUBLIC_APP_CHANNEL || ""
  try {
    const pkgRaw = fs.readFileSync(pkgPath, "utf-8")
    const pkg = JSON.parse(pkgRaw)
    appVersion = typeof pkg.version === "string" ? pkg.version : ""
  } catch {}

  const whatsappActive = (() => {
    const raw = inmobiliariaInfo?.whatsapp_activo
    if (typeof raw === "boolean") return !!raw
    const v = String(raw ?? "").trim().toLowerCase()
    return v !== "no"
  })()

  const changelogPath = path.join(process.cwd(), "CHANGELOG.md")
  const whatsNewSections: WhatsNewSection[] = []
  let clText: string = ""
  try {
    clText = fs.readFileSync(changelogPath, "utf-8")
  } catch {}
  if (!clText) {
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/jiglesiasdile4g-dot/Rentaflow_Trae/main/dashboard/v0-dashboard-basico-alfa-0-2-main/CHANGELOG.md",
        { cache: "no-store" }
      )
      if (res.ok) clText = await res.text()
    } catch {}
  }

  const prioritizedNames = ["mini", "starter", "agency", "profesional"]
  const orderedPlans = (availablePlans || [])
    .filter((p) => prioritizedNames.includes(String(p?.Nombre || "").toLowerCase()))
    .sort((a, b) => Number(a?.Precio ?? 0) - Number(b?.Precio ?? 0))
  const fallbackOrderedPlans = (availablePlans || [])
    .sort((a, b) => Number(a?.Precio ?? 0) - Number(b?.Precio ?? 0))
  const planStyle = (name: string) => {
    const n = String(name || "").toLowerCase()
    if (n === "mini") return "border-slate-200 bg-slate-50/60"
    if (n === "starter") return "border-green-200 bg-green-50/40"
    if (n === "agency") return "border-blue-200 bg-blue-50/40"
    if (n === "profesional") return "border-purple-200 bg-purple-50/40"
    return "border-muted"
  }
  const computeNextRenewal = (base: Date) => {
    const y = base.getFullYear()
    const mNext = base.getMonth() + 1
    const d = base.getDate()
    const last = new Date(y, mNext + 1, 0).getDate()
    return new Date(y, mNext, Math.min(d, last))
  }
  const isWhatsappIncluded = (plan: any) => {
    const raw =
      (plan as any)?.WhatsappConf ??
      (plan as any)?.Whatsapp ??
      (plan as any)?.whatsapp ??
      (plan as any)?.Whatsapp_conf ??
      (plan as any)["Whatsapp-conf"]
    if (typeof raw === "boolean") return !!raw
    const val = String(raw ?? "").trim().toLowerCase()
    return val === "si" || val === "sí" || val === "true" || val === "1" || val === "yes"
  }
  const sanitize = (s: string) =>
    s
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\([0-9a-f]{7,}\)/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  if (clText) {
    const clRawNormalized = clText.replace(/\r\n/g, "\n")
    const sectionMatches = Array.from(clRawNormalized.matchAll(/##\s*\[?([^\]]+)\]?[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/g))
    sectionMatches.slice(0, 3).forEach((sm) => {
      const versionLabel = String(sm[1] || "").trim()
      const body = String(sm[2] || "").replace(/\\n/g, "\n")
      let groups: WhatsNewGroup[] = []
      const groupMatches = Array.from(body.matchAll(/###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g))
      if (groupMatches.length > 0) {
        groups = groupMatches.map((gm) => {
          const heading = gm[1].trim()
          const content = gm[2]
          const topItems = content.split(/^\*\s+/m).slice(1)
          const blocks = topItems.map((block): WhatsNewBlock => {
            const lines = block.split(/\r?\n/)
            const rawTitle = sanitize((lines[0] || "").trim())
            const titleParts = rawTitle.split(/\s*,\s*/)
            const title = titleParts[0] || ""
            let subitems = lines
              .slice(1)
              .filter((l) => /^\s*-\s+/.test(l))
              .map((l) => sanitize(l.replace(/^\s*-\s+/, "").trim()))
            if (subitems.length === 0 && titleParts.length > 1) {
              subitems = titleParts.slice(1).map((p) => sanitize(p)).filter(Boolean)
            }
            return { title, subitems }
          })
          return { heading, blocks }
        })
        groups = groups.map((g) => ({ heading: g.heading, blocks: g.blocks.slice(0, 3).map((b) => ({ title: b.title, subitems: b.subitems.slice(0, 5) })) }))
      } else {
        const headingMatch = body.match(/###\s+([^\n]+)/)
        const singleHeading = headingMatch ? headingMatch[1].trim() : ""
        const topItems = body.split(/^\*\s+/m).slice(1)
        const blocks = topItems.map((block): WhatsNewBlock => {
          const lines = block.split(/\r?\n/)
          const title = sanitize((lines[0] || "").trim())
          const subitems = lines
            .slice(1)
            .filter((l) => /^\s*-\s+/.test(l))
            .map((l) => sanitize(l.replace(/^\s*-\s+/, "").trim()))
          return { title, subitems }
        })
        groups = [{ heading: singleHeading, blocks: blocks.slice(0, 3).map((b) => ({ title: b.title, subitems: b.subitems.slice(0, 5) })) }]
      }
      if (groups.length === 0 || !groups.some((g) => g.blocks && g.blocks.length > 0 && (g.heading || "").trim().length > 0)) {
        const bullets = Array.from(body.matchAll(/^\*\s+(.+)$/gm)).map((m) => sanitize(m[1]))
        if (bullets.length > 0) {
          groups = [{ heading: "Features", blocks: bullets.slice(0, 5).map((b) => ({ title: b, subitems: [] })) }]
        }
      }
      whatsNewSections.push({ version: versionLabel, groups })
    })
  }

  const sp = (searchParams ? await searchParams : undefined) as Record<string, string | string[] | undefined> | undefined
  const planUpdate = typeof sp?.planUpdate === "string" ? sp?.planUpdate : undefined
  const updateMsg = typeof sp?.msg === "string" ? sp?.msg : undefined

  let periodStart: Date | null = null
  let periodEnd: Date | null = null
  let whatsappPeriodoCount = 0
  let whatsappPeriodoCost = 0
  try {
    if (inmobiliariaInfo?.idi) {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const resetAt = inmobiliariaInfo?.PlanResetAt ? new Date(inmobiliariaInfo.PlanResetAt) : null
      const validReset = resetAt && !isNaN(resetAt.getTime()) ? resetAt : null
      const start = validReset ? validReset : monthStart
      periodStart = start
      const dbPeriodEnd = inmobiliariaInfo?.PlanNextEffectiveAt ? new Date(inmobiliariaInfo.PlanNextEffectiveAt) : null
      periodEnd = dbPeriodEnd && !isNaN(dbPeriodEnd.getTime()) ? dbPeriodEnd : computeNextRenewal(start)
      const { data: leadsData } = await supabase
        .from("Clientes")
        .select("IDC")
        .eq("usuario", inmobiliariaInfo.idi)
      const leadIDCs = (leadsData || [])
        .map((l: any) => l.IDC)
        .filter((id: any) => Number.isFinite(id))
      if (leadIDCs.length > 0) {
        const { data: whatsPeriodo } = await supabase
          .from("Whatsapp")
          .select("id, created_at")
          .in("IDC", leadIDCs)
          .gte("created_at", start.toISOString())
          .lt("created_at", now.toISOString())
          .eq("Tipo", "Enviado")
        whatsappPeriodoCount = (whatsPeriodo || []).length
        whatsappPeriodoCost = Number((whatsappPeriodoCount * 0.0327).toFixed(2))
      }
    }
  } catch {}

  return (
    <div className="p-8">
      {planUpdate && (
        <div className="mb-4">
          <Alert variant={planUpdate === "error" ? "destructive" : "default"}>
            <AlertDescription>
              {updateMsg || (planUpdate === "success" ? "Plan actualizado correctamente" : "No se pudo actualizar el plan")}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Información</h2>
          <p className="text-muted-foreground mt-2">Información del usuario y estado de la base de datos</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <CalendarClock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Último acceso</p>
                    <p className="text-sm text-muted-foreground">{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-ES") : "N/A"}</p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">Fecha de registro</p>
                    <p className="text-sm text-muted-foreground">{user.created_at ? new Date(user.created_at).toLocaleString("es-ES") : "N/A"}</p>
                  </div>
                </div>
                {inmobiliariaInfo && (
                  <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">Inmobiliaria</p>
                      <p className="text-sm text-muted-foreground">{inmobiliariaInfo.Nombre}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {inmobiliariaInfo && (
            <Card>
              <CardHeader className="bg-primary/10 rounded-t-lg border-b border-primary/20">
                <CardTitle className="flex items-center gap-2 text-primary font-bold">
                  <Package className="h-5 w-5" />
                  Plan Actual
                </CardTitle>
                <CardDescription>Detalles de tu plan contratado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {planInfo ? (
                  <>
                    <div>
                      <p className="text-sm font-medium">Nombre del Plan:</p>
                      <p className="text-lg font-bold text-primary">{planInfo.Nombre}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Leads:</p>
                        <p className="text-2xl font-bold text-foreground">{formatPlanValue(planInfo.ejecuciones)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Anuncios:</p>
                        <p className="text-2xl font-bold text-foreground">{formatPlanValue(planInfo.Anuncios)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Usuarios:</p>
                        <p className="text-2xl font-bold text-foreground">{planInfo.Usuarios}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Soporte:</p>
                        <p className="text-sm text-muted-foreground">{planInfo.Soporte}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Precio:</p>
                      <p className="text-xl font-bold text-green-600">€{planInfo.Precio?.toLocaleString()}/mes</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">Periodo activo desde:</p>
                        <p className="text-xs font-bold text-foreground">{(periodStart || new Date()).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Vence el periodo:</p>
                        <p className="text-xs font-bold text-foreground">{(periodEnd || computeNextRenewal(new Date())).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium">WhatsApps enviados (periodo actual):</p>
                        <p className="text-xs font-bold text-foreground">{whatsappPeriodoCount}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Gasto aproximado en mensajes de WhatsApp:</p>
                        <p className="text-xs font-bold text-foreground">€{whatsappPeriodoCost.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    {isWhatsappIncluded(planInfo) && (
                      <div className="flex items-center justify-between gap-3 pt-2">
                        <p className={`text-sm ${whatsappActive ? "text-green-700" : "text-muted-foreground"}`}>
                          WhatsApp: {whatsappActive ? "Activo" : "Desactivado"}
                        </p>
                        {whatsappActive ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" aria-label="Detener envíos de WhatsApp" title="Detener envíos de WhatsApp">
                                Detener envíos de WhatsApp
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar desactivación de WhatsApp</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción detendrá los envíos de WhatsApp para tu inmobiliaria.
                                  Si el lead no tiene un email de contacto no podrás comunicarte con él mediante la aplicación.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <form action={disableWhatsappAction}>
                                  <input type="hidden" name="idi" value={String(inmobiliariaInfo.idi)} />
                                  <AlertDialogAction asChild>
                                    <Button type="submit" variant="destructive" size="sm">Confirmar y detener</Button>
                                  </AlertDialogAction>
                                </form>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <form action={enableWhatsappAction}>
                            <input type="hidden" name="idi" value={String(inmobiliariaInfo.idi)} />
                            <Button type="submit" variant="default" size="sm" aria-label="Reactivar envíos de WhatsApp" title="Reactivar envíos de WhatsApp">
                              Reactivar envíos de WhatsApp
                            </Button>
                          </form>
                        )}
                      </div>
                    )}
                    {availablePlans && availablePlans.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-medium">Cambiar plan</p>
                        <div className="pb-2">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {(orderedPlans.length > 0 ? orderedPlans : fallbackOrderedPlans).map((p) => (
                              <form id={`change-plan-form-${String(p.idp)}`} key={p.idp} action={changePlanAction} className={`rounded-md`}>
                                <input type="hidden" name="idi" value={String(inmobiliariaInfo.idi)} />
                                <input type="hidden" name="planId" value={String(p.idp)} />
                                <Card className={`cursor-pointer overflow-hidden transition-all ${inmobiliariaInfo.Plan === p.idp ? "border-primary border-2 bg-primary/5 ring-2 ring-primary/40 shadow-md" : planStyle(p.Nombre)} rounded-lg`}>
                                  <CardContent className="p-4 flex flex-col gap-3">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold break-words leading-tight">{p.Nombre}</h3>
                                        {String(p?.Nombre || "").toLowerCase() === "starter" && (
                                          <Badge variant="feature" className="text-xs">Recomendado</Badge>
                                        )}
                                      </div>
                                      <span className="text-sm font-bold">€{p.Precio}/mes</span>
                                    </div>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div>{p.Usuarios} usuarios</div>
                                    <div>{formatPlanValue(p.ejecuciones)} leads</div>
                                    <div>{formatPlanValue(p.Anuncios)} anuncios</div>
                                    <div className={isWhatsappIncluded(p) ? "text-green-600" : ""}>
                                      Configuración de WhatsApp: {isWhatsappIncluded(p) ? "Incluida" : "No incluida"}
                                    </div>
                                  </div>
                                    <div className="flex items-center justify-between gap-2">
                                      {inmobiliariaInfo.Plan === p.idp ? (
                                        <Badge variant="secondary" className="text-xs shrink-0">Plan actual</Badge>
                                      ) : (
                                        <span />
                                      )}
                                      <ChangePlanButton idi={Number(inmobiliariaInfo.idi)} planId={Number(p.idp)} current={inmobiliariaInfo.Plan === p.idp} />
                                    </div>
                                  </CardContent>
                                </Card>
                              </form>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Plan ID: {inmobiliariaInfo.Plan}</p>
                    <p className="text-xs text-muted-foreground mt-2">No se pudieron cargar los detalles del plan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Novedades
              </CardTitle>
              <CardDescription>Últimos cambios en la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {appVersion && <Badge variant="secondary">v{appVersion}{appChannel ? ` (${appChannel})` : ""}</Badge>}
              </div>
              {whatsNewSections.length > 0 ? (
                <div className="space-y-6">
              {whatsNewSections.map((section: WhatsNewSection, si: number) => (
                    <div key={si} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">v{section.version}</Badge>
                      </div>
                      <div className="space-y-4">
                        {section.groups.map((group: WhatsNewGroup, gi: number) => {
                          const labelMap: Record<string, string> = {
                            "Bug Fixes": "Correcciones",
                            Features: "Nuevas funcionalidades",
                            "Performance Improvements": "Mejoras de rendimiento",
                            Chore: "Mantenimiento",
                            Docs: "Documentación",
                            Refactor: "Refactorizaciones",
                          }
                          const variantMap: Record<string, string> = {
                            "Bug Fixes": "bug",
                            Features: "feature",
                            "Performance Improvements": "performance",
                            Chore: "chore",
                            Docs: "docs",
                            Refactor: "refactor",
                          }
                          const label = labelMap[group.heading] || group.heading
                          const variant = (variantMap[group.heading] || "secondary") as any
                          return (
                            <div key={gi} className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant={variant} className="text-xs">{label}</Badge>
                              </div>
                              <ul className="space-y-2 text-sm">
                                {group.blocks.map((block: WhatsNewBlock, idx: number) => (
                                  <li key={idx}>
                                    {(() => {
                                      const primaryTitle = (block.title || "").trim()
                                      const autoItems = primaryTitle
                                        .split(/\s*,\s*/)
                                        .map((i) => i.replace(/\([0-9a-f]{7,}\)/gi, "").trim())
                                        .filter(Boolean)
                                      const items = block.subitems.length > 0 ? block.subitems : (autoItems.length > 1 ? autoItems : [])
                                      return items.length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-0.5">
                                          {items.map((s: string, j: number) => (
                                            <li key={j}>{s}</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="font-medium">{primaryTitle}</div>
                                      )
                                    })()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin novedades</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Estado del Sistema
              </CardTitle>
              <CardDescription>Estado general del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className={dbConnected ? "bg-green-500" : "bg-red-500"}>
                  {dbConnected ? "Funcionando" : "Incidencia"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {dbConnected ? "Sistema funcionando correctamente" : "Sistema con incidencias"}
              </p>
            </CardContent>
          </Card>
        </div>

        

        {tablesError && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Error de Conexión</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{tablesError}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
