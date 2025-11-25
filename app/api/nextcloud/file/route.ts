import { NextResponse } from "next/server"

export const runtime = "nodejs"

function basicAuthHeader(user: string, pass: string) {
  const token = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${token}`
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    const path = u.searchParams.get("path")
    const baseUrl = process.env.NEXTCLOUD_URL
    const user = process.env.NEXTCLOUD_USERNAME
    const pass = process.env.NEXTCLOUD_PASSWORD
    if (!baseUrl || !user || !pass) {
      return NextResponse.json({ error: "Nextcloud no configurado" }, { status: 500 })
    }
    if (!path) {
      return NextResponse.json({ error: "path requerido" }, { status: 400 })
    }
    const ensureEncoded = (p: string) => {
      let s = p
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
    const encodedPath = ensureEncoded(path)
    const url = `${baseUrl.replace(/\/$/, "")}/remote.php/dav/files/${encodeURIComponent(user)}/${encodedPath}`
    const res = await fetch(url, { headers: { Authorization: basicAuthHeader(user, pass) } })
    if (!res.ok) {
      return NextResponse.json({ error: `Error WebDAV ${res.status}` }, { status: 502 })
    }
    const ct = res.headers.get("content-type") || "application/octet-stream"
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, { headers: { "Content-Type": ct, "Cache-Control": "private, max-age=60" } })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const u = new URL(req.url)
    const path = u.searchParams.get("path")
    const baseUrl = process.env.NEXTCLOUD_URL
    const user = process.env.NEXTCLOUD_USERNAME
    const pass = process.env.NEXTCLOUD_PASSWORD
    if (!baseUrl || !user || !pass) {
      return NextResponse.json({ error: "Nextcloud no configurado" }, { status: 500 })
    }
    if (!path) {
      return NextResponse.json({ error: "path requerido" }, { status: 400 })
    }
    const ensureEncoded = (p: string) => {
      let s = p
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
    const encodedPath = ensureEncoded(path)
    const url = `${baseUrl.replace(/\/$/, "")}/remote.php/dav/files/${encodeURIComponent(user)}/${encodedPath}`
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: basicAuthHeader(user, pass) } })
    if (res.status === 404) {
      return NextResponse.json({ ok: true, status: 404 })
    }
    if (!res.ok && res.status !== 204) {
      return NextResponse.json({ error: `Error WebDAV ${res.status}` }, { status: 502 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}