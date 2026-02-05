"use server"

import { createAdminClient } from "@/lib/supabase/admin"

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
        .select("ida, Referencia, Direccion, Duracion_visita, Gap_visita, duracion_visita, tiempo_entre_visitas, Activacion")
      
      if (ads) {
        advertisement = ads.find((a: any) => 
          (a.Referencia && lead.Inmueble && a.Referencia.trim() === lead.Inmueble.trim()) || 
          (a.Direccion && lead.Inmueble && a.Direccion.trim() === lead.Inmueble.trim()) || 
          (lead.Inmueble && a.Direccion && lead.Inmueble.includes(a.Direccion))
        ) || null
      }
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
      .select("fecha_de_visita, Inmueble, idag")
      .not("fecha_de_visita", "is", null)
      .gte("fecha_de_visita", startDate)

    // 6. Fetch All Ads for Duration Logic (Optimization: Only fetch needed fields)
    const { data: allAds } = await supabase
      .from("Anuncios")
      .select("ida, Referencia, Direccion, Duracion_visita, Gap_visita, duracion_visita, tiempo_entre_visitas")

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
        visita_completada: "pendiente",
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

export async function proposeVisit(leadId: string, proposedDate: string) {
  console.log("[Booking Action] proposeVisit called", { leadId, proposedDate })
  const supabase = createAdminClient()
  
  try {
    const { data, error } = await supabase
      .from("Clientes")
      .update({
        fecha_de_visita: proposedDate,
        visita_completada: "visita propuesta"
      })
      .eq("id", leadId)
      .select()

    if (error) {
      console.error("[Booking Action] Propose failed:", error)
      throw error
    }

    if (!data || data.length === 0) {
        return { error: "No se encontró el cliente para actualizar." }
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
        await fetch("https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/descartado", {
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
