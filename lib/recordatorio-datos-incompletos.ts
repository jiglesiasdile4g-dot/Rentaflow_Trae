import { getWebhookUrl, getPublicAppBaseUrl } from "@/lib/utils"

// Enlace del formulario: usa el enviado en el primer mensaje (url_form) o, si no existe,
// el formulario propio de la app con precarga de datos por id de lead.
export function resolveFormUrl(lead: any): string {
  const direct = String(lead?.url_form || "").trim()
  if (direct) return direct
  const base = getPublicAppBaseUrl()
  const id = lead?.id ?? lead?.IDC
  if (!base || id === null || id === undefined || id === "") return ""
  return `${base}/formulario?id=${encodeURIComponent(String(id))}`
}

export function buildMensajes(lead: any, inmueble: string, formUrl: string) {
  const link = String(formUrl || "").trim()
  const nombre = String(lead?.Nombre || "").trim()

  const cuerpoComun = `👉 Recordatorio: seguimos necesitando tus datos
Hace unos días te enviamos el enlace para completar tu solicitud y todavía no hemos recibido tu información. Para poder avanzar, necesitamos algunos datos básicos sobre ti y tu situación económica.

📝 Opción recomendada:
Rellenar el formulario online en el siguiente enlace:
📝 Rellenar formulario online

✉️ Alternativa:
Responder a este correo indicando:
Nombre completo | Teléfono | DNI/NIE/Pasaporte | Ingresos mensuales netos | Situación laboral

➖➖➖➖➖
⚠️ Aviso importante:
Puede aparecer un aviso de seguridad al abrir los enlaces. Es un aviso estándar para enlaces externos.

Si tienes cualquier duda, puedes responder a este correo.

Un saludo,
El equipo de Aces Alquiler`

  const saludo = nombre ? `Hola ${nombre},\n\n` : ""

  const email = `${saludo}${cuerpoComun.replace(
    "📝 Rellenar formulario online",
    `📝 <a href="${link}">Rellenar formulario online</a>`
  )}`
  const whatsapp = `${saludo}${cuerpoComun.replace("📝 Rellenar formulario online", `📝 ${link}`)}`

  return { Email: email, WhatsApp: whatsapp, Inmueble: inmueble }
}

export function getRecordatorioWebhookUrl(): string {
  return (
    process.env.RECORDATORIO_INCOMPLETOS_WEBHOOK_URL ||
    getWebhookUrl("recordatorio_datos_incompletos")
  )
}

export type RecordatorioResult = {
  ok: boolean
  skipped?: boolean
  reason?: string
  status?: number
  count: number
  evaluated: number
  dias?: number
}

/**
 * Construye y envía el recordatorio de "datos incompletos" a los leads indicados.
 * - requireActiveAd: exige que el inmueble del lead coincida con un anuncio Activo (modo cron).
 *   En envío manual se desactiva, para poder recordar a cualquier lead elegido.
 * Marca `Recordatorio=true` tras un envío correcto.
 */
