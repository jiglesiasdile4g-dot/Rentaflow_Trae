import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    const target = u.searchParams.get("url")
    if (!target) return NextResponse.json({ error: "url requerida" }, { status: 400 })
    let finalUrl = target
    try {
      new URL(target)
    } catch {
      finalUrl = new URL(target, `${u.protocol}//${u.host}`).toString()
    }
    const res = await fetch(finalUrl)
    if (!res.ok) return NextResponse.json({ error: "no descargado" }, { status: 502 })
    const ct = res.headers.get("content-type") || "application/pdf"
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        "Content-Type": ct,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=60",
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}