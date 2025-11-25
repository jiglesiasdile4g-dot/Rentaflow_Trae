import { NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    const target = u.searchParams.get("url")
    if (!target) return NextResponse.json({ error: "url requerida" }, { status: 400 })
    const allowInsecure = process.env.NEXTCLOUD_ALLOW_INSECURE === "1"
    if (allowInsecure) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
    }
    const baseUrl = process.env.NEXTCLOUD_URL
    const user = process.env.NEXTCLOUD_USERNAME
    const pass = process.env.NEXTCLOUD_PASSWORD
    const isFileRoute = /^\/?api\/nextcloud\/file/i.test(target)
    if (isFileRoute && baseUrl && user && pass) {
      const q = new URLSearchParams(target.split("?")[1] || "")
      const p = q.get("path") || ""
      if (!p) return NextResponse.json({ error: "path requerido" }, { status: 400 })
      const ensureEncoded = (s0: string) => {
        let s = s0
        for (let i = 0; i < 3; i++) {
          try {
            const d = decodeURIComponent(s)
            if (d === s) break
            s = d
          } catch {
            break
          }
        }
        return s.split("/").map((seg) => encodeURIComponent(seg)).join("/")
      }
      const encodedPath = ensureEncoded(p)
      const root = baseUrl.replace(/\/$/, "")
      const userEnc = encodeURIComponent(user)
      const userLowerEnc = encodeURIComponent(user.toLowerCase())
      const auth = { Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}` }
      const safeFetch = async (url: string, opts: any) => {
        try { return await fetch(url, opts) } catch { return null as any }
      }
      let url = `${root}/remote.php/dav/files/${userEnc}/${encodedPath}`
      let res = await safeFetch(url, { headers: auth })
      if (!res || (!res.ok && res.status === 404 && userLowerEnc !== userEnc)) {
        url = `${root}/remote.php/dav/files/${userLowerEnc}/${encodedPath}`
        res = await safeFetch(url, { headers: auth })
      }
      if (!res || (!res.ok && res.status === 404)) {
        url = `${root}/remote.php/webdav/${encodedPath}`
        res = await safeFetch(url, { headers: auth })
      }
      if (!res || !res.ok) return NextResponse.json({ error: "no descargado" }, { status: 502 })
      const ct = res.headers.get("content-type") || "application/pdf"
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, { headers: { "Content-Type": ct, "Content-Disposition": "inline", "Cache-Control": "private, max-age=60" } })
    } else {
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
      return new NextResponse(buf, { headers: { "Content-Type": ct, "Content-Disposition": "inline", "Cache-Control": "private, max-age=60" } })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}