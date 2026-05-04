import { NextResponse } from "next/server"

export const runtime = "nodejs"

const DEFAULT_APROBADO_URL = "https://acesalquiler-n8n.ibdvf1.easypanel.host/webhook/aprobado"

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

    const envUrl =
      process.env.N8N_WEBHOOK_APROBADO ||
      process.env.NEXT_PUBLIC_N8N_WEBHOOK_APROBADO ||
      process.env.APROBADO_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_APROBADO_WEBHOOK_URL ||
      ""

    const webhookUrl = String(envUrl || "").trim() || DEFAULT_APROBADO_URL

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
        console.error(`[aprobado] Webhook failed with status ${res.status}:`, text.slice(0, 200))
        return NextResponse.json({ ok: false, status: res.status })
      }
    } catch (err) {
      console.error("[aprobado] Error calling webhook:", err)
      return NextResponse.json({ ok: false, error: "webhook_error" }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}
