"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

async function fetchPerfil(supabase: any, usuario: string) {
  const candidates = ["idi, inmobiliaria, is_admin, role", "inmobiliaria, is_admin, role", "idi, is_admin, role", "is_admin, role"]
  for (const fields of candidates) {
    const { data, error } = await supabase.from("Perfiles").select(fields).eq("usuario", usuario).maybeSingle()
    if (!error) return data
  }
  return null
}

function getIdiFromPerfil(perfil: any) {
  if (!perfil) return null
  return perfil.idi ?? perfil.inmobiliaria ?? null
}

function isMissingColumnError(message: string, columnName: string) {
  const msg = String(message || "").toLowerCase()
  const col = String(columnName || "").toLowerCase()
  return msg.includes("column") && msg.includes(col) && (msg.includes("does not exist") || msg.includes("no existe"))
}

export async function listComunicaciones(targetIdi?: number | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], columns: [], error: "No autenticado" }
  }
  const profile = await fetchPerfil(supabase, user.email)

  const roleStr = String(profile?.role || "").toLowerCase()
  const isSuperAdmin = profile?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
  const isAdmin = isSuperAdmin || ["administrador", "admin"].includes(roleStr)
  const ownIdi = getIdiFromPerfil(profile)
  const effectiveIdi =
    isSuperAdmin && typeof targetIdi === "number" && Number.isFinite(targetIdi) ? targetIdi : isSuperAdmin && targetIdi === null ? null : ownIdi

  let adminData: any[] | null = null
  let inferredColumns: string[] = []
  try {
    const admin = createAdminClient()
    const { data: rawAdminData } = await admin.from("comunicaciones").select("*").order("created_at", { ascending: false }).limit(200)
    adminData = rawAdminData || []
    inferredColumns = rawAdminData && rawAdminData.length > 0 ? Object.keys(rawAdminData[0]) : []
  } catch {}

  let query = supabase.from("comunicaciones").select("*").order("created_at", { ascending: false }).limit(200)
  if (effectiveIdi != null) {
    const idiValue = String(effectiveIdi)
    query = query.eq("idi", idiValue)
  }

  let { data, error } = await query
  if (error && effectiveIdi != null && isMissingColumnError(error.message || "", "idi")) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("comunicaciones")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .eq("inmobiliaria", String(effectiveIdi))
    data = fallbackData
    error = fallbackError
  }
  if (error) {
    const message = error.message || "Error al cargar comunicaciones"
    if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")) {
      if (adminData && isAdmin) {
        if (effectiveIdi != null) {
          const idiValue = String(effectiveIdi)
          const filtered = adminData.filter((row: any) => {
            if (row == null) return false
            if (row.idi != null && String(row.idi) === idiValue) return true
            if (row.inmobiliaria != null && String(row.inmobiliaria) === idiValue) return true
            return false
          })
          return { data: filtered, columns: [], error: null }
        }
        return { data: adminData || [], columns: [], error: null }
      }
      return { data: [], columns: [], error: message }
    }
    return { data: [], columns: [], error: message }
  }

  if (isAdmin && adminData && adminData.length > 0 && (!data || data.length === 0)) {
    if (effectiveIdi != null) {
      const idiValue = String(effectiveIdi)
      const filtered = adminData.filter((row: any) => {
        if (row == null) return false
        if (row.idi != null && String(row.idi) === idiValue) return true
        if (row.inmobiliaria != null && String(row.inmobiliaria) === idiValue) return true
        return false
      })
      return { data: filtered, columns: [], error: null }
    }
    return { data: adminData, columns: [], error: null }
  }

  return { data: data || [], columns: [], error: null }
}

export async function createComunicacion(payload: Record<string, any>, targetIdi?: number | null) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autenticado" }
  }

  const profile = await fetchPerfil(supabase, user.email)

  const roleStr = String(profile?.role || "").toLowerCase()
  const isSuperAdmin = profile?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
  if (!isSuperAdmin) {
    return { error: "Solo un superusuario puede guardar cambios en comunicaciones" }
  }
  const ownIdi = getIdiFromPerfil(profile)
  const effectiveIdi =
    isSuperAdmin && typeof targetIdi === "number" && Number.isFinite(targetIdi) ? targetIdi : isSuperAdmin && targetIdi === null ? null : ownIdi

  const nextPayload = { ...payload }
  if (effectiveIdi != null) {
    const idiValue = String(effectiveIdi)
    if (!nextPayload.idi) nextPayload.idi = idiValue
  }

  const admin = createAdminClient()
  let { error } = await admin.from("comunicaciones").insert([nextPayload])
  if (error && effectiveIdi != null && isMissingColumnError(error.message || "", "idi")) {
    const fallbackPayload = { ...payload }
    if (!fallbackPayload.inmobiliaria) fallbackPayload.inmobiliaria = String(effectiveIdi)
    ;({ error } = await admin.from("comunicaciones").insert([fallbackPayload]))
  }
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateComunicacion(
  keyField: string,
  keyValue: string | number,
  payload: Record<string, any>,
  targetIdi?: number | null
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autenticado" }
  }

  const profile = await fetchPerfil(supabase, user.email)

  const roleStr = String(profile?.role || "").toLowerCase()
  const isSuperAdmin = profile?.is_admin === true || ["superuser", "superadmin"].includes(roleStr)
  if (!isSuperAdmin) {
    return { error: "Solo un superusuario puede guardar cambios en comunicaciones" }
  }

  try {
    const admin = createAdminClient()
    const { data, error } = await admin.from("comunicaciones").update(payload).eq(keyField, keyValue).select()
    if (error) return { error: error.message }
    if (!data || data.length === 0) return { error: "No se pudo actualizar la comunicación" }
    return { error: null }
  } catch (err: any) {
    return { error: err?.message || "No se pudo actualizar la comunicación" }
  }
}
