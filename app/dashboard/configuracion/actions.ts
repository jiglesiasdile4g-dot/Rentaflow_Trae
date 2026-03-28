"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getPlanData } from "@/lib/plan-data"
import { formatWebhookDate } from "@/lib/utils"
import { logAuditEvent } from "@/lib/audit-logger"

async function logAuditAction(admin: any, actionType: string, targetEmail: string, details: any = {}) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        await logAuditEvent({
            actorId: user?.id,
            actorEmail: user?.email || "system",
            actionType: actionType,
            category: 'ADMINISTRATION',
            targetObject: targetEmail,
            actionResult: 'SUCCESS',
            details: details
        })
    } catch (e) {
        console.error("Failed to log audit action:", e)
    }
}

function getLocalDateString(date = new Date()) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, "0")
    const d = String(date.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
}

function getDayRangeIso(dateStr: string) {
    const start = new Date(`${dateStr}T00:00:00`)
    const end = new Date(`${dateStr}T23:59:59.999`)
    return { startIso: start.toISOString(), endIso: end.toISOString() }
}

// Helper to find profile and correct column names
async function findProfileAndColumns(admin: any, email: string, idi: number) {
    const whereVariants = [
        { u: 'usuario', i: 'inmobiliaria' },
        { u: 'usuario', i: 'Inmobiliaria' },
        { u: 'Usuario', i: 'inmobiliaria' },
        { u: 'Usuario', i: 'Inmobiliaria' },
    ]
    
    for (const v of whereVariants) {
        // Try to find the record
        try {
            const { data, error } = await admin
                .from("Perfiles")
                .select("*")
                .eq(v.u, email)
                .eq(v.i, idi)
                .limit(1)
            
            if (!error && data && data.length > 0) {
                return { 
                    profile: data[0], 
                    whereUser: v.u, 
                    whereInm: v.i,
                    columns: v // Pass the found column names
                }
            }
        } catch (e) {
            // Ignore errors (like column not found) and try next variant
        }
    }
    return null
}

