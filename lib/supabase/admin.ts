import { createClient } from "@supabase/supabase-js"

const sanitizeEnvUrl = (value: string | undefined) => {
  const raw = String(value || "").trim()
  const unquoted = raw.replace(/^[`"']+|[`"']+$/g, "").trim()
  return unquoted.replace(/\/+$/, "")
}

export function createAdminClient() {
  const rawUrl = sanitizeEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!rawUrl || (!serviceKey && !anonKey)) {
    throw new Error("Faltan variables de entorno de Supabase (URL o SERVICE_ROLE_KEY)")
  }
  return createClient(rawUrl, serviceKey || anonKey!)
}
