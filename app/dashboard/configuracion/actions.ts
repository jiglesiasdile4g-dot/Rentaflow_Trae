"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getPlanData } from "@/lib/plan-data"
import { formatWebhookDate, getWebhookUrl, getPublicAppBaseUrl } from "@/lib/utils"
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

function normalizeEmailKey(value: any) {
    const raw = String(value || "").trim().toLowerCase()
    const local = raw.includes("@") ? raw.split("@")[0] : raw
    return { raw, local }
}

function normalizePhoneToNumber(value: any) {
    const digits = String(value ?? "").replace(/\D/g, "")
    if (!digits) return 0
    const num = Number(digits)
    return Number.isFinite(num) ? num : 0
}

export async function syncAgentNamesAction(formData: FormData) {
    const admin = createAdminClient()
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Usuario no autenticado")}`)
    }
    const idiRaw = String(formData.get("idi") || "").trim()
    const idi = Number(idiRaw)
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role, inmobiliaria")
        .ilike("usuario", user.email)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    const scopeIdi = Number.isFinite(idi) && idi > 0 ? idi : Number(perfil?.inmobiliaria || 0)
    if (!scopeIdi && !isSuperuser) {
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("No se pudo determinar la inmobiliaria")}`)
    }
    const whereIdi = scopeIdi || null
    const { data: agents, error: agentsError } = await admin
        .from("Agentes")
        .select("idag, Nombre, Email, idi")
        .match(whereIdi ? { idi: whereIdi } : {})
    if (agentsError) {
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(agentsError.message)}`)
    }
    const { data: perfiles } = await admin
        .from("Perfiles")
        .select("usuario, nombre, Nombre, inmobiliaria")
        .match(whereIdi ? { inmobiliaria: String(whereIdi) } : {})
    const profileMap = new Map<string, string>()
    ;(perfiles || []).forEach((p: any) => {
        const { raw, local } = normalizeEmailKey(p.usuario || p.Usuario || "")
        const nm = p.nombre || p.Nombre
        if (nm && String(nm).trim()) {
            const val = String(nm).trim()
            if (raw) profileMap.set(raw, val)
            if (local) profileMap.set(local, val)
        }
    })
    let updated = 0
    for (const ag of agents || []) {
        const { raw, local } = normalizeEmailKey(ag.Email)
        const targetName = profileMap.get(raw) || profileMap.get(local) || ag.Nombre
        if (targetName && targetName !== ag.Nombre) {
            const { error } = await admin
                .from("Agentes")
                .update({ Nombre: targetName })
                .eq("idag", ag.idag)
            if (!error) updated += 1
        }
    }
    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent(`Agentes sincronizados: ${updated}`)}`)
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

async function findProfilesByEmailAnyCase(admin: any, email: string) {
    const emailNorm = String(email || "").trim().toLowerCase()
    const local = emailNorm.includes("@") ? emailNorm.split("@")[0] : emailNorm
    const patterns = Array.from(new Set([emailNorm, local && local !== emailNorm ? `${local}@%` : null].filter(Boolean) as string[]))

    const whereVariants = [
        { u: "usuario", i: "inmobiliaria" },
        { u: "usuario", i: "Inmobiliaria" },
        { u: "Usuario", i: "inmobiliaria" },
        { u: "Usuario", i: "Inmobiliaria" },
    ]

    const acc: Array<{ profile: any; columns: { u: string; i: string } }> = []
    for (const v of whereVariants) {
        for (const p of patterns) {
            try {
                const { data, error } = await admin
                    .from("Perfiles")
                    .select("*")
                    .ilike(v.u, p)
                    .limit(100)
                if (!error && Array.isArray(data) && data.length > 0) {
                    for (const row of data) acc.push({ profile: row, columns: v })
                }
            } catch {}
        }
    }

    const seen = new Set<string>()
    const unique: Array<{ profile: any; columns: { u: string; i: string } }> = []
    for (const item of acc) {
        const p = item.profile || {}
        const key = p.id != null ? `id:${String(p.id)}` : p.idp != null ? `idp:${String(p.idp)}` : JSON.stringify(p)
        if (seen.has(key)) continue
        seen.add(key)
        unique.push(item)
    }

    return unique
}

async function assertSingleInmobiliariaPerEmail(admin: any, email: string, targetIdi: number | null) {
    const matches = await findProfilesByEmailAnyCase(admin, email)
    const withIdi = matches
        .map((m) => ({
            ...m,
            idi: (() => {
                const raw = (m.profile as any)?.inmobiliaria ?? (m.profile as any)?.Inmobiliaria ?? null
                const n = Number(raw)
                return Number.isFinite(n) && n > 0 ? n : null
            })(),
        }))
        .filter((m) => m.idi != null)

    const distinctIdi = Array.from(new Set(withIdi.map((m) => String(m.idi))))

    if (targetIdi == null) {
        if (distinctIdi.length > 0) {
            throw new Error(`Este email ya tiene un perfil asignado a una inmobiliaria (IDI ${distinctIdi.join(", ")}).`)
        }
        if (matches.length > 0) {
            throw new Error("Este email ya tiene un perfil en Perfiles. Elimina duplicados antes de continuar.")
        }
        return
    }

    const sameIdi = withIdi.filter((m) => Number(m.idi) === Number(targetIdi))
    const otherIdi = withIdi.filter((m) => Number(m.idi) !== Number(targetIdi))

    if (otherIdi.length > 0) {
        const ids = Array.from(new Set(otherIdi.map((m) => String(m.idi))))
        throw new Error(`Este email ya está asignado a otra inmobiliaria (IDI ${ids.join(", ")}). Un correo solo puede pertenecer a una inmobiliaria.`)
    }

    if (sameIdi.length > 1) {
        throw new Error(`Hay perfiles duplicados para este email en la inmobiliaria ${targetIdi}. Elimina duplicados antes de continuar.`)
    }
}

// Helper to find profile and correct column names
async function findProfileAndColumns(admin: any, email: string, idi: number) {
    const emailNorm = String(email || "").trim().toLowerCase()
    const whereVariants = [
        { u: "usuario", i: "inmobiliaria" },
        { u: "usuario", i: "Inmobiliaria" },
        { u: "Usuario", i: "inmobiliaria" },
        { u: "Usuario", i: "Inmobiliaria" },
    ]

    for (const v of whereVariants) {
        try {
            const { data, error } = await admin
                .from("Perfiles")
                .select("*")
                .ilike(v.u, emailNorm)
                .eq(v.i, idi)
                .limit(1)

            if (!error && data && data.length > 0) {
                return {
                    profile: data[0],
                    whereUser: v.u,
                    whereInm: v.i,
                    columns: v,
                }
            }
        } catch {}
    }
    return null
}

async function fetchPerfilesByIdiAnyCase(admin: any, idi: number) {
    const idiVariants = ["inmobiliaria", "Inmobiliaria"]
    for (const field of idiVariants) {
        try {
            const { data, error } = await admin
                .from("Perfiles")
                .select("*")
                .eq(field, idi)
                .limit(5000)
            if (!error) return data || []
        } catch {}
    }
    try {
        const { data, error } = await admin.from("Perfiles").select("*").limit(5000)
        if (!error) {
            return (data || []).filter((p: any) => String(p?.inmobiliaria ?? p?.Inmobiliaria ?? "") === String(idi))
        }
    } catch {}
    return []
}

function normalizeRole(value: any) {
    return String(value || "").trim().toLowerCase()
}

function isPerfilActive(perfil: any) {
    const hasLowerActivo = perfil && Object.prototype.hasOwnProperty.call(perfil, "activo")
    const hasUpperActivo = perfil && Object.prototype.hasOwnProperty.call(perfil, "Activo")
    const raw = hasLowerActivo || hasUpperActivo ? (perfil?.activo ?? perfil?.Activo) : (perfil?.es_agente ?? perfil?.Es_agente)
    if (typeof raw === "boolean") return raw !== false
    if (raw === null || raw === undefined) return true
    const s = String(raw).trim().toLowerCase()
    if (s === "false" || s === "0" || s === "no") return false
    return true
}

function isAdministradorPerfil(perfil: any) {
    const roleStr = normalizeRole(perfil?.role ?? perfil?.Role)
    const isSuperuser = perfil?.is_admin === true || perfil?.Is_admin === true || roleStr === "superuser" || roleStr === "superadmin"
    const isLocalAdmin = roleStr === "administrador" || roleStr === "admin"
    return isSuperuser || isLocalAdmin
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
    const webhookUrl = process.env.RECORDATORIO_VISITA_WEBHOOK_URL || getWebhookUrl("recordatorio_visita_agente")
    if (!webhookUrl) {
        redirect(`/dashboard/configuracion?reminder=success&rmsg=${encodeURIComponent("Recordatorio omitido: webhook no configurado")}`)
    }
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
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    if (!isSuperuser) {
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

export async function onboardInmobiliariaAction(formData: FormData) {
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
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    if (!isSuperuser) {
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

    const adminEmail = String(formData.get("admin_email") || "").trim().toLowerCase()
    const adminName = String(formData.get("admin_nombre") || "").trim()
    const adminPhone = String(formData.get("admin_telefono") || "").trim()

    if (!nombre) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Falta el nombre")}`)
    }
    if (!adminEmail || !adminEmail.includes("@")) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Email del administrador inválido")}`)
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

    try {
        await assertSingleInmobiliariaPerEmail(admin, adminEmail, null)
    } catch (e: any) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(e?.message || "El email ya está asignado")}`)
    }

    const { data: insertedInmo, error: inmoError } = await admin.from("Inmobiliarias").insert(payload).select("idi").maybeSingle()
    if (inmoError) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(inmoError.message || "Error creando inmobiliaria")}`)
    }

    const idiNum = Number((insertedInmo as any)?.idi)
    if (!Number.isFinite(idiNum) || idiNum <= 0) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("No se pudo obtener el ID de la inmobiliaria creada")}`)
    }

    const siteUrl = getPublicAppBaseUrl() || "http://localhost:3000"
    const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/update-password")}`

    let inviteOk = false
    try {
        const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(adminEmail, { redirectTo: redirectUrl })
        if (inviteError) {
            const msg = String(inviteError.message || "").toLowerCase()
            if (msg.includes("already registered") || msg.includes("user already")) {
                const { error: resetError } = await admin.auth.resetPasswordForEmail(adminEmail, { redirectTo: redirectUrl })
                if (resetError) {
                    redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(resetError.message || "No se pudo enviar el correo al administrador")}`)
                }
                inviteOk = true
            } else {
                redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(inviteError.message || "No se pudo invitar al administrador")}`)
            }
        } else {
            inviteOk = true
        }
    } catch (e: any) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(e?.message || "No se pudo invitar al administrador")}`)
    }

    let authUserId: string | null = null
    try {
        const { data } = await admin.auth.admin.listUsers({ perPage: 1000 } as any)
        const users = (data as any)?.users || []
        const foundUser = users.find((u: any) => String(u?.email || "").toLowerCase() === adminEmail)
        authUserId = foundUser?.id || null
    } catch {}

    const displayName = adminName || adminEmail.split("@")[0]
    const existing = await findProfileAndColumns(admin, adminEmail, idiNum)
    if (!existing) {
        const basePayload: any = {
            usuario: adminEmail,
            inmobiliaria: idiNum,
            role: "administrador",
            is_admin: false,
            es_agente: true,
            nombre: displayName,
            telefono: adminPhone,
        }
        if (authUserId) basePayload.user_id = authUserId
        try {
            const { error } = await admin.from("Perfiles").insert(basePayload)
            if (error) {
                if (error.code === "42703") {
                    const altPayload: any = {
                        Usuario: adminEmail,
                        Inmobiliaria: idiNum,
                        Role: "administrador",
                        Is_admin: false,
                        Es_agente: true,
                        Nombre: displayName,
                        Telefono: adminPhone,
                    }
                    if (authUserId) altPayload.user_id = authUserId
                    const retry = await admin.from("Perfiles").insert(altPayload)
                    if (retry.error) {
                        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(retry.error.message || "No se pudo crear el perfil del administrador")}`)
                    }
                } else {
                    redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(error.message || "No se pudo crear el perfil del administrador")}`)
                }
            }
        } catch (e: any) {
            redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(e?.message || "No se pudo crear el perfil del administrador")}`)
        }
    } else {
        const idField = existing.profile.id ? "id" : "idp"
        const updates: any = {
            role: "administrador",
            is_admin: false,
            es_agente: true,
            nombre: displayName,
            telefono: adminPhone,
        }
        if (authUserId) updates.user_id = authUserId
        await admin.from("Perfiles").update(updates).eq(idField, existing.profile[idField])
    }

    await logAuditAction(admin, "ONBOARD_INMOBILIARIA", adminEmail, { idi: idiNum, inmobiliaria: nombre, invite_sent: inviteOk })

    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?inmo=success&imsg=${encodeURIComponent(`Inmobiliaria creada (IDI ${idiNum}) y administrador invitado: ${adminEmail}`)}`)
}

export async function updateInmobiliariaAction(formData: FormData) {
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
        .select("is_admin, role, inmobiliaria")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    const isAdmin = isSuperuser || ["administrador", "admin"].includes(roleStr)
    if (!isAdmin) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("Sin permisos para editar inmobiliarias")}`)
    }
    const idiRaw = String(formData.get("idi") || "").trim()
    const idi = Number(idiRaw)
    if (!idi || !Number.isFinite(idi)) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("ID de inmobiliaria inválido")}`)
    }
    if (!isSuperuser && String(perfil?.inmobiliaria) !== String(idi)) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent("No tienes permiso para editar esta inmobiliaria")}`)
    }
    const nombre = (formData.get("Nombre") ?? formData.get("nombre") ?? "").toString().trim()
    const direccion = (formData.get("Direccion") ?? formData.get("direccion") ?? "").toString().trim()
    const telefono = (formData.get("Telefono") ?? formData.get("telefono") ?? "").toString().trim()
    const mailContacto = (formData.get("Mail contacto") ?? formData.get("mail_contacto") ?? "").toString().trim()
    const mailSistema = (formData.get("Mail sistema") ?? formData.get("mail_sistema") ?? "").toString().trim()
    const whatsappEmpresa = (formData.get("Whatsapp_empresa") ?? formData.get("whatsapp_empresa") ?? "").toString().trim()
    const personaContacto = (formData.get("Persona de Contacto") ?? formData.get("persona_contacto") ?? "").toString().trim()
    const paginaWeb = (formData.get("pagina_web") ?? "").toString().trim()
    const logoUrl = (formData.get("logo_url") ?? "").toString().trim()
    const colorPrimario = (formData.get("color_primario") ?? "").toString().trim()
    const colorSecundario = (formData.get("color_secundario") ?? "").toString().trim()
    const firmaHtml = (formData.get("firma_html") ?? "").toString().trim()
    const whatsappActivo = formData.get("whatsapp_activo") != null
    const inmobiliariaAct = (formData.get("inmobiliaria_act") ?? "").toString().trim()

    const updates: Record<string, any> = {}
    if (nombre) updates.Nombre = nombre
    if (direccion) updates.Direccion = direccion
    if (telefono) updates.Telefono = telefono
    if (mailContacto) updates["Mail contacto"] = mailContacto
    if (mailSistema) updates["Mail sistema"] = mailSistema
    if (whatsappEmpresa) updates.Whatsapp_empresa = whatsappEmpresa
    if (personaContacto) updates["Persona de Contacto"] = personaContacto
    if (paginaWeb) updates.pagina_web = paginaWeb
    if (logoUrl) updates.logo_url = logoUrl
    if (colorPrimario) updates.color_primario = colorPrimario
    if (colorSecundario) updates.color_secundario = colorSecundario
    if (firmaHtml) updates.firma_html = firmaHtml
    if (inmobiliariaAct) updates.inmobiliaria_act = inmobiliariaAct
    updates.whatsapp_activo = whatsappActivo

    const { error } = await admin.from("Inmobiliarias").update(updates).eq("idi", idi)
    if (error) {
        redirect(`/dashboard/configuracion?inmo=error&imsg=${encodeURIComponent(error.message || "Error actualizando inmobiliaria")}`)
    }
    revalidatePath("/dashboard/configuracion")
    redirect(`/dashboard/configuracion?inmo=success&imsg=${encodeURIComponent("Inmobiliaria actualizada")}`)
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
                Telefono: normalizePhoneToNumber(found?.profile?.Telefono ?? found?.profile?.telefono)
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
    const password = String(formData.get("newPassword") || "").trim()
    const skipEmail = String(formData.get("skipEmail") || "").toLowerCase() === "true" || String(formData.get("skipEmail") || "").toLowerCase() === "on"
    const createWithPassword = skipEmail || !!password

    if (!email || !email.includes("@")) {
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent("Email inválido")}`)
    }

    try {
        await assertSingleInmobiliariaPerEmail(admin, email, idi)

        if (createWithPassword) {
            if (!password) {
                redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent("Contraseña requerida para crear/activar sin email")}`)
            }

            let authUserId: string | null = null
            const { data: created, error: createErr } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name },
            } as any)

            if (createErr) {
                const rawMsg = String((createErr as any)?.message || "")
                const msgLower = rawMsg.toLowerCase()
                const looksLikeExists =
                    msgLower.includes("already") ||
                    msgLower.includes("exists") ||
                    msgLower.includes("registered") ||
                    msgLower.includes("duplicate") ||
                    msgLower.includes("user") && msgLower.includes("registered")

                if (!looksLikeExists) {
                    throw new Error(rawMsg || "Error creando usuario")
                }

                const { data: listData } = await admin.auth.admin.listUsers({ perPage: 1000 } as any)
                const users = (listData as any)?.users || []
                const existing = users.find((u: any) => String(u?.email || "").toLowerCase() === email.toLowerCase())
                if (!existing?.id) {
                    throw new Error("El usuario ya existe en Auth pero no se pudo recuperar para actualizar contraseña")
                }
                authUserId = String(existing.id)
                const { error: updErr } = await admin.auth.admin.updateUserById(authUserId, {
                    password,
                    email_confirm: true,
                    user_metadata: { name },
                } as any)
                if (updErr) {
                    throw new Error(String((updErr as any)?.message || "No se pudo actualizar la contraseña del usuario existente"))
                }
            } else {
                authUserId = (created as any)?.user?.id ? String((created as any).user.id) : null
            }

            console.log(`[createAgentAction] User created/updated without email. Auth user id=${authUserId || "N/A"}`)
        } else {
            const siteUrl = getPublicAppBaseUrl() || "http://localhost:3000"
            const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/update-password")}`

            console.log(`[createAgentAction] Inviting ${email} to idi ${idi}`)

            const { error: authError } = await admin.auth.admin.inviteUserByEmail(email, {
                redirectTo: redirectUrl
            })

            if (authError) {
                console.error("Error inviting user:", authError)
                const rawMsg = String((authError as any)?.message || "")
                const status = (authError as any)?.status
                const code = (authError as any)?.code

                if (/Error sending invite email/i.test(rawMsg)) {
                    const detail = [code ? `code=${code}` : null, status ? `status=${status}` : null].filter(Boolean).join(" ")
                    throw new Error(
                        `No se pudo enviar el email de invitación. Revisa la configuración de correo (SMTP) en Supabase Auth/GoTrue.${detail ? ` (${detail})` : ""}`
                    )
                }

                const detail = [rawMsg, code ? `code=${code}` : null, status ? `status=${status}` : null].filter(Boolean).join(" ")
                throw new Error(detail || "Error al invitar usuario")
            }

            console.log("[createAgentAction] Invite sent successfully")
        }

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
    redirect(
        `/dashboard/configuracion?createUser=success&msg=${encodeURIComponent(
            createWithPassword ? "Usuario creado y activado (sin email)" : "Invitación enviada correctamente"
        )}`
    )
}