export async function triggerVisitReminderAction() {
    const supabase = await createClient()
    const admin = createAdminClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
        redirect(`/dashboard/configuracion?reminder=error&rmsg=${encodeURIComponent("Usuario no autenticado")}`)
    }
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isAdmin = perfil?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
    if (!isAdmin) {
        redirect(`/dashboard/configuracion?reminder=error&rmsg=${encodeURIComponent("Sin permisos para ejecutar el recordatorio")}`)
    }
    const dateStr = getLocalDateString()
    const { startIso, endIso } = getDayRangeIso(dateStr)
    const { data: visits, error } = await admin
        .from("Clientes")
        .select("id, IDC, Nombre, Correo, Telefono, Obsevaciones, Inmueble, fecha_de_visita, idag, usuario, correo_proxy")
        .not("fecha_de_visita", "is", null)
        .gte("fecha_de_visita", startIso)
        .lte("fecha_de_visita", endIso)
    if (error) {
        redirect(`/dashboard/configuracion?reminder=error&rmsg=${encodeURIComponent(error.message || "Error consultando visitas")}`)
    }
    const webhookUrl =
        process.env.RECORDATORIO_VISITA_WEBHOOK_URL ||
        "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/recordatorio_visita_agente"
    const idags = Array.from(
        new Set((visits || []).map((v: any) => v?.idag).filter((v: any) => v !== null && v !== undefined))
    )
    let agentsByIdag = new Map<number, any>()
    if (idags.length > 0) {
        const { data: agents } = await admin
            .from("Agentes")
            .select("idag, Nombre, Email, Telefono")
            .in("idag", idags)
        if (agents) {
            agentsByIdag = new Map(agents.map((a: any) => [a.idag, a]))
        }
    }
    const inmoIds = Array.from(
        new Set(
            (visits || [])
                .map((v: any) => v?.usuario)
                .filter((v: any) => v !== null && v !== undefined)
                .map((v: any) => String(v))
        )
    )
    let adsByInmo = new Map<string, any[]>()
    if (inmoIds.length > 0) {
        const { data: ads } = await admin
            .from("Anuncios")
            .select("ida, Referencia, Direccion, usuario, Activacion")
            .in("usuario", inmoIds)
            .eq("Activacion", "Activo")
        if (ads) {
            for (const ad of ads) {
                const key = String(ad.usuario)
                const list = adsByInmo.get(key) || []
                list.push(ad)
                adsByInmo.set(key, list)
            }
        }
    }
    let inmoById = new Map<string, any>()
    if (inmoIds.length > 0) {
        const { data: inmobiliarias } = await admin
            .from("Inmobiliarias")
            .select("idi, Nombre, \"Mail sistema\"")
            .in("idi", inmoIds)
        if (inmobiliarias) {
            for (const inmo of inmobiliarias) {
                const key = String(inmo.idi)
                inmoById.set(key, inmo)
            }
        }
    }
    function matchAdForLead(lead: any) {
        const key = String(lead?.usuario ?? "")
        const list = adsByInmo.get(key) || []
        const inm = (lead?.Inmueble || "").trim()
        if (!inm || list.length === 0) return null
        return (
            list.find((a: any) => a.Referencia && a.Referencia.trim() === inm) ||
            list.find((a: any) => a.Direccion && a.Direccion.trim() === inm) ||
            list.find((a: any) => a.Direccion && inm.includes(a.Direccion))
        ) || null
    }
    const grouped = new Map<string, any>()
    for (const lead of visits || []) {
        const notes = lead?.Obsevaciones ?? ""
        const leadMail = lead?.Correo ?? lead?.correo_proxy ?? ""
        const leadPhone = lead?.Telefono ?? ""
        const leadId = lead?.id ?? lead?.IDC ?? null
        const { date, time } = formatWebhookDate(lead?.fecha_de_visita)
        const agent = agentsByIdag.get(lead?.idag)
        const ad = matchAdForLead(lead)
        const inmoKey = String(lead?.usuario ?? "")
        const inmo = inmoById.get(inmoKey)
        const inmoMailSistema = inmo?.["Mail sistema"] ?? null
        const agentKey = String(lead?.idag ?? "sin_agente")
        if (!grouped.has(agentKey)) {
            grouped.set(agentKey, {
                Agente: {
                    Nombre: agent?.Nombre ?? "",
                    Idag: agent?.idag ?? lead?.idag ?? null,
                    Mail: agent?.Email ?? "",
                    telefono: agent?.Telefono ?? "",
                },
                Visitas: [],
            })
        }
        grouped.get(agentKey).Visitas.push({
            Lead: {
                Nombre: lead?.Nombre ?? "",
                Id: leadId,
                Mail: leadMail,
                Telefono: leadPhone,
                Notas: notes,
            },
            Inmueble: {
                Referencia: ad?.Referencia ?? lead?.Inmueble ?? "",
                Direccion: ad?.Direccion ?? "",
            },
            Inmobiliaria: {
                Nombre: inmo?.Nombre ?? null,
                MailSistema: inmoMailSistema,
                Idi: inmo?.idi ?? (Number(inmoKey) || null),
            },
            Visita: {
                Fecha: date,
                Hora: time,
            },
        })
    }
    const payload = Array.from(grouped.values())
    let ok = false
    try {
        const res = await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(15000),
        })
        ok = res.ok
    } catch {
        ok = false
    }
    revalidatePath("/dashboard/configuracion")
    redirect(
        `/dashboard/configuracion?reminder=${ok ? "success" : "error"}&rmsg=${encodeURIComponent(
            ok ? "Webhook ejecutado correctamente" : "Error ejecutando el webhook"
        )}`
    )
}

