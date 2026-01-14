import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("[Webhook] Received visit proposal:", body)

    // Forward to n8n webhook
    try {
      const webhookUrl = "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook-test/proponer_visita"
      console.log("[Webhook] Forwarding to:", webhookUrl)
      
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        console.error(`[Webhook] External webhook failed with status: ${response.status}`)
        // We don't fail the request to the UI, but we log it
      } else {
        console.log("[Webhook] External webhook call successful")
      }
    } catch (webhookError) {
      console.error("[Webhook] Error calling external webhook:", webhookError)
    }

    return NextResponse.json({ success: true, message: "Webhook processed successfully" })
  } catch (error: any) {
    console.error("[Webhook] Error processing request:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
