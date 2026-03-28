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

  console.log("Total agenda count for agent 22:", agenda?.length)
  if (agenda && agenda.length > 0) {
      console.log(agenda.slice(0, 3))
  }
}

test()
