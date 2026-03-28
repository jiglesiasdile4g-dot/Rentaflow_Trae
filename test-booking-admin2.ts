import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const leadId = "2817"
  
  const { data: lead } = await supabase
    .from("Clientes")
    .select("*")
    .eq("id", leadId)
    .single()

  const today = new Date()
  const startDate = today.toISOString().split("T")[0]
  const endDate = new Date(today.setDate(today.getDate() + 14)).toISOString().split("T")[0]

  const { data: agenda } = await supabase
    .from("Agendas")
    .select("*")
    .eq("agente_id", lead?.idag)
    .gte("fecha", startDate)
    .lte("fecha", endDate)

  console.log("Agenda:", agenda)
}

test()

