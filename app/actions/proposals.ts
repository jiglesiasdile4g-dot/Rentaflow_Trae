"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateSlotCandidates, AgendaSlot, AdData } from "@/lib/agenda-utils"

function getTimeZoneOffsetMinutes(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
  const parts = dtf.formatToParts(date)
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value || "GMT"
  const match = tzName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/i)
  if (!match) return 0
  const sign = match[1] === "-" ? -1 : 1
  const hours = Number(match[2] || 0)
  const minutes = Number(match[3] || 0)
  return sign * (hours * 60 + minutes)
}

function madridLocalDateTimeToUtcIso(dateStr: string, time: string) {
  const [y, m, d] = dateStr.split("-").map(Number)
  const [hh, mm] = time.split(":").map(Number)
  const asUtc = new Date(Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0))
  const offsetMinutes = getTimeZoneOffsetMinutes("Europe/Madrid", asUtc)
  const corrected = new Date(asUtc.getTime() - offsetMinutes * 60_000)
  return corrected.toISOString()
}

function formatMadridDateStr(date: Date) {
  const d = new Date(date)
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  return s
}

export async function createVisitProposal(data: {
  leadIds: string[]
  date: Date
  time: string
  inmuebleRef?: string
  inmuebleDireccion?: string
  inmuebleId?: string
  inmobiliariaId: number
  origin: string
  agentId?: number | null
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()
  
  const madridDateStr = formatMadridDateStr(data.date)
  const fechaVisitaIso = madridLocalDateTimeToUtcIso(madridDateStr, data.time)

  // Resolve Agent UUID if agentId is provided
  let agentUuid = null
  if (data.agentId) {
    try {
      // 1. Get Agent Email
      const { data: agentData } = await supabase
        .from("Agentes")
        .select("Email")
        .eq("idag", data.agentId)
        .single()
      
      if (agentData?.Email) {
        // 2. Get User UUID from Auth
        // Note: listUsers is admin-only. We need to find the user by email.
        // Sadly, getUserByEmail is not directly exposed in some client versions, 
        // but we can list users filtering or assume specific user structure.
        // Actually, admin.listUsers() is pagination based.
        // A better way might be if Agentes has a UUID column, but it doesn't.
        // Let's try to search via listUsers for now.
        const { data: { users }, error: userError } = await adminSupabase.auth.admin.listUsers()
        if (!userError && users) {
             const user = users.find(u => u.email?.toLowerCase() === agentData.Email.toLowerCase())
             if (user) {
                 agentUuid = user.id
             }
        }
      }
    } catch (e) {
      console.error("Error resolving agent UUID:", e)
    }
  }

  const { data: proposal, error } = await supabase
    .from("PropuestasVisita")
    .insert({
      fecha_visita: fechaVisitaIso,
      inmueble_ref: data.inmuebleRef,
      inmueble_direccion: data.inmuebleDireccion,
      inmueble_id: data.inmuebleId,
      inmobiliaria_id: data.inmobiliariaId,
      agente_id: agentUuid, // Use UUID here
      leads_invitados: data.leadIds,
      estado: "pendiente"
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating visit proposal:", error)
    throw new Error("No se pudo crear la propuesta de visita")
  }

  // --- Webhook Integration ---
  let webhookSuccess = false
  let webhookErrorMsg = ""
  try {
    console.log("[createVisitProposal] Fetching details for webhook...")
      const { data: leads } = await supabase
        .from("Clientes")
        .select("*")
        .in("id", data.leadIds)

      let agent = null
      if (data.agentId) {
        const { data: agentData } = await supabase
          .from("Agentes")
          .select("*")
          .eq("idag", data.agentId)
          .single()
        agent = agentData
      }

      let advertisement = null
      if (data.inmuebleId) {
        const { data: adData } = await supabase
          .from("Anuncios")
          .select("*")
          .eq("ida", data.inmuebleId)
          .single()
        advertisement = adData
      }

      let inmobiliaria = null
      if (data.inmobiliariaId) {
        const { data: inmoData } = await supabase
          .from("Inmobiliarias")
          .select("*")
          .eq("idi", data.inmobiliariaId)
          .single()
        inmobiliaria = inmoData
      }

      const link = `${data.origin}/oferta-visita/${proposal.id}`

      const cleanLeads = (leads || []).map((lead: any) => {
        const rest = { ...lead }
        if ("status_history" in rest) delete rest.status_history
        return rest
      })

      const payload = {
        proposal_id: proposal.id,
        link: link,
        visita: {
          fecha: madridDateStr,
          hora: data.time,
          fecha_completa: fechaVisitaIso
        },
        agente: agent,
        inmueble: advertisement || {
          id: data.inmuebleId,
          referencia: data.inmuebleRef,
          direccion: data.inmuebleDireccion
        },
        inmobiliaria: inmobiliaria,
        leads: cleanLeads
      }

      console.log("[createVisitProposal] Payload constructed. Size:", JSON.stringify(payload).length)

      const webhookUrl = "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/visita_grupal"

      console.log("[createVisitProposal] Sending webhook to:", webhookUrl)

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      })

      console.log("[createVisitProposal] Webhook response status:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[createVisitProposal] Webhook failed:", response.status, errorText)
        try {
          const errorJson = JSON.parse(errorText)
          webhookErrorMsg = errorJson.message || errorText
        } catch {
          webhookErrorMsg = `Status ${response.status}: ${errorText.slice(0, 100)}`
        }
      } else {
        webhookSuccess = true
        console.log("[createVisitProposal] Webhook sent successfully.")
      }
  } catch (err) {
    console.error("[createVisitProposal] Error in webhook processing:", err)
  }

  return { success: true, proposalId: proposal.id, webhookSuccess, webhookError: webhookErrorMsg }
}

