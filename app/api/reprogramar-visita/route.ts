import { NextResponse } from "next/server"
import { getWebhookUrl } from "@/lib/utils"
import { createAdminClient } from "@/lib/supabase/admin"

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
    console.log("[Webhook] Received visit reschedule:", body)

    const payload: any = typeof body === "object" && body ? { ...body } : body
    if (payload && typeof payload === "object") {
      const lead = payload.lead && typeof payload.lead === "object" ? payload.lead : null
      const targetInmoId =
        payload.inmobiliariaId ??
        payload.idi ??
        payload.usuario ??
        lead?.inmobiliariaId ??
        lead?.idi ??
        lead?.usuario ??
        payload?.inmobiliaria?.idi ??
        payload?.Inmobiliaria?.idi ??
        null

      if (targetInmoId != null && !payload.inmobiliaria && !payload.Inmobiliaria) {
        try {
          const admin = createAdminClient()
          const { data: inmo, error } = await admin.from("Inmobiliarias").select("*").eq("idi", String(targetInmoId)).maybeSingle()
          if (!error && inmo) {
            payload.inmobiliaria = inmo
            payload.Inmobiliaria = inmo
            payload.inmobiliariaId = targetInmoId
            payload.idi = targetInmoId
            payload.inmobiliariaNombre = (inmo as any)?.Nombre ?? null
          }
        } catch (e) {
          console.error("[Webhook] Could not fetch inmobiliaria for reschedule payload:", e)
        }
      }

      if (payload.lead && typeof payload.lead === "object") {
        const leadCopy: any = { ...payload.lead }
        delete leadCopy.status_history
        delete leadCopy.statusHistory
        payload.lead = leadCopy
      }
    }

    // Forward to n8n webhook
    try {
      const webhookUrl = getWebhookUrl("reprogramar_visita_por_cliente")
      console.log("[Webhook] Forwarding to:", webhookUrl)
      if (!webhookUrl) {
        return NextResponse.json({ success: true, message: "Webhook processed successfully" })
      }
      
      const response = await fetchWithTimeout(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
