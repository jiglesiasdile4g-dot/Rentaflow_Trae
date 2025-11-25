import { NextResponse } from "next/server"

export const runtime = "nodejs"

function basicAuthHeader(user: string, pass: string) {
  const token = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${token}`
}

function tag(xml: string, name: string) {
  const re = new RegExp(`<${name}[^>]*>([\s\S]*?)<\/${name}>`, "i")
  const m = xml.match(re)
  return m ? m[1] : ""
}

function tag200(xml: string, name: string) {
  const blocks = xml.match(/<d:propstat[\s\S]*?<\/d:propstat>/gi) || []
  for (const b of blocks) {
    const sm = b.match(/<d:status[^>]*>([\s\S]*?)<\/d:status>/i)
    const s = sm ? sm[1] : ""
    if (/200\s+OK/i.test(s)) {
      const m = b.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i"))
      if (m) return m[1]
      const sc = b.match(new RegExp(`<${name}[^>]*\\/\\s*>`, "i"))
      if (sc) return ""
    }
  }
  return tag(xml, name)
}

function stripTimestampName(s: string) {
  const m = s.match(/^(\d{13})-(.+)$/)
  return m ? m[2] : s
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url)
    const referencia = u.searchParams.get("referencia") || ""
    const inmobiliaria = u.searchParams.get("inmobiliaria") || ""
    const debug = u.searchParams.get("debug") === "1"
    const baseUrl = process.env.NEXTCLOUD_URL
    const user = process.env.NEXTCLOUD_USERNAME
    const pass = process.env.NEXTCLOUD_PASSWORD
    const rootPath = process.env.NEXTCLOUD_ROOT_PATH || ""
    if (!baseUrl || !user || !pass) {
      return NextResponse.json({ error: "Nextcloud no configurado" }, { status: 500 })
    }
    if (!referencia || !inmobiliaria) {
      return NextResponse.json({ error: "referencia e inmobiliaria requeridas" }, { status: 400 })
    }
    const segments = [rootPath, inmobiliaria, referencia].filter(Boolean)
    const encodedPath = segments.map((s) => encodeURIComponent(s)).join("/")
    const folderPath = segments.join("/")
    const base = `${baseUrl.replace(/\/$/, "")}/remote.php/dav/files/`
    const userEnc = encodeURIComponent(user)
    const userLowerEnc = encodeURIComponent(user.toLowerCase())
    let userUsed = userEnc
    let webdavUrl = `${base}${userEnc}/${encodedPath}/`
    const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:">\n  <d:prop>\n    <d:displayname/>\n    <d:getcontenttype/>\n    <d:getlastmodified/>\n    <d:getcontentlength/>\n    <d:resourcetype/>\n  </d:prop>\n</d:propfind>`
    let res = await fetch(webdavUrl, {
      method: "PROPFIND",
      headers: {
        Authorization: basicAuthHeader(user, pass),
        Depth: "1",
        "Content-Type": "text/xml",
      },
      body,
    })
    if (!res.ok && res.status === 404 && userLowerEnc !== userEnc) {
      userUsed = userLowerEnc
      webdavUrl = `${base}${userLowerEnc}/${encodedPath}/`
      res = await fetch(webdavUrl, {
        method: "PROPFIND",
        headers: {
          Authorization: basicAuthHeader(user, pass),
          Depth: "1",
          "Content-Type": "text/xml",
        },
        body,
      })
    }
    if (!res.ok && res.status === 404) {
      const altSegments = [rootPath, referencia].filter(Boolean)
      const altEncoded = altSegments.map((s) => encodeURIComponent(s)).join("/")
      const altFolderPath = altSegments.join("/")
      let altUrl = `${base}${userUsed}/${altEncoded}/`
      res = await fetch(altUrl, {
        method: "PROPFIND",
        headers: {
          Authorization: basicAuthHeader(user, pass),
          Depth: "1",
          "Content-Type": "text/xml",
        },
        body,
      })
      if (!res.ok && res.status === 404 && userLowerEnc !== userUsed) {
        userUsed = userLowerEnc
        altUrl = `${base}${userUsed}/${altEncoded}/`
        res = await fetch(altUrl, {
          method: "PROPFIND",
          headers: {
            Authorization: basicAuthHeader(user, pass),
            Depth: "1",
            "Content-Type": "text/xml",
          },
          body,
        })
      }
      if (!res.ok) {
        return NextResponse.json({ folder: altFolderPath, files: [], recent: [] })
      }
      const xml = await res.text()
      if (debug) {
        return NextResponse.json({ folder: altFolderPath, xml })
      }
      const responses = xml.match(/<d:response[\s\S]*?<\/d:response>/gi) || []
      const userCandidates = userEnc !== userLowerEnc ? [userEnc, userLowerEnc] : [userEnc]
      const prefixes = [
        ...userCandidates.map((u) => `/remote.php/dav/files/${u}/`),
        `/remote.php/webdav/`,
      ]
      const now = Date.now()
      const files = [] as Array<{ name: string; path: string; href: string; lastModified: string; size: number; contentType: string }>
      for (const r of responses) {
      let href = tag(r, "d:href") || tag(r, "href")
      if (href && /^https?:\/\//i.test(href)) {
        try { href = new URL(href).pathname } catch {}
      }
      const resType = tag200(r, "d:resourcetype") || tag200(r, "resourcetype")
      const isDir = /<d:collection\b/i.test(resType) || /\/$/.test(href || "")
      if (isDir) continue
      const displayname = tag200(r, "d:displayname") || tag200(r, "displayname")
      const last = tag200(r, "d:getlastmodified") || tag200(r, "getlastmodified")
      const ctype = tag200(r, "d:getcontenttype") || tag200(r, "getcontenttype") || ""
      const clen = parseInt(tag200(r, "d:getcontentlength") || "0", 10) || 0
      let rel = href || ""
      for (const p of prefixes) {
        if (rel.startsWith(p)) { rel = rel.slice(p.length); break }
      }
      const safeLast = rel ? rel.split("/").pop() || "" : ""
      const name = displayname || safeLast || (href ? href.split("/").pop() || "" : "")
      if (!rel) {
        const basePath = altFolderPath
        const baseName = name || (href ? href.split("/").pop() || "" : "")
        rel = [basePath, baseName].filter(Boolean).join("/")
      }
      files.push({ name, path: rel, href, lastModified: last, size: clen, contentType: ctype })
      }
      const byBase = new Map<string, { name: string; path: string; href: string; lastModified: string; size: number; contentType: string }>()
      for (const f of files) {
        const base = stripTimestampName(f.name || "")
        const key = base.toLowerCase()
        const prev = byBase.get(key)
        const ct = Date.parse(f.lastModified) || 0
        const pt = prev ? (Date.parse(prev.lastModified) || 0) : -1
        if (!prev || ct >= pt) {
          byBase.set(key, { ...f, name: base })
        }
      }
      const dedup = Array.from(byBase.values())
      dedup.sort((a, b) => (Date.parse(b.lastModified) || 0) - (Date.parse(a.lastModified) || 0))
      const recentWindowMs = 24 * 60 * 60 * 1000
      const recent = dedup.filter((f) => now - (Date.parse(f.lastModified) || 0) <= recentWindowMs)
      return NextResponse.json({ folder: altFolderPath, files: dedup, recent })
    }
    if (!res.ok) {
      return NextResponse.json({ error: `Error WebDAV ${res.status}` }, { status: 502 })
    }
    const xml = await res.text()
    if (debug) {
      return NextResponse.json({ folder: folderPath, xml })
    }
    const responses = xml.match(/<d:response[\s\S]*?<\/d:response>/gi) || []
    const userCandidates = userEnc !== userLowerEnc ? [userEnc, userLowerEnc] : [userEnc]
    const prefixes = [
      ...userCandidates.map((u) => `/remote.php/dav/files/${u}/`),
      `/remote.php/webdav/`,
    ]
    const now = Date.now()
    const files = [] as Array<{ name: string; path: string; href: string; lastModified: string; size: number; contentType: string }>
    for (const r of responses) {
      let href = tag(r, "d:href") || tag(r, "href")
      if (href && /^https?:\/\//i.test(href)) {
        try { href = new URL(href).pathname } catch {}
      }
      const resType = tag200(r, "d:resourcetype") || tag200(r, "resourcetype")
      const isDir = /<d:collection\b/i.test(resType) || /\/$/.test(href || "")
      if (isDir) continue
      const displayname = tag200(r, "d:displayname") || tag200(r, "displayname")
      const last = tag200(r, "d:getlastmodified") || tag200(r, "getlastmodified")
      const ctype = tag200(r, "d:getcontenttype") || tag200(r, "getcontenttype") || ""
      const clen = parseInt(tag200(r, "d:getcontentlength") || "0", 10) || 0
      let rel = href || ""
      for (const p of prefixes) {
        if (rel.startsWith(p)) { rel = rel.slice(p.length); break }
      }
      const safeLast = rel ? rel.split("/").pop() || "" : ""
      const name = displayname || safeLast || (href ? href.split("/").pop() || "" : "")
      if (!rel) {
        const basePath = folderPath
        const baseName = name || (href ? href.split("/").pop() || "" : "")
        rel = [basePath, baseName].filter(Boolean).join("/")
      }
      files.push({ name, path: rel, href, lastModified: last, size: clen, contentType: ctype })
    }
    const byBase = new Map<string, { name: string; path: string; href: string; lastModified: string; size: number; contentType: string }>()
    for (const f of files) {
      const base = stripTimestampName(f.name || "")
      const key = base.toLowerCase()
      const prev = byBase.get(key)
      const ct = Date.parse(f.lastModified) || 0
      const pt = prev ? (Date.parse(prev.lastModified) || 0) : -1
      if (!prev || ct >= pt) {
        byBase.set(key, { ...f, name: base })
      }
    }
    const dedup = Array.from(byBase.values())
    dedup.sort((a, b) => (Date.parse(b.lastModified) || 0) - (Date.parse(a.lastModified) || 0))
    const recentWindowMs = 24 * 60 * 60 * 1000
    const recent = dedup.filter((f) => now - (Date.parse(f.lastModified) || 0) <= recentWindowMs)
    return NextResponse.json({ folder: folderPath, files: dedup, recent })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}