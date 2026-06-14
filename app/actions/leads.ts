"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { revalidatePath } from "next/cache"
import { logAuditEvent } from "@/lib/audit-logger"

async function getLeadActionContext() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: "No autenticado" as const }
  }

  const { data: profile, error: profileError } = await supabase
    .from("Perfiles")
    .select("role")
    .eq("usuario", user.email)
    .single()

  if (profileError) {
    console.error("Error fetching profile:", profileError)
    return { error: "Error al verificar permisos" as const }
  }

  if (profile?.role === "agente") {
    return { error: "No tienes permisos para gestionar leads" as const }
  }

  return { supabase, user, profile }
}

function appendMergeNote(existingValue: any, note: string) {
  const current = String(existingValue || "").trim()
  return current ? `${current}\n\n${note}` : note
}

export async function createLeadAction(leadData: any) {
  const context = await getLeadActionContext()
  if ("error" in context) {
    return { error: context.error }
  }

  const { supabase, user } = context

  const { data, error } = await supabase.from("Clientes").insert([leadData]).select()

  if (error) {
    console.error("Error creating lead:", error)
    return { error: error.message }
  }

  if (data && data[0]) {
    await logAuditEvent({
        actorId: user.id,
        actorEmail: user.email,
        actionType: "CREATE_LEAD",
        category: "OPERATIONAL",
        targetObject: `Lead ${data[0].id}`,
        actionResult: "SUCCESS",
        details: { 
            leadId: data[0].id, 
            nombre: data[0].Nombre,
            inmobiliaria: leadData.usuario 
        }
    })
  }

  revalidatePath("/dashboard/leads")
  return { data }
}

export async function mergeLeadsAction({
  mergedLeadData,
  sourceLeadIds,
}: {
  mergedLeadData: any
  sourceLeadIds: Array<string | number>
}) {
  const context = await getLeadActionContext()
  if ("error" in context) {
    return { error: context.error }
  }

  const { supabase, user } = context
  const uniqueSourceLeadIds = [...new Set((sourceLeadIds || []).map((id) => String(id).trim()).filter(Boolean))]
  const normalizedSourceLeadIds = uniqueSourceLeadIds.map((id) => {
    const numericId = Number(id)
    return Number.isFinite(numericId) && id !== "" ? numericId : id
  })
  const admin = createAdminClient()

  if (uniqueSourceLeadIds.length < 2) {
    return { error: "Selecciona al menos 2 leads para fusionar" }
  }

  const { data: sourceLeads, error: sourceError } = await admin
    .from("Clientes")
    .select("id, Nombre, Estado, usuario, status_history, Obsevaciones")
    .in("id", normalizedSourceLeadIds as any[])

  if (sourceError) {
    console.error("Error fetching source leads for merge:", sourceError)
    return { error: sourceError.message || "No se pudieron cargar los leads a fusionar" }
  }

  if (!sourceLeads || sourceLeads.length !== uniqueSourceLeadIds.length) {
    return { error: "No se encontraron todos los leads seleccionados para fusionar" }
  }

  const fallbackUsuario = sourceLeads.find((lead: any) => lead?.usuario != null)?.usuario ?? null
  const targetLeadId = normalizedSourceLeadIds[0]
  const targetLead = sourceLeads.find((lead: any) => String(lead.id) === String(targetLeadId))
  const finalMergedLeadData =
    mergedLeadData && typeof mergedLeadData === "object"
      ? {
          ...mergedLeadData,
          usuario: mergedLeadData?.usuario ?? fallbackUsuario,
        }
      : mergedLeadData

  if (!finalMergedLeadData?.usuario) {
    return { error: "No se pudo determinar la inmobiliaria del lead fusionado" }
  }

  if (!targetLeadId || !targetLead) {
    return { error: "No se pudo determinar el lead destino para la fusion" }
  }

  const currentTargetHistory = Array.isArray(targetLead?.status_history) ? targetLead.status_history : []
  const incomingHistory = Array.isArray(finalMergedLeadData?.status_history) ? finalMergedLeadData.status_history : []
  const mergedHistory = [...currentTargetHistory]
  incomingHistory.forEach((entry: any) => {
    const key = JSON.stringify(entry)
    if (!mergedHistory.some((current: any) => JSON.stringify(current) === key)) {
      mergedHistory.push(entry)
    }
  })

  const mergeSummaryNote = `Lead fusionado a partir de: ${uniqueSourceLeadIds.join(", ")}.`
  const mergedObservaciones = appendMergeNote(finalMergedLeadData?.Obsevaciones, mergeSummaryNote)

  const targetLeadUpdate = {
    ...finalMergedLeadData,
    Obsevaciones: mergedObservaciones,
    status_history: mergedHistory,
  }

  delete (targetLeadUpdate as any).id
  delete (targetLeadUpdate as any).IDC
  delete (targetLeadUpdate as any).created_at

  const { data: updatedLead, error: createError } = await admin
    .from("Clientes")
    .update(targetLeadUpdate)
    .eq("id", targetLeadId)
    .select()
    .single()

  if (createError) {
    console.error("Error updating merged target lead:", createError)
    return { error: createError.message || "No se pudo consolidar el lead fusionado" }
  }

  let createdLead = updatedLead

  const timestamp = new Date().toISOString()
  const mergeNote = `Fusionado en el lead #${createdLead.id} el ${timestamp}.`

  const updateResults = await Promise.all(
    sourceLeads
      .filter((lead: any) => String(lead.id) !== String(targetLeadId))
      .map(async (lead: any) => {
      const currentHistory = Array.isArray(lead?.status_history) ? lead.status_history : []
      const mergedObservaciones = appendMergeNote(lead?.Obsevaciones, mergeNote)
      const discardHistoryEntry = {
        status: "Descartado",
        timestamp,
        agent_id: user.id,
        agent_name: user.email,
        source: "merge",
        reason: "merge",
      }

      const { error } = await admin
        .from("Clientes")
        .update({
          Estado: "Descartado",
          Obsevaciones: mergedObservaciones,
          status_history: [...currentHistory, discardHistoryEntry],
        })
        .eq("id", lead.id)

      return { id: String(lead.id), error }
      }),
  )

  const failedSourceUpdates = updateResults.filter((result) => result.error)

  await logAuditEvent({
    actorId: user.id,
    actorEmail: user.email,
    actionType: "MERGE_LEADS",
    category: "OPERATIONAL",
    targetObject: `Lead ${createdLead.id}`,
    actionResult: failedSourceUpdates.length > 0 ? "FAILURE" : "SUCCESS",
    details: {
      mergedLeadId: createdLead.id,
      sourceLeadIds: uniqueSourceLeadIds,
      failedSourceLeadIds: failedSourceUpdates.map((item) => item.id),
      nombre: createdLead.Nombre,
      inmobiliaria: finalMergedLeadData?.usuario ?? null,
    },
  })

  revalidatePath("/dashboard/leads")

  if (failedSourceUpdates.length > 0) {
    return {
      data: createdLead,
      warning: `La fusion se guardó en el lead #${createdLead.id}, pero ${failedSourceUpdates.length} lead(s) origen no pudieron marcarse como descartados.`,
      failedSourceLeadIds: failedSourceUpdates.map((item) => item.id),
    }
  }

  return { data: createdLead }
}
