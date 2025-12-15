"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { getPlanData } from "@/lib/plan-data"

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
        let err: any = null
        // We update both role and is_admin for backward compatibility
        const { error: e1 } = await supa
            .from("Perfiles")
            .update({
                role: newRole,
                is_admin: isAdminRole
            })
            .eq("usuario", email)
            .eq("inmobiliaria", idi as any)
        err = e1

        if (err) {
            // Fallback for case sensitivity if needed, though usually covered by first query if correct
            const { error: e2 } = await supa
                .from("Perfiles")
                .update({
                    role: newRole,
                    is_admin: isAdminRole
                })
                .eq("usuario", email)
                .eq("Inmobiliaria", idi as any)
            err = e2
        }

        if (!err) {
            // Only create if role is 'agente'. For admin/supervisor, only update if exists.
            const shouldCreate = newRole === "agente"
            await ensureAgentRecord(supa, email, idi, newRole, shouldCreate)
        }

        if (err) {
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(err.message)}`)
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent("Rol actualizado correctamente")}`)
    } catch (e: any) {
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
        let err: any = null
        const { error: e1 } = await supa
            .from("Perfiles")
            .update({ activo: setActive })
            .eq("usuario", email)
            .eq("inmobiliaria", idi as any)
        err = e1
        if (err) {
            const { error: e2 } = await supa
                .from("Perfiles")
                .update({ activo: setActive })
                .eq("usuario", email)
                .eq("Inmobiliaria", idi as any)
            err = e2
        }
        if (err) {
            const { error: e3 } = await supa
                .from("Perfiles")
                .update({ activo: setActive })
                .eq("Usuario", email)
                .eq("inmobiliaria", idi as any)
            err = e3
        }
        if (err) {
            const { error: e4 } = await supa
                .from("Perfiles")
                .update({ activo: setActive })
                .eq("Usuario", email)
                .eq("Inmobiliaria", idi as any)
            err = e4
        }
        if (err) {
            revalidatePath("/dashboard/configuracion")
            redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(err.message)}`)
        }
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=success&mmsg=${encodeURIComponent(setActive ? "Agente activado" : "Agente desactivado")}`)
    } catch (e: any) {
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
        let err: any = null
        let deleteQuery = admin.from("Perfiles").delete()

        if (id) {
            deleteQuery = deleteQuery.eq("id", id)
        } else {
            // Fallback por email si no hay ID
            deleteQuery = deleteQuery.eq("usuario", email).eq("inmobiliaria", idi as any)
        }

        const { error: e1 } = await deleteQuery
        err = e1

        if (err) {
            throw new Error(err.message || "No se pudo borrar el perfil")
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
    if (!isAdmin) {
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent("Solo administradores pueden gestionar funciones de agente")}`)
    }

    const email = String(formData.get("email") || "").trim()
    const idi = Number(formData.get("idi"))
    const enable = String(formData.get("enable") || "").toLowerCase() === "true"

    try {
        const admin = createAdminClient()

        if (enable) {
            // Fetch user role to set Cargo correctly
            const { data: targetProfile } = await supa
                .from("Perfiles")
                .select("role, is_admin")
                .eq("usuario", email)
                .eq("inmobiliaria", idi as any)
                .maybeSingle()

            const role = targetProfile?.role || (targetProfile?.is_admin ? "administrador" : "agente")

            await ensureAgentRecord(admin, email, idi, role, true)
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
        revalidatePath("/dashboard/configuracion")
        redirect(`/dashboard/configuracion?manageUser=error&mmsg=${encodeURIComponent(e?.message || "No se pudo reenviar la invitación")}`)
    }
}
