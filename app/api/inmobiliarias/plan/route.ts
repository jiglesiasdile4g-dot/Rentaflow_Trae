import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const planId = Number(body?.planId)
    const idi = Number(body?.idi)
    const forceImmediate = body?.forceImmediate === true

    if (!planId || !idi) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 })
    }

    const { data: currRow, error: currErr } = await supabase
      .from("Inmobiliarias")
      .select("idi, Plan, PlanResetAt")
      .eq("idi", idi)
      .maybeSingle()
    if (currErr) {
      return NextResponse.json({ ok: false, error: currErr.message }, { status: 400 })
    }

    const currentPlanId = Number(currRow?.Plan) || 0
    const resetAt = currRow?.PlanResetAt ? new Date(currRow.PlanResetAt) : null

    let currentLimit = 1000000
    let newLimit = 1000000
    try {
      const { data: planes } = await supabase.from("Planes").select("*")
      const normalize = (p: any) => ({ ...p, ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0 })
      const normalized = (planes || []).map(normalize)
      const currMatch = normalized.find((p: any) => p?.idp === currentPlanId || (p as any)?.id === currentPlanId)
      const newMatch = normalized.find((p: any) => p?.idp === planId || (p as any)?.id === planId)
      if (currMatch) currentLimit = Number(currMatch.ejecuciones) || 1000000
      if (newMatch) newLimit = Number(newMatch.ejecuciones) || 1000000
    } catch {}

    const now = new Date()
    const nextRenewal = (() => {
      const base = resetAt || new Date(now.getFullYear(), now.getMonth(), 1)
      const y = base.getFullYear()
      const mNext = base.getMonth() + 1
      const d = base.getDate()
      const last = new Date(y, mNext + 1, 0).getDate()
      return new Date(y, mNext, Math.min(d, last))
    })()

    const isDowngrade = newLimit < currentLimit
    
    // Si es downgrade y NO se fuerza el cambio inmediato, se programa para el siguiente periodo
    if (isDowngrade && now < nextRenewal && !forceImmediate) {
      let scheduledOk = false
      let scheduledError: any = null
      try {
        const { data: schedData, error: schedErr } = await supabase
          .from("Inmobiliarias")
          .update({ PlanNext: planId, PlanNextEffectiveAt: nextRenewal.toISOString() })
          .eq("idi", idi)
          .select("idi, PlanNext, PlanNextEffectiveAt")
        if (schedErr) {
          scheduledError = schedErr
        }
        scheduledOk = Array.isArray(schedData) ? schedData.length > 0 : !!schedData
      } catch (e: any) {
        scheduledError = e
      }
      if (!scheduledOk) {
        const msg = String(scheduledError?.message || "")
        if (
          msg.toLowerCase().includes("column") ||
          msg.toLowerCase().includes("does not exist") ||
          msg.includes("PlanNext") ||
          msg.includes("PlanNextEffectiveAt")
        ) {
          return NextResponse.json(
            {
              ok: false,
              error: "Faltan columnas para programar el downgrade. Aplique la migración 009_add_plan_next.sql",
              policy: "schedule_required",
              nextRenewal: nextRenewal.toISOString(),
            },
            { status: 400 },
          )
        }
        return NextResponse.json(
          { ok: false, error: scheduledError?.message || "No se pudo programar el downgrade" },
          { status: 400 },
        )
      }
      return NextResponse.json({ ok: true, scheduled: true, scheduledAt: nextRenewal.toISOString() })
    }

    const nowIso = new Date().toISOString()
    let { data, error } = await supabase
      .from("Inmobiliarias")
      .update({ Plan: planId, PlanResetAt: nowIso })
      .eq("idi", idi)
      .select("idi, Plan, PlanResetAt")

    if (error) {
      const msg = String(error.message || "")
      if (msg.includes("PlanResetAt") || msg.toLowerCase().includes("column") || msg.toLowerCase().includes("does not exist")) {
        const fallback = await supabase
          .from("Inmobiliarias")
          .update({ Plan: planId })
          .eq("idi", idi)
          .select("idi, Plan")
        data = fallback.data as any
        error = fallback.error as any
      }
      if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
      }
    }

    return NextResponse.json({ ok: true, updated: Array.isArray(data) ? data.length : 0, resetAt: nowIso })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}