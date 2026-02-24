 "use client"
 
 import { useEffect, useMemo, useRef, useState, useCallback } from "react"
 import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
 import { Progress } from "@/components/ui/progress"
 import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
 import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn, formatDate } from "@/lib/utils"
import { formatPlanValue, getPlanData } from "@/lib/plan-data"
 import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
 import { DateRange } from "react-day-picker"
 import { addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isBefore, isWithinInterval, differenceInCalendarDays, format } from "date-fns"
 import { es } from "date-fns/locale"
 
 type StatsPeriod = "hoy" | "esteMes" | "ultimoMes" | "periodoActual" | "esteAno" | "custom"
 
 function getCurrentBillingCycle(resetAtValue: Date | string | null, now = new Date()) {
   const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
   const resetAt = resetAtValue ? new Date(resetAtValue) : null
   const validReset = resetAt && !isNaN(resetAt.getTime()) ? resetAt : null
   const base = validReset ? validReset : monthStart
   const msPerDay = 24 * 60 * 60 * 1000
   const msPerPeriod = 30 * msPerDay
   const diff = now.getTime() - base.getTime()
   const periodsPassed = diff > 0 ? Math.floor(diff / msPerPeriod) : 0
   const start = new Date(base.getTime() + periodsPassed * msPerPeriod)
   const end = new Date(start.getTime() + msPerPeriod)
   const displayEnd = new Date(end.getTime() - msPerDay)
   return { start, end, displayEnd }
 }
 
const isVisitCompleted = (status: any) => {
  if (status === true) return true
  if (typeof status === "string") {
    const s = status.toLowerCase().trim()
    return s === "true" || s === "completada" || s === "realizada" || s === "si"
  }
  return false
}

