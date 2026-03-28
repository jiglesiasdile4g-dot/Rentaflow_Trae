import { createAdminClient } from "@/lib/supabase/admin"
import { headers } from "next/headers"

export type AuditCategory = 'AUTHENTICATION' | 'SENSITIVE_ACCESS' | 'OPERATIONAL' | 'ADMINISTRATION'
export type ActionResult = 'SUCCESS' | 'FAILURE'

interface AuditEventParams {
    actorId?: string
    actorEmail?: string
    actionType: string
    category: AuditCategory
    targetObject?: string
    actionResult: ActionResult
    details?: any
}

export async function logAuditEvent({
    actorId,
    actorEmail,
    actionType,
    category,
    targetObject,
    actionResult,
    details = {}
}: AuditEventParams) {
    try {
        const admin = createAdminClient()
        
        let ipAddress = null
        let userAgent = null
        try {
            const headersList = await headers()
            ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
            userAgent = headersList.get('user-agent')
        } catch (e) {
            // Context might not have headers
        }

        await admin.from("Audit_Logs").insert({
            actor_id: actorId,
            actor_email: actorEmail || 'system',
            action_type: actionType,
            category: category,
            target_object: targetObject,
            action_result: actionResult,
            ip_address: ipAddress,
            user_agent: userAgent,
            details: details
        })
    } catch (e) {
        console.error("Failed to insert audit log:", e)
    }
}
