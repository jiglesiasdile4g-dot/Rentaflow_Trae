import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  const sanitizeEnvUrl = (value: string | undefined) => {
    const raw = String(value || "").trim()
    const unquoted = raw.replace(/^[`"']+|[`"']+$/g, "").trim()
    return unquoted.replace(/\/+$/, "")
  }
  const supabaseUrl = sanitizeEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
  if (!id) {
    return NextResponse.json({ ok: true, supabaseUrl }, { status: 200 })
  }

  const supabase = createAdminClient()

  try {
    const { data, error } = await supabase
      .from("Clientes")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code, details: error }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
