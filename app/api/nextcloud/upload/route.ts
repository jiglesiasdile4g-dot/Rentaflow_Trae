import { NextResponse } from "next/server"

export const runtime = "nodejs"

if (process.env.NEXTCLOUD_ALLOW_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

function basicAuthHeader(user: string, pass: string) {
  const token = Buffer.from(`${user}:${pass}`).toString("base64")
  return `Basic ${token}`
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function mkcolWithRetry(url: string, auth: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "MKCOL", headers: { Authorization: auth } })
    if (res.status === 429) {
      const ra = parseInt(res.headers.get("retry-after") || "0", 10)
      await sleep((ra > 0 ? ra : 1) * 1000 * (attempt + 1))
      continue
    }
    if (res.ok || res.status === 405 || res.status === 409) {
      return true
    }
  }
  return false
}

async function putWithRetry(url: string, body: ArrayBuffer, contentType: string, auth: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "PUT", headers: { Authorization: auth, "Content-Type": contentType }, body })
    if (res.status === 429) {
      const ra = parseInt(res.headers.get("retry-after") || "0", 10)
      await sleep((ra > 0 ? ra : 1) * 1000 * (attempt + 1))
      continue
    }
    if (res.ok) return res
  }
  return null
}

async function deleteWithRetry(url: string, auth: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "DELETE", headers: { Authorization: auth } })
    if (res.status === 429) {
      const ra = parseInt(res.headers.get("retry-after") || "0", 10)
      await sleep((ra > 0 ? ra : 1) * 1000 * (attempt + 1))
      continue
    }
    if (res.ok || res.status === 204 || res.status === 404) return true
  }
  return false
}

function tag(xml: string, name: string) {
  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, "i")
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

async function listFolderEntries(folderUrl: string, auth: string) {
  const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:">\n  <d:prop>\n    <d:displayname/>\n    <d:getcontenttype/>\n    <d:getlastmodified/>\n    <d:getcontentlength/>\n    <d:resourcetype/>\n  </d:prop>\n</d:propfind>`
  const res = await fetch(folderUrl, { method: "PROPFIND", headers: { Authorization: auth, Depth: "1", "Content-Type": "text/xml" }, body })
  if (!res.ok) return [] as Array<{ name: string; lastModified: string }>
  const xml = await res.text()
  const responses = xml.match(/<d:response[\s\S]*?<\/d:response>/gi) || []
  const out: Array<{ name: string; lastModified: string }> = []
  for (const r of responses) {
    const resType = tag200(r, "d:resourcetype") || tag200(r, "resourcetype")
    const isDir = /<d:collection\b/i.test(resType)
    if (isDir) continue
    const name = tag200(r, "d:displayname") || tag200(r, "displayname")
    const last = tag200(r, "d:getlastmodified") || tag200(r, "getlastmodified")
    if (name) out.push({ name, lastModified: last })
  }
  return out
}

async function cleanupDuplicates(folderUrl: string, auth: string, baseNames: string[]) {
  const entries = await listFolderEntries(folderUrl, auth)
  const targets = new Map<string, Array<{ name: string; last: number }>>()
  for (const e of entries) {
    const base = stripTimestampName(e.name)
    const key = base.toLowerCase()
    const last = Date.parse(e.lastModified || "") || 0
    const arr = targets.get(key) || []
    arr.push({ name: e.name, last })
    targets.set(key, arr)
  }
  for (const base of baseNames) {
    const arr = targets.get(base.toLowerCase()) || []
    if (arr.length <= 1) continue
    arr.sort((a, b) => b.last - a.last)
    const keep = arr[0]?.name || ""
    for (let i = 1; i < arr.length; i++) {
      const n = arr[i].name
      const delUrl = `${folderUrl}${encodeURIComponent(n)}`
      await deleteWithRetry(delUrl, auth)
    }
  }
}