export async function deleteAgentAction(formData: FormData) {
    const admin = createAdminClient()
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("email"))

    try {
        const found = await findProfileAndColumns(admin, email, idi)
        if (found) {
            const currentRole = normalizeRole(found.profile?.role ?? found.profile?.Role)
            const currentCanManage = isAdministradorPerfil(found.profile)
            if (currentCanManage && isPerfilActive(found.profile)) {
                const perfiles = await fetchPerfilesByIdiAnyCase(admin, idi)
                const remainingAdmins = perfiles.filter((p: any) => {
                    const pEmail = String(p?.usuario ?? p?.Usuario ?? "").trim().toLowerCase()
                    if (pEmail && pEmail === String(email).trim().toLowerCase()) return false
                    return isPerfilActive(p) && isAdministradorPerfil(p)
                })
                if (remainingAdmins.length === 0) {
                    return { error: "No se puede eliminar el último administrador de esta inmobiliaria. Crea otro administrador antes." }
                }
            }
        }

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

    const activeCol = (() => {
        if (found.profile && Object.prototype.hasOwnProperty.call(found.profile, "activo")) return "activo"
        if (found.profile && Object.prototype.hasOwnProperty.call(found.profile, "Activo")) return "Activo"
        return found.columns.u === "Usuario" ? "Es_agente" : "es_agente"
    })()
    const idField = found.profile.id ? "id" : "idp"
    
    const currentActive = found.profile[activeCol] !== false // Default true if null/undefined
    const newActive = !currentActive

    const currentRole = normalizeRole(found.profile?.role ?? found.profile?.Role)
    const currentCanManage = isAdministradorPerfil(found.profile)
    if (currentCanManage && currentActive === true && newActive === false) {
        const perfiles = await fetchPerfilesByIdiAnyCase(admin, idi)
        const remainingAdmins = perfiles.filter((p: any) => {
            const pEmail = String(p?.usuario ?? p?.Usuario ?? "").trim().toLowerCase()
            if (pEmail && pEmail === String(email).trim().toLowerCase()) return false
            return isPerfilActive(p) && isAdministradorPerfil(p)
        })
        if (remainingAdmins.length === 0) {
            const debugAdmins = perfiles
                .filter((p: any) => isAdministradorPerfil(p))
                .slice(0, 8)
                .map((p: any) => {
                    const pEmail = String(p?.usuario ?? p?.Usuario ?? "").trim().toLowerCase()
                    const roleStr = normalizeRole(p?.role ?? p?.Role)
                    const isSuperuser = p?.is_admin === true || p?.Is_admin === true || roleStr === "superuser" || roleStr === "superadmin"
                    const hasActivo = Object.prototype.hasOwnProperty.call(p, "activo") || Object.prototype.hasOwnProperty.call(p, "Activo")
                    const activeVal = hasActivo ? (p?.activo ?? p?.Activo) : (p?.es_agente ?? p?.Es_agente)
                    const activeComputed = isPerfilActive(p)
                    return `${pEmail || "?"}{role=${roleStr || "?"},is_admin=${isSuperuser ? "1" : "0"},raw_active=${String(activeVal)},active=${activeComputed ? "1" : "0"}}`
                })
                .join(" | ")
            return {
                error:
                    "No se puede desactivar el último administrador de esta inmobiliaria. Crea otro administrador antes." +
                    ` (Debug idi=${idi} email=${String(email).trim().toLowerCase()} activeCol=${activeCol} admins=${debugAdmins || "none"})`,
            }
        }
    }

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
    const targetRole = String(formData.get("role"))

    const found = await findProfileAndColumns(admin, email, idi)
    if (!found) return

    const currentRole = normalizeRole(found.profile?.role ?? found.profile?.Role)
    const currentIsLocalAdmin = currentRole === "administrador" || currentRole === "admin"
    const nextRole = normalizeRole(targetRole)
    const nextIsLocalAdmin = nextRole === "administrador" || nextRole === "admin"

    if (currentIsLocalAdmin && !nextIsLocalAdmin && isPerfilActive(found.profile)) {
        const perfiles = await fetchPerfilesByIdiAnyCase(admin, idi)
        const remainingAdmins = perfiles.filter((p: any) => {
            const pEmail = String(p?.usuario ?? p?.Usuario ?? "").trim().toLowerCase()
            if (pEmail && pEmail === String(email).trim().toLowerCase()) return false
            return isPerfilActive(p) && isAdministradorPerfil(p)
        })
        if (remainingAdmins.length === 0) {
            return { error: "No se puede quitar el rol al último administrador de esta inmobiliaria. Crea otro administrador antes." }
        }
    }

    const nextRoleNormalized = normalizeRole(targetRole)
    const roleToSet =
        nextRoleNormalized === "administrador" || nextRoleNormalized === "admin"
            ? "administrador"
            : nextRoleNormalized === "supervisor"
                ? "supervisor"
                : "agente"

    const updates: any = { role: roleToSet }

    // Handle case sensitivity for columns if needed, but Perfiles seems standard mostly
    const idField = found.profile.id ? "id" : "idp"
    await admin
        .from("Perfiles")
        .update(updates)
        .eq(idField, found.profile[idField])

    await logAuditAction(admin, "CHANGE_ROLE", email, { idi, new_role: roleToSet })

    revalidatePath("/dashboard/configuracion")
}

