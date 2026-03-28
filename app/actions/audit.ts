"use server"

import { logAuditEvent, AuditCategory, ActionResult } from "@/lib/audit-logger"

export async function logClientEventAction(
    actionType: string,
    category: AuditCategory,
    actionResult: ActionResult,
    targetObject?: string,
    actorEmail?: string,
    actorId?: string,
    details?: any
) {
    await logAuditEvent({
        actorId,
        actorEmail,
        actionType,
        category,
        targetObject,
        actionResult,
        details
    })
}