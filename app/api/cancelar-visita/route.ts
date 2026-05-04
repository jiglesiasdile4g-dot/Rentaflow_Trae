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
    console.log("[Webhook] Received visit cancellation:", body)

    // Forward to n8n webhook
    try {
      const webhookUrl = getN8nWebhookUrl("cancelacion_visita_por_cliente")
      console.log("[Webhook] Forwarding to:", webhookUrl)
      if (!webhookUrl) {
        return NextResponse.json({ success: true, message: "Webhook processed successfully" })
      }
      
      const response = await fetchWithTimeout(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        console.error(`[Webhook] External webhook failed with status: ${response.status}`)
        return NextResponse.json({ success: false, error: `External webhook failed with status: ${response.status}` }, { status: response.status })
      } else {
        console.log("[Webhook] External webhook call successful")
      }
    } catch (webhookError) {
      console.error("[Webhook] Error calling external webhook:", webhookError)
      return NextResponse.json({ success: false, error: "Error calling external webhook" }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error: any) {
    console.error("[Webhook] Error processing request:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
