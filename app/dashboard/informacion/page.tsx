import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Database, User, Package } from "lucide-react"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"

export default async function InformacionPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  let inmobiliariaInfo: any = null
  let planInfo: any = null

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
          console.log("[v0] Could not load plans from database, using fallback data")
          planInfo = getPlanData(inmobiliaria.Plan)
        } else {
          planInfo = planesData.find((p: any) => p.idp === inmobiliaria.Plan || p.id === inmobiliaria.Plan)

          if (!planInfo) {
            planInfo = getPlanData(inmobiliaria.Plan)
          }
        }
      }
    }
  } catch (err) {
    console.log("[v0] Error fetching inmobiliaria/plan info:", err)
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

  return (
    <div className="p-8">
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
                        <p className="text-sm font-medium">Ejecuciones:</p>
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
                <Database className="h-5 w-5" />
                Base de Datos
              </CardTitle>
              <CardDescription>Estado de conexión con Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="default" className="bg-green-500">
                  Conectado
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Conexión establecida correctamente con la base de datos Supabase
              </p>
            </CardContent>
          </Card>
        </div>

        {tables.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tablas Disponibles</CardTitle>
              <CardDescription>Tablas encontradas en tu base de datos Supabase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {tables.map((table, index) => (
                  <Badge key={index} variant="outline" className="justify-center p-2">
                    {table.table_name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
