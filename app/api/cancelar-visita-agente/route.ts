import { NextResponse } from "next/server"
import { getN8nWebhookUrl } from "@/lib/utils"

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

    const webhookUrl = getN8nWebhookUrl("cancelacion_visita_por_agente")
    
    console.log("[Webhook Proxy] Forwarding to:", webhookUrl)
    if (!webhookUrl) {
      return NextResponse.json({ success: true })
    }

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
