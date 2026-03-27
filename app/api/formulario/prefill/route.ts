import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const toNumberOrNull = (value: string | null) => {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  try {
    let url: URL
    try {
      url = new URL(req.url)
    } catch {
      url = new URL(req.url, "http://localhost")
    }

    const idc = url.searchParams.get("idc")
    const id = url.searchParams.get("id")
    const idi = url.searchParams.get("idi") || url.searchParams.get("inmobiliaria")
    
    const supabase = createAdminClient()
    const selectFields = [
      "\"ID\"",
      "Inmueble",
      "IDC",
      "usuario",
      "Entrada",
      "Fecha_de_Entrada",
      "Nombre",
      "Correo",
      "Telefono",
      "WhatsApp",
      "Codigo_Postal",
      "Ingresos",
      "Tipo_Documento",
      "Documento",
      "Pais",
      "Persona_2",
      "\"Correo 2\"",
      "\"Telefono 2\"",
      "\"Codigo_Postal 2\"",
      "Ingresos_2",
      "Tipo_Documento_2",
      "Documento_2",
      "Pais_2",
      "tipo",
      "Persona_3",
      "\"Correo 3\"",
      "\"Telefono 3\"",
      "\"Codigo_Postal 3\"",
      "Ingresos_3",
      "Tipo_Documento_3",
      "Documento_3",
      "\"Pais 3\"",
      "tipo2",
      "Persona_4",
      "\"Correo 4\"",
      "\"Coreo 4\"",
      "\"Telefono 4\"",
      "\"Codigo_Postal 4\"",
      "Ingresos_4",
      "\"Tipo_Documento 4\"",
      "Documento_4",
      "\"Pais 4\"",
      "tipo3",
    ].join(", ")

    let lead: any = null
    const isMissingColumnError = (msg: string) => /does not exist|no existe|unknown column/i.test(msg)
    const fetchLead = async (column: string, value: string) => {
      const numeric = toNumberOrNull(value)
      const runQuery = async (selectValue: string) => {
        const query = supabase
          .from("Clientes")
          .select(selectValue)
          .eq(column, numeric != null ? numeric : value)
          .maybeSingle()
        return await query
      }
      const { data, error } = await runQuery(selectFields)
      if (error) {
        if (isMissingColumnError(error.message)) {
          const retry = await runQuery("*")
          if (retry.error) {
            return { error: retry.error.message, data: null }
          }
          return { error: null, data: retry.data }
        }
        return { error: error.message, data: null }
      }
      return { error: null, data }
    }

    if (idc || id) {
      if (idc) {
        const attempts = ["IDC", "Idc", "idc", "ID", "id"]
        let lastError: string | null = null
        for (const column of attempts) {
          const { data, error } = await fetchLead(column, idc)
          if (error) {
            lastError = error
            if (!/does not exist|no existe|unknown column/i.test(error)) {
              return NextResponse.json({ ok: false, error }, { status: 400 })
            }
            continue
          }
          if (data) {
            lead = data
            break
          }
        }
        if (!lead && lastError && !/does not exist|no existe|unknown column/i.test(lastError)) {
          return NextResponse.json({ ok: false, error: lastError }, { status: 400 })
        }
      } else if (id) {
        const attempts = ["id", "ID", "Id", "IDC"]
        let lastError: string | null = null
        for (const column of attempts) {
          const { data, error } = await fetchLead(column, id)
          if (error) {
            lastError = error
            if (!/does not exist|no existe|unknown column/i.test(error)) {
              return NextResponse.json({ ok: false, error }, { status: 400 })
            }
            continue
          }
          if (data) {
            lead = data
            break
          }
        }
        if (!lead && lastError && !/does not exist|no existe|unknown column/i.test(lastError)) {
          return NextResponse.json({ ok: false, error: lastError }, { status: 400 })
        }
      }
    }

    if ((idc || id) && !lead) {
      return NextResponse.json({ ok: false, error: "no_encontrado" }, { status: 404 })
    }

    const inmoId = idi || (lead?.usuario != null ? String(lead.usuario) : "")
    let inmobiliaria = null
    let anuncios: any[] = []

    if (inmoId) {
      const inmoQuery = async (selectValue: string) => {
        return await supabase.from("Inmobiliarias").select(selectValue).eq("idi", inmoId).maybeSingle()
      }
      const { data: inmoData, error: inmoErr } = await inmoQuery(
        "idi, Nombre, logo_url, color_primario, color_secundario, firma_html, pagina_web",
      )
      if (inmoErr) {
        if (isMissingColumnError(inmoErr.message)) {
          const retry = await inmoQuery("*")
          if (retry.error) {
            return NextResponse.json({ ok: false, error: retry.error.message }, { status: 400 })
          }
          inmobiliaria = retry.data || null
        } else {
          return NextResponse.json({ ok: false, error: inmoErr.message }, { status: 400 })
        }
      } else {
        inmobiliaria = inmoData || null
      }
    }

    const adsQuery = async (selectValue: string, withActive: boolean) => {
      let query = supabase.from("Anuncios").select(selectValue)
      if (inmoId) {
        query = query.eq("usuario", inmoId)
      }
      if (withActive) {
        query = query.eq("Activacion", "Activo")
      }
      return await query
    }
    
    const { data: adsData, error: adsErr } = await adsQuery("ida, Referencia, Direccion, Precio, Activacion, usuario", true)
    if (adsErr) {
      if (isMissingColumnError(adsErr.message)) {
        const retry = await adsQuery("ida, Referencia, Direccion, Precio, usuario", false)
        if (retry.error) {
          return NextResponse.json({ ok: false, error: retry.error.message }, { status: 400 })
        }
        anuncios = Array.isArray(retry.data) ? retry.data : []
      } else {
        return NextResponse.json({ ok: false, error: adsErr.message }, { status: 400 })
      }
    } else {
      anuncios = Array.isArray(adsData) ? adsData : []
    }

    return NextResponse.json({ ok: true, lead, inmobiliaria, anuncios })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || "error" }, { status: 500 })
  }
}
