import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Database, User, Package, Sparkles } from "lucide-react"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import fs from "node:fs"
import path from "node:path"
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
    const { data: perfil } = await supabase.from("Perfiles").select("inmobiliaria").eq("usuario", user.email).single()

    if (perfil?.inmobiliaria) {
      const { data: inmobiliaria } = await supabase
        .from("Inmobiliarias")
        .select("idi, Nombre, Plan")
        .eq("idi", perfil.inmobiliaria)
        .single()

      inmobiliariaInfo = inmobiliaria

      if (inmobiliaria?.Plan) {
        const { data: planesData, error: planesError } = await supabase.from("Planes").select("*")

        if (planesError || !planesData || planesData.length === 0) {
          planInfo = getPlanData(inmobiliaria.Plan)
        } else {
          const normalize = (p: any) => ({
            ...p,
            ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
            Anuncios: p?.Anuncios ?? p?.anuncios_activos ?? p?.AnunciosActivos ?? 0,
            Precio: p?.Precio ?? p?.precio ?? 0,
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

  const pkgPath = path.join(process.cwd(), "package.json")
  let appVersion: string = ""
  try {
    const pkgRaw = fs.readFileSync(pkgPath, "utf-8")
    const pkg = JSON.parse(pkgRaw)
    appVersion = typeof pkg.version === "string" ? pkg.version : ""
  } catch {}

  const changelogPath = path.join(process.cwd(), "CHANGELOG.md")
  let whatsNewGroups: { heading: string; blocks: { title: string; subitems: string[] }[] }[] = []
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

  const prioritizedNames = ["Starter", "Agency", "Profesional"]
  const orderedPlans = (availablePlans || [])
    .filter((p) => prioritizedNames.includes(p?.Nombre))
    .sort((a, b) => (a?.ejecuciones ?? 0) - (b?.ejecuciones ?? 0))
  const fallbackOrderedPlans = (availablePlans || [])
    .sort((a, b) => (a?.ejecuciones ?? 0) - (b?.ejecuciones ?? 0))
  const planStyle = (name: string) => {
    if (name === "Starter") return "border-green-200 bg-green-50/40"
    if (name === "Agency") return "border-blue-200 bg-blue-50/40"
    if (name === "Profesional") return "border-purple-200 bg-purple-50/40"
    return "border-muted"
  }
  const sanitize = (s: string) =>
    s
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
  if (clText) {
    const clRawNormalized = clText.replace(/\r\n/g, "\n")
    const sectionMatch = clRawNormalized.match(/##\s*\[?([^\]]+)\]?[^\n]*\n([\s\S]*?)(?=\n##\s|\n#\s|$)/)
    if (sectionMatch) {
      const body = sectionMatch[2].replace(/\\n/g, "\n")
      const groupMatches = Array.from(body.matchAll(/###\s+([^\n]+)\n([\s\S]*?)(?=\n###\s|\n##\s|$)/g))
      if (groupMatches.length > 0) {
        whatsNewGroups = groupMatches.map((gm) => {
          const heading = gm[1].trim()
          const content = gm[2]
          const topItems = content.split(/^\*\s+/m).slice(1)
          const blocks = topItems.map((block) => {
            const lines = block.split(/\r?\n/)
            const title = sanitize((lines[0] || "").trim())
            const subitems = lines
              .slice(1)
              .filter((l) => /^\s*-\s+/.test(l))
              .map((l) => sanitize(l.replace(/^\s*-\s+/, "").trim()))
            return { title, subitems }
          })
          return { heading, blocks }
        })
        whatsNewGroups = whatsNewGroups.map((g) => ({ heading: g.heading, blocks: g.blocks.slice(0, 3).map((b) => ({ title: b.title, subitems: b.subitems.slice(0, 5) })) }))
      } else {
        const headingMatch = body.match(/###\s+([^\n]+)/)
        const singleHeading = headingMatch ? headingMatch[1].trim() : ""
        const topItems = body.split(/^\*\s+/m).slice(1)
        const blocks = topItems.map((block) => {
          const lines = block.split(/\r?\n/)
          const title = sanitize((lines[0] || "").trim())
          const subitems = lines
            .slice(1)
            .filter((l) => /^\s*-\s+/.test(l))
            .map((l) => sanitize(l.replace(/^\s*-\s+/, "").trim()))
          return { title, subitems }
        })
        whatsNewGroups = [{ heading: singleHeading, blocks: blocks.slice(0, 3).map((b) => ({ title: b.title, subitems: b.subitems.slice(0, 5) })) }]
      }
    }
  }

  const sp = (searchParams ? await searchParams : undefined) as Record<string, string | string[] | undefined> | undefined
  const planUpdate = typeof sp?.planUpdate === "string" ? sp?.planUpdate : undefined
  const updateMsg = typeof sp?.msg === "string" ? sp?.msg : undefined

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Información del Usuario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium">Email:</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">ID:</p>
                <p className="text-sm text-muted-foreground font-mono">{user.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Último acceso:</p>
                <p className="text-sm text-muted-foreground">
                  {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString("es-ES") : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Fecha de registro:</p>
                <p className="text-sm text-muted-foreground">
                  {user.created_at ? new Date(user.created_at).toLocaleString("es-ES") : "N/A"}
                </p>
              </div>
              {inmobiliariaInfo && (
                <div>
                  <p className="text-sm font-medium">Inmobiliaria:</p>
                  <p className="text-sm text-muted-foreground">{inmobiliariaInfo.Nombre}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {inmobiliariaInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                    {availablePlans && availablePlans.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <p className="text-sm font-medium">Cambiar plan</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {(orderedPlans.length > 0 ? orderedPlans : fallbackOrderedPlans).map((p) => (
                            <form id={`change-plan-form-${String(p.idp)}`} key={p.idp} action={changePlanAction} className={`rounded-md`}>
                              <input type="hidden" name="idi" value={String(inmobiliariaInfo.idi)} />
                              <input type="hidden" name="planId" value={String(p.idp)} />
                              <Card className={`cursor-pointer overflow-hidden transition-all ${inmobiliariaInfo.Plan === p.idp ? "border-primary border-2 bg-primary/5" : planStyle(p.Nombre)} rounded-lg`}>
                                <CardContent className="p-4 flex flex-col gap-3">
                                  <div className="flex items-center justify-start gap-2">
                                    <h3 className="text-sm font-semibold break-words leading-tight">{p.Nombre}</h3>
                                    {p.Nombre === "Agency" && (
                                      <Badge variant="feature" className="text-xs">Recomendado</Badge>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-bold">€{p.Precio}/mes</span>
                                  </div>
                                  <div className="text-xs text-muted-foreground leading-snug whitespace-normal break-words">
                                    {p.Usuarios} usuarios • {formatPlanValue(p.ejecuciones)} leads • {formatPlanValue(p.Anuncios)} anuncios
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
                {appVersion && <Badge variant="secondary">v{appVersion}</Badge>}
              </div>
              {whatsNewGroups.length > 0 ? (
                <div className="space-y-4">
                  {whatsNewGroups.map((group, gi) => {
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
                          {group.blocks.map((block, idx) => (
                            <li key={idx}>
                              <div className="font-medium">{block.title}</div>
                              {block.subitems.length > 0 && (
                                <ul className="list-disc pl-5 space-y-0.5">
                                  {block.subitems.map((s, j) => (
                                    <li key={j}>{s}</li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  })}
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
                Base de Datos
              </CardTitle>
              <CardDescription>Estado de conexión con la base de datos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="bg-green-500">
                  Conectado
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Conexión establecida correctamente con la base de datos
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
