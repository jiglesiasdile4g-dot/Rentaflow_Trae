import { NextResponse } from "next/server"
import Stripe from "stripe"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const planId = Number(body?.planId || 0)
    const customerEmail = String(body?.email || "")

    const secret = process.env.STRIPE_SECRET_KEY || ""
    if (!secret) return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 })

    const priceEnvKey = `STRIPE_PRICE_ID_${planId}`
    const priceId = process.env[priceEnvKey] || ""
    if (!priceId) return NextResponse.json({ error: `Precio no configurado para plan ${planId}` }, { status: 400 })

    const stripe = new Stripe(secret, { apiVersion: "2025-11-17.clover" })

    const origin = new URL(req.url).origin
    const successUrl = `${origin}/dashboard/configuracion?stripe_success=1`
    const cancelUrl = `${origin}/dashboard/configuracion?stripe_canceled=1`

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail || undefined,
      line_items: [{ price: priceId, quantity: 1 }],
    })

    return NextResponse.json({ sessionId: session.id })
  } catch (err) {
    return NextResponse.json({ error: "Error creando sesión" }, { status: 500 })
  }
}
