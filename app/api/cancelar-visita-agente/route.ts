import { NextResponse } from "next/server"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error(`Timeout después de ${timeoutMs}ms`)
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[Webhook Proxy] Received agent cancellation:", body)

    const webhookUrl = "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/cancelacion_visita_por_agente"
    
    console.log("[Webhook Proxy] Forwarding to:", webhookUrl)

    const response = await fetchWithTimeout(webhookUrl, {
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
