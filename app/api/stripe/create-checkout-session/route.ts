import { NextResponse } from "next/server"
import Stripe from "stripe"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const planId = Number(body?.planId || 0)
    const customerEmail = String(body?.email || "")
    const idi = body?.idi != null ? Number(body.idi) : null
    const successPath = String(body?.successPath || "/dashboard/informacion").trim() || "/dashboard/informacion"
    const cancelPath = String(body?.cancelPath || "/dashboard/informacion").trim() || "/dashboard/informacion"

    const secret = process.env.STRIPE_SECRET_KEY || ""
    if (!secret) return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 })

    const priceEnvKey = `STRIPE_PRICE_ID_${planId}`
    const priceId = process.env[priceEnvKey] || ""
    if (!priceId) return NextResponse.json({ error: `Precio no configurado para plan ${planId}` }, { status: 400 })

    const stripe = new Stripe(secret, { apiVersion: "2026-01-28.clover" })

    const origin = new URL(req.url).origin
    const successUrl = `${origin}${successPath}?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${origin}${cancelPath}?stripe_canceled=1`

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        planId: String(planId),
        idi: idi != null && Number.isFinite(idi) ? String(idi) : "",
      },
      subscription_data: {
        metadata: {
          planId: String(planId),
          idi: idi != null && Number.isFinite(idi) ? String(idi) : "",
        },
      },
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    return NextResponse.json({ error: "Error creando sesión" }, { status: 500 })
  }
}
