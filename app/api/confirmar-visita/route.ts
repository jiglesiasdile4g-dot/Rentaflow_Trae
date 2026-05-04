import { NextResponse } from "next/server"
import { getN8nWebhookUrl } from "@/lib/utils"

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[Webhook] Received visit confirmation:", body)

    // Forward to n8n webhook with timeout
    try {
      const webhookUrl = getN8nWebhookUrl("confirmacion_visita")
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
      }, 8000) // 8 segundos de timeout para el webhook

      if (!response.ok) {
        console.error(`[Webhook] External webhook failed with status: ${response.status}`)
        // We don't fail the request to the UI, but we log it
      } else {
        console.log("[Webhook] External webhook call successful")
      }
    } catch (webhookError: any) {
      console.error("[Webhook] Error calling external webhook:", webhookError)
      if (webhookError.message?.includes("Timeout")) {
        console.error("[Webhook] El webhook externo tardó demasiado en responder (timeout 8s)")
      }
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error: any) {
    console.error("[Webhook] Error processing request:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
