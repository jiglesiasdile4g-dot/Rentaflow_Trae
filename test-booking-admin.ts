import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const leadId = "2817"
  
  const { data: lead, error: leadError } = await supabase
    .from("Clientes")
    .select("*")
    .eq("id", leadId)
    .single()

  console.log("Lead:", lead?.Nombre, lead?.Inmueble, lead?.idag)

  const { data: allAds } = await supabase
    .from("Anuncios")
    .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, whatsapp_activo")

  const leadInmuebleNorm = lead?.Inmueble.trim().toLowerCase()
  const advertisement = allAds?.find((a: any) => 
    (a.Referencia && a.Referencia.trim().toLowerCase() === leadInmuebleNorm) || 
    (a.Direccion && a.Direccion.trim().toLowerCase() === leadInmuebleNorm) || 
    (a.Direccion && leadInmuebleNorm.includes(a.Direccion.trim().toLowerCase()))
  ) || null

  console.log("Ad:", advertisement)

  const today = new Date()
  const startDate = today.toISOString().split("T")[0]
  const endDate = new Date(today.setDate(today.getDate() + 14)).toISOString().split("T")[0]

  const { data: agenda } = await supabase
    .from("Agendas")
    .select("*")
    .eq("agente_id", lead?.idag)
    .gte("fecha", startDate)
    .lte("fecha", endDate)

  console.log("Agenda count:", agenda?.length)

  const { data: existingVisits } = await supabase
    .from("Clientes")
    .select("fecha_de_visita, Inmueble, idag, Estado")
    .eq("idag", lead?.idag)
    .not("fecha_de_visita", "is", null)
    .gte("fecha_de_visita", startDate)

  console.log("Existing visits count:", existingVisits?.length)
  if (existingVisits && existingVisits.length > 0) {
    console.log("Visits:", existingVisits)
  }
}

test()
