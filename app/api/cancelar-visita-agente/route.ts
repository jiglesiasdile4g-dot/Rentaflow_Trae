import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[Webhook Proxy] Received agent cancellation:", body)

    const webhookUrl = "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/cancelacion_visita_por_agente"
    
    console.log("[Webhook Proxy] Forwarding to:", webhookUrl)

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.error(`[Webhook Proxy] Upstream failed: ${response.status}`)
      return NextResponse.json({ error: `Upstream error: ${response.status}` }, { status: response.status })
    }

    console.log("[Webhook Proxy] Success")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Webhook Proxy] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
