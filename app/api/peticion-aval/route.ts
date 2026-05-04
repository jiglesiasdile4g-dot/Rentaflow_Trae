import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DEFAULT_PETICION_AVAL_URL = "https://acesalquiler-n8n.ibdvf1.easypanel.host/webhook/peticion_aval"
const DEFAULT_ORIGIN = "https://acesalquiler-n8n.ibdvf1.easypanel.host"

function sanitizeUrl(raw: any) {
  return String(raw || "")
    .trim()
    .replace(/^[`"']+|[`"']+$/g, "")
    .trim()
}

function sanitizeHeader(raw: any) {
  return String(raw || "")
    .trim()
    .replace(/^[`"']+|[`"']+$/g, "")
    .trim()
}

function buildAuthHeaderValue() {
  const direct =
    sanitizeHeader(process.env.N8N_WEBHOOK_PETICION_AVAL_AUTH_HEADER) ||
    sanitizeHeader(process.env.PETICION_AVAL_WEBHOOK_AUTH_HEADER) ||
    ""
  if (direct) return direct

  const user =
    sanitizeHeader(process.env.N8N_WEBHOOK_PETICION_AVAL_BASIC_USER) ||
    sanitizeHeader(process.env.PETICION_AVAL_WEBHOOK_BASIC_USER) ||
    ""
  const pass =
    sanitizeHeader(process.env.N8N_WEBHOOK_PETICION_AVAL_BASIC_PASSWORD) ||
    sanitizeHeader(process.env.PETICION_AVAL_WEBHOOK_BASIC_PASSWORD) ||
    ""

  if (user && pass) return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
  return ""
}

function toSafeUrlInfo(rawUrl: string) {
  try {
    const u = new URL(rawUrl)
    return { origin: u.origin, pathname: u.pathname }
  } catch {
    return { origin: null, pathname: null }
  }
}

function resolvePeticionAvalUrl(envUrlRaw: string) {
  const envUrl = sanitizeUrl(envUrlRaw)
  if (!envUrl) {
    return { url: DEFAULT_PETICION_AVAL_URL, resolvedFrom: "default" as const, envIgnored: false }
  }

  const info = toSafeUrlInfo(envUrl)
  if (info.origin && info.origin !== DEFAULT_ORIGIN) {
    return { url: DEFAULT_PETICION_AVAL_URL, resolvedFrom: "default" as const, envIgnored: true }
  }

  return { url: envUrl, resolvedFrom: "env" as const, envIgnored: false }
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

    const resolved = resolvePeticionAvalUrl(envUrl)
    const webhookUrl = resolved.url
    const urlInfo = toSafeUrlInfo(webhookUrl)
    const authHeaderValue = buildAuthHeaderValue()
    const authSent = Boolean(authHeaderValue)

    try {
      const res = await fetchWithTimeout(
        webhookUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authHeaderValue ? { Authorization: authHeaderValue } : {}),
          },
          body: JSON.stringify(body),
        },
        12000
      )

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        console.error(`[peticion-aval] Webhook failed with status ${res.status}:`, text.slice(0, 200))
        return NextResponse.json(
          {
            ok: false,
            status: res.status,
            webhook: urlInfo,
            webhookOrigin: urlInfo.origin,
            webhookPathname: urlInfo.pathname,
            resolvedFrom: resolved.resolvedFrom,
            envIgnored: resolved.envIgnored,
            authSent,
            response: text.slice(0, 300),
          },
          { status: 502 }
        )
      }
    } catch (err) {
      console.error("[peticion-aval] Error calling webhook:", err)
      return NextResponse.json(
        {
          ok: false,
          error: "webhook_error",
          webhook: urlInfo,
          webhookOrigin: urlInfo.origin,
          webhookPathname: urlInfo.pathname,
          resolvedFrom: resolved.resolvedFrom,
          envIgnored: resolved.envIgnored,
          authSent,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      ok: true,
      webhook: urlInfo,
      webhookOrigin: urlInfo.origin,
      webhookPathname: urlInfo.pathname,
      resolvedFrom: resolved.resolvedFrom,
      envIgnored: resolved.envIgnored,
      authSent,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}
