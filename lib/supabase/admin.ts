import { createClient } from "@supabase/supabase-js"

export function createAdminClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!rawUrl || !serviceKey) {
    throw new Error("Faltan variables de entorno de Supabase (URL o SERVICE_ROLE_KEY)")
  }
  const url = rawUrl.replace(/\/+$/, "")
  return createClient(url, serviceKey)
}