export async function createInmobiliariaAction(formData: FormData) {
    const supabase = await createClient()
    const admin = createAdminClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Usuario no autenticado")}`)
    }
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isAdmin = perfil?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
    if (!isAdmin) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Sin permisos para crear inmobiliarias")}`)
    }
    const nombre = String(formData.get("Nombre") || "").trim()
    const direccion = String(formData.get("Direccion") || "").trim()
    const telefono = String(formData.get("Telefono") || "").trim()
    const mailContacto = String(formData.get("Mail contacto") || "").trim()
    const mailSistema = String(formData.get("Mail sistema") || "").trim()
    const whatsappEmpresa = String(formData.get("Whatsapp_empresa") || "").trim()
    const personaContacto = String(formData.get("Persona de Contacto") || "").trim()
    const planRaw = String(formData.get("Plan") || "").trim()
    const planResetRaw = String(formData.get("PlanResetAt") || "").trim()
    const planNextRaw = String(formData.get("PlanNext") || "").trim()
    const planNextAtRaw = String(formData.get("PlanNextEffectiveAt") || "").trim()
    const whatsappActivo = formData.get("whatsapp_activo") != null
    const inmobiliariaAct = String(formData.get("inmobiliaria_act") || "").trim()
    const firmaHtml = String(formData.get("firma_html") || "").trim()
    const paginaWeb = String(formData.get("pagina_web") || "").trim()
    const logoUrl = String(formData.get("logo_url") || "").trim()
    const colorPrimario = String(formData.get("color_primario") || "").trim()
    const colorSecundario = String(formData.get("color_secundario") || "").trim()
    if (!nombre) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Falta el nombre")}`)
    }
    const payload: Record<string, any> = { Nombre: nombre }
    if (direccion) payload.Direccion = direccion
    if (telefono) payload.Telefono = telefono
    if (mailContacto) payload["Mail contacto"] = mailContacto
    if (mailSistema) payload["Mail sistema"] = mailSistema
    if (whatsappEmpresa) payload.Whatsapp_empresa = whatsappEmpresa
    if (personaContacto) payload["Persona de Contacto"] = personaContacto
    if (paginaWeb) payload.pagina_web = paginaWeb
    if (logoUrl) payload.logo_url = logoUrl
    if (colorPrimario) payload.color_primario = colorPrimario
    if (colorSecundario) payload.color_secundario = colorSecundario
    if (firmaHtml) payload.firma_html = firmaHtml
    if (inmobiliariaAct) payload.inmobiliaria_act = inmobiliariaAct
    payload.whatsapp_activo = whatsappActivo
    if (planRaw) {
        const planNum = Number(planRaw)
        if (Number.isFinite(planNum)) payload.Plan = planNum
    }
    if (planNextRaw) {
        const planNextNum = Number(planNextRaw)
        if (Number.isFinite(planNextNum)) payload.PlanNext = planNextNum
    }
    if (planResetRaw) {
        const date = new Date(planResetRaw)
        if (!Number.isNaN(date.getTime())) payload.PlanResetAt = date.toISOString()
    }
    if (planNextAtRaw) {
        const date = new Date(planNextAtRaw)
        if (!Number.isNaN(date.getTime())) payload.PlanNextEffectiveAt = date.toISOString()
    }
    const { error } = await admin.from("Inmobiliarias").insert(payload)
    if (error) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(error.message || "Error creando inmobiliaria")}`)
    }
    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?inmo=success&imsg=${encodeURIComponent("Inmobiliaria creada")}`)
}

async function ensureAgentRecord(admin: any, email: string, idi: number, role: string, shouldCreate: boolean) {
    // Check if agent record exists
    const { data: existing, error } = await admin
        .from("Agentes")
        .select("*")
        .ilike("Email", email)
        .eq("idi", idi)
        .maybeSingle()
    
    if (shouldCreate) {
        if (!existing) {
            // Create agent
            // Get name from profile if available
            const found = await findProfileAndColumns(admin, email, idi)
            const name = found?.profile?.Nombre || found?.profile?.nombre || email.split('@')[0]
            
            await admin.from("Agentes").insert({
                Nombre: name,
                Email: email,
                idi: idi,
                Telefono: found?.profile?.Telefono || found?.profile?.telefono || 0
            })
        }
    } else {
        // If not creating, usually we leave it alone unless we want to enforce removal for non-agents?
        // Current logic in toggleAgentFunctionsAction handles explicit removal.
        // Here we just ensure consistency if needed.
    }
}

