
declare const process: { env: Record<string, string | undefined> }

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
}

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
