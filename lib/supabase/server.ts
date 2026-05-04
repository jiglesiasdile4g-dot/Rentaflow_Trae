import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

const sanitizeEnvUrl = (value: string | undefined) => {
  const raw = String(value || "").trim()
  const unquoted = raw.replace(/^[`"']+|[`"']+$/g, "").trim()
  return unquoted.replace(/\/+$/, "")
}

export async function createClient() {
  const cookieStore = await cookies()

  const fetchWithRetry: typeof fetch = async (url, options: any = {}) => {
    const maxAttempts = 2
    const baseDelayMs = 400
    let lastErr: any = null
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const hasSignal = Boolean(options?.signal)
        const signal = hasSignal ? options.signal : AbortSignal.timeout(60_000)
        return await fetch(url, { ...options, signal })
      } catch (e: any) {
        lastErr = e
        const msg = String(e?.message || "")
        const isTimeout = msg.toLowerCase().includes("timed out") || e?.name === "TimeoutError"
        const isNetwork = e?.name === "TypeError" || msg.toLowerCase().includes("fetch failed")
        if (attempt >= maxAttempts || (!isTimeout && !isNetwork)) throw e
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt))
      }
    }
    throw lastErr
  }

  const supabaseUrl = sanitizeEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables. Please check your environment configuration.")
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
    global: {
      fetch: (url, options = {}) => {
        return fetchWithRetry(url, options)
      },
    },
  })
}