export async function getVisitProposal(id: string) {
  // Use admin client to allow public access to proposal details via UUID
  const supabase = createAdminClient()
  
  const { data: proposal, error } = await supabase
    .from("PropuestasVisita")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !proposal) {
    return null
  }

  // Fetch Inmobiliaria info
  const { data: inmobiliaria } = await supabase
    .from("Inmobiliarias")
    .select("Nombre, logo_url, pagina_web, color_primario")
    .eq("idi", proposal.inmobiliaria_id)
    .single()

  return {
    ...proposal,
    inmobiliaria
  }
}

export async function getAgendaProposals(params: {
  startDate: string
  endDate: string
  inmobiliariaId?: number | null
}) {
  try {
    const supabase = createAdminClient()
    const selectFields = "id, fecha, lead_id, turno, inmobiliaria_idi, anuncio_id, agente_id, mensaje"
    let clientQuery = supabase
      .from("propuesta_cliente")
      .select(selectFields)
      .gte("fecha", params.startDate)
      .lte("fecha", params.endDate)

    if (params.inmobiliariaId) {
      clientQuery = clientQuery.eq("inmobiliaria_idi", params.inmobiliariaId)
    }

    const { data, error } = await clientQuery
    if (error) {
      console.error("Error fetching agenda proposals (propuesta_cliente):", error)
      return { data: [], error: error.message }
    }

    return { data: data || [] }
  } catch (err: any) {
    console.error("Error fetching agenda proposals:", err)
    return { data: [], error: err?.message || "Error interno" }
  }
}

