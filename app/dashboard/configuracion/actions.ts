"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getPlanData } from "@/lib/plan-data"

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
                    whereInm: v.i 
                }
            }
        } catch (e) {
            // Ignore errors (like column not found) and try next variant
        }
    }
    return null
}

// Helper function to ensure agent record exists or update it
async function ensureAgentRecord(supabaseClient: any, email: string, idi: number, role: string, createIfMissing: boolean = true) {
    try {
        const { data: existing } = await supabaseClient
            .from("Agentes")
            .select("idag")
            .ilike("Email", email)
            .maybeSingle()

        // const cargo = role.charAt(0).toUpperCase() + role.slice(1) // Capitalize role - Removed as column might not exist

        if (!existing) {
            if (createIfMissing) {
                console.log("[ensureAgent] Creating agent record for:", email, "IDI:", idi)
                const { error, data } = await supabaseClient
                    .from("Agentes")
                    .insert({
                        Nombre: email.split("@")[0], // Default name from email
                        Email: email,
                        idi: idi,
                        // Cargo: cargo // Removed to fix schema error
                    })
                    .select()
                
                if (error) {
                    console.error("[ensureAgent] Error creating agent:", error)
                    throw error
                }
                console.log("[ensureAgent] Agent created:", data)
            }
        } else {
            // If exists, update properties if needed (currently none besides Cargo which is removed)
            // We keep this block in case we need to update other fields later
            
            // We should ideally ensure idi matches, but if RLS restricts visibility, 
            // existing record MUST be in this idi. 
            // However, just in case 'existing' was found via some other means or RLS is open:
            // We won't force-update IDI blindly unless we are sure. 
            // But for this feature "Activate functions in THIS inmobiliaria", we should probably ensure it.
            
            /* 
            const updates: any = {}
            if (existing.Cargo !== cargo) updates.Cargo = cargo
            
            if (Object.keys(updates).length > 0) {
                console.log("[ensureAgent] Updating agent:", email, updates)
                await supabaseClient
                    .from("Agentes")
                    .update(updates)
                    .eq("idag", existing.idag)
            }
            */
        }
    } catch (err) {
        console.error("[ensureAgent] Failed:", err)
        throw err
    }
}

export async function createAgentAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, inmobiliaria, role")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const isSupervisor = perfil?.role === 'supervisor'
    const idi = Number(formData.get("idi"))
    const email = String(formData.get("newEmail") || "").trim()

    let msg = ""
    if (!isAdmin && !isSupervisor) {
        msg = "Solo administradores y supervisores pueden crear usuarios"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    if (!email) {
        msg = "Completa el correo electrónico"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
    const emailValid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
    if (!emailValid) {
        msg = "El correo electrónico no es válido"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }

    let canCreate = false
    try {
        const { data: inm } = await supa
            .from("Inmobiliarias")
            .select("idi, Plan")
            .eq("idi", idi as any)
            .limit(1)
            .maybeSingle()
        const planId = Number(inm?.Plan) || 0
        const planData = planId ? getPlanData(planId) : null
        const limit = Number(planData?.Usuarios || 0)
        const unlimited = limit >= 1000000
        let currentAgents = 0
        try {
            const { count: c1 } = await supa
                .from("Perfiles")
                .select("usuario", { count: "exact", head: true })
                .eq("inmobiliaria", idi as any)
            currentAgents = Number(c1 || 0)
        } catch { }
        if (!currentAgents) {
            try {
                const { count: c2 } = await supa
                    .from("Perfiles")
                    .select("usuario", { count: "exact", head: true })
                    .eq("Inmobiliaria", idi as any)
                currentAgents = Number(c2 || 0)
            } catch { }
        }
        canCreate = unlimited || currentAgents < limit
        if (!canCreate) {
            msg = "Límite de agentes alcanzado para el plan contratado"
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
        }
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        msg = e?.message || "Error verificando límites de plan"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }

    try {
        const admin = createAdminClient()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/dashboard/configuracion?action=set_password")}`

        console.log("[INVITE] Using siteUrl:", siteUrl)
        console.log("[INVITE] Sending redirectTo:", redirectUrl)

        const { data: createdUser, error: adminError } = await admin.auth.admin.inviteUserByEmail(email, {
            data: {
                inmobiliaria_id: Number(idi),
                role: "agente",
            },
            redirectTo: redirectUrl,
        })
        if (adminError) {
            msg = adminError.message
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
        }
        if (!createdUser?.user?.id) {
            msg = "El usuario no pudo crearse en Auth"
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
        }
        const { data: fetched, error: fetchError } = await admin.auth.admin.getUserById(createdUser.user.id)
        if (fetchError || !fetched?.user?.id) {
            msg = fetchError?.message || "El usuario no figura en Auth tras la creación"
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
        }
        let insertErrorMsg = ""
        {
            const { error: e1 } = await admin.from("Perfiles").insert({
                usuario: email,
                inmobiliaria: Number(idi),
                is_admin: false,
            })
            let err = e1
            if (err) {
                const { error: e2 } = await admin.from("Perfiles").insert({
                    usuario: email,
                    Inmobiliaria: Number(idi),
                    is_admin: false,
                })
                err = e2
            }
            if (err) {
                const { error: e3 } = await admin.from("Perfiles").insert({
                    Usuario: email,
                    inmobiliaria: Number(idi),
                    is_admin: false,
                })
                err = e3
            }
            if (err) {
                const { error: e4 } = await admin.from("Perfiles").insert({
                    Usuario: email,
                    Inmobiliaria: Number(idi),
                    is_admin: false,
                })
                err = e4
            }
            if (err) {
                insertErrorMsg = err.message || "error"
            }
        }
        if (insertErrorMsg) {
            msg = insertErrorMsg
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
        }
        msg = "Invitación enviada correctamente."

        // Ensure Agente record exists immediately upon invitation
        try {
            await ensureAgentRecord(admin, email, Number(idi), "agente", true)
        } catch (agentErr) {
            console.error("Error ensuring agent record on create:", agentErr)
        }

        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=success&msg=${encodeURIComponent(msg)}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        msg = e?.message || "No se pudo crear el usuario"
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?createUser=error&msg=${encodeURIComponent(msg)}`)
    }
}

export async function updateRoleAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, inmobiliaria")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    if (!isAdmin) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden cambiar roles")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))

    // Determine new role logic
    let newRole = "agente"
    let isAdminRole = false

    // Check if coming from toggle button (toAdmin) or select (role)
    const toAdminRaw = formData.get("toAdmin")
    const roleRaw = formData.get("role")

    if (toAdminRaw !== null) {
        // Logic from quick toggle button
        isAdminRole = String(toAdminRaw) === "true"
        newRole = isAdminRole ? "administrador" : "agente"
    } else if (roleRaw) {
        // Logic from explicit role select (if any)
        newRole = String(roleRaw).toLowerCase()
        isAdminRole = newRole === "administrador"
    }

    try {
        const admin = createAdminClient()
        let success = false
        let lastError: any = null

        const found = await findProfileAndColumns(admin, email, idi)

        if (found) {
            const { profile, whereUser, whereInm } = found
            
            // Determine column names from the found profile object
            // Check for 'role' or 'Role'
            const roleCol = 'role' in profile ? 'role' : ('Role' in profile ? 'Role' : null)
            // Check for 'is_admin' or 'Is_admin' or 'isAdmin'
            const adminCol = 'is_admin' in profile ? 'is_admin' : ('Is_admin' in profile ? 'Is_admin' : ('isAdmin' in profile ? 'isAdmin' : null))

            if (roleCol && adminCol) {
                const { data, error } = await admin
                    .from("Perfiles")
                    .update({
                        [roleCol]: newRole,
                        [adminCol]: isAdminRole
                    })
                    .eq(whereUser, email)
                    .eq(whereInm, idi)
                    .select()
                
                if (!error && data && data.length > 0) success = true
                if (error) lastError = error
            } else {
                // If columns missing, we can try to update blindly with lowercase defaults as fallback?
                // But usually if they are missing in select * result, they don't exist.
                // However, maybe RLS hid them? But we are using admin client.
                // So if missing, we probably can't update.
                lastError = { message: `No se encontraron las columnas de rol/admin (role=${roleCol}, is_admin=${adminCol}). Columnas disponibles: ${Object.keys(profile).join(', ')}` }
            }
        } else {
             lastError = { message: "No se encontró el perfil del usuario" }
        }

        if (success) {
            // Only create if role is 'agente'. For admin/supervisor, only update if exists.
            const shouldCreate = newRole === "agente"
            await ensureAgentRecord(supa, email, idi, newRole, shouldCreate)
        }

        if (!success) {
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(lastError?.message || "No se pudo actualizar el rol (registro no encontrado)")}`)
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Rol actualizado correctamente")}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo actualizar el rol")}`)
    }
}

export async function toggleActiveAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, inmobiliaria, role")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const isSupervisor = perfil?.role === 'supervisor'
    if (!isAdmin && !isSupervisor) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores y supervisores pueden cambiar estado")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const activeRaw = formData.get("active")
    const setActive = String(activeRaw || "").toLowerCase() === "true"
    try {
        const admin = createAdminClient()
        let success = false
        let lastError: any = null

        const found = await findProfileAndColumns(admin, email, idi)

        if (found) {
            const { profile, whereUser, whereInm } = found
            
            // Determine column name
            const activeCol = 'activo' in profile ? 'activo' : 
                              ('Activo' in profile ? 'Activo' : 
                              ('active' in profile ? 'active' : 
                              ('Active' in profile ? 'Active' : 
                              ('is_active' in profile ? 'is_active' : 
                              ('es_agente' in profile ? 'es_agente' : null)))))
            
            if (activeCol) {
                const { data, error } = await admin
                    .from("Perfiles")
                    .update({ [activeCol]: setActive })
                    .eq(whereUser, email)
                    .eq(whereInm, idi)
                    .select()
                
                if (!error && data && data.length > 0) success = true
                if (error) lastError = error
            } else {
                lastError = { message: `No se encontró la columna de estado 'activo' o 'Activo'. Columnas disponibles: ${Object.keys(profile).join(', ')}` }
            }
        } else {
             lastError = { message: "No se encontró el perfil del usuario para activar/desactivar" }
        }

        if (!success) {
            console.error("Error updating active status:", lastError)
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(lastError?.message || "No se pudo actualizar el estado (registro no encontrado)")}`)
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent(setActive ? "Agente activado" : "Agente desactivado")}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo actualizar el estado")}`)
    }
}

export async function deleteAgentAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, inmobiliaria, role")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const isSupervisor = perfil?.role === 'supervisor'
    if (!isAdmin && !isSupervisor) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores y supervisores pueden borrar usuarios")}`)
    }
    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const id = formData.get("id") ? String(formData.get("id")) : null

    try {
        const admin = createAdminClient()

        // 1. Eliminar de Perfiles
        let success = false
        let lastError: any = null

        if (id) {
             // If we have ID, just delete by ID
             const { data, error } = await admin.from("Perfiles").delete().eq("id", id).select()
             if (!error && data && data.length > 0) success = true
             if (error) lastError = error
        } else {
             const found = await findProfileAndColumns(admin, email, idi)
             if (found) {
                 const { whereUser, whereInm } = found
                 const { data, error } = await admin
                    .from("Perfiles")
                    .delete()
                    .eq(whereUser, email)
                    .eq(whereInm, idi)
                    .select()
                 if (!error && data && data.length > 0) success = true
                 if (error) lastError = error
             } else {
                  lastError = { message: "No se encontró el perfil para borrar" }
             }
        }

        if (!success) {
            throw new Error(lastError?.message || "No se pudo borrar el perfil (no encontrado)")
        }

        // 2. Eliminar de Agentes (si existe)
        await admin.from("Agentes").delete().eq("Email", email).eq("idi", idi as any)

        // 3. Intentar borrar de Auth
        try {
            const { data: authUsers } = await admin.auth.admin.listUsers()
            const authUser = authUsers.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
            if (authUser) {
                await admin.auth.admin.deleteUser(authUser.id)
            }
        } catch (authErr) {
            console.error("Error borrando usuario de Auth:", authErr)
        }

        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Usuario borrado correctamente")}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo borrar el usuario")}`)
    }
}

export async function toggleAgentFunctionsAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, inmobiliaria, role")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const isSupervisor = perfil?.role === 'supervisor'
    if (!isAdmin && !isSupervisor) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores y supervisores pueden gestionar funciones de agente")}`)
    }

    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const enable = String(formData.get("enable") || "").toLowerCase() === "true"

    // Fetch user role to ensure we don't disable functions for an 'agente'
    const { data: targetProfile } = await supa
        .from("Perfiles")
        .select("role, is_admin")
        .eq("usuario", email)
        .eq("inmobiliaria", idi as any)
        .maybeSingle()
    
    const targetRole = targetProfile?.role || (targetProfile?.is_admin ? "administrador" : "agente")
    
    if (!enable && targetRole === "agente") {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("No se pueden desactivar las funciones de agente para un usuario con rol Agente")}`)
    }

    try {
        const admin = createAdminClient()

        if (enable) {
            // ... fetch user role logic removed as we fetched it above ...
            await ensureAgentRecord(admin, email, idi, targetRole, true)
        } else {
            console.log("[toggleAgentFunctions] Disabling agent for:", email, "IDI:", idi)
            
            // Find the agent first to ensure we target the right one (case-insensitive)
            const { data: agentToDelete, error: findError } = await admin
                .from("Agentes")
                .select("idag")
                .ilike("Email", email)
                .eq("idi", idi as any)
                .maybeSingle()

            if (findError) {
                console.error("[toggleAgentFunctions] Error finding agent:", findError)
                throw findError
            }

            if (agentToDelete) {
                console.log("[toggleAgentFunctions] Found agent to delete:", agentToDelete)
                const { error: deleteError } = await admin
                    .from("Agentes")
                    .delete()
                    .eq("idag", agentToDelete.idag)

                if (deleteError) {
                    console.error("[toggleAgentFunctions] Error deleting agent:", deleteError)
                    throw deleteError
                }
            } else {
                console.warn("[toggleAgentFunctions] No agent found to delete for:", email)
                // We don't throw error here, as the goal is "deactivated", which is true if it doesn't exist.
            }
        }

        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent(enable ? "Funciones de agente habilitadas" : "Funciones de agente deshabilitadas")}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "Error gestionando funciones de agente")}`)
    }
}

export async function resendUserConfirmationAction(formData: FormData) {
    const supa = await createClient()
    const {
        data: { user: currentUser },
    } = await supa.auth.getUser()
    if (!currentUser) {
        redirect("/login")
    }
    const { data: perfil } = await supa
        .from("Perfiles")
        .select("is_admin, role")
        .eq("usuario", currentUser.email)
        .limit(1)
        .maybeSingle()
    const isAdmin = perfil?.is_admin === true
    const isSupervisor = perfil?.role === 'supervisor'
    const email = String(formData.get("email") || "").trim()

    try {
        if (!isAdmin && !isSupervisor) {
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores y supervisores pueden reenviar invitaciones")}`)
        }

        const admin = createAdminClient()
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        const redirectUrl = `${siteUrl}/auth/callback?next=${encodeURIComponent("/dashboard/configuracion?action=set_password")}`

        const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
            redirectTo: redirectUrl
        })

        if (error) {
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(error.message)}`)
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Enlace de invitación reenviado correctamente")}`)
    } catch (e: any) {
        if (e.message === 'NEXT_REDIRECT' || e.digest?.startsWith('NEXT_REDIRECT')) {
            throw e
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo reenviar la invitación")}`)
    }
}