export async function createAgentAction(formData: FormData) {
    const supabase = await createClient()
    const admin = createAdminClient()
    
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("newEmail")).toLowerCase().trim()
    const name = String(formData.get("newName") || "").trim() || email.split('@')[0]
    const phone = String(formData.get("newPhone") || "").trim()

    if (!email || !email.includes("@")) {
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent("Email inválido")}`)
    }

    try {
        // 1. Invite user via Supabase Auth
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/update-password")}`
        
        console.log(`[createAgentAction] Inviting ${email} to idi ${idi}`)

        const { data: authData, error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectUrl
        })

        if (authError) {
            console.error("Error inviting user:", authError)
            throw new Error(authError.message)
        }

        console.log("[createAgentAction] Invite sent successfully")

        // 2. Create profile entry if not exists
        const found = await findProfileAndColumns(admin, email, idi)
        
        if (!found) {
            console.log("[createAgentAction] Profile not found. Creating manual profile...")
            
            // Try inserting with lowercase first (standard)
            const { error: insertError } = await admin.from("Perfiles").insert({
                usuario: email,
                inmobiliaria: idi,
                role: "agente",
                is_admin: false,
                es_agente: true,
                nombre: name, // Use provided name
                telefono: phone // Use provided phone
            })
            
            if (insertError) {
                console.error("[createAgentAction] Error creating profile (lowercase):", insertError)
                
                // Fallback: Try Capitalized if the error suggests column issues
                if (insertError.code === '42703') { // Undefined column
                     console.log("[createAgentAction] Retrying with capitalized columns...")
                     const { error: insertError2 } = await admin.from("Perfiles").insert({
                        Usuario: email,
                        Inmobiliaria: idi,
                        Role: "agente",
                        Is_admin: false,
                        Es_agente: true,
                        Nombre: name,
                        Telefono: phone
                    })
                    
                    if (insertError2) {
                         console.error("[createAgentAction] Error creating profile (Capitalized):", insertError2)
                         throw new Error("No se pudo crear el perfil del usuario (DB Error)")
                    } else {
                        console.log("[createAgentAction] Profile created with capitalized columns")
                    }
                } else {
                     throw new Error(`Error al crear perfil: ${insertError.message}`)
                }
            } else {
                console.log("[createAgentAction] Profile created successfully")
            }
        } else {
            console.log("[createAgentAction] Profile already exists")
        }

        // 3. Create Agent record
        await ensureAgentRecord(admin, email, idi, "agente", true)

        await logAuditAction(admin, "CREATE_USER", email, { idi, role: "agente" })

    } catch (error: any) {
        console.error("Create agent error:", error)
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(error.message || "Error al invitar usuario")}`)
    }

    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?createUser=success&msg=${encodeURIComponent("Invitación enviada correctamente")}`)
}

export async function deleteAgentAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))

    try {
        // Delete from Auth (optional, depends on policy. Maybe just deactivate?)
        // For now, let's just remove from Perfiles and Agentes?
        // Or better, just delete from Perfiles. Auth user remains but has no access?
        
        // Actually, deleting from Auth is cleaner for "Delete".
        const { data: { users }, error: userError } = await admin.auth.admin.listUsers()
        const user = users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase())
        
        if (user) {
            await admin.auth.admin.deleteUser(user.id)
        }

        // Delete from Perfiles
        const found = await findProfileAndColumns(admin, email, idi)
        if (found) {
            const idField = found.profile.id ? "id" : "idp"
            await admin
                .from("Perfiles")
                .delete()
                .eq(idField, found.profile[idField])
        }

        // Delete from Agentes
        await admin.from("Agentes").delete().ilike("Email", email).eq("idi", idi)

        await logAuditAction(admin, "DELETE_USER", email, { idi })

    } catch (e: any) {
        console.error("Error deleting user:", e)
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e.message)}`)
    }

    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Usuario eliminado")}`)
}