export async function POST(req: Request) {
  try {
    const baseUrl = process.env.NEXTCLOUD_URL
    const user = process.env.NEXTCLOUD_USERNAME
    const pass = process.env.NEXTCLOUD_PASSWORD
    const rootPath = process.env.NEXTCLOUD_ROOT_PATH || ""
    if (!baseUrl || !user || !pass) {
      return NextResponse.json({ error: "Nextcloud no configurado" }, { status: 500 })
    }

    const form = await req.formData()
    const files = form.getAll("files").filter((x) => x instanceof File) as File[]
    const f = (form.get("file") as File | null) || null
    const referencia = String(form.get("referencia") || "")
    const inmobiliaria = String(form.get("inmobiliaria") || "")
    const filenameOverride = String(form.get("filename") || "")
    if (((!files || files.length === 0) && !f) || !referencia || !inmobiliaria) {
      return NextResponse.json({ error: "files/file, referencia e inmobiliaria requeridos" }, { status: 400 })
    }

    const segments = [rootPath, inmobiliaria, referencia].filter(Boolean)
    const encodedSegments = segments.map((s) => encodeURIComponent(s))
    const folderPath = segments.join("/")
    const encodedFolderPath = encodedSegments.join("/")
    const baseRoot = `${baseUrl.replace(/\/$/, "")}/remote.php/dav/files/`
    const userEnc = encodeURIComponent(user)
    const userLowerEnc = encodeURIComponent(user.toLowerCase())
    let base = `${baseRoot}${userEnc}`
    let folderUrl = `${base}/${encodedFolderPath}/`
    const acc: string[] = []
    const auth = basicAuthHeader(user, pass)
    let mkcolOk = true
    for (const part of encodedSegments) {
      acc.push(part)
      const url = `${base}/${acc.join("/")}/`
      const ok = await mkcolWithRetry(url, auth)
      if (!ok) { mkcolOk = false; break }
    }
    if (!mkcolOk && userLowerEnc !== userEnc) {
      // fallback con user_id en minúsculas
      base = `${baseRoot}${userLowerEnc}`
      folderUrl = `${base}/${encodedFolderPath}/`
      acc.length = 0
      mkcolOk = true
      for (const part of encodedSegments) {
        acc.push(part)
        const url = `${base}/${acc.join("/")}/`
        const ok = await mkcolWithRetry(url, auth)
        if (!ok) { mkcolOk = false; break }
      }
    }
    if (!mkcolOk) {
      return NextResponse.json({ error: "No se pudo crear carpeta en Nextcloud" }, { status: 502 })
    }

    const uploadOne = async (file: File, overrideName?: string) => {
      const name = overrideName || file.name || "archivo"
      const outName = name
      const targetUrl = `${folderUrl}${encodeURIComponent(outName)}`
      const buf = await file.arrayBuffer()
      const res = await putWithRetry(targetUrl, buf, file.type || "application/octet-stream", auth)
      if (!res) {
        throw new Error("No se pudo subir archivo (429/errores)")
      }
      return { path: `${folderPath}/${outName}`, name: outName }
    }

    const results: Array<{ path: string; name: string }> = []
    if (files && files.length > 0) {
      for (const file of files) {
        const r = await uploadOne(file)
        results.push(r)
      }
    } else if (f) {
      const r = await uploadOne(f, filenameOverride)
      results.push(r)
    }

    const bases = Array.from(new Set(results.map((r) => stripTimestampName(r.name || "")).filter(Boolean)))
    if (bases.length > 0) {
      await cleanupDuplicates(folderUrl, auth, bases)
    }

    const webhookUrl = process.env.N8N_WEBHOOK_URL || "https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/subirdoc"
    if (webhookUrl) {
      const fd = new FormData()
      fd.append("referencia", referencia)
      fd.append("inmobiliaria", inmobiliaria)
      const toSend: File[] = (files && files.length > 0) ? files : (f ? [f] : [])
      for (const file of toSend) {
        fd.append("files", file)
      }
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)
        await fetch(webhookUrl, { method: "POST", body: fd, signal: controller.signal })
        clearTimeout(timeout)
      } catch {}
    }

    return NextResponse.json({ uploaded: results })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}
