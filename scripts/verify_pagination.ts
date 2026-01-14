
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://acesalquiler-supabase.igc7oi.easypanel.host/"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyPagination() {
  console.log("Verifying pagination fix...")

  // 1. Fetch default (1000 limit)
  const { data: batch1, error: error1 } = await supabase
    .from("Clientes")
    .select("id")
    .order("created_at", { ascending: false })
  
  if (error1) {
    console.error("Error batch 1:", error1)
    return
  }

  console.log("Batch 1 (default limit) count:", batch1?.length)
  const has2271_batch1 = batch1?.some(l => l.id === 2271)
  console.log("Batch 1 contains 2271:", has2271_batch1)

  // 2. Fetch with extended range
  const { data: batch2, error: error2 } = await supabase
    .from("Clientes")
    .select("id")
    .order("created_at", { ascending: false })
    .range(0, 4999)

  if (error2) {
    console.error("Error batch 2:", error2)
    return
  }

  console.log("Batch 2 (extended range) count:", batch2?.length)
  const has2271_batch2 = batch2?.some(l => l.id === 2271)
  console.log("Batch 2 contains 2271:", has2271_batch2)
}

verifyPagination()
