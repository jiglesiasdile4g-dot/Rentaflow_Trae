import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: agenda } = await supabase
    .from("Agendas")
    .select("*")
    .eq("agente_id", 22)
    .gte("fecha", "2026-03-27")

  console.log("Agenda count for agent 22:", agenda?.length)
  console.log(agenda)
}

test()
