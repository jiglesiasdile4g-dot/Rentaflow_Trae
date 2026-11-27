const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const SECRET = process.env.RECORDATORIO_VISITA_SECRET || process.env.REMINDER_WEBHOOK_SECRET || ""
const ENABLED = process.env.REMINDER_CRON_ENABLED === "1" || process.env.RECORDATORIO_VISITA_CRON === "1"

// Recordatorio de leads con datos incompletos (una sola vez por lead).
const INCOMPLETOS_SECRET = process.env.RECORDATORIO_INCOMPLETOS_SECRET || SECRET
const INCOMPLETOS_ENABLED =
  process.env.RECORDATORIO_INCOMPLETOS_CRON === "1" ||
  (ENABLED && process.env.RECORDATORIO_INCOMPLETOS_CRON !== "0")

let lastRunDate = ""
let lastIncompletosDate = ""

async function callEndpoint(path, secret, dateStr) {
  const url = new URL(`${SITE_URL}${path}`)
  if (secret) url.searchParams.set("secret", secret)
  if (dateStr) url.searchParams.set("date", dateStr)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
    const txt = await res.text()
    console.log(`[reminder-cron] POST ${url.toString()} -> ${res.status} ${txt}`)
  } catch (e) {
    console.log(`[reminder-cron] error calling ${url.toString()}: ${e?.message || e}`)
  }
}

function getLocalDateString(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

async function tick() {
  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  if (hh !== 8 || mm !== 30) return
  const today = getLocalDateString(now)

  if (ENABLED && lastRunDate !== today) {
    lastRunDate = today
    await callEndpoint("/api/recordatorio-visita-agente", SECRET, today)
  }

  if (INCOMPLETOS_ENABLED && lastIncompletosDate !== today) {
    lastIncompletosDate = today
    await callEndpoint("/api/recordatorio-datos-incompletos", INCOMPLETOS_SECRET, today)
  }
}

console.log(
  "[reminder-cron] started. ENABLED =",
  ENABLED,
  "INCOMPLETOS_ENABLED =",
  INCOMPLETOS_ENABLED,
  "SITE_URL =",
  SITE_URL
)
setInterval(tick, 30 * 1000)
