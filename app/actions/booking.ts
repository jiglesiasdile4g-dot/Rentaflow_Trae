"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { getN8nWebhookUrl } from "@/lib/utils"

export async function getBookingData(leadId: string) {
  console.log("[Booking Action] getBookingData called with ID:", leadId)
  const supabase = createAdminClient()

  try {
    // 1. Fetch Lead
    console.log("[Booking Action] Querying Clientes table...")
    // Fetch all fields to ensure webhook has full context (Email, Phone, etc.)
    const { data: lead, error: leadError } = await supabase
      .from("Clientes")
      .select("*")
      .eq("id", leadId)
      .single()

    if (leadError) {
        console.error("[Booking Action] Supabase Error fetching lead:", leadError)
        return { error: `Error DB: ${leadError.message} (${leadError.code})` }
    }
    
    if (!lead) {
      console.error("[Booking Action] Lead not found (data is null)")
      return { error: "No se encontró el cliente (data null)." }
    }

    console.log("[Booking Action] Lead found:", lead.Nombre)

    if (!lead.idag) {
      return { error: "Este cliente no tiene un agente asignado." }
    }

    // 2. Fetch Agent Name, Email and Inmobiliaria ID
    const { data: agentRaw } = await supabase
      .from("Agentes")
      .select('Nombre, idag, idi, Email') // Use correct casing 'Nombre' and 'idag'
      .eq("idag", lead.idag) // Use 'idag' as PK
      .single()

    const agent = agentRaw ? {
      ...agentRaw,
      Nombre: agentRaw.Nombre
    } : null

    // 2.1 Fetch Inmobiliaria Data
    let inmobiliaria = null
    if (agentRaw && agentRaw.idi) {
        const { data: inmoData } = await supabase
            .from("Inmobiliarias")
            .select("*")
            .eq("idi", agentRaw.idi)
            .single()
        inmobiliaria = inmoData
    }

    // 3. Fetch Advertisement (Inmueble)
    let advertisement = null
    if (lead.Inmueble) {
      const { data: ads } = await supabase.from("Anuncios")
        .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, Activacion, whatsapp_activo, usuario")
      
      if (ads) {
        const leadInmuebleNorm = lead.Inmueble.trim().toLowerCase()
        advertisement = ads.find((a: any) => 
          (a.Referencia && a.Referencia.trim().toLowerCase() === leadInmuebleNorm) || 
          (a.Direccion && a.Direccion.trim().toLowerCase() === leadInmuebleNorm) || 
          (a.Direccion && leadInmuebleNorm.includes(a.Direccion.trim().toLowerCase()))
        ) || null
      }
      
      // Fallback: Try direct DB lookup if not found in cache (more robust)
      if (!advertisement && lead.Inmueble) {
          console.log("[Booking Action] Ad not found in cache, trying direct lookup for:", lead.Inmueble)
          // Try exact match first, then partial
          const { data: directAd } = await supabase
            .from("Anuncios")
            .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, Activacion, whatsapp_activo, usuario")
            .ilike("Referencia", `%${lead.Inmueble.trim()}%`)
            .maybeSingle()
          
          if (directAd) {
              console.log("[Booking Action] Found ad via direct lookup:", directAd.ida)
              advertisement = directAd
          }
      }
    }

    // Fallback: If Inmobiliaria not found via Agent, try via Advertisement
    if (!inmobiliaria && advertisement && advertisement.usuario) {
        console.log("[Booking Action] Inmobiliaria not found via Agent, trying via Advertisement (usuario):", advertisement.usuario)
        const { data: inmoData } = await supabase
            .from("Inmobiliarias")
            .select("*")
            .eq("idi", advertisement.usuario)
            .single()
        inmobiliaria = inmoData
    }

    // 4. Fetch Agent Agenda (Next 14 days)
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.setDate(today.getDate() + 14)).toISOString().split('T')[0]

    const { data: agenda } = await supabase
      .from("Agendas")
      .select("*")
      .eq("agente_id", lead.idag)
      .gte("fecha", startDate)
      .lte("fecha", endDate)

    // 5. Fetch Existing Visits (to avoid collision)
    const { data: existingVisits } = await supabase
      .from("Clientes")
      .select("fecha_de_visita, Inmueble, idag, Estado")
      .eq("idag", lead.idag)
      .not("fecha_de_visita", "is", null)
      .gte("fecha_de_visita", startDate)

    // 6. Fetch All Ads for Duration Logic (Optimization: Only fetch needed fields)
    const { data: allAds } = await supabase
      .from("Anuncios")
      .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, whatsapp_activo")

    return {
      lead,
      agent,
      inmobiliaria,
      advertisement,
      agenda: agenda || [],
      existingVisits: existingVisits || [],
      allAds: allAds || []
    }

  } catch (err: any) {
    console.error("Error in getBookingData:", err)
    return { error: "Error interno del servidor." }
  }
}

export async function confirmVisit(leadId: string, visitDate: string) {
  console.log("[Booking Action] confirmVisit called", { leadId, visitDate })
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("Clientes")
      .update({
        fecha_de_visita: visitDate,
        visita_completada: "visita confirmada", // Changed from "pendiente" to "visita confirmada"
        Estado: "Visita Confirmada"
      })
      .eq("id", leadId)
      .select()

    if (error) {
      console.error("[Booking Action] Update failed:", error)
      throw error
    }

    console.log("[Booking Action] Update success. Rows affected:", data?.length)
    
    if (!data || data.length === 0) {
        console.warn("[Booking Action] No rows updated. ID might be wrong or row missing.")
        return { error: "No se encontró el cliente para actualizar." }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error confirming visit:", err)
    return { error: "No se pudo agendar la visita." }
  }
}

