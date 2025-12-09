import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User } from "lucide-react"

export default async function DashboardPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase.from("Perfiles").select("inmobiliaria, is_admin").eq("usuario", user.email).single()

  let inmobiliariaId: number | null | undefined = profile?.inmobiliaria
  try {
    const spRaw = searchParams ? await searchParams : undefined
    const spIdiRaw = spRaw?.idi
    if (profile?.is_admin === true) {
      if (typeof spIdiRaw === "string") {
        if (spIdiRaw === "all") {
          inmobiliariaId = null
        } else {
          const n = Number(spIdiRaw)
          inmobiliariaId = Number.isFinite(n) ? n : profile?.inmobiliaria
        }
      } else if (Array.isArray(spIdiRaw) && spIdiRaw.length > 0) {
        const n = Number(spIdiRaw[0])
        inmobiliariaId = Number.isFinite(n) ? n : profile?.inmobiliaria
      }
    }
  } catch {}

  if (!inmobiliariaId) {
    console.log("[v0] No inmobiliaria ID found for user")
  }

  const leadsMetrics = {
    totalLeads: 0,
    newToday: 0,
    completed: 0,
    error: null as string | null,
  }

  try {
    console.log("[v0] Fetching leads metrics...")

    let totalQuery = supabase
      .from("Clientes")
      .select("*", { count: "exact", head: true })
    if (inmobiliariaId != null) {
      totalQuery = totalQuery.eq("usuario", inmobiliariaId)
    }
    const { count: totalCount, error: totalError } = await totalQuery

    if (totalError) {
      console.log("[v0] Total leads error:", totalError)
      throw totalError
    }

    leadsMetrics.totalLeads = totalCount || 0
    console.log("[v0] Total leads:", leadsMetrics.totalLeads)

    // Get today's date range in local timezone
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    const todayStartISO = todayStart.toISOString()
    const todayEndISO = todayEnd.toISOString()

    console.log("[v0] Searching for leads between:", todayStartISO, "and", todayEndISO)

    // Try multiple possible date field names
    let todayCount = 0
    let foundDateField = false

    let createdAtQuery = supabase
      .from("Clientes")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStartISO)
      .lt("created_at", todayEndISO)
    if (inmobiliariaId != null) {
      createdAtQuery = createdAtQuery.eq("usuario", inmobiliariaId)
    }
    const { count: createdAtCount, error: createdAtError } = await createdAtQuery

    if (!createdAtError) {
      todayCount = createdAtCount || 0
      foundDateField = true
      console.log("[v0] Found leads with created_at field:", todayCount)
    } else {
      console.log("[v0] created_at field error:", createdAtError)

      let fechaCreacionQuery = supabase
        .from("Clientes")
        .select("*", { count: "exact", head: true })
        .gte("fecha_creacion", todayStartISO)
        .lt("fecha_creacion", todayEndISO)
      if (inmobiliariaId != null) {
        fechaCreacionQuery = fechaCreacionQuery.eq("usuario", inmobiliariaId)
      }
      const { count: fechaCreacionCount, error: fechaCreacionError } = await fechaCreacionQuery

      if (!fechaCreacionError) {
        todayCount = fechaCreacionCount || 0
        foundDateField = true
        console.log("[v0] Found leads with fecha_creacion field:", todayCount)
      } else {
        console.log("[v0] fecha_creacion field error:", fechaCreacionError)

        let fechaRegistroQuery = supabase
          .from("Clientes")
          .select("*", { count: "exact", head: true })
          .gte("fecha_registro", todayStartISO)
          .lt("fecha_registro", todayEndISO)
        if (inmobiliariaId != null) {
          fechaRegistroQuery = fechaRegistroQuery.eq("usuario", inmobiliariaId)
        }
        const { count: fechaRegistroCount, error: fechaRegistroError } = await fechaRegistroQuery

        if (!fechaRegistroError) {
          todayCount = fechaRegistroCount || 0
          foundDateField = true
          console.log("[v0] Found leads with fecha_registro field:", todayCount)
        } else {
          console.log("[v0] fecha_registro field error:", fechaRegistroError)
        }
      }
    }

    if (!foundDateField) {
      console.log("[v0] No valid date field found, checking available columns...")
      // Get first few records to see available columns
      const { data: sampleData, error: sampleError } = await supabase.from("Clientes").select("*").limit(1)

      if (!sampleError && sampleData && sampleData.length > 0) {
        console.log("[v0] Available columns in Clientes table:", Object.keys(sampleData[0]))
      }
    }

    leadsMetrics.newToday = todayCount
    console.log("[v0] New leads today:", leadsMetrics.newToday)

    // Completed leads with "Datos Completos" status created today
    let completedTodayCount = 0
    let foundCompletedField = false

    if (foundDateField) {
      let completedTodayQuery = supabase
        .from("Clientes")
        .select("*", { count: "exact", head: true })
        .eq("Estado", "Datos Completos")
        .gte("created_at", todayStartISO)
        .lt("created_at", todayEndISO)
      if (inmobiliariaId != null) {
        completedTodayQuery = completedTodayQuery.eq("usuario", inmobiliariaId)
      }
      const { count: completedTodayCountResult, error: completedTodayError } = await completedTodayQuery

      if (!completedTodayError) {
        completedTodayCount = completedTodayCountResult || 0
        foundCompletedField = true
        console.log("[v0] Found leads with 'Datos Completos' status today:", completedTodayCount)
      } else {
        console.log("[v0] Datos Completos with created_at error:", completedTodayError)

        let completedFechaQuery = supabase
          .from("Clientes")
          .select("*", { count: "exact", head: true })
          .eq("Estado", "Datos Completos")
          .gte("fecha_creacion", todayStartISO)
          .lt("fecha_creacion", todayEndISO)
        if (inmobiliariaId != null) {
          completedFechaQuery = completedFechaQuery.eq("usuario", inmobiliariaId)
        }
        const { count: completedFechaCount, error: completedFechaError } = await completedFechaQuery

        if (!completedFechaError) {
          completedTodayCount = completedFechaCount || 0
          foundCompletedField = true
          console.log("[v0] Found leads with 'Datos Completos' status today (fecha_creacion):", completedTodayCount)
        } else {
          console.log("[v0] Datos Completos with fecha_creacion error:", completedFechaError)

          let completedRegistroQuery = supabase
            .from("Clientes")
            .select("*", { count: "exact", head: true })
            .eq("Estado", "Datos Completos")
            .gte("fecha_registro", todayStartISO)
            .lt("fecha_registro", todayEndISO)
          if (inmobiliariaId != null) {
            completedRegistroQuery = completedRegistroQuery.eq("usuario", inmobiliariaId)
          }
          const { count: completedRegistroCount, error: completedRegistroError } = await completedRegistroQuery

          if (!completedRegistroError) {
            completedTodayCount = completedRegistroCount || 0
            foundCompletedField = true
            console.log("[v0] Found leads with 'Datos Completos' status today (fecha_registro):", completedTodayCount)
          } else {
            console.log("[v0] Datos Completos with fecha_registro error:", completedRegistroError)
          }
        }
      }
    }

    if (!foundCompletedField) {
      console.log("[v0] No valid combination found, trying without date filter...")
      let completedNoDateQuery = supabase
        .from("Clientes")
        .select("*", { count: "exact", head: true })
        .eq("Estado", "Datos Completos")
      if (inmobiliariaId != null) {
        completedNoDateQuery = completedNoDateQuery.eq("usuario", inmobiliariaId)
      }
      const { count: completedNoDateCount, error: completedNoDateError } = await completedNoDateQuery

      if (!completedNoDateError) {
        console.log("[v0] Found leads with 'Datos Completos' status (all time):", completedNoDateCount || 0)
        console.log("[v0] But couldn't filter by today's date")
      } else {
        console.log("[v0] 'Datos Completos' status not found in 'Estado' field, trying alternative status fields...")

        let statusQuery = supabase
          .from("Clientes")
          .select("*", { count: "exact", head: true })
          .eq("estado", "Datos Completos")
        if (inmobiliariaId != null) {
          statusQuery = statusQuery.eq("usuario", inmobiliariaId)
        }
        const { count: statusCount, error: statusError } = await statusQuery

        if (!statusError) {
          console.log("[v0] Found leads with 'Datos Completos' in lowercase 'estado' field:", statusCount || 0)
        } else {
          console.log("[v0] No valid status field found with 'Datos Completos'")

          // Get sample data to see available status values
          const { data: statusSample, error: statusSampleError } = await supabase
            .from("Clientes")
            .select("Estado, estado, status")
            .limit(10)

          if (!statusSampleError && statusSample) {
            console.log("[v0] Sample status values:", statusSample)
          }
        }
      }
    }

    leadsMetrics.completed = completedTodayCount
    console.log("[v0] Completed leads today:", leadsMetrics.completed)
  } catch (err) {
    console.log("[v0] Error fetching leads metrics:", err)
    leadsMetrics.error = "Error al cargar métricas de leads"
  }

  return (
    <div className="p-8">
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard de Leads</h2>
          <p className="text-muted-foreground mt-2">Métricas y estadísticas de tus clientes potenciales</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Leads</CardTitle>
              <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{leadsMetrics.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Todos los clientes registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Leads Nuevos Hoy</CardTitle>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Hoy
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{leadsMetrics.newToday}</div>
              <p className="text-xs text-muted-foreground">Registrados en las últimas 24h</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Leads con información completa</CardTitle>
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Hoy
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{leadsMetrics.completed}</div>
              <p className="text-xs text-muted-foreground">Con estado &quot;Datos Completos&quot; hoy</p>
            </CardContent>
          </Card>
        </div>

        {leadsMetrics.error && (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Error al cargar métricas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{leadsMetrics.error}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Verifica que la tabla Clientes tenga los campos necesarios (created_at, estado)
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
