"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendRecordatorioDatosIncompletos, type RecordatorioResult } from "@/lib/recordatorio-datos-incompletos"

/**
 * Envío manual del recordatorio de "datos incompletos" a un único lead.
 * Se lanza desde el botón del modal del lead. Ignora los filtros del cron
 * (antigüedad y anuncio activo): es una acción explícita del gestor.
 */
export async function sendLeadIncompleteReminderAction(
  leadId: number
): Promise<RecordatorioResult | { ok: false; count: number; evaluated: number; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return { ok: false, count: 0, evaluated: 0, error: "Usuario no autenticado" }
  }

  const admin = createAdminClient()

  const { data: lead, error } = await admin
    .from("Clientes")
    .select(
      "id, IDC, Nombre, Correo, correo_proxy, Telefono, n_whatsapp, Inmueble, url_form, usuario, created_at"
    )
    .eq("id", leadId)
    .maybeSingle()

  if (error || !lead) {
    return { ok: false, count: 0, evaluated: 0, error: "Lead no encontrado" }
  }

  // requireActiveAd: false → permite recordar a este lead aunque su anuncio no esté activo.
  return sendRecordatorioDatosIncompletos(admin, [lead], { requireActiveAd: false })
}
