import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.N8N_LEAD_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json({ ok: false, error: "Webhook no configurado" }, { status: 500 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ ok: false, error: "Payload inválido" }, { status: 400 })
    }

    const payload = Array.isArray(body) ? body : [body]

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12000),
    })

    if (!res.ok) {
      const txt = await res.text().catch(() => "")
      return NextResponse.json(
        { ok: false, error: `Webhook ${res.status}`, details: txt.slice(0, 200) },
        { status: res.status }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Error" }, { status: 500 })
  }
}
