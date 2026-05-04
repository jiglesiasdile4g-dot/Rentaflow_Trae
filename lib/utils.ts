import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function formatDate(date: string | Date | number | undefined | null): string {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  })
}

export function formatDateTime(date: string | Date | number | undefined | null): string {
  if (!date) return ""
  const d = new Date(date)
  if (isNaN(d.getTime())) return ""
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

export function formatWebhookDate(date: string | Date | number | undefined | null) {
  if (!date) return { date: null, time: null }
  const d = new Date(date)
  if (isNaN(d.getTime())) return { date: null, time: null }
  
  // Force DD/MM/YYYY format
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const dateStr = `${day}/${month}/${year}`

  const timeStr = d.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  })

  return { date: dateStr, time: timeStr }
}

export function maskEmail(value: any) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const at = raw.indexOf("@")
  if (at <= 1) return "***"
  const local = raw.slice(0, at)
  const domain = raw.slice(at + 1)
  const domainParts = domain.split(".").filter(Boolean)
  const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : ""
  const maskedLocal = local[0] + "***" + local.slice(-1)
  const maskedDomain = domainParts.length ? "***" + (tld ? "." + tld : "") : "***"
  return `${maskedLocal}@${maskedDomain}`
}

export function maskPhone(value: any) {
  const digits = String(value ?? "").replace(/\D/g, "")
  if (!digits) return ""
  const last4 = digits.slice(-4)
  return `***${last4}`
}

export function maskName(value: any) {
  const raw = String(value || "").trim()
  if (!raw) return ""
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 1) + "***"
  return parts
    .map((p, idx) => {
      if (!p) return ""
      if (idx === 0) return p.slice(0, 1) + "***"
      return p.slice(0, 1) + "."
    })
    .join(" ")
}

export function isDemoCookieEnabled(cookieString: string | undefined | null) {
  const s = String(cookieString || "")
  return /(?:^|;\s*)rf_demo=1(?:;|$)/.test(s)
}

export function getPublicAppBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || ""
  if (raw) return String(raw).replace(/\/$/, "")
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin
  return ""
}

export function buildBookingLink(leadId: string | number) {
  const base = getPublicAppBaseUrl()
  const id = encodeURIComponent(String(leadId ?? ""))
  return base ? `${base}/agendar-visita?leadId=${id}` : `/agendar-visita?leadId=${id}`
}

export function getN8nWebhookUrl(hook: string) {
  const baseRaw = process.env.NEXT_PUBLIC_N8N_BASE_URL || process.env.N8N_BASE_URL || ""
  const base = String(baseRaw || "").trim().replace(/\/$/, "")
  if (!base) return null
  const cleaned = String(hook || "").trim().replace(/^\/+/, "").replace(/^webhook\/+/, "")
  if (!cleaned) return null
  return `${base}/webhook/${cleaned}`
}