export async function toggleActiveAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))

    const found = await findProfileAndColumns(admin, email, idi)
    if (!found) return

    // Determine correct active column (es_agente) and id field
    const activeCol = found.columns.u === 'Usuario' ? 'Es_agente' : 'es_agente'
    const idField = found.profile.id ? "id" : "idp"
    
    const currentActive = found.profile[activeCol] !== false // Default true if null/undefined
    const newActive = !currentActive

    await admin
        .from("Perfiles")
        .update({ [activeCol]: newActive })
        .eq(idField, found.profile[idField])

    await logAuditAction(admin, "TOGGLE_ACTIVE", email, { idi, active: newActive })

    revalidatePath("/dashboard/configuracion")
}

export async function updateSignatureAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const firma_html = String(formData.get("firma_html"))

    if (!idi) return

    try {
        await admin
            .from("Inmobiliarias")
            .update({ firma_html })
            .eq("idi", idi)

        revalidatePath("/dashboard/configuracion")
    } catch (e: any) {
        console.error("Error updating signature:", e)
        throw new Error("No se pudo actualizar la firma")
    }
}

export async function toggleRoleAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))
    const targetRole = String(formData.get("role")) // 'admin' | 'supervisor' | 'agente'

    const found = await findProfileAndColumns(admin, email, idi)
    if (!found) return

    const updates: any = {}
    if (targetRole === 'admin') {
        updates.is_admin = true
        updates.role = 'admin'
    } else {
        updates.is_admin = false
        updates.role = targetRole
    }

    // Handle case sensitivity for columns if needed, but Perfiles seems standard mostly
    const idField = found.profile.id ? "id" : "idp"
    await admin
        .from("Perfiles")
        .update(updates)
        .eq(idField, found.profile[idField])

    await logAuditAction(admin, "CHANGE_ROLE", email, { idi, new_role: targetRole })

    revalidatePath("/dashboard/configuracion")
}

export async function resendUserConfirmationAction(formData: FormData) {
    const admin = createAdminClient()
    const email = String(formData.get("email"))
    
    try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/update-password")}`
        
        console.log(`[resendUserConfirmationAction] Processing for ${email}`)

        // Intentar invitar primero (funciona si no existe o si existe pero no está confirmado)
        const { data, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: redirectUrl })

        if (inviteError) {
            // Si falla, verificar si es porque ya está registrado (y confirmado)
            // El mensaje de error típico es "User already registered" o código 422/400
            console.log(`[resendUserConfirmationAction] Invite failed: ${inviteError.message}. Trying password reset...`)
            
            // Intentar reset password (está en admin.auth, NO en admin.auth.admin)
            const { error: resetError } = await admin.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
            
            if (resetError) {
                console.error("[resendUserConfirmationAction] Reset password also failed:", resetError)
                throw new Error(resetError.message || "No se pudo enviar el correo")
            } else {
                console.log("[resendUserConfirmationAction] Reset password sent successfully")
            }
        } else {
            console.log("[resendUserConfirmationAction] Invite sent successfully")
        }

        revalidatePath("/dashboard/configuracion")
        return { success: true }
    } catch (error: any) {
        console.error("[resendUserConfirmationAction] Error:", error)
        return { error: error.message || "Error al reenviar enlace" }
    }
}

export async function updateWebsiteAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const website = formData.get("website") as string

    console.log(`[updateWebsiteAction] Updating website for idi: ${idi}, website: '${website}'`)

    if (!idi) {
        console.error("[updateWebsiteAction] Missing IDI")
        return
    }

    try {
        const { error } = await admin
            .from("Inmobiliarias")
            .update({ pagina_web: website })
            .eq("idi", idi)

        if (error) {
            console.error("[updateWebsiteAction] DB Error:", error)
            throw new Error(error.message)
        }

        console.log("[updateWebsiteAction] Success")
        revalidatePath("/dashboard/configuracion")
        return { success: true }
    } catch (e: any) {
        console.error("[updateWebsiteAction] Exception:", e)
        throw new Error("No se pudo actualizar la página web")
    }
}

