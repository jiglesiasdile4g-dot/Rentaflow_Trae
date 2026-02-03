import { NextResponse } from "next/server"

export const runtime = "nodejs"

if (process.env.NEXTCLOUD_ALLOW_INSECURE === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
}

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

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 10000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Timeout después de ${timeoutMs}ms`)
    }
    throw error
  }
}

export async function GET(req: Request) {
  try {
    let u: URL
    try {
      u = new URL(req.url)
    } catch {
      u = new URL(req.url, "http://localhost")
    }
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
    const userValue = user as string
    const passValue = pass as string
    const encodedPath = segments.map((s) => encodeURIComponent(s)).join("/")
    const folderPath = segments.join("/")
    const base = `${baseUrl.replace(/\/$/, "")}/remote.php/dav/files/`
    const userEnc = encodeURIComponent(userValue)
    const userLowerEnc = encodeURIComponent(userValue.toLowerCase())
    let userUsed = userEnc
    let webdavUrl = `${base}${userEnc}/${encodedPath}/`
    console.log("[Nextcloud List] Requesting:", webdavUrl)

    const body = `<?xml version="1.0" encoding="utf-8"?>\n<d:propfind xmlns:d="DAV:">\n  <d:prop>\n    <d:displayname/>\n    <d:getcontenttype/>\n    <d:getlastmodified/>\n    <d:getcontentlength/>\n    <d:resourcetype/>\n  </d:prop>\n</d:propfind>`
    let res
    let attemptCount = 0
    const maxAttempts = 3
    
    async function tryFetch(url: string, attemptNum: number): Promise<Response> {
      console.log(`[Nextcloud List] Intentando fetch #${attemptNum}:`, url)
      try {
        return await fetchWithTimeout(url, {
          method: "PROPFIND",
          headers: {
            Authorization: basicAuthHeader(userValue, passValue),
            Depth: "1",
            "Content-Type": "text/xml",
          },
          body,
        }, 10000) // 10 segundos de timeout
      } catch (error: any) {
        console.error(`[Nextcloud List] Intento #${attemptNum} falló:`, error.message)
        throw error
      }
    }
    
    try {
      attemptCount++
      res = await tryFetch(webdavUrl, attemptCount)
    } catch (fetchErr: any) {
      console.error("[Nextcloud List] Fetch error:", fetchErr)
      const isRefused = fetchErr?.cause?.code === "ECONNREFUSED"
      const isTimeout = fetchErr.message?.includes("Timeout")
      const msg = isTimeout
        ? `Timeout conectando a Nextcloud (10s). El servidor podría estar sobrecargado.`
        : isRefused 
        ? `No se puede conectar a Nextcloud en ${baseUrl}. ¿Está encendido?` 
        : `Error conectando a Nextcloud: ${fetchErr?.message || "Error desconocido"}`
      
      return NextResponse.json({ 
        error: msg, 
        details: fetchErr?.message,
        cause: fetchErr?.cause,
        url: webdavUrl,
        baseUrl: baseUrl
      }, { status: 500 })
    }
    console.log("[Nextcloud List] Primary response status:", res.status)

    // Implementar lógica de reintentos con límite de 3 intentos
    let currentFolderPath = folderPath
    const retryStrategies = []
    
    // Estrategia 1: Usuario en minúsculas (si aplica)
    if (!res.ok && res.status === 404 && userLowerEnc !== userEnc && attemptCount < maxAttempts) {
      retryStrategies.push(async () => {
        attemptCount++
        userUsed = userLowerEnc
        webdavUrl = `${base}${userLowerEnc}/${encodedPath}/`
        console.log(`[Nextcloud List] Intento #${attemptCount} - Usuario minúsculas:`, webdavUrl)
        return await tryFetch(webdavUrl, attemptCount)
      })
    }
    
    // Estrategia 2: Ruta alternativa (sin inmobiliaria)
    if (!res.ok && res.status === 404 && attemptCount < maxAttempts) {
      retryStrategies.push(async () => {
        attemptCount++
        const altSegments = [rootPath, referencia].filter(Boolean)
        const altEncoded = altSegments.map((s) => encodeURIComponent(s)).join("/")
        currentFolderPath = altSegments.join("/")
        let altUrl = `${base}${userUsed}/${altEncoded}/`
        console.log(`[Nextcloud List] Intento #${attemptCount} - Ruta alternativa:`, altUrl)
        return await tryFetch(altUrl, attemptCount)
      })
    }
    
    // Estrategia 3: Usuario minúsculas con ruta alternativa
    if (!res.ok && res.status === 404 && userLowerEnc !== userEnc && attemptCount < maxAttempts) {
      retryStrategies.push(async () => {
        attemptCount++
        const altSegments = [rootPath, referencia].filter(Boolean)
        const altEncoded = altSegments.map((s) => encodeURIComponent(s)).join("/")
        currentFolderPath = altSegments.join("/")
        userUsed = userLowerEnc
        let altUrl = `${base}${userLowerEnc}/${altEncoded}/`
        console.log(`[Nextcloud List] Intento #${attemptCount} - Usuario minúsculas + ruta alternativa:`, altUrl)
        return await tryFetch(altUrl, attemptCount)
      })
    }
    
    // Ejecutar estrategias de reintento
    for (const strategy of retryStrategies) {
      if (!res.ok && attemptCount < maxAttempts) {
        try {
          res = await strategy()
        } catch (strategyErr: any) {
          console.error(`[Nextcloud List] Estrategia de reintento falló:`, strategyErr.message)
          // Continuar con la siguiente estrategia
        }
      }
    }
    
    // Si después de todos los intentos sigue sin estar ok, retornar lista vacía
    if (!res.ok) {
      console.log(`[Nextcloud List] Todos los intentos fallaron (${attemptCount}/${maxAttempts}). Status:`, res.status)
      return NextResponse.json({ 
        folder: folderPath, 
        files: [], 
        recent: [], 
        error: "No se pudieron listar los archivos de Nextcloud después de varios intentos",
        attempts: attemptCount,
        maxAttempts: maxAttempts
      })
    }
    
    const xml = await res.text()
    console.log("[Nextcloud List] XML length:", xml.length)
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
    console.error("[Nextcloud List] Exception:", e)
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}