export async function rescheduleVisit(leadId: string, newDate: string) {
    console.log("[Booking Action] rescheduleVisit called", { leadId, newDate })
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase
        .from("Clientes")
        .update({
        fecha_de_visita: newDate,
        visita_completada: "reprogramada",
        Estado: "Visita Confirmada"
      })
        .eq("id", leadId)
        .select()
  
      if (error) {
        console.error("[Booking Action] Update failed:", error)
        throw error
      }
  
      console.log("[Booking Action] Update success. Rows affected:", data?.length)
      
      if (!data || data.length === 0) {
          return { error: "No se encontró el cliente para actualizar." }
      }
  
      return { success: true }
    } catch (err: any) {
      console.error("Error rescheduling visit:", err)
      return { error: "No se pudo reprogramar la visita." }
    }
}

export async function proposeVisit(
  leadId: string,
  proposedDate: string,
  preferredShift?: string,
  agentId?: number | null,
  proposalMeta?: {
    inmobiliariaId?: number | null
    inmuebleRef?: string | null
    inmuebleDireccion?: string | null
    inmuebleId?: string | number | null
    message?: string | null
  }
) {
  console.log("[Booking Action] proposeVisit called", { leadId, proposedDate, preferredShift, agentId, proposalMeta })
  const supabase = createAdminClient()
  
  try {
    const shiftLabel = preferredShift ? preferredShift.toLowerCase() : ""
    const proposedStatus = shiftLabel ? `visita propuesta ${shiftLabel}` : "visita propuesta"
    const updatePayload: Record<string, any> = {
      fecha_de_visita: proposedDate,
      visita_completada: proposedStatus,
      Estado: "Visita Propuesta",
    }
    if (agentId) {
      updatePayload.idag = agentId
    }
    const { data, error } = await supabase
      .from("Clientes")
      .update(updatePayload)
      .eq("id", leadId)
      .select()

    if (error) {
      console.error("[Booking Action] Propose failed:", error)
      throw error
    }

    if (!data || data.length === 0) {
        return { error: "No se encontró el cliente para actualizar." }
    }

    try {
      const leadIdNumber = Number(leadId)
      const inmuebleIdValue = proposalMeta?.inmuebleId ? Number(proposalMeta.inmuebleId) : null
      const fechaValue = proposedDate.includes("T") ? proposedDate.split("T")[0] : proposedDate
      if (!Number.isNaN(leadIdNumber)) {
        const { data: proposalData, error: proposalError } = await supabase
          .from("propuesta_cliente")
          .insert({
            fecha: fechaValue,
            turno: preferredShift ?? null,
            inmobiliaria_idi: proposalMeta?.inmobiliariaId ?? null,
            lead_id: leadIdNumber,
            anuncio_id: inmuebleIdValue,
            agente_id: agentId ?? null,
            mensaje: proposalMeta?.message ?? null
          })
          .select()
          .single()
        if (proposalError) {
          throw proposalError
        }
        if (!proposalData) {
          return { error: "No se pudo guardar la propuesta del cliente." }
        }
      }
    } catch (proposalErr) {
      console.error("Error creating proposal record:", proposalErr)
      return { error: "No se pudo guardar la propuesta del cliente." }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error proposing visit:", err)
    return { error: "No se pudo proponer la visita." }
  }
}

export async function cancelVisit(leadId: string) {
    console.log("[Booking Action] cancelVisit called", { leadId })
    const supabase = createAdminClient()
    
    try {
      const { data, error } = await supabase
        .from("Clientes")
        .update({
          Estado: "Descartado",
          visita_completada: "cancelada",
          fecha_de_visita: null
        })
        .eq("id", leadId)
        .select()
  
      if (error) {
        console.error("[Booking Action] Cancel failed:", error)
        throw error
      }
  
      if (!data || data.length === 0) {
          return { error: "No se encontró el cliente para cancelar." }
      }

      try {
        const webhookUrl = getN8nWebhookUrl("descartado")
        if (!webhookUrl) {
          return { success: true }
        }
        await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId,
            Estado: "Descartado",
            lead: data[0] ?? null,
            source: "cancelVisit",
            timestamp: new Date().toISOString()
          })
        })
      } catch (webhookErr) {
        console.error("[Booking Action] Error calling descartado webhook:", webhookErr)
      }
  
      return { success: true }
    } catch (err: any) {
      console.error("Error canceling visit:", err)
      return { error: "No se pudo cancelar la visita." }
    }
}

export async function cancelVisitByAgent(leadId: string | number) {
  console.log("[Booking Action] cancelVisitByAgent called", { leadId })
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("Clientes")
      .update({
        visita_completada: "cancelada",
        fecha_de_visita: null,
        Estado: "Aceptado"
      })
      .eq("id", leadId)
      .select()

    if (error) {
      console.error("[Booking Action] Agent cancel failed:", error)
      throw error
    }

    if (!data || data.length === 0) {
      return { error: "No se encontró el cliente para cancelar." }
    }

    return { success: true }
  } catch (err: any) {
    console.error("Error canceling visit by agent:", err)
    return { error: "No se pudo cancelar la visita." }
  }
}