export async function toggleAgentFunctionsAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))
    const enable = formData.get("enable") === "true"

    if (enable) {
        // Create agent record
        // First get name from profile or metadata? Or just use email part
        const found = await findProfileAndColumns(admin, email, idi)
        const name = found?.profile?.Nombre || found?.profile?.nombre || email.split('@')[0]
        
        // Check if exists
        const { data: existing } = await admin.from("Agentes").select("idag").ilike("Email", email).eq("idi", idi).maybeSingle()
        if (!existing) {
            await admin.from("Agentes").insert({
                Nombre: name,
                Email: email,
                idi: idi,
                Telefono: found?.profile?.Telefono || found?.profile?.telefono || 0
            })
            await logAuditAction(admin, "ENABLE_AGENT_FUNCTIONS", email, { idi })
        }
    } else {
        // Remove agent record
        await admin.from("Agentes").delete().ilike("Email", email).eq("idi", idi)
        await logAuditAction(admin, "DISABLE_AGENT_FUNCTIONS", email, { idi })
    }
    
    revalidatePath("/dashboard/configuracion")
}

export async function updateUserDetailsAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))
    const name = String(formData.get("name"))
    const phone = String(formData.get("phone"))

    console.log(`[updateUserDetailsAction] Inicio actualización para ${email} (idi: ${idi}). Nombre: ${name}, Tel: ${phone}`)

    const found = await findProfileAndColumns(admin, email, idi)
    if (!found) {
        console.error(`[updateUserDetailsAction] Perfil no encontrado para ${email}`)
        return
    }

    const p = found.profile
    console.log(`[updateUserDetailsAction] Perfil encontrado. Keys:`, Object.keys(p))

    // Determine correct ID field
    const idField = p.id ? "id" : "idp"
    console.log(`[updateUserDetailsAction] Using ID field: ${idField} = ${p[idField]}`)

    // Update Perfiles
    // Intentaremos ser exhaustivos: actualizaremos tanto camelCase como PascalCase si existen,
    // o forzaremos 'nombre'/'telefono' (minúsculas) que es lo estándar post-migración.
    
    const updates: any = {}
    
    // Lógica más agresiva: si la clave existe, úsala. Si no, usa minúscula por defecto.
    // PERO también envía la otra variante si existe en el objeto (por si acaso hay duplicidad rara).
    
    let nombreKey = 'nombre'
    if ('Nombre' in p) nombreKey = 'Nombre'
    if ('nombre' in p) nombreKey = 'nombre' // Preferencia a minúscula si existe
    
    let telefonoKey = 'telefono'
    if ('Telefono' in p) telefonoKey = 'Telefono'
    if ('telefono' in p) telefonoKey = 'telefono' // Preferencia a minúscula si existe

    updates[nombreKey] = name
    updates[telefonoKey] = phone
    
    console.log(`[updateUserDetailsAction] Intentando update en Perfiles:`, updates)

    try {
        const { error, data } = await admin
            .from("Perfiles")
            .update(updates)
            .eq(idField, p[idField])
            .select() // Select para confirmar que devolvió algo

        if (error) {
            console.error(`[updateUserDetailsAction] Error en primer intento update:`, error)
            
            // Si falla y usamos minúscula, probamos mayúscula, o viceversa?
            // El error 42703 (undefined column) es clave.
            if (error.code === '42703') {
                console.warn(`[updateUserDetailsAction] Columna no encontrada. Reintentando con variantes...`)
                // Intento alternativo "ciego"
                const altUpdates: any = {}
                if (nombreKey === 'nombre') altUpdates['Nombre'] = name
                else altUpdates['nombre'] = name
                
                if (telefonoKey === 'telefono') altUpdates['Telefono'] = phone
                else altUpdates['telefono'] = phone
                
                console.log(`[updateUserDetailsAction] Reintentando con:`, altUpdates)
                
                const { error: error2 } = await admin
                    .from("Perfiles")
                    .update(altUpdates)
                    .eq(idField, p[idField])
                
                if (error2) {
                    console.error(`[updateUserDetailsAction] Falló el segundo intento:`, error2)
                } else {
                    console.log(`[updateUserDetailsAction] Segundo intento exitoso!`)
                }
            } else {
                throw error
            }
        } else {
            console.log(`[updateUserDetailsAction] Update Perfiles exitoso. Data:`, data)
        }
    } catch (e: any) {
         console.error("[updateUserDetailsAction] Excepción fatal actualizando Perfiles:", e)
    }

    // Update Agentes if exists
    try {
        const { data: agent } = await admin.from("Agentes").select("idag").ilike("Email", email).eq("idi", idi).maybeSingle()
        if (agent) {
                console.log(`[updateUserDetailsAction] Actualizando Agente ${agent.idag}`)
                const { error: agentError } = await admin.from("Agentes").update({
                    Nombre: name,
                    // nombre: name, // Removed to avoid error if column doesn't exist
                    Telefono: phone
                }).eq("idag", agent.idag)
                
                if (agentError) console.error(`[updateUserDetailsAction] Error actualizando Agente:`, agentError)
                else console.log(`[updateUserDetailsAction] Agente actualizado correctamente`)
        } else {
            console.log(`[updateUserDetailsAction] No se encontró registro en Agentes para sincronizar. Creando...`)
            const { error: insertError } = await admin.from("Agentes").insert({
                Nombre: name,
                Email: email,
                idi: idi,
                Telefono: phone
            })
            
            if (insertError) console.error(`[updateUserDetailsAction] Error creando Agente faltante:`, insertError)
            else console.log(`[updateUserDetailsAction] Agente creado correctamente`)
        }
    } catch (e) {
        console.error(`[updateUserDetailsAction] Error en bloque Agentes:`, e)
    }

    await logAuditAction(admin, "UPDATE_USER_DETAILS", email, { idi, name, phone })

    revalidatePath("/dashboard/configuracion")
}