export async function resendUserConfirmationAction(formData: FormData) {
    const admin = createAdminClient()
    const email = String(formData.get("email"))
    
    try {
        const siteUrl = getPublicAppBaseUrl() || "http://localhost:3000"
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
            const { error: insertError } = await admin.from("Agentes").insert({
                Nombre: name,
                Email: email,
                idi: idi,
                Telefono: normalizePhoneToNumber(found?.profile?.Telefono ?? found?.profile?.telefono)
            })
            if (insertError) {
                console.error("[toggleAgentFunctionsAction] Error enabling agent functions:", insertError)
                return { error: insertError.message || "No se pudieron activar las funciones de agente" }
            }
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
    
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return { error: "No autenticado" }

    const admin = createAdminClient()
    const idiNum = Number(idi)
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role, inmobiliaria")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    const canEdit = isSuperuser || (String(perfil?.inmobiliaria || "") === String(idiNum) && ["administrador", "admin", "supervisor"].includes(roleStr))
    if (!canEdit) return { error: "No autorizado" }
    
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

export async function updateLogoUrlAction(formData: FormData) {
    const idiRaw = String(formData.get("idi") || "").trim()
    if (!idiRaw) return { error: "Falta ID" }
    const logoUrlRaw = String(formData.get("logo_url") || "").trim()
    const logoUrl = logoUrlRaw ? logoUrlRaw : null

    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return { error: "No autenticado" }

    const admin = createAdminClient()
    const idiNum = Number(idiRaw)
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role, inmobiliaria")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    const canEdit = isSuperuser || (String(perfil?.inmobiliaria || "") === String(idiNum) && ["administrador", "admin", "supervisor"].includes(roleStr))
    if (!canEdit) return { error: "No autorizado" }

    const { error } = await admin
        .from("Inmobiliarias")
        .update({ logo_url: logoUrl })
        .eq("idi", idiNum)

    if (error) return { error: error.message || "No se pudo guardar la URL" }

    revalidatePath("/dashboard/configuracion")
    return { success: true }
}

export async function deleteLogoAction(formData: FormData) {
    const idi = formData.get("idi")
    if (!idi) return { error: "Falta ID" }
    
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) return { error: "No autenticado" }

    const admin = createAdminClient()
    const idiNum = Number(idi)
    const { data: perfil } = await admin
        .from("Perfiles")
        .select("is_admin, role, inmobiliaria")
        .ilike("usuario", user.email)
        .limit(1)
        .maybeSingle()
    const roleStr = String(perfil?.role || "").toLowerCase()
    const isSuperuser = perfil?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
    const canEdit = isSuperuser || (String(perfil?.inmobiliaria || "") === String(idiNum) && ["administrador", "admin", "supervisor"].includes(roleStr))
    if (!canEdit) return { error: "No autorizado" }
    
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
