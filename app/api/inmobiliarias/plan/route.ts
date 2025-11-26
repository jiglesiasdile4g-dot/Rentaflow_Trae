import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const body = await req.json().catch(() => ({}))
    const planId = Number(body?.planId)
    const idi = Number(body?.idi)
    if (!planId || !idi) {
      return NextResponse.json({ ok: false, error: "Parámetros inválidos" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("Inmobiliarias")
      .update({ Plan: planId })
      .eq("idi", idi)
      .select("idi, Plan")

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, updated: Array.isArray(data) ? data.length : 0 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "error" }, { status: 500 })
  }
}