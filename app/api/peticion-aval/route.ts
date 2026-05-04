import { NextResponse } from "next/server"
import { getWebhookUrl } from "@/lib/utils"

export const runtime = "nodejs"

const DEFAULT_PETICION_AVAL_URL = "https://acesalquiler-n8n.ibdvf1.easypanel.host/webhook/peticion_aval"

function sanitizeUrl(raw: any) {
  return String(raw || "")
    .trim()
    .replace(/^[`"']+|[`"']+$/g, "")
    .trim()
}

function toSafeUrlInfo(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    return { origin: u.origin, pathname: u.pathname }
  } catch {
    return { origin: null, pathname: null }
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === "AbortError") throw new Error(`Timeout después de ${timeoutMs}ms`)
    throw error
  }
}

function isPeticionAvalConfigured() {
  const key = "PETICION_AVAL"
  const urlKey = `NEXT_PUBLIC_N8N_WEBHOOK_${key}`
  const hookKey = `NEXT_PUBLIC_N8N_HOOK_${key}`
  const serverUrlKey = `N8N_WEBHOOK_${key}`
  const serverHookKey = `N8N_HOOK_${key}`
  const baseKeyClient = "NEXT_PUBLIC_N8N_BASE_URL"
  const baseKeyServer = "N8N_BASE_URL"
  return Boolean(
    process.env[urlKey] ||
      process.env[hookKey] ||
      process.env[serverUrlKey] ||
      process.env[serverHookKey] ||
      process.env[baseKeyClient] ||
      process.env[baseKeyServer]
  )
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 })
    }

    const envUrl = sanitizeUrl(
      process.env.N8N_WEBHOOK_PETICION_AVAL ||
        process.env.NEXT_PUBLIC_N8N_WEBHOOK_PETICION_AVAL ||
        process.env.PETICION_AVAL_WEBHOOK_URL ||
        process.env.NEXT_PUBLIC_PETICION_AVAL_WEBHOOK_URL ||
        ""
    )

    const webhookUrl = sanitizeUrl(envUrl) || sanitizeUrl(getWebhookUrl("peticion_aval")) || DEFAULT_PETICION_AVAL_URL
    const urlInfo = toSafeUrlInfo(webhookUrl)

    if (!isPeticionAvalConfigured() && webhookUrl !== DEFAULT_PETICION_AVAL_URL) {
      return NextResponse.json({ ok: true, skipped: true, reason: "peticion_aval_not_configured" })
    }

    try {
      const res = await fetchWithTimeout(
        webhookUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        12000
      )

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error(`[peticion-aval] Webhook failed with status ${res.status}:`, text.slice(0, 200))
        return NextResponse.json(
          { ok: false, status: res.status, webhook: urlInfo, response: text.slice(0, 300) },
          { status: 502 }
        )
      }
    } catch (err) {
      console.error("[peticion-aval] Error calling webhook:", err)
      return NextResponse.json({ ok: false, error: "webhook_error", webhook: urlInfo }, { status: 502 })
    }

    return NextResponse.json({ ok: true, webhook: urlInfo })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}