export function InmobiliariaStatsModal({ idi }: { idi?: number | null }) {
   const supabase = createClient()
   const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>("esteMes")
   const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)
   const [customCalendarMonth, setCustomCalendarMonth] = useState<Date>(() => new Date())
   const [trendData, setTrendData] = useState<any[]>([])
  const [qualityMetrics, setQualityMetrics] = useState<{ datosIncompletos: number; necesidadAval: number }>({ datosIncompletos: 0, necesidadAval: 0 })
   const [consumptionMetrics, setConsumptionMetrics] = useState<{ leads: number; tiempoAhorrado: number; planUtilizado: number; whatsappsEnviados: number; emailsEnviados: number }>({ leads: 0, tiempoAhorrado: 0, planUtilizado: 0, whatsappsEnviados: 0, emailsEnviados: 0 })
   const [planResetAt, setPlanResetAt] = useState<Date | null>(null)
  const [planId, setPlanId] = useState<number | null>(null)
  const [planLimit, setPlanLimit] = useState<number | null>(null)
   const [statsLeads, setStatsLeads] = useState<any[]>([])
   const [statsEmails, setStatsEmails] = useState<any[]>([])
   const [statsWhatsapps, setStatsWhatsapps] = useState<any[]>([])
   const [activityData, setActivityData] = useState<number[]>([])
   const [activityStartDate, setActivityStartDate] = useState<Date | null>(null)
 
   const weekDays = useMemo(() => {
     const start = startOfWeek(new Date(), { locale: es })
     return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), "EEEEE", { locale: es }))
   }, [])
 
   const buildMonthDays = useCallback((monthDate: Date) => {
     const monthStart = startOfMonth(monthDate)
     const monthEnd = endOfMonth(monthDate)
     const gridStart = startOfWeek(monthStart, { locale: es })
     const gridEnd = endOfWeek(monthEnd, { locale: es })
     const days: Date[] = []
     let current = gridStart
     while (current <= gridEnd) {
       days.push(current)
       current = addDays(current, 1)
     }
     return days
   }, [])
 
   const handleCustomDayClick = useCallback((day: Date) => {
     const normalized = new Date(day)
     normalized.setHours(0, 0, 0, 0)
     const from = customDateRange?.from ? new Date(customDateRange.from) : undefined
     if (from) from.setHours(0, 0, 0, 0)
     const to = customDateRange?.to ? new Date(customDateRange.to) : undefined
     if (to) to.setHours(0, 0, 0, 0)
     let nextRange: DateRange
     if (!from || (from && to)) {
       nextRange = { from: normalized, to: undefined }
     } else if (isBefore(normalized, from)) {
       nextRange = { from: normalized, to: from }
     } else {
       nextRange = { from, to: normalized }
     }
     setCustomDateRange(nextRange)
     setStatsPeriod("custom")
   }, [customDateRange])
 
   const formatTime = (hours: number) => {
     if (!Number.isFinite(hours) || hours <= 0) return "0h 0m"
     const h = Math.floor(hours)
     const m = Math.round((hours - h) * 60)
     return `${h}h ${m}m`
   }
 
  const preparedPhaseMetrics = useMemo(() => {
    const now = new Date()
    const cycle = getCurrentBillingCycle(planResetAt, now)
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const yearStart = new Date(now.getFullYear(), 0, 1)
    const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from : cycle.start
    const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? dayEnd : statsPeriod === "ultimoMes" ? prevMonthEnd : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
    const filtered = statsLeads.filter((l) => {
      const d = new Date(l.created_at)
      return d >= start && d < end
    })
    const datosCompletos = filtered.filter((l) => String(l.Estado || "").toLowerCase() === "datos completos").length
    const aceptados = filtered.filter((l) => ["aceptado", "visita propuesta", "visita confirmada"].includes(String(l.Estado || "").toLowerCase())).length
    const visitaPropuesta = filtered.filter((l) => ["visita propuesta", "visita confirmada"].includes(String(l.Estado || "").toLowerCase())).length
    const visitaCompletada = filtered.filter((l) => String(l.Estado || "").toLowerCase() === "visita completada" || isVisitCompleted(l.visita_completada)).length
    return { datosCompletos, aceptados, visitaPropuesta, visitaCompletada }
  }, [statsLeads, statsPeriod, customDateRange, planResetAt])

   useEffect(() => {
     const run = async () => {
       if (idi && Number.isFinite(Number(idi))) {
         const { data } = await supabase.from("Inmobiliarias").select("PlanResetAt, Plan").eq("idi", Number(idi)).single()
        const reset = data?.PlanResetAt ? new Date(data.PlanResetAt) : null
        setPlanResetAt(reset)
        const currentPlanId = Number(data?.Plan) || 0
        setPlanId(currentPlanId || null)
        let limit = 1000000
        try {
          const { data: planesData } = await supabase.from("Planes").select("*")
          if (planesData && planesData.length > 0) {
            const normalize = (p: any) => ({
              ...p,
              ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
            })
            const normalized = (planesData || []).map(normalize)
            const match = normalized.find((p: any) => p?.idp === currentPlanId || (p as any)?.id === currentPlanId)
            if (match) {
              limit = Number(match.ejecuciones) || 1000000
            } else {
              const fallback = getPlanData(currentPlanId)
              limit = fallback?.ejecuciones ?? 1000000
            }
          } else {
            const fallback = getPlanData(currentPlanId)
            limit = fallback?.ejecuciones ?? 1000000
          }
        } catch {
          const fallback = getPlanData(currentPlanId)
          limit = fallback?.ejecuciones ?? 1000000
        }
        setPlanLimit(limit)
       } else {
         setPlanResetAt(null)
        setPlanId(null)
        setPlanLimit(null)
       }
     }
     run()
   }, [idi, supabase])
 
  const fetchAllLeads = useCallback(async () => {
    let q = supabase.from("Clientes").select("IDC, Estado, created_at, Correo, visita_completada")
     if (idi && Number.isFinite(Number(idi))) {
       q = q.eq("usuario", Number(idi))
     }
     const { data } = await q
     const leads = data || []
     setStatsLeads(leads)
     const leadEmails = leads.map((l: any) => l.Correo).filter(Boolean)
     const leadIDCs = leads.map((l: any) => l.IDC).filter((id: any) => Number.isFinite(id))
     let currentEmails: any[] = []
     let currentWhatsapps: any[] = []
     if (leadEmails.length > 0) {
       const chunkSize = 50
       const chunks: string[][] = []
       for (let i = 0; i < leadEmails.length; i += chunkSize) chunks.push(leadEmails.slice(i, i + chunkSize))
       const results = await Promise.all(chunks.map((c) => supabase.from("Correos").select("to, Tipo, created_at").in("to", c)))
       currentEmails = results.flatMap((r) => r.data || [])
     }
     if (leadIDCs.length > 0) {
       const chunkSize = 50
       const chunks: number[][] = []
       for (let i = 0; i < leadIDCs.length; i += chunkSize) chunks.push(leadIDCs.slice(i, i + chunkSize))
       const results = await Promise.all(chunks.map((c) => supabase.from("Whatsapp").select("IDC, Tipo, created_at").in("IDC", c)))
       currentWhatsapps = results.flatMap((r) => r.data || [])
     }
     setStatsEmails(currentEmails)
     setStatsWhatsapps(currentWhatsapps)
    const dayMs = 24 * 60 * 60 * 1000
    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * dayMs)
    if (leads.length > 0) {
      const earliest = leads.reduce((min: Date | null, lead: any) => {
        const d = lead?.created_at ? new Date(lead.created_at) : null
        if (!d || isNaN(d.getTime())) return min
        if (!min || d < min) return d
        return min
      }, null)
      if (earliest) startDate = earliest
    }
    startDate.setHours(0, 0, 0, 0)
    const daysSinceStart = Math.ceil((now.getTime() - startDate.getTime()) / dayMs)
    const totalDays = Math.min(Math.max(daysSinceStart, 7), 365)
     const actData: number[] = []
     for (let i = 0; i < totalDays; i++) {
       const currentDate = new Date(startDate.getTime() + i * dayMs)
       currentDate.setHours(0, 0, 0, 0)
       const nextDate = new Date(currentDate.getTime() + dayMs)
       const cnt = leads.filter((lead: any) => {
         const createdAt = lead?.created_at ? new Date(lead.created_at) : null
         return createdAt && createdAt >= currentDate && createdAt < nextDate
       }).length || 0
       actData.push(cnt)
     }
     setActivityData(actData)
     setActivityStartDate(startDate)
   }, [idi, supabase])
 
  useEffect(() => {
    fetchAllLeads()
  }, [fetchAllLeads])
 
   useEffect(() => {
     const now = new Date()
     const billingCycle = getCurrentBillingCycle(planResetAt, now)
     const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
     const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
     const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
     const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
     const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
     const yearStart = new Date(now.getFullYear(), 0, 1)
    const periodStart = billingCycle.start
    const periodEnd = billingCycle.end
     const periodLeads = statsLeads.filter((l) => {
       const d = new Date(l.created_at)
      return d >= periodStart && d < periodEnd
     })
     const count = periodLeads.length
     const leadEmails = periodLeads.map((l) => l.Correo).filter(Boolean)
     const leadIDCs = periodLeads.map((l) => l.IDC).filter((id: any) => Number.isFinite(id))
     let emailsEnviados = 0
     if (leadEmails.length > 0 && statsEmails.length > 0) {
       const matchingEmails = statsEmails.filter((e) => leadEmails.includes(e.to))
      emailsEnviados = matchingEmails.filter((e) => e.Tipo?.toLowerCase() === "enviado" && new Date(e.created_at) >= periodStart && new Date(e.created_at) < periodEnd).length
     }
     let whatsappsEnviados = 0
     if (leadIDCs.length > 0 && statsWhatsapps.length > 0) {
      const matchingWhatsapps = statsWhatsapps.filter((w) => leadIDCs.includes(w.IDC) && w.Tipo === "Enviado" && new Date(w.created_at) >= periodStart && new Date(w.created_at) < periodEnd)
       whatsappsEnviados = matchingWhatsapps.length
     }
     const tiempo = (emailsEnviados + whatsappsEnviados) * 1.27 / 60
    const effectivePlanLimit = planLimit ?? 0
    const planUsed = effectivePlanLimit > 0 ? Math.min(100, (count / effectivePlanLimit) * 100) : 0
     setConsumptionMetrics({ leads: count, tiempoAhorrado: tiempo, planUtilizado: planUsed, whatsappsEnviados, emailsEnviados })
  }, [statsLeads, statsEmails, statsWhatsapps, planResetAt, planLimit])
 
   useEffect(() => {
     const now = new Date()
     const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
     const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
     const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
     const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
     const yearStart = new Date(now.getFullYear(), 0, 1)
     const billingCycle = getCurrentBillingCycle(planResetAt, now)
     const periodStart = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : billingCycle.start
     const periodEnd = statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "ultimoMes" ? new Date(prevMonthEnd.getTime() + 1) : statsPeriod === "periodoActual" ? billingCycle.end : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
     const countMetrics = (leads: any[]) => {
       let total = 0
       let completos = 0
       let aceptados = 0
       let visitaPropuesta = 0
       let visitaCompletada = 0
       let descartados = 0
       for (const lead of leads || []) {
         const d = new Date(lead.created_at)
         if (d < periodStart || d >= periodEnd) continue
         total++
         const est = String(lead.Estado || "").toLowerCase()
         if (["datos completos", "aceptado", "visita propuesta", "visita confirmada", "pedir aval"].includes(est)) completos++
        if (["aceptado", "visita propuesta", "visita confirmada"].includes(est)) aceptados++
         if (["visita propuesta", "visita confirmada"].includes(est)) visitaPropuesta++
        if (est === "visita completada" || isVisitCompleted(lead.visita_completada)) visitaCompletada++
         if (est === "descartado") descartados++
       }
       return { total, completos, aceptados, visitaPropuesta, visitaCompletada, descartados }
     }
     const buildTrend = async () => {
       if (statsPeriod === "hoy") {
         const hourly: any[] = []
         for (let i = 23; i >= 0; i--) {
           const start = new Date(now.getTime() - i * 60 * 60 * 1000)
           const end = new Date(start.getTime() + 60 * 60 * 1000)
           const data = statsLeads.filter((l) => {
             const d = new Date(l.created_at)
             return d >= start && d < end
           })
           const label = start.getHours().toString().padStart(2, "0") + ":00"
           const m = countMetrics(data)
           hourly.push({ name: label, ...m })
         }
         setTrendData(hourly)
         return
       }
       if (statsPeriod === "esteMes" || statsPeriod === "ultimoMes") {
         const startDate = new Date(now)
         if (statsPeriod === "ultimoMes") startDate.setMonth(startDate.getMonth() - 1)
         startDate.setDate(1)
         startDate.setHours(0, 0, 0, 0)
         const daysInMonth = statsPeriod === "ultimoMes" ? new Date(now.getFullYear(), now.getMonth(), 0).getDate() : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
         const daily: any[] = []
         for (let i = 0; i < daysInMonth; i++) {
           const dayStart = new Date(startDate)
           dayStart.setDate(startDate.getDate() + i)
           dayStart.setHours(0, 0, 0, 0)
           const dayEnd = new Date(dayStart)
           dayEnd.setHours(23, 59, 59, 999)
           if (dayStart > now && statsPeriod === "esteMes") break
           const data = statsLeads.filter((l) => {
             const d = new Date(l.created_at)
             return d >= dayStart && d < new Date(dayEnd.getTime() + 1)
           })
           const label = dayStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
           const m = countMetrics(data)
           daily.push({ name: label, ...m })
         }
         setTrendData(daily)
         return
       }
       if (statsPeriod === "esteAno") {
         const monthly: any[] = []
         for (let i = 0; i < 12; i++) {
           const mStart = new Date(now.getFullYear(), i, 1)
           const mEnd = new Date(now.getFullYear(), i + 1, 0)
           mEnd.setHours(23, 59, 59, 999)
           if (mStart > now) break
           const data = statsLeads.filter((l) => {
             const d = new Date(l.created_at)
             return d >= mStart && d < new Date(mEnd.getTime() + 1)
           })
           const label = mStart.toLocaleDateString("es-ES", { month: "short" })
           const m = countMetrics(data)
           monthly.push({ name: label, ...m })
         }
         setTrendData(monthly)
         return
       }
      if (statsPeriod === "periodoActual") {
        const start = new Date(billingCycle.start)
        const end = new Date(billingCycle.end)
        start.setHours(0, 0, 0, 0)
        end.setHours(23, 59, 59, 999)
        const daily: any[] = []
        let currentDay = new Date(start)
        while (currentDay <= end && currentDay <= now) {
          const dayStart = new Date(currentDay)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(23, 59, 59, 999)
          const data = statsLeads.filter((l) => {
            const d = new Date(l.created_at)
            return d >= dayStart && d < new Date(dayEnd.getTime() + 1)
          })
          const label = dayStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
          const m = countMetrics(data)
          daily.push({ name: label, ...m })
          currentDay.setDate(currentDay.getDate() + 1)
        }
        setTrendData(daily)
        return
      }
      if (statsPeriod === "custom" && customDateRange?.from) {
        const start = new Date(customDateRange.from)
        start.setHours(0, 0, 0, 0)
        const end = customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from)
        end.setHours(23, 59, 59, 999)
        const daily: any[] = []
        let currentDay = new Date(start)
        while (currentDay <= end) {
          const dayStart = new Date(currentDay)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(dayStart)
          dayEnd.setHours(23, 59, 59, 999)
          const data = statsLeads.filter((l) => {
            const d = new Date(l.created_at)
            return d >= dayStart && d < new Date(dayEnd.getTime() + 1)
          })
          const label = dayStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })
          const m = countMetrics(data)
          daily.push({ name: label, ...m })
          currentDay = addDays(currentDay, 1)
        }
        setTrendData(daily)
        return
      }
       const last7: any[] = []
       for (let i = 6; i >= 0; i--) {
         const dayStart = new Date(now)
         dayStart.setDate(dayStart.getDate() - i)
         dayStart.setHours(0, 0, 0, 0)
         const dayEnd = new Date(dayStart)
         dayEnd.setHours(23, 59, 59, 999)
         const data = statsLeads.filter((l) => {
           const d = new Date(l.created_at)
           return d >= dayStart && d < new Date(dayEnd.getTime() + 1)
         })
         const label = dayStart.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })
         const m = countMetrics(data)
         last7.push({ name: label, ...m })
       }
       setTrendData(last7)
     }
     buildTrend()
   }, [statsPeriod, customDateRange, statsLeads, planResetAt])
 
   useEffect(() => {
     const now = new Date()
     let startDate: Date
     let endDate: Date = new Date()
     if (statsPeriod === "hoy") {
       startDate = new Date(now)
       startDate.setHours(0, 0, 0, 0)
       endDate = new Date(now)
       endDate.setHours(23, 59, 59, 999)
     } else if (statsPeriod === "esteMes") {
       startDate = new Date(now.getFullYear(), now.getMonth(), 1)
     } else if (statsPeriod === "ultimoMes") {
       startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
       endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
     } else if (statsPeriod === "esteAno") {
       startDate = new Date(now.getFullYear(), 0, 1)
    } else if (statsPeriod === "custom" && customDateRange?.from) {
      startDate = new Date(customDateRange.from)
      startDate.setHours(0, 0, 0, 0)
      endDate = customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from)
      endDate.setHours(23, 59, 59, 999)
    } else {
       const cycle = getCurrentBillingCycle(planResetAt, now)
       startDate = cycle.start
       endDate = cycle.end
     }
     const leads = statsLeads.filter((l) => {
       const d = new Date(l.created_at)
       return d >= startDate && d <= endDate
     })
     const datosIncompletos = leads.filter((lead) => {
       const est = String(lead.Estado || "").toLowerCase()
       return ["datos incompletos", "pendiente", "incompleto"].includes(est)
     }).length || 0
     const necesidadAval = leads.filter((l) => l.Estado === "Pedir Aval" || l.Estado === "Aval Pedido").length || 0
    setQualityMetrics({ datosIncompletos, necesidadAval })
  }, [statsPeriod, customDateRange, statsLeads, planResetAt])
 
   const ActivityHeatmap = ({ data, startDate, periodStart, periodEnd }: { data: number[]; startDate: Date; periodStart?: Date; periodEnd?: Date }) => {
     const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null)
     const containerRef = useRef<HTMLDivElement | null>(null)
     const max = Math.max(...data, 1)
     const dayMs = 24 * 60 * 60 * 1000
     const cls = (ratio: number, active: boolean) =>
       !active ? "bg-muted/20" : ratio <= 0 ? "bg-muted/30" : ratio < 0.25 ? "bg-emerald-200/80" : ratio < 0.5 ? "bg-emerald-400/80" : ratio < 0.75 ? "bg-emerald-600" : "bg-emerald-800"
     const start = new Date(startDate)
     start.setHours(0, 0, 0, 0)
     const baseCells = data.map((value, i) => {
       const date = new Date(start.getTime() + i * dayMs)
       const ratio = max > 0 ? value / max : 0
       const active = periodStart && periodEnd ? date >= periodStart && date < periodEnd : true
       const label = `${date.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" })} · ${value} leads`
       return { ratio, active, label, date, value }
     })
     const rows = 7
     const paddingDays = start.getDay()
     const paddedCells = Array.from({ length: paddingDays }, () => ({ ratio: 0, active: false, label: "", date: null as any, value: 0, pad: true }))
     const cells = [...paddedCells, ...baseCells]
     const columns = Math.ceil(cells.length / rows)
     const cellSize = columns <= 8 ? 1 : columns <= 16 ? 0.9 : columns <= 24 ? 0.8 : 0.7
     const showMonthLabels = columns > 4
     const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
     const monthStarts: { month: string; col: number }[] = []
     let lastMonth = -1
     baseCells.forEach((_, idx) => {
       const date = new Date(start.getTime() + idx * dayMs)
       const currentMonth = date.getMonth()
       if (currentMonth !== lastMonth) {
         const col = Math.floor((idx + paddingDays) / rows)
         monthStarts.push({ month: monthLabels[currentMonth], col })
         lastMonth = currentMonth
       }
     })
     const showDayLabels = true
     const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
     const total = data.reduce((a, b) => a + b, 0)
     const avg = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0
     const maxVal = Math.max(...data, 0)
     const maxIdx = data.findIndex((v) => v === maxVal)
     const maxDate = new Date(start.getTime() + Math.max(0, maxIdx) * dayMs)
     const maxLabel = `${maxDate.toLocaleDateString("es-ES", { day: "2-digit", month: "short" })} (${maxVal})`
     return (
       <div ref={containerRef} className="overflow-x-auto relative">
         {showMonthLabels && monthStarts.length > 0 && (
           <div className="flex mb-1 text-[10px] text-muted-foreground">
             {monthStarts.map(({ month, col }, idx) => (
               <div key={idx} className="text-center" style={{ marginLeft: idx === 0 ? "0" : `${(col - monthStarts[idx - 1].col) * cellSize}rem` }}>
                 {month}
               </div>
             ))}
           </div>
         )}
         <div className="flex items-start gap-1">
           {showDayLabels && (
             <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
               {dayLabels.map((day, idx) => (
                 <div key={idx} className="text-right flex items-center justify-end" style={{ height: `${cellSize}rem`, lineHeight: `${cellSize}rem` }}>
                   {day}
                 </div>
               ))}
             </div>
           )}
           <div className="grid grid-flow-col gap-[2px]" style={{ gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, gridAutoColumns: `${cellSize}rem` }}>
             {cells.map((c, idx) => (
               <div
                 key={idx}
                 className={`rounded-[2px] border border-muted-foreground/20 ${cls((c as any).ratio, (c as any).active)}`}
                 style={{ width: `${cellSize}rem`, height: `${cellSize}rem`, minWidth: `${cellSize}rem`, minHeight: `${cellSize}rem` }}
                 onMouseEnter={(e) => {
                   if ((c as any).pad) return
                   const rect = containerRef.current?.getBoundingClientRect()
                   const x = rect ? e.clientX - rect.left : 0
                   const y = rect ? e.clientY - rect.top : 0
                   setHover({ label: (c as any).label, x, y })
                 }}
                 onMouseMove={(e) => {
                   if ((c as any).pad) return
                   const rect = containerRef.current?.getBoundingClientRect()
                   const x = rect ? e.clientX - rect.left : 0
                   const y = rect ? e.clientY - rect.top : 0
                   setHover((prev) => (prev ? { label: prev.label, x, y } : null))
                 }}
                 onMouseLeave={() => setHover(null)}
               />
             ))}
           </div>
         </div>
         {hover && (
           <div className="absolute z-20 px-2 py-1 text-[10px] rounded bg-background border shadow" style={{ left: hover.x + 12, top: hover.y + 12 }}>
             {hover.label}
           </div>
         )}
         <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
           <span>Total: {total}</span>
           <span>Promedio diario: {avg}</span>
           <span>Pico: {maxLabel}</span>
         </div>
       </div>
     )
   }
 
  const planLimitLabel = planLimit != null ? formatPlanValue(planLimit) : "N/D"

  return (
    <div className="mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-2">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Estadísticas de la Inmobiliaria</h3>
          <p className="text-sm text-muted-foreground">Totales y rendimiento agregados por periodo</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground/80 tabular-nums">
            {statsPeriod === "periodoActual"
              ? `${formatDate(getCurrentBillingCycle(planResetAt).start)} - ${formatDate(getCurrentBillingCycle(planResetAt).displayEnd)}`
              : statsPeriod === "custom" && customDateRange?.from
              ? customDateRange.to
                ? `${format(customDateRange.from, "dd MMM", { locale: es })} - ${format(customDateRange.to, "dd MMM", { locale: es })}`
                : format(customDateRange.from, "dd MMM", { locale: es })
              : new Date().toLocaleDateString("es-ES")}
          </span>
          <div className="flex items-center bg-muted/50 rounded-md p-0.5">
            {([
              { value: "hoy", label: "Hoy" },
              { value: "esteMes", label: "Mes" },
              { value: "ultimoMes", label: "Mes ant." },
              { value: "periodoActual", label: "Ciclo" },
            ] as const).map((period) => (
              <button
                key={period.value}
                onClick={() => {
                  const v = period.value
                  setStatsPeriod(v)
                  setCustomDateRange(undefined)
                }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md gap-1.5 h-6 text-[10px] px-2 font-medium",
                  statsPeriod === period.value
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 hover:bg-primary/90"
                    : "text-foreground/70 hover:text-foreground hover:bg-accent dark:hover:bg-accent/50",
                )}
              >
                {period.label}
              </button>
            ))}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  onClick={() => {
                    setStatsPeriod("custom")
                  }}
                  className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md gap-1.5 h-6 text-[10px] px-2 font-medium",
                    statsPeriod === "custom"
                      ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/30 hover:bg-primary/90"
                      : "text-foreground/70 hover:text-foreground hover:bg-accent dark:hover:bg-accent/50",
                  )}
                >
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  Personalizado
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="rounded-md border shadow-sm p-4 bg-background">
                  <div className="flex items-center justify-between mb-3">
                    <button type="button" className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm h-7 w-7 hover:bg-accent hover:text-accent-foreground" onClick={() => setCustomCalendarMonth(addMonths(customCalendarMonth, -1))}>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="text-sm font-medium capitalize">{format(customCalendarMonth, "MMMM yyyy", { locale: es })}</div>
                    <button type="button" className="inline-flex items-center justify-center rounded-md border border-input bg-background shadow-sm h-7 w-7 hover:bg-accent hover:text-accent-foreground" onClick={() => setCustomCalendarMonth(addMonths(customCalendarMonth, 1))}>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {[customCalendarMonth, addMonths(customCalendarMonth, 1)].map((monthDate, monthIndex) => (
                      <div key={monthIndex}>
                        <div className="text-xs font-medium text-muted-foreground mb-2 capitalize text-center">{format(monthDate, "MMMM yyyy", { locale: es })}</div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground mb-2">
                          {weekDays.map((dayLabel, idx) => (
                            <div key={`${monthIndex}-${idx}`} className="h-4 flex items-center justify-center">
                              {dayLabel}
                            </div>
                          ))}
                        </div>
                        <TooltipProvider>
                          <div className="grid grid-cols-7 gap-1">
                            {buildMonthDays(monthDate).map((day) => {
                              const from = customDateRange?.from
                              const to = customDateRange?.to
                              const inMonth = isSameMonth(day, monthDate)
                              const isStart = from && isSameDay(day, from)
                              const isEnd = to && isSameDay(day, to)
                              const inRange = from && to && isWithinInterval(day, { start: from, end: to })
                              const isMiddle = inRange && !isStart && !isEnd
                              const isSelected = isStart || isEnd || (from && !to && isSameDay(day, from))
                              const ratio = (() => {
                                if (!activityStartDate || activityData.length === 0) return 0
                                const d = new Date(day)
                                d.setHours(0, 0, 0, 0)
                                const diffDays = differenceInCalendarDays(d, activityStartDate)
                                if (diffDays < 0 || diffDays >= activityData.length) return 0
                                const max = Math.max(...activityData, 1)
                                return activityData[diffDays] / max
                              })()
                              const activityClass = ratio <= 0 ? "" : ratio < 0.25 ? "bg-emerald-100/80" : ratio < 0.5 ? "bg-emerald-200/80" : ratio < 0.75 ? "bg-emerald-300/80" : "bg-emerald-400/80"
                              if (!inMonth) return <div key={day.toISOString()} className="h-9 w-9" />
                              return (
                                <UITooltip key={day.toISOString()} delayDuration={0}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => handleCustomDayClick(day)}
                                      className={cn(
                                        "relative h-9 w-9 rounded-md text-sm font-medium transition-colors",
                                        "flex items-center justify-center",
                                        isSelected && "bg-stone-300/80 text-stone-950 dark:bg-stone-700/60 dark:text-stone-50",
                                        isMiddle && "bg-stone-300/80 text-stone-950 dark:bg-stone-700/60 dark:text-stone-50",
                                        !isSelected && !isMiddle && activityClass,
                                        !isSelected && !isMiddle && "hover:bg-accent hover:text-accent-foreground",
                                      )}
                                    >
                                      {(isSelected || isMiddle) && <span className={cn("absolute inset-0 rounded-md bg-stone-300/80 dark:bg-stone-700/60")} />}
                                      <span className={cn("relative z-10", isMiddle ? "text-stone-950 dark:text-stone-50" : "")}>{format(day, "d")}</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="z-[9999]">
                                    <p>{(() => {
                                      if (!activityStartDate || activityData.length === 0) return 0
                                      const d = new Date(day)
                                      d.setHours(0, 0, 0, 0)
                                      const diffDays = differenceInCalendarDays(d, activityStartDate)
                                      if (diffDays < 0 || diffDays >= activityData.length) return 0
                                      return activityData[diffDays]
                                    })()} leads</p>
                                  </TooltipContent>
                                </UITooltip>
                              )
                            })}
                          </div>
                        </TooltipProvider>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>
      <div className="space-y-6 py-4">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <TooltipProvider>
                 <UITooltip delayDuration={0}>
                   <TooltipTrigger asChild>
                     <Button variant="outline" className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-foreground">{statsLeads.filter((l) => {
                         const now = new Date()
                         const cycle = getCurrentBillingCycle(planResetAt, now)
                         const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                         const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                         const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                         const yearStart = new Date(now.getFullYear(), 0, 1)
                         const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : cycle.start
                         const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
                         const d = new Date(l.created_at)
                         return d >= start && d < end
                       }).length}</span>
                       <span className="text-xs text-muted-foreground font-normal">Leads Totales</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent side="top" className="z-[9999]">
                     <p>Leads totales del periodo seleccionado</p>
                   </TooltipContent>
                 </UITooltip>
               </TooltipProvider>
               <TooltipProvider>
                 <UITooltip delayDuration={0}>
                   <TooltipTrigger asChild>
                     <Button variant="outline" className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{statsLeads.filter((l) => {
                         const now = new Date()
                         const cycle = getCurrentBillingCycle(planResetAt, now)
                         const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                         const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                         const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                         const yearStart = new Date(now.getFullYear(), 0, 1)
                         const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : cycle.start
                         const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
                         const d = new Date(l.created_at)
                         if (!(d >= start && d < end)) return false
                         const est = String(l.Estado || "").toLowerCase()
                         return ["datos completos", "aceptado", "visita propuesta", "visita confirmada", "pedir aval"].includes(est)
                       }).length}</span>
                       <span className="text-xs text-muted-foreground font-normal">Datos Completos</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent side="top" className="z-[9999]">
                     <p>Leads con datos completos</p>
                   </TooltipContent>
                 </UITooltip>
               </TooltipProvider>
               <TooltipProvider>
                 <UITooltip delayDuration={0}>
                   <TooltipTrigger asChild>
                     <Button variant="outline" className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                         {(() => {
                           const total = statsLeads.filter((l) => {
                             const now = new Date()
                             const cycle = getCurrentBillingCycle(planResetAt, now)
                             const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                             const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                             const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                             const yearStart = new Date(now.getFullYear(), 0, 1)
                             const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : cycle.start
                             const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
                             const d = new Date(l.created_at)
                             return d >= start && d < end
                           }).length
                           const completos = statsLeads.filter((l) => {
                             const now = new Date()
                             const cycle = getCurrentBillingCycle(planResetAt, now)
                             const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                             const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                             const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                             const yearStart = new Date(now.getFullYear(), 0, 1)
                             const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : cycle.start
                             const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
                             const d = new Date(l.created_at)
                             if (!(d >= start && d < end)) return false
                             const est = String(l.Estado || "").toLowerCase()
                             return ["datos completos", "aceptado", "visita propuesta", "visita confirmada", "pedir aval"].includes(est)
                           }).length
                           return total > 0 ? ((completos / total) * 100).toFixed(1) : "0.0"
                         })()}
                         %
                       </span>
                       <span className="text-xs text-muted-foreground font-normal">Tasa Conversión</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent side="top" className="z-[9999]">
                     <p>Porcentaje de leads con datos completos respecto al total</p>
                   </TooltipContent>
                 </UITooltip>
               </TooltipProvider>
               <TooltipProvider>
                 <UITooltip delayDuration={0}>
                   <TooltipTrigger asChild>
                     <Button variant="outline" className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1">
                       <span className="text-3xl font-bold text-red-600 dark:text-red-400">{statsLeads.filter((l) => {
                         const now = new Date()
                         const cycle = getCurrentBillingCycle(planResetAt, now)
                         const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                         const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                         const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                         const yearStart = new Date(now.getFullYear(), 0, 1)
                         const start = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customDateRange?.from ? customDateRange.from! : cycle.start
                         const end = statsPeriod === "periodoActual" ? cycle.end : statsPeriod === "hoy" ? new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) : statsPeriod === "custom" && customDateRange?.to ? new Date(customDateRange.to) : now
                         const d = new Date(l.created_at)
                         return d >= start && d < end && l.Estado === "Descartado"
                       }).length}</span>
                       <span className="text-xs text-muted-foreground font-normal">Descartados</span>
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent side="top" className="z-[9999]">
                     <p>Leads con el estado Descartado</p>
                   </TooltipContent>
                 </UITooltip>
               </TooltipProvider>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Preparados para la fase de visita</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <TooltipProvider>
                  <UITooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-between hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                        <span className="text-xs text-muted-foreground">Datos Completados</span>
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {preparedPhaseMetrics.datosCompletos}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-[9999]">
                      <p>Leads con estado Datos Completos</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-between hover:bg-green-50 dark:hover:bg-green-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                        <span className="text-xs text-muted-foreground">Candidatos Aprobados</span>
                        <span className="text-lg font-bold text-green-600 dark:text-green-400">
                          {preparedPhaseMetrics.aceptados}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-[9999]">
                      <p>Leads aprobados (incluye Visita Propuesta)</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-between hover:bg-blue-50 dark:hover:bg-blue-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                        <span className="text-xs text-muted-foreground">Visita Propuesta</span>
                        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {preparedPhaseMetrics.visitaPropuesta}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-[9999]">
                      <p>Leads con estado Visita Propuesta</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button variant="outline" className="w-full justify-between hover:bg-sky-50 dark:hover:bg-sky-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent">
                        <span className="text-xs text-muted-foreground">Visita Completada</span>
                        <span className="text-lg font-bold text-sky-600 dark:text-sky-400">
                          {preparedPhaseMetrics.visitaCompletada}
                        </span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="z-[9999]">
                      <p>Leads con estado Visita Completada</p>
                    </TooltipContent>
                  </UITooltip>
                </TooltipProvider>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="space-y-3">
                 <h4 className="font-semibold text-sm">Actividad de Leads</h4>
                 <div className="bg-muted p-4 rounded-lg">
                   {!activityData || activityData.length === 0 || !activityStartDate ? (
                     <div className="flex items-center justify-center h-32">
                       <div className="text-sm text-muted-foreground">Sin datos</div>
                     </div>
                   ) : (
                     (() => {
                       const now = new Date()
                       const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
                       const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
                       const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                       const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
                       const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                       const yearStart = new Date(now.getFullYear(), 0, 1)
                       const billingCycle = getCurrentBillingCycle(planResetAt, now)
                      const customStart = customDateRange?.from ? new Date(customDateRange.from) : null
                      if (customStart) customStart.setHours(0, 0, 0, 0)
                      const customEnd = customDateRange?.from ? addDays(customDateRange.to ? new Date(customDateRange.to) : new Date(customDateRange.from), 1) : null
                      if (customEnd) customEnd.setHours(0, 0, 0, 0)
                      const periodStart = statsPeriod === "hoy" ? dayStart : statsPeriod === "ultimoMes" ? prevMonthStart : statsPeriod === "esteMes" ? thisMonthStart : statsPeriod === "esteAno" ? yearStart : statsPeriod === "custom" && customStart ? customStart : billingCycle.start
                      const periodEnd = statsPeriod === "hoy" ? dayEnd : statsPeriod === "ultimoMes" ? prevMonthEnd : statsPeriod === "periodoActual" ? billingCycle.end : statsPeriod === "custom" && customEnd ? customEnd : now
                       return <ActivityHeatmap data={activityData} startDate={activityStartDate!} periodStart={periodStart} periodEnd={periodEnd} />
                     })()
                   )}
                   <div className="flex items-center justify-end mt-2 gap-1 text-[10px] text-muted-foreground">
                     <span>Menor</span>
                     <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-muted-foreground/20 bg-muted/30" />
                     <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-muted-foreground/20 bg-emerald-200/80" />
                     <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-muted-foreground/20 bg-emerald-400/80" />
                     <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-muted-foreground/20 bg-emerald-600" />
                     <span className="inline-block w-2.5 h-2.5 rounded-[2px] border border-muted-foreground/20 bg-emerald-800" />
                     <span>Mayor</span>
                   </div>
                 </div>
               </div>
 
               <div className="space-y-3">
                 <h4 className="font-semibold text-sm">Leads por período</h4>
                 <div className="bg-muted p-4 rounded-lg" style={{ height: trendData && trendData.length > 10 ? "300px" : trendData && trendData.length > 5 ? "250px" : "200px" }}>
                   {!trendData || trendData.length === 0 ? (
                     <div className="flex items-center justify-center h-full">
                       <div className="text-sm text-muted-foreground">Sin datos</div>
                     </div>
                   ) : (
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={trendData} margin={{ top: 10, right: trendData.length > 10 ? 12 : 36, left: 28, bottom: trendData.length > 10 ? 48 : 28 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                         <XAxis dataKey="name" tick={{ fontSize: trendData.length > 10 ? 10 : 12 }} angle={trendData.length > 10 ? -45 : 0} textAnchor="end" height={trendData.length > 10 ? 80 : 60} interval={trendData.length > 15 ? "preserveStartEnd" : 0} tickMargin={6} padding={{ left: 6, right: 6 }} />
                         <YAxis tick={{ fontSize: 12 }} tickMargin={6} domain={["dataMin - 2", "dataMax + 4"]} allowDecimals={false} />
                         <Tooltip formatter={(value, name) => [String(value), String(name)]} labelFormatter={(label) => `Período: ${label}`} />
                         <Legend verticalAlign="bottom" align="center" iconSize={8} wrapperStyle={{ paddingTop: 6, fontSize: 11, color: "var(--muted-foreground)", opacity: 0.75 }} formatter={(value) => <span style={{ fontSize: 11, color: "var(--muted-foreground)", opacity: 0.75 }}>{String(value)}</span>} />
                         <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Leads Totales" />
                         <Line type="monotone" dataKey="completos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Datos Completos" />
                         <Line type="monotone" dataKey="descartados" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Descartados" />
                       </LineChart>
                     </ResponsiveContainer>
                   )}
                 </div>
               </div>
             </div>
 
             <div className="space-y-3">
               <h4 className="font-semibold">Análisis de Calidad</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-4 bg-muted rounded-lg border">
                   <div className="text-xs text-muted-foreground mb-2">Datos Incompletos</div>
                   <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{qualityMetrics.datosIncompletos}</div>
                 </div>
                 <div className="text-center p-4 bg-muted rounded-lg border">
                   <div className="text-xs text-muted-foreground mb-2">Necesidad de Aval</div>
                   <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{qualityMetrics.necesidadAval}</div>
                 </div>
               </div>
              <p className="text-xs text-muted-foreground text-center">
                Métricas calculadas para el período: {statsPeriod === "periodoActual"
                  ? `${formatDate(getCurrentBillingCycle(planResetAt).start)} - ${formatDate(getCurrentBillingCycle(planResetAt).displayEnd)}`
                  : statsPeriod === "hoy"
                  ? "Hoy"
                  : statsPeriod === "esteMes"
                  ? "Este mes"
                  : statsPeriod === "ultimoMes"
                  ? "Último mes"
                  : statsPeriod === "esteAno"
                  ? "Este año"
                  : "Periodo actual"}
              </p>
             </div>
 
             <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <h4 className="font-semibold">Consumo y Rendimiento</h4>
               </div>
               <p className="text-xs text-muted-foreground -mt-2 mb-2">
                 Ciclo actual: {(() => {
                   const billingCycle = getCurrentBillingCycle(planResetAt)
                   return `${formatDate(billingCycle.start)} - ${formatDate(billingCycle.displayEnd)}`
                 })()}
               </p>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-4">
                   <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-xs text-muted-foreground">Leads</span>
                      <span className="text-sm font-semibold text-foreground">
                        {consumptionMetrics.leads} / {planLimitLabel}
                      </span>
                    </div>
                     <Progress value={consumptionMetrics.planUtilizado} className="h-2" />
                     <div className="text-xs text-muted-foreground">{consumptionMetrics.planUtilizado.toFixed(1)}% del plan utilizado</div>
                   </div>
                   <div className="flex justify-between text-sm items-center pt-2 border-t">
                     <span className="text-xs text-muted-foreground">Whatsapps enviados</span>
                     <span className="text-sm font-semibold text-foreground">{consumptionMetrics.whatsappsEnviados}</span>
                   </div>
                   {consumptionMetrics.whatsappsEnviados > 0 && (
                     <div className="flex justify-between text-sm items-center pt-1">
                       <span className="text-xs text-muted-foreground">Coste aprox. WhatsApps</span>
                       <span className="text-sm font-semibold text-green-600">€{(consumptionMetrics.whatsappsEnviados * 0.0327).toFixed(2)}</span>
                     </div>
                   )}
                   <div className="flex justify-between text-sm items-center pt-2 border-t">
                     <span className="text-xs text-muted-foreground">Emails enviados</span>
                     <span className="text-sm font-semibold text-foreground">{consumptionMetrics.emailsEnviados}</span>
                   </div>
                 </div>
                 <div className="space-y-2">
                   <div className="flex justify-between text-sm">
                     <span className="text-xs text-muted-foreground">Tiempo ahorrado</span>
                     <span className="text-sm font-semibold text-foreground">{formatTime(consumptionMetrics.tiempoAhorrado)}</span>
                   </div>
                   <div className="text-xs text-muted-foreground">Basado en 1.27 min/mensaje procesado</div>
                 </div>
               </div>
             </div>
      </div>
     </div>
   )
 }
 
