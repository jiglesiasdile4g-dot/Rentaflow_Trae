import { NextResponse } from "next/server"
import { getWebhookUrl } from "@/lib/utils"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null)
    if (!payload) {
      return NextResponse.json({ ok: false, error: "payload_invalido" }, { status: 400 })
    }
    const webhookUrl = getWebhookUrl("formulario_app")
    if (!webhookUrl) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const text = await res.text().catch(() => "")
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: text || "Error enviando formulario" }, { status: 400 })
    }
    return NextResponse.json({ ok: true, message: "Formulario enviado correctamente" })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "error" }, { status: 500 })
  }
}