export async function sendRecordatorioDatosIncompletos(
  admin: any,
  leads: any[],
  opts: { dias?: number; requireActiveAd?: boolean } = {}
): Promise<RecordatorioResult> {
  const { dias } = opts
  const requireActiveAd = opts.requireActiveAd !== false

  const candidates = (leads || []).filter((l: any) => resolveFormUrl(l).length > 0)

  if (candidates.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "Sin leads con enlace de formulario",
      count: 0,
      evaluated: (leads || []).length,
      dias,
    }
  }

  const inmoIds = Array.from(
    new Set(
      candidates
        .map((l: any) => l?.usuario)
        .filter((v: any) => v !== null && v !== undefined)
        .map((v: any) => String(v))
    )
  )

  const adsByInmo = new Map<string, any[]>()
  if (inmoIds.length > 0) {
    const { data: ads } = await admin
      .from("Anuncios")
      .select("ida, Referencia, Direccion, usuario, Activacion")
      .in("usuario", inmoIds)
      .eq("Activacion", "Activo")
    for (const ad of ads || []) {
      const key = String(ad.usuario)
      const list = adsByInmo.get(key) || []
      list.push(ad)
      adsByInmo.set(key, list)
    }
  }

  const inmoById = new Map<string, any>()
  if (inmoIds.length > 0) {
    const { data: inmobiliarias } = await admin
      .from("Inmobiliarias")
      .select('idi, Nombre, "Mail sistema"')
      .in("idi", inmoIds)
    for (const inmo of inmobiliarias || []) {
      inmoById.set(String(inmo.idi), inmo)
    }
  }

  function matchAdForLead(lead: any) {
    const list = adsByInmo.get(String(lead?.usuario ?? "")) || []
    const inm = (lead?.Inmueble || "").trim()
    if (!inm || list.length === 0) return null
    return (
      list.find((a: any) => a.Referencia && a.Referencia.trim() === inm) ||
      list.find((a: any) => a.Direccion && a.Direccion.trim() === inm) ||
      list.find((a: any) => a.Direccion && inm.includes(a.Direccion)) ||
      null
    )
  }

  const items: any[] = []
  for (const lead of candidates) {
    const ad = matchAdForLead(lead)
    if (requireActiveAd && !ad) continue

    const mail = String(lead?.Correo || lead?.correo_proxy || "").trim()
    const whatsapp = String(lead?.n_whatsapp || lead?.Telefono || "").trim()
    if (!mail && !whatsapp) continue

    const canales: string[] = []
    if (mail) canales.push("email")
    if (whatsapp) canales.push("whatsapp")

    const inmo = inmoById.get(String(lead?.usuario ?? ""))
    const formUrl = resolveFormUrl(lead)
    const mensaje = buildMensajes(lead, ad?.Referencia || lead?.Inmueble || "", formUrl)

    items.push({
      Lead: {
        Id: lead?.id ?? lead?.IDC ?? null,
        IDC: lead?.IDC ?? null,
        Nombre: lead?.Nombre ?? "",
        Mail: mail,
        Telefono: lead?.Telefono ?? "",
        WhatsApp: whatsapp,
      },
      Inmueble: {
        Referencia: ad?.Referencia ?? lead?.Inmueble ?? "",
        Direccion: ad?.Direccion ?? "",
      },
      Inmobiliaria: {
        Nombre: inmo?.Nombre ?? null,
        MailSistema: inmo?.["Mail sistema"] ?? null,
        Idi: inmo?.idi ?? (Number(lead?.usuario) || null),
      },
      Formulario: { Url: formUrl },
      Canales: canales,
      Mensaje: mensaje,
    })
  }

  if (items.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: requireActiveAd
        ? "Sin coincidencias con anuncios activos"
        : "Lead sin canales de contacto",
      count: 0,
      evaluated: candidates.length,
      dias,
    }
  }

  const webhookUrl = getRecordatorioWebhookUrl()
  if (!webhookUrl) {
    return {
      ok: true,
      skipped: true,
      reason: "N8N webhook not configured",
      count: items.length,
      evaluated: candidates.length,
      dias,
    }
  }

  let webhookOk = false
  let webhookStatus = 0
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(items),
      signal: AbortSignal.timeout(15000),
    })
    webhookOk = res.ok
    webhookStatus = res.status
  } catch {
    webhookOk = false
  }

  // Marcar como recordados solo si el envío se completó, para no repetir (una sola vez por lead).
  if (webhookOk) {
    const ids = items
      .map((i: any) => i?.Lead?.Id)
      .filter((v: any) => v !== null && v !== undefined)
    if (ids.length > 0) {
      await admin.from("Clientes").update({ Recordatorio: true }).in("id", ids)
    }
  }

  return {
    ok: webhookOk,
    status: webhookStatus,
    count: items.length,
    evaluated: candidates.length,
    dias,
  }
}
