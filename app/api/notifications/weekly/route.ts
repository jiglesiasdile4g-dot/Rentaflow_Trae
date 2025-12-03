import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ ok: false, error: "no_auth" }, { status: 401 })
  }

  const meta = (user as any).user_metadata || {}
  if (!Boolean(meta.weekly_report)) {
    return NextResponse.json({ ok: false, error: "disabled" }, { status: 200 })
  }

  const { data: perfil } = await supabase
    .from("Perfiles")
    .select("inmobiliaria")
    .eq("usuario", user.email)
    .maybeSingle()

  const inmobiliariaId = perfil?.inmobiliaria
  if (!inmobiliariaId) {
    return NextResponse.json({ ok: false, error: "no_inmobiliaria" }, { status: 400 })
  }

  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)

  const { count: totalLeads = 0 } = await supabase
    .from("Clientes")
    .select("*", { count: "exact", head: true })
    .eq("usuario", inmobiliariaId)

  const { count: newThisWeek = 0 } = await supabase
    .from("Clientes")
    .select("*", { count: "exact", head: true })
    .eq("usuario", inmobiliariaId)
    .gte("created_at", weekStart.toISOString())
    .lte("created_at", now.toISOString())

  const { count: completedLeads = 0 } = await supabase
    .from("Clientes")
    .select("*", { count: "exact", head: true })
    .eq("usuario", inmobiliariaId)
    .eq("Estado", "Completado")

  const { count: acceptedLeads = 0 } = await supabase
    .from("Clientes")
    .select("*", { count: "exact", head: true })
    .eq("usuario", inmobiliariaId)
    .eq("Estado", "Aceptado")

  const subject = "Resumen semanal de actividad"
  const body = [
    `Hola,`,
    `Aquí tienes tu resumen semanal:`,
    `- Leads totales: ${totalLeads ?? 0}`,
    `- Leads nuevos esta semana: ${newThisWeek ?? 0}`,
    `- Leads completados: ${completedLeads ?? 0}`,
    `- Leads aceptados: ${acceptedLeads ?? 0}`,
  ].join("\n")

  let sent = false
  const webhook = process.env.EMAIL_WEBHOOK_URL
  if (webhook) {
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: user.email, subject, text: body }),
      })
      sent = res.ok
    } catch {
      sent = false
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    metrics: {
      totalLeads: totalLeads ?? 0,
      newThisWeek: newThisWeek ?? 0,
      completedLeads: completedLeads ?? 0,
      acceptedLeads: acceptedLeads ?? 0,
    },
    preview: { subject, body },
  })
}