export async function deleteAgendaProposal(params: {
  leadId: number
  proposalId?: number
  fecha?: string
}) {
  try {
    const supabase = createAdminClient()
    let query = supabase.from("propuesta_cliente").delete()

    if (typeof params.proposalId === "number") {
      query = query.eq("id", params.proposalId)
    } else {
      query = query.eq("lead_id", params.leadId)
    }

    if (params.fecha) {
      query = query.eq("fecha", params.fecha)
    }

    const { error } = await query

    if (error) {
      console.error("Error deleting agenda proposal:", error)
      return { error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    console.error("Error deleting agenda proposal:", err)
    return { error: err?.message || "Error interno" }
  }
}

export async function confirmAgendaProposal(params: {
  leadId: number
  fechaHora: string
  agentId?: number | null
  proposalId?: number
}) {
  try {
    const supabase = createAdminClient()
    const updatePayload: Record<string, any> = {
      fecha_de_visita: params.fechaHora,
      visita_completada: "visita confirmada", // Changed from "pendiente" to "visita confirmada" so UI knows it's not a proposal
      Estado: "Visita Confirmada",
      visita_propuesta: false // Ensure the database trigger doesn't revert it
    }
    if (typeof params.agentId === "number") {
      updatePayload.idag = params.agentId
    }
    const { data: updatedRows, error: updateError } = await supabase
      .from("Clientes")
      .update(updatePayload)
      .eq("id", params.leadId)
      .select("id")

    if (updateError) {
      console.error("Error confirming agenda proposal:", updateError)
      return { error: updateError.message }
    }
    if (!updatedRows || updatedRows.length === 0) {
      return { error: "Lead no encontrado para confirmar la visita" }
    }

    const { error: deleteError } = await supabase
      .from("propuesta_cliente")
      .delete()
      .eq("lead_id", params.leadId)

    if (deleteError) {
      console.error("Error deleting agenda proposal after confirm:", deleteError)
      return { error: deleteError.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error confirming agenda proposal:", err)
    return { error: err?.message || "Error interno" }
  }
}

export async function rejectAgendaProposal(params: {
  leadId: number
  proposalId?: number
}) {
  try {
    const supabase = createAdminClient()
    const { data: updatedRows, error: updateError } = await supabase
      .from("Clientes")
      .update({
        Estado: "Descartado",
        visita_completada: "cancelada",
        fecha_de_visita: null
      })
      .eq("id", params.leadId)
      .select("id")

    if (updateError) {
      console.error("Error rejecting agenda proposal:", updateError)
      return { error: updateError.message }
    }
    if (!updatedRows || updatedRows.length === 0) {
      return { error: "Lead no encontrado para rechazar la propuesta" }
    }

    const { error: deleteError } = await supabase
      .from("propuesta_cliente")
      .delete()
      .eq("lead_id", params.leadId)

    if (deleteError) {
      console.error("Error deleting agenda proposal after reject:", deleteError)
      return { error: deleteError.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error rejecting agenda proposal:", err)
    return { error: err?.message || "Error interno" }
  }
}

export async function bookVisitProposal(proposalId: string, leadPhone: string) {
  // Use admin client to bypass RLS, as the user (lead) is not authenticated
  const supabase = createAdminClient()
  
  console.log(`[bookVisitProposal] Processing proposal ${proposalId} for phone ${leadPhone}`)

  // 1. Get proposal to check status and invited leads
  const { data: proposal, error: fetchError } = await supabase
    .from("PropuestasVisita")
    .select("*")
    .eq("id", proposalId)
    .single()

  if (fetchError || !proposal) {
    console.error("[bookVisitProposal] Error fetching proposal:", fetchError)
    return { success: false, message: "Propuesta no encontrada" }
  }

  console.log(`[bookVisitProposal] Proposal found. Invited leads: ${JSON.stringify(proposal.leads_invitados)}`)

  if (proposal.estado !== "pendiente") {
    return { success: false, message: "Esta visita ya ha sido reservada" }
  }

  // 2. Find lead by phone
  // Strategy:
  // a) Get all invited leads from the proposal
  // b) Check if any of them matches the provided phone number (ignoring spaces, dashes, prefixes)
  
  if (!proposal.leads_invitados || proposal.leads_invitados.length === 0) {
     return { success: false, message: "Esta propuesta no tiene leads invitados." }
  }

  const { data: leads, error: leadError } = await supabase
    .from("Clientes")
    .select("id, Nombre, Inmueble, fecha_de_visita, Telefono, Correo")
    .in("id", proposal.leads_invitados)

  if (leadError) {
      console.error("[bookVisitProposal] Error fetching leads:", leadError)
  }
  
  console.log(`[bookVisitProposal] Leads fetched: ${leads?.length || 0}`)

  if (leadError || !leads || leads.length === 0) {
    return { success: false, message: "No se encontraron los datos de los clientes invitados." }
  }

  // Normalize helper: remove all non-numeric chars
  const normalizePhone = (p: string | null) => p ? p.replace(/\D/g, "") : ""
  const inputPhone = normalizePhone(leadPhone)

  // Find matching lead
  // We check if the input phone is contained in the stored phone or vice versa, 
  // or if they match exactly after normalization.
  // This handles cases like: Input: 34600... DB: 600... (Input includes country code)
  // or Input: 600... DB: +34 600... (DB includes country code)
  const lead = leads.find(l => {
      const dbPhone = normalizePhone(l.Telefono)
      if (!dbPhone || !inputPhone) return false
      return dbPhone === inputPhone || dbPhone.endsWith(inputPhone) || inputPhone.endsWith(dbPhone)
  })

  if (!lead) {
    return { success: false, message: "No encontramos un cliente invitado con este teléfono." }
  }

  // Optional: Check if lead was invited?
  // if (proposal.leads_invitados && !proposal.leads_invitados.includes(String(lead.id))) {
  //   return { success: false, message: "Este teléfono no corresponde a los invitados para esta visita" }
  // }

  // 3. Attempt to book (Concurrency check via UPDATE WHERE)
  const { error: updateError, count } = await supabase
    .from("PropuestasVisita")
    .update({ 
      estado: "reservada",
      lead_adjudicado_id: lead.id
    })
    .eq("id", proposalId)
    .eq("estado", "pendiente") // Optimistic locking
    .select()

  if (updateError || count === 0) {
    console.error("[bookVisitProposal] Update error:", updateError)
    return { success: false, message: "La visita ya fue reservada por otro usuario." }
  }

  // 4. Update Lead status and visit date
  // Fetch proposal details again or use local vars
  const visitDate = new Date(proposal.fecha_visita)
  
  // Resolve Agent ID (integer) from proposal.agente_id (UUID)
  let assignedAgentId = null
  let fullAgentData = null

  if (proposal.agente_id) {
     try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(proposal.agente_id)
        if (user && user.email) {
            const { data: agentData } = await supabase
               .from("Agentes")
               .select("*")
               .ilike("Email", user.email)
               .maybeSingle()
            if (agentData) {
                assignedAgentId = agentData.idag
                fullAgentData = agentData
            }
        }
     } catch (e) {
         console.error("Error resolving assigned agent:", e)
     }
  }

  // Update lead
  const { data: clientUpdateData, error: clientUpdateError } = await supabase
    .from("Clientes")
    .update({
      fecha_de_visita: visitDate.toISOString(),
      visita_propuesta: false, // Clear flag
      visita_completada: "visita confirmada", // Changed from "pendiente" to "visita confirmada"
      Estado: "Visita Confirmada", // Correct column name (was status)
      idag: assignedAgentId // Assign to the agent who created the proposal
    })
    .eq("id", lead.id)
    .select()
    .single()

  if (clientUpdateError) {
      console.error("[bookVisitProposal] Error updating client:", clientUpdateError)
      // We should probably rollback or warn, but for now just log
      return { success: false, message: "Error al actualizar el cliente: " + clientUpdateError.message }
  }

  // Double-check persistence and retry if needed (workaround for hidden trigger reversion)
  if (clientUpdateData?.Estado !== "Visita Confirmada") {
      console.warn(`[bookVisitProposal] Status reverted to ${clientUpdateData?.Estado}. Retrying force update...`)
      // Wait a moment
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const { data: retryData, error: retryError } = await supabase
        .from("Clientes")
        .update({ Estado: "Visita Confirmada" })
        .eq("id", lead.id)
        .select()
        .single()
      
      if (retryError) {
         console.error("[bookVisitProposal] Retry update failed:", retryError)
      } else {
         console.log(`[bookVisitProposal] Retry update result: ${retryData.Estado}`)
      }
  }

  try {
    console.log("[bookVisitProposal] Preparing confirmation webhook...")

      // Fetch additional data
      const { data: inmobiliaria } = await supabase
          .from("Inmobiliarias")
          .select("*")
          .eq("idi", proposal.inmobiliaria_id)
          .single()

      let advertisement = null
      // Check both potential column names for advertisement ID
      const adId = (proposal as any).anuncio_id || proposal.inmueble_id
      if (adId) {
          const { data: adData } = await supabase
              .from("Anuncios")
              .select("*")
              .eq("ida", adId)
              .single()
          advertisement = adData
      } else {
          // Fallback: Try to find Anuncio by Referencia (from proposal or lead)
      // This is critical for webhooks where Direccion is needed but ID might be missing
      const ref = (proposal.inmueble_ref || lead.Inmueble || "").trim()
      if (ref) {
         console.log(`[bookVisitProposal] Attempting to find Anuncio by Referencia: "${ref}"`)
         const { data: adData } = await supabase
              .from("Anuncios")
              .select("*")
              // Use ilike for case-insensitive matching and trim whitespace
              .ilike("Referencia", ref)
              .maybeSingle()
         
         if (adData) {
             console.log(`[bookVisitProposal] Found Anuncio by Referencia: ID ${adData.ida}`)
             advertisement = adData
         } else {
             console.log(`[bookVisitProposal] No Anuncio found for Referencia: "${ref}"`)
         }
      }
  }

  // Clean lead for payload
  const cleanLead = { ...lead }

  // Construct robust Inmueble object with fallbacks and Capitalized keys
  const inmuebleObj = advertisement 
    ? {
        ...advertisement,
        // Ensure Capitalized keys exist even if DB returns lowercase
        Direccion: advertisement.Direccion || advertisement.direccion || "",
        Referencia: advertisement.Referencia || advertisement.referencia || "",
        Id: advertisement.ida || advertisement.id
      }
    : {
        id: adId,
        Referencia: proposal.inmueble_ref || lead.Inmueble || "Sin Referencia",
        Direccion: proposal.inmueble_direccion || "",
        whatsapp_activo: null,
        // Duplicate keys for lowercase compatibility
        referencia: proposal.inmueble_ref || lead.Inmueble || "Sin Referencia",
        direccion: proposal.inmueble_direccion || ""
    }

      const payload = {
          proposal_id: proposal.id,
          link: `http://localhost:3000/oferta-visita/${proposal.id}`,
          visita: {
              fecha: visitDate.toISOString().split('T')[0],
              hora: visitDate.toTimeString().split(' ')[0].substring(0, 5), // HH:MM
              fecha_completa: visitDate.toISOString()
          },
          agente: fullAgentData,
          inmueble: inmuebleObj,
          // Add flattened fields for n8n compatibility
          "Fecha Visita": visitDate.toISOString().split('T')[0],
          "Hora Visita": visitDate.toTimeString().split(' ')[0].substring(0, 5),
          "Correo": lead.Correo || "no-email@example.com", // Fallback if missing
          "Nombre de lead": lead.Nombre,
          "Inmueble/Anuncio": inmuebleObj,
          inmobiliaria: inmobiliaria,
          // Ensure case compatibility if n8n expects capitalized
          Inmobiliaria: inmobiliaria,
          leads: [cleanLead]
      }

      const webhookUrl = "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/confirmacion_visita"
      console.log("[bookVisitProposal] Sending webhook to:", webhookUrl)

      const response = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
      })

      if (!response.ok) {
        console.error("[bookVisitProposal] Webhook failed with status:", response.status)
      } else {
        console.log("[bookVisitProposal] Webhook sent successfully.")
      }

  } catch (webhookErr) {
    console.error("[bookVisitProposal] Error preparing webhook:", webhookErr)
  }

  return { success: true, message: "Visita confirmada exitosamente.", leadName: lead?.Nombre || "" }
}

export async function getAvailableSlotsForProposal(
  dateStr: string, 
  agentId: number, 
  inmobiliariaId: number, 
  advertisementId?: string
) {
  const supabase = createAdminClient()

  if (!agentId) return []

  // 1. Fetch Agent's Agenda for this date
  const { data: rawAgendaItems, error: agendaError } = await supabase
    .from("Agendas")
    .select("*")
    .eq("agente_id", agentId)
    .eq("fecha", dateStr)

  if (agendaError) {
    console.error("Error fetching agenda:", agendaError)
    return []
  }
  
  // Filter agenda items: Keep generic slots OR slots assigned to this specific advertisement
  const agendaItems = rawAgendaItems?.filter(item => {
      if (!item.anuncio_id) return true // Generic slot
      if (!advertisementId) return false // If we don't know the target ad, we can't use a restricted slot safely (or maybe we should? conservative approach: hide restricted slots)
      return String(item.anuncio_id) === String(advertisementId)
  })

  if (!agendaItems || agendaItems.length === 0) {
    return []
  }

  // 2. Fetch Existing Visits for this date/agent (to check collisions)
  const startOfDay = `${dateStr}T00:00:00`
  const endOfDay = `${dateStr}T23:59:59`
  
  const { data: existingVisits, error: visitsError } = await supabase
    .from("Clientes")
    .select("fecha_de_visita, Inmueble, Estado")
    .eq("idag", agentId)
    .gte("fecha_de_visita", startOfDay)
    .lte("fecha_de_visita", endOfDay)
    
  if (visitsError) {
    console.error("Error fetching visits:", visitsError)
    return []
  }

  // 3. Fetch Advertisement details for duration/gap calculation
  // We need current ad details AND all ads details (to calculate duration of existing visits)
  
  let currentAdDuration = 20
  let currentAdGap = 5
  
  const { data: ads, error: adsError } = await supabase
    .from("Anuncios")
    .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas")
    .eq("usuario", inmobiliariaId)
    
  const allAds = (ads || []).map(a => ({
    ida: a.ida,
    Referencia: a.Referencia,
    Direccion: a.Direccion,
    duracion_visita: a.duracion_visita,
    tiempo_entre_visitas: a.tiempo_entre_visitas
  })) as AdData[]

  if (advertisementId) {
     const ad = allAds.find(a => String(a.ida) === String(advertisementId))
     if (ad) {
         currentAdDuration = Number(ad.duracion_visita) || 20
         currentAdGap = Number(ad.tiempo_entre_visitas) || 5
     }
  }

  // 4. Generate Candidates
  // Map agendaItems to AgendaSlot interface
  const slots: AgendaSlot[] = agendaItems.map(item => ({
    hora_inicio: item.hora_inicio,
    hora_fin: item.hora_fin,
    anuncio_id: item.anuncio_id,
    duracion: item.duracion,
    gap: item.gap
  }))

  const candidates = generateSlotCandidates(slots, allAds, currentAdDuration, currentAdGap)
  
  // 5. Filter Collisions
  const availableSlots = candidates.filter(candidate => {
    const [h, m] = candidate.time.split(":").map(Number)
    const slotStartMins = h * 60 + m
    const slotEndMins = slotStartMins + candidate.duration + candidate.gap // Include gap in collision check? usually yes.

    // Check against all existing visits
    const isOccupied = existingVisits?.some(visit => {
      if (!visit.fecha_de_visita) return false
      
      // Filter cancelled visits
      if (visit.Estado === "Cancelado" || visit.Estado === "Descartado") return false

      // If the visit is for the SAME property, do NOT block the slot! Group visits are allowed.
      let currentAd = null
      if (advertisementId) {
        currentAd = allAds.find(a => String(a.ida) === String(advertisementId))
      }
  
      if (currentAd && visit.Inmueble) {
        const isSameProperty = 
          visit.Inmueble === currentAd.Referencia || 
          (currentAd.Direccion && visit.Inmueble.includes(currentAd.Direccion)) ||
          (currentAd.Direccion && currentAd.Direccion.includes(visit.Inmueble))
        if (isSameProperty) return false
      }

      const vDate = new Date(visit.fecha_de_visita)
      
      // Parse the visit date in Madrid time to match the agenda local time
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Madrid',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      })
      const timeStr = formatter.format(vDate) // e.g. "24:00" -> "00:00" or "10:30"
      // Handle "24:00" which Intl sometimes returns
      const [vHStr, vMStr] = timeStr.split(':')
      const vH = parseInt(vHStr) === 24 ? 0 : parseInt(vHStr)
      const vM = parseInt(vMStr)
      
      const vStartMins = vH * 60 + vM
      
      // Calculate visit duration
      let vDuration = 20
      let vGap = 5
      
      if (visit.Inmueble) {
        const vAd = allAds.find(a => 
          (a.Referencia && a.Referencia === visit.Inmueble) || 
          (a.Direccion && a.Direccion.includes(visit.Inmueble)) ||
          (visit.Inmueble.includes(a.Direccion || "###"))
        )
        if (vAd) {
          vDuration = Number(vAd.duracion_visita) || 20
          vGap = Number(vAd.tiempo_entre_visitas) || 5
        }
      }
      
      const vEndMins = vStartMins + vDuration + vGap
      
      // Check overlap: Math.max(start1, start2) < Math.min(end1, end2)
      return Math.max(slotStartMins, vStartMins) < Math.min(slotEndMins, vEndMins)
    })

    return !isOccupied
  })

  return availableSlots.map(s => s.time)
}

export async function getAvailableDatesForProposal(
  agentId: number,
  _inmobiliariaId: number,
  advertisementId?: string,
  daysToLookAhead: number = 30
) {
  const supabase = createAdminClient()

  if (!agentId) return []

  const today = new Date()
  const endDate = new Date()
  endDate.setDate(today.getDate() + daysToLookAhead)

  const todayStr = today.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  // Query Agendas to find days with configuration
  let query = supabase
    .from("Agendas")
    .select("fecha, anuncio_id")
    .eq("agente_id", agentId)
    .gte("fecha", todayStr)
    .lte("fecha", endDateStr)

  const { data: agendaItems, error } = await query

  if (error) {
    console.error("Error fetching available dates:", error)
    return []
  }

  if (!agendaItems || agendaItems.length === 0) {
    return []
  }

  // Filter dates based on advertisement restrictions
  const validDates = new Set<string>()
  
  agendaItems.forEach(item => {
    // If the slot is specific to an ad, it must match our ad
    // If our ad is not provided, we might only see generic slots? 
    // Usually we always have an advertisementId in this context.
    
    if (item.anuncio_id) {
      if (advertisementId && String(item.anuncio_id) === String(advertisementId)) {
        validDates.add(item.fecha)
      }
    } else {
      // Generic slot, available for any ad (unless business logic says otherwise)
      validDates.add(item.fecha)
    }
  })

  // Sort dates
  return Array.from(validDates).sort()
}
