import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function createClient() {
  if (client) {
    return client
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables. Please check your environment configuration.")
  }

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

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    global: {
      fetch: (url, options = {}) => {
        return fetchWithRetry(url, options)
      },
    },
  })
  return client
}

export { createBrowserClient }
