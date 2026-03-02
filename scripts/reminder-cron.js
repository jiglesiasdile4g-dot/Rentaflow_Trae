const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
const SECRET = process.env.RECORDATORIO_VISITA_SECRET || process.env.REMINDER_WEBHOOK_SECRET || ""
const ENABLED = process.env.REMINDER_CRON_ENABLED === "1" || process.env.RECORDATORIO_VISITA_CRON === "1"

let lastRunDate = ""

async function callReminder(dateStr) {
  const url = new URL(`${SITE_URL}/api/recordatorio-visita-agente`)
  if (SECRET) url.searchParams.set("secret", SECRET)
  url.searchParams.set("date", dateStr)
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
  if (!ENABLED) return
  const now = new Date()
  const hh = now.getHours()
  const mm = now.getMinutes()
  const today = getLocalDateString(now)
  if (hh === 8 && mm === 30) {
    if (lastRunDate !== today) {
      lastRunDate = today
      await callReminder(today)
    }
  }
}

console.log("[reminder-cron] started. ENABLED =", ENABLED, "SITE_URL =", SITE_URL)
setInterval(tick, 30 * 1000)
