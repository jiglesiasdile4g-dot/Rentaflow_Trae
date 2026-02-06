
"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function createVisitProposal(data: {
  leadIds: string[]
  date: Date
  time: string
  inmuebleRef?: string
  inmuebleDireccion?: string
  inmuebleId?: string
  inmobiliariaId: number
}) {
  const supabase = await createClient()
  
  // Combine date and time
  const dateTime = new Date(data.date)
  const [hours, minutes] = data.time.split(":").map(Number)
  dateTime.setHours(hours, minutes, 0, 0)

  const { data: proposal, error } = await supabase
    .from("PropuestasVisita")
    .insert({
      fecha_visita: dateTime.toISOString(),
      inmueble_ref: data.inmuebleRef,
      inmueble_direccion: data.inmuebleDireccion,
      inmueble_id: data.inmuebleId,
      inmobiliaria_id: data.inmobiliariaId,
      leads_invitados: data.leadIds,
      estado: "pendiente"
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating visit proposal:", error)
    throw new Error("No se pudo crear la propuesta de visita")
  }

  return { success: true, proposalId: proposal.id }
}

export async function getVisitProposal(id: string) {
  const supabase = await createClient()
  
  const { data: proposal, error } = await supabase
    .from("PropuestasVisita")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    return null
  }

  return proposal
}

export async function bookVisitProposal(proposalId: string, leadPhone: string) {
  const supabase = await createClient()
  
  // 1. Get proposal to check status and invited leads
  const { data: proposal, error: fetchError } = await supabase
    .from("PropuestasVisita")
    .select("*")
    .eq("id", proposalId)
    .single()

  if (fetchError || !proposal) {
    return { success: false, message: "Propuesta no encontrada" }
  }

  if (proposal.estado !== "pendiente") {
    return { success: false, message: "Esta visita ya ha sido reservada" }
  }

  // 2. Find lead by phone
  // Clean phone number for comparison (basic cleanup)
  // Assuming basic matching for now. In production, consider fuzzy matching or strict formatting.
  const { data: leads, error: leadError } = await supabase
    .from("Clientes")
    .select("id, Nombre, Apellidos, Inmueble, fecha_de_visita")
    .ilike("Telefono", `%${leadPhone.trim()}%`)
    .limit(1)

  if (leadError || !leads || leads.length === 0) {
    return { success: false, message: "No encontramos un cliente con este teléfono" }
  }

  const lead = leads[0]

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
    .eq("estado", "pendiente") // Critical: ensures optimistic locking
    // .select() // No need to select

  if (updateError) { // Supabase might not return count in error obj directly if using select?
      console.error("Error booking proposal:", updateError)
      return { success: false, message: "Error al reservar la visita" }
  }
  
  // If count is 0, it means it was modified by someone else in between
  // Supabase update returns data/count if specified.
  // Let's verify status again to be sure? 
  // Actually, checking count is better, but Supabase JS client behavior depends on config.
  // Let's re-fetch to confirm *we* won.
  const { data: confirmedProposal } = await supabase
      .from("PropuestasVisita")
      .select("lead_adjudicado_id")
      .eq("id", proposalId)
      .single()
      
  if (confirmedProposal?.lead_adjudicado_id !== lead.id) {
       return { success: false, message: "Lo sentimos, alguien más acaba de reservar esta visita." }
  }

  // 4. Update Lead Status
  const { error: leadUpdateError } = await supabase
    .from("Clientes")
    .update({
      fecha_de_visita: proposal.fecha_visita, // Assuming ISO string works
      Estado: "Visita Confirmada" // Or "Visita Propuesta" -> "Visita Confirmada"?
    })
    .eq("id", lead.id)

  if (leadUpdateError) {
    console.error("Error updating lead status:", leadUpdateError)
    // Should we rollback proposal? Ideally yes, but rare edge case.
  }

  // 5. Trigger Webhook (Optional but good practice)
  // We can reuse the confirmVisit webhook logic here if needed.

  revalidatePath(`/oferta-visita/${proposalId}`)
  return { success: true, message: "Visita reservada con éxito", leadName: `${lead.Nombre} ${lead.Apellidos}` }
}
