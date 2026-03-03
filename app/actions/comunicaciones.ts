"use server"

import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function listComunicaciones() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { data: [], columns: [], error: "No autenticado" }
  }
  const { data: profile } = await supabase
    .from("Perfiles")
    .select("inmobiliaria, is_admin, role")
    .eq("usuario", user.email)
    .maybeSingle()

  const roleStr = String(profile?.role || "").toLowerCase()
  const isAdmin = profile?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
  const inmobiliariaId = profile?.inmobiliaria ?? null

  let adminData: any[] | null = null
  let inferredColumns: string[] = []
  try {
    const admin = createAdminClient()
    const { data: rawAdminData } = await admin.from("comunicaciones").select("*").order("created_at", { ascending: false }).limit(200)
    adminData = rawAdminData || []
    inferredColumns = rawAdminData && rawAdminData.length > 0 ? Object.keys(rawAdminData[0]) : []
  } catch {}

  let query = supabase.from("comunicaciones").select("*").order("created_at", { ascending: false }).limit(200)
  if (inmobiliariaId != null) {
    const inmobiliariaValue = String(inmobiliariaId)
    query = query.eq("inmobiliaria", inmobiliariaValue)
  }

  const { data, error } = await query
  if (error) {
    const message = error.message || "Error al cargar comunicaciones"
    if (message.toLowerCase().includes("permission") || message.toLowerCase().includes("rls")) {
      if (adminData && isAdmin) {
        if (inmobiliariaId != null) {
          const inmobiliariaValue = String(inmobiliariaId)
          const filtered = adminData.filter((row: any) => {
            if (row == null) return false
            if (row.inmobiliaria != null && String(row.inmobiliaria) === inmobiliariaValue) return true
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
    if (inmobiliariaId != null) {
      const inmobiliariaValue = String(inmobiliariaId)
      const filtered = adminData.filter((row: any) => {
        if (row == null) return false
        if (row.inmobiliaria != null && String(row.inmobiliaria) === inmobiliariaValue) return true
        return false
      })
      return { data: filtered, columns: [], error: null }
    }
    return { data: adminData, columns: [], error: null }
  }

  return { data: data || [], columns: [], error: null }
}

export async function createComunicacion(payload: Record<string, any>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autenticado" }
  }

  const { data: profile } = await supabase
    .from("Perfiles")
    .select("inmobiliaria, is_admin, role")
    .eq("usuario", user.email)
    .maybeSingle()

  const roleStr = String(profile?.role || "").toLowerCase()
  const isAdmin = profile?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
  const inmobiliariaId = profile?.inmobiliaria ?? null

  const nextPayload = { ...payload }
  if (inmobiliariaId != null) {
    const inmobiliariaValue = String(inmobiliariaId)
    if (!nextPayload.inmobiliaria) nextPayload.inmobiliaria = inmobiliariaValue
  }

  const { error } = await supabase.from("comunicaciones").insert([nextPayload])
  if (error) return { error: error.message }
  return { error: null }
}

export async function updateComunicacion(keyField: string, keyValue: string | number, payload: Record<string, any>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "No autenticado" }
  }

  const { data: profile } = await supabase
    .from("Perfiles")
    .select("inmobiliaria, is_admin, role")
    .eq("usuario", user.email)
    .maybeSingle()

  const roleStr = String(profile?.role || "").toLowerCase()
  const isAdmin = profile?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
  const inmobiliariaId = profile?.inmobiliaria ?? null

  if (isAdmin) {
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

  let query = supabase.from("comunicaciones").update(payload).eq(keyField, keyValue)
  if (inmobiliariaId != null) {
    query = query.eq("inmobiliaria", String(inmobiliariaId))
  }
  const { data, error } = await query.select()
  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: "No tienes permisos para actualizar esta comunicación" }
  return { error: null }
}
