import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatWebhookDate, getN8nWebhookUrl } from "@/lib/utils"

export const runtime = "nodejs"

function getLocalDateString(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getDayRangeIso(dateStr: string) {
  const start = new Date(`${dateStr}T00:00:00`)
  const end = new Date(`${dateStr}T23:59:59.999`)
  return { startIso: start.toISOString(), endIso: end.toISOString() }
}

function resolveSecret(headers: Headers, url: URL) {
  return (
    headers.get("x-cron-secret") ||
    headers.get("x-webhook-secret") ||
    url.searchParams.get("secret") ||
    ""
  )
}

export async function POST(req: Request) {
  const url = new URL(req.url)
  const secret = process.env.RECORDATORIO_VISITA_SECRET || process.env.REMINDER_WEBHOOK_SECRET
  const provided = resolveSecret(req.headers, url)
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  let bodyDate: string | undefined
  try {
    const body = await req.json()
    if (body?.date && typeof body.date === "string") bodyDate = body.date
  } catch {}

  const dateStr = url.searchParams.get("date") || bodyDate || getLocalDateString()
  const { startIso, endIso } = getDayRangeIso(dateStr)
  const admin = createAdminClient()
  const { data: visits, error } = await admin
    .from("Clientes")
    .select("id, IDC, Nombre, Correo, Telefono, Obsevaciones, Inmueble, fecha_de_visita, idag, usuario, correo_proxy")
    .not("fecha_de_visita", "is", null)
    .gte("fecha_de_visita", startIso)
    .lte("fecha_de_visita", endIso)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const webhookUrl = process.env.RECORDATORIO_VISITA_WEBHOOK_URL || getN8nWebhookUrl("recordatorio_visita_agente")
  if (!webhookUrl) {
    return NextResponse.json({ ok: true, skipped: true, reason: "N8N webhook not configured", count: (visits || []).length })
  }
  const idags = Array.from(
    new Set((visits || []).map((v: any) => v?.idag).filter((v: any) => v !== null && v !== undefined))
  )
  let agentsByIdag = new Map<number, any>()
  if (idags.length > 0) {
    const { data: agents } = await admin
      .from("Agentes")
      .select("idag, Nombre, Email, Telefono")
      .in("idag", idags)
    if (agents) {
      agentsByIdag = new Map(agents.map((a: any) => [a.idag, a]))
    }
  }
  const inmoIds = Array.from(
    new Set(
      (visits || [])
        .map((v: any) => v?.usuario)
        .filter((v: any) => v !== null && v !== undefined)
        .map((v: any) => String(v))
    )
  )
  let adsByInmo = new Map<string, any[]>()
  if (inmoIds.length > 0) {
    const { data: ads } = await admin
      .from("Anuncios")
      .select("ida, Referencia, Direccion, usuario, Activacion")
      .in("usuario", inmoIds)
      .eq("Activacion", "Activo")
    if (ads) {
      for (const ad of ads) {
        const key = String(ad.usuario)
        const list = adsByInmo.get(key) || []
        list.push(ad)
        adsByInmo.set(key, list)
      }
    }
  }
  let inmoById = new Map<string, any>()
  if (inmoIds.length > 0) {
    const { data: inmobiliarias } = await admin
      .from("Inmobiliarias")
      .select("idi, Nombre, \"Mail sistema\"")
      .in("idi", inmoIds)
    if (inmobiliarias) {
      for (const inmo of inmobiliarias) {
        const key = String(inmo.idi)
        inmoById.set(key, inmo)
      }
    }
  }
  function matchAdForLead(lead: any) {
    const key = String(lead?.usuario ?? "")
    const list = adsByInmo.get(key) || []
    const inm = (lead?.Inmueble || "").trim()
    if (!inm || list.length === 0) return null
    return (
      list.find((a: any) => a.Referencia && a.Referencia.trim() === inm) ||
      list.find((a: any) => a.Direccion && a.Direccion.trim() === inm) ||
      list.find((a: any) => a.Direccion && inm.includes(a.Direccion))
    ) || null
  }
  const grouped = new Map<string, any>()
  for (const lead of visits || []) {
    const notes = lead?.Obsevaciones ?? ""
    const leadMail = lead?.Correo ?? lead?.correo_proxy ?? ""
    const leadPhone = lead?.Telefono ?? ""
    const leadId = lead?.id ?? lead?.IDC ?? null
    const { date, time } = formatWebhookDate(lead?.fecha_de_visita)
    const agent = agentsByIdag.get(lead?.idag)
    const ad = matchAdForLead(lead)
    const inmoKey = String(lead?.usuario ?? "")
    const inmo = inmoById.get(inmoKey)
    const inmoMailSistema = inmo?.["Mail sistema"] ?? null
    const agentKey = String(lead?.idag ?? "sin_agente")
    if (!grouped.has(agentKey)) {
      grouped.set(agentKey, {
        Agente: {
          Nombre: agent?.Nombre ?? "",
          Idag: agent?.idag ?? lead?.idag ?? null,
          Mail: agent?.Email ?? "",
          telefono: agent?.Telefono ?? "",
        },
        Visitas: [],
      })
    }
    grouped.get(agentKey).Visitas.push({
      Lead: {
        Nombre: lead?.Nombre ?? "",
        Id: leadId,
        Mail: leadMail,
        Telefono: leadPhone,
        Notas: notes,
      },
      Inmueble: {
        Referencia: ad?.Referencia ?? lead?.Inmueble ?? "",
        Direccion: ad?.Direccion ?? "",
      },
      Inmobiliaria: {
        Nombre: inmo?.Nombre ?? null,
        MailSistema: inmoMailSistema,
        Idi: inmo?.idi ?? (Number(inmoKey) || null),
      },
      Visita: {
        Fecha: date,
        Hora: time,
      },
    })
  }
  const payload = Array.from(grouped.values())
  let webhookOk = false
  let webhookStatus = 0
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    })
    webhookOk = res.ok
    webhookStatus = res.status
  } catch {
    webhookOk = false
  }

  return NextResponse.json({
    ok: webhookOk,
    status: webhookStatus,
    date: dateStr,
    count: visits?.length ?? 0,
  })
}