export async function uploadLogoAction(formData: FormData) {
    const idi = formData.get("idi")
    const file = formData.get("file") as File
    if (!idi || !file) return { error: "Faltan datos" }
    
    const admin = createAdminClient()
    
    // Upload to storage
    const { error: uploadError } = await admin.storage
        .from("imagenes")
        .upload(`logos/${idi}-logo.png`, file, {
            upsert: true,
            contentType: file.type
        })
        
    if (uploadError) {
            console.error("Upload logo error:", uploadError)
            return { error: uploadError.message }
    }

    // Get public URL
    const { data: { publicUrl } } = admin.storage.from("imagenes").getPublicUrl(`logos/${idi}-logo.png`)
    
    // Update Inmobiliarias table
    const { error: dbError } = await admin
        .from("Inmobiliarias")
        .update({ logo_url: publicUrl })
        .eq("idi", idi)

    if (dbError) {
        console.error("Error updating Inmobiliarias logo_url:", dbError)
        // We don't fail the action if DB update fails, but it's good to know
    }
    
    revalidatePath("/dashboard/configuracion")
    return { success: true }
}

export async function deleteLogoAction(formData: FormData) {
    const idi = formData.get("idi")
    if (!idi) return { error: "Falta ID" }
    
    const admin = createAdminClient()
    
    // Remove from storage
    const { error } = await admin.storage
        .from("imagenes")
        .remove([`logos/${idi}-logo.png`])
        
    if (error) return { error: error.message }

    // Update Inmobiliarias table
    const { error: dbError } = await admin
        .from("Inmobiliarias")
        .update({ logo_url: null })
        .eq("idi", idi)

    if (dbError) {
        console.error("Error clearing Inmobiliarias logo_url:", dbError)
    }
    
    revalidatePath("/dashboard/configuracion")
    return { success: true }
}
