import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRecordatorioDatosIncompletos } from "@/lib/recordatorio-datos-incompletos"

export const runtime = "nodejs"

// Días de antigüedad máxima del lead para considerarlo "reciente" (configurable por env).
const DIAS_RECIENTES_DEFAULT = 7

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
  const secret =
    process.env.RECORDATORIO_INCOMPLETOS_SECRET ||
    process.env.RECORDATORIO_VISITA_SECRET ||
    process.env.REMINDER_WEBHOOK_SECRET
  const provided = resolveSecret(req.headers, url)
  if (secret && provided !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  const dias = Number(process.env.RECORDATORIO_INCOMPLETOS_DIAS || DIAS_RECIENTES_DEFAULT)
  const cutoffIso = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

  // Estado "Incompleto" no existe en el enum estado_enum: el único estado incompleto real es "Datos Incompletos".
  const { data: leads, error } = await admin
    .from("Clientes")
    .select(
      "id, IDC, Nombre, Correo, correo_proxy, Telefono, n_whatsapp, Inmueble, url_form, usuario, created_at"
    )
    .eq("Estado", "Datos Incompletos")
    .or("Recordatorio.is.null,Recordatorio.eq.false")
    .gte("created_at", cutoffIso)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const result = await sendRecordatorioDatosIncompletos(admin, leads || [], {
    dias,
    requireActiveAd: true,
  })

  return NextResponse.json(result)
}
