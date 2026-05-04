"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getBookingData, confirmVisit, cancelVisit, proposeVisit } from "@/app/actions/booking"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle, AlertCircle, XCircle, RefreshCw } from "lucide-react"
import { format, addDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn, formatWebhookDate, isDemoCookieEnabled, buildBookingLink } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { generateSlotCandidates, isOverlapping } from "@/lib/agenda-utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClient } from "@/lib/supabase/client"

type Lead = {
  id: string
  Nombre: string
  Apellidos?: string
  Inmueble: string
  idag: number
  fecha_de_visita?: string
  Estado?: string
  Email?: string
  Telefono?: string
  [key: string]: any // Allow other fields from DB
}

type Advertisement = {
  ida: string
  Referencia: string
  Direccion: string
  Duracion_visita?: number
  Gap_visita?: number
  duracion_visita?: number
  tiempo_entre_visitas?: number
  whatsapp_activo?: boolean
}

type AgendaItem = {
  id: number
  agente_id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  anuncio_id?: string | number | null
  duracion?: number | null
  gap?: number | null
}

function AgendarVisitaContent() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("leadId")
  const { toast } = useToast()
  const [demoMode, setDemoMode] = useState(false)

  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<{ date: string; slots: string[] }[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null)
  const [agentName, setAgentName] = useState<string>("")
  const [agentEmail, setAgentEmail] = useState<string>("")
  const [agent, setAgent] = useState<any>(null)
  const [inmobiliaria, setInmobiliaria] = useState<any>(null)
  
  const [isRescheduling, setIsRescheduling] = useState(false)
    const [isCancelled, setIsCancelled] = useState(false)
    const [isCancelling, setIsCancelling] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)
    const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
    
    // Proposal state
    const [isProposing, setIsProposing] = useState(false)
    const [proposalDate, setProposalDate] = useState<Date | undefined>(undefined)
    const [proposalShift, setProposalShift] = useState<string>("")
    const [proposalComment, setProposalComment] = useState<string>("")
    const [submittingProposal, setSubmittingProposal] = useState(false)
    const [proposalSuccess, setProposalSuccess] = useState(false)

  useEffect(() => {
    const enabled = isDemoCookieEnabled(document.cookie)
    if (!enabled) {
      setDemoMode(false)
      return
    }

    const disableCookies = () => {
      try {
        const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : ""
        document.cookie = `rf_demo=0; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
        document.cookie = `rf_demo_since=; Path=/; Max-Age=0; SameSite=Lax${secure}`
      } catch {}
    }

    const run = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user?.email) {
          disableCookies()
          setDemoMode(false)
          return
        }

        const { data: perfil } = await supabase
          .from("Perfiles")
          .select("inmobiliaria, is_admin, role")
          .ilike("usuario", user.email)
          .maybeSingle()

        const roleStr = String(perfil?.role || "").toLowerCase()
        const isAdmin = perfil?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
        const isIdi1 = Number(perfil?.inmobiliaria) === 1

        if (isAdmin && isIdi1) {
          setDemoMode(true)
        } else {
          disableCookies()
          setDemoMode(false)
        }
      } catch {
        disableCookies()
        setDemoMode(false)
      }
    }

    run()
  }, [])

  useEffect(() => {
    console.log("AgendarVisitaPage mounted. LeadID:", leadId)
    if (!leadId) {
      setError("Enlace inválido. Falta el ID del cliente.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        console.log("Fetching lead data for:", leadId)
        
        // Use Server Action
        const result = await getBookingData(leadId)

        if (result.error) {
            throw new Error(result.error)
        }

        const { lead: leadData, agent, advertisement: adData, agenda, existingVisits, allAds, inmobiliaria: inmoData } = result

        if (!leadData) {
          throw new Error("No se encontraron datos del cliente.")
        }

        const estado = String(leadData.Estado || "").trim()
        const visitaStatus = String((leadData as any).visita_completada || "").trim().toLowerCase()
        const hasVisitDate = !!leadData.fecha_de_visita && String(leadData.fecha_de_visita).trim() !== ""
        const isCancelledState =
          ["cancelado", "cancelada", "descartado", "descartada"].includes(estado.toLowerCase()) ||
          visitaStatus.includes("cancelad") ||
          visitaStatus.includes("descartad")
        const isProposedState = estado === "Visita Propuesta" || visitaStatus.includes("visita propuesta")
        const isConfirmedState = hasVisitDate && !isProposedState

        if (isCancelledState) {
          setLead(leadData)
          if (agent) {
            setAgentName(agent.Nombre)
            if (agent.Email) setAgentEmail(agent.Email)
            setAgent(agent)
          }
          setAdvertisement(adData || null)
          if (inmoData) setInmobiliaria(inmoData)
          setIsCancelled(true)
          return
        }

        if (!isProposedState && !isConfirmedState) {
          const mailSistema = inmoData
            ? (inmoData as any)["Mail sistema"] ??
              (inmoData as any).mail_sistema ??
              (inmoData as any).Mail_sistema ??
              (inmoData as any).MailSistema ??
              (inmoData as any).mailSistema ??
              (inmoData as any).EmailSistema ??
              (inmoData as any).email_sistema ??
              (inmoData as any).emailSistema
            : null
          const contactoExtra = mailSistema ? ` o con ${mailSistema}` : ""
          setError(`Esta página no está disponible en tu fase del proceso. Contacta con tu agente${contactoExtra}.`)
          return
        }

        setLead(leadData)
        if (agent) {
          setAgentName(agent.Nombre)
          if (agent.Email) setAgentEmail(agent.Email)
          setAgent(agent)
        }
        setAdvertisement(adData || null)
        if (inmoData) setInmobiliaria(inmoData)

        if (hasVisitDate) {
          const d = new Date(String(leadData.fecha_de_visita))
          if (!Number.isNaN(d.getTime())) {
            setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()))
            setSelectedSlot(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`)
            setSuccess(true)
          }
        }

        // Calculate Availability locally using data fetched from server
        calculateAvailability(agenda || [], existingVisits || [], allAds || [], adData || null)

      } catch (err: any) {
        console.error("Error fetching data:", err)
        setError(err.message || "Error al cargar los datos.")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [leadId])

  const calculateAvailability = (agendaData: any[], existingVisits: any[], allAds: any[], currentAd: Advertisement | null) => {
    if (!agendaData || agendaData.length === 0) {
        setAvailableSlots([])
        return
    }

    const slotsByDate: Record<string, string[]> = {}
    const uniqueDates = [...new Set(agendaData.map((a: AgendaItem) => a.fecha))]

    // Map ads for utils
    const mappedAds = allAds?.map((a: any) => ({
        ida: a.ida,
        duracion_visita: a.duracion_visita,
        tiempo_entre_visitas: a.tiempo_entre_visitas
    })) || []

    for (const date of uniqueDates) {
        const dayAgenda = agendaData.filter((a: AgendaItem) => a.fecha === date)
        const dayVisits = existingVisits?.filter((v: any) => v.fecha_de_visita?.startsWith(date)) || []

        const busyRanges: { start: number, end: number }[] = []

        dayVisits.forEach((v: any) => {
          if (v.fecha_de_visita) {
            // Filter cancelled visits
            if (v.Estado === "Cancelado" || v.Estado === "Descartado") return

            // If the visit is for the SAME property, do NOT block the slot! Group visits are allowed.
            if (currentAd && v.Inmueble) {
                const isSameProperty = 
                    v.Inmueble === currentAd.Referencia || 
                    (currentAd.Direccion && v.Inmueble.includes(currentAd.Direccion)) ||
                    (currentAd.Direccion && currentAd.Direccion.includes(v.Inmueble));
                
                if (isSameProperty) return;
            }

            const visitDate = new Date(v.fecha_de_visita)
            const startMinutes = visitDate.getHours() * 60 + visitDate.getMinutes()

            let durMinutes = 30
            let gapMinutes = 0

            if (allAds) {
              const visitAd = allAds.find(
                (a: any) =>
                  a.Referencia === v.Inmueble ||
                  a.Direccion === v.Inmueble ||
                  (v.Inmueble && a.Direccion && v.Inmueble.includes(a.Direccion)),
              )
              if (visitAd) {
                durMinutes = visitAd.duracion_visita || 30
                gapMinutes = visitAd.tiempo_entre_visitas || 0
              }
            }

            busyRanges.push({
              start: startMinutes,
              end: startMinutes + durMinutes + gapMinutes,
            })
          }
        })

        // Filter agenda items relevant to currentAd
        const relevantSlots = dayAgenda.filter((range: AgendaItem) => {
             if (!range.hora_inicio || !range.hora_fin) return false
             // Filter by property specific agenda if applicable
             if (range.anuncio_id && currentAd && String(range.anuncio_id) !== String(currentAd.ida)) return false
             return true
        })

        // Determine defaults from currentAd (or system defaults 20/5)
        const defaultDur = currentAd ? (currentAd.duracion_visita || 20) : 20
        const defaultGap = currentAd ? (currentAd.tiempo_entre_visitas || 5) : 5

        // Generate candidates using centralized logic
        const candidates = generateSlotCandidates(relevantSlots, mappedAds, defaultDur, defaultGap)

        const validSlots: string[] = []
        const now = new Date()

        candidates.forEach(candidate => {
          const [h, m] = candidate.time.split(":").map(Number)
          const slotStart = h * 60 + m
          const slotEnd = slotStart + candidate.duration + candidate.gap

          const candidateDateTime = new Date(`${date}T${candidate.time}`).getTime()
          const isBusy = busyRanges.some(r => isOverlapping(slotStart, slotEnd, r.start, r.end))
          const isPast = candidateDateTime < now.getTime()

          if (!isBusy && !isPast) {
            validSlots.push(candidate.time)
          }
        })

        if (validSlots.length > 0) {
            slotsByDate[date] = [...new Set(validSlots)].sort()
        }
    }

    setAvailableSlots(
        Object.entries(slotsByDate)
            .map(([date, slots]) => ({ date, slots }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    )
  }

  const handleConfirm = async () => {
    if (!lead || !selectedDate || !selectedSlot) return
    setSubmitting(true)

    try {
        const dateStr = format(selectedDate, "yyyy-MM-dd")
        const dateTimeStr = `${dateStr}T${selectedSlot}:00`
        
        // Handle timezone offset for Supabase timestamptz
        const d = new Date(dateTimeStr)
        const off = d.getTimezoneOffset()
        const sign = off <= 0 ? "+" : "-"
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
        const mm = String(Math.abs(off) % 60).padStart(2, "0")
        const offset = `${sign}${hh}:${mm}`
        const valueWithOffset = `${dateTimeStr}${offset}`

        // If rescheduling, trigger cancellation webhook for the previous visit
        if (lead.fecha_de_visita) {
            try {
                 const { status_history, ...leadWithoutStatusHistory } = lead as any
                 const { date: formattedDate, time: formattedTime } = formatWebhookDate(lead.fecha_de_visita)

                 const bookingLink = buildBookingLink(lead.id)

                 const payload = {
                    "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
                    "Agente Asignado": agent || (agentName ? { Nombre: agentName, Email: agentEmail } : null),
                    "Agente Email": agentEmail || null,
                    "Direccion de inmueble": advertisement?.Direccion || lead.Inmueble,
                    "Direccion": advertisement?.Direccion || lead.Inmueble,
                    "Inmueble/Anuncio": {
                        ...(advertisement || {}),
                        Referencia: advertisement?.Referencia || lead.Inmueble,
                        Direccion: advertisement?.Direccion || "Pregunta a tu agente",
                        whatsapp_activo: advertisement?.whatsapp_activo ?? null
                    },
                    "Inmobiliaria": inmobiliaria || null,
                    "Firma": (inmobiliaria as any)?.firma_html || "",
                    "Link de Agendamiento": bookingLink,
                    "Fecha Visita": formattedDate,
                    "Hora Visita": formattedTime,
                    "Fecha Completa": lead.fecha_de_visita,
                    ...leadWithoutStatusHistory
                }

                fetch("/api/cancelar-visita", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                }).catch(e => console.error("Error calling cancellation webhook during reschedule", e))

            } catch (err) {
                 console.error("Error preparing cancellation webhook during reschedule:", err)
            }
        }

        // Use Server Action
        const result = await confirmVisit(lead.id, valueWithOffset)

        if (result.error) throw new Error(result.error)

        // Trigger Confirmation Webhook
        try {
            const { status_history, ...leadWithoutStatusHistory } = lead as any
            
            const { date: formattedDate, time: formattedTime } = formatWebhookDate(valueWithOffset)

            const bookingLink = buildBookingLink(lead.id)

            const payload = {
                "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
                "Agente Asignado": agent || (agentName ? { Nombre: agentName, Email: agentEmail } : null),
                "Agente Email": agentEmail || null,
                "Link de Agendamiento": bookingLink,
                "Direccion de inmueble": advertisement?.Direccion || "Pregunta a tu agente",
                "Direccion": advertisement?.Direccion || "Pregunta a tu agente",
                "Direccion del Anuncio": advertisement?.Direccion || "Pregunta a tu agente",
                "Inmueble/Anuncio": {
                    ...(advertisement || {}),
                    Referencia: advertisement?.Referencia || lead.Inmueble,
                    Direccion: advertisement?.Direccion || "Pregunta a tu agente",
                    whatsapp_activo: advertisement?.whatsapp_activo ?? null
                },
                "Inmobiliaria": inmobiliaria || null,
                "Firma": (inmobiliaria as any)?.firma_html || "",
                "Fecha Visita": formattedDate,
                "Hora Visita": formattedTime,
                "Fecha Completa": valueWithOffset,
                ...leadWithoutStatusHistory,
                fecha_de_visita: valueWithOffset
            }

            // Determine if it's a reschedule or new booking
            const isReschedule = !!lead.fecha_de_visita
            const endpoint = isReschedule ? "/api/reprogramar-visita" : "/api/confirmar-visita"

            fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(e => console.error("Error calling webhook proxy", e))

        } catch (webhookErr) {
            console.error("Error preparing webhook payload:", webhookErr)
        }

        setSuccess(true)
        setLead({ ...lead, fecha_de_visita: valueWithOffset })
        toast({
            title: "Visita agendada",
            description: "Tu visita ha sido confirmada correctamente.",
        })

    } catch (err: any) {
        console.error("Error confirming visit:", err)
        toast({
            title: "Error",
            description: "No se pudo agendar la visita. Inténtalo de nuevo.",
            variant: "destructive",
        })
    } finally {
        setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!lead) return
    setIsCancelling(true)
    try {
        const result = await cancelVisit(lead.id)
        if (result.error) throw new Error(result.error)
        
        // Trigger Cancellation Webhook
        try {
             const { status_history, ...leadWithoutStatusHistory } = lead as any
             const { date: formattedDate, time: formattedTime } = formatWebhookDate(lead.fecha_de_visita)

             const bookingLink = buildBookingLink(lead.id)

             const payload = {
                "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
                "Agente Asignado": agent || (agentName ? { Nombre: agentName, Email: agentEmail } : null),
                "Agente Email": agentEmail || null,
                "Direccion de inmueble": advertisement?.Direccion || "Pregunta a tu agente",
                "Direccion": advertisement?.Direccion || "Pregunta a tu agente",
                "Direccion del Anuncio": advertisement?.Direccion || "Pregunta a tu agente",
                "Inmueble/Anuncio": {
                    ...(advertisement || {}),
                    Referencia: advertisement?.Referencia || lead.Inmueble,
                    Direccion: advertisement?.Direccion || "Pregunta a tu agente",
                    whatsapp_activo: advertisement?.whatsapp_activo ?? null
                },
                "Inmobiliaria": inmobiliaria || null,
                "Firma": (inmobiliaria as any)?.firma_html || "",
                "Link de Agendamiento": bookingLink,
                "Fecha Visita": formattedDate,
                "Hora Visita": formattedTime,
                "Fecha Completa": lead.fecha_de_visita,
                ...leadWithoutStatusHistory,
                Estado: "Descartado"
            }

            fetch("/api/cancelar-visita", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(e => console.error("Error calling webhook proxy", e))

        } catch (webhookErr) {
            console.error("Error preparing webhook payload:", webhookErr)
        }

        toast({
            title: "Visita anulada",
            description: "La visita ha sido cancelada correctamente.",
        })

        // Update local state to show cancellation confirmation
        setLead({ ...lead, fecha_de_visita: undefined, Estado: "Descartado" })
        setIsRescheduling(false)
        setSuccess(false)
        setSelectedDate(undefined)
        setSelectedSlot(null)
        setIsCancelled(true)
        
    } catch (err: any) {
        console.error("Error cancelling visit:", err)
        toast({
            title: "Error",
            description: "No se pudo anular la visita.",
            variant: "destructive",
        })
    } finally {
        setIsCancelling(false)
    }
  }

  const handlePropose = async () => {
    if (!lead || !proposalDate || !proposalShift) return
    setSubmittingProposal(true)

    try {
        const dateStr = format(proposalDate, "yyyy-MM-dd")
        const dateTimeStr = `${dateStr}T12:00:00`
        
        // Handle timezone offset
        const d = new Date(dateTimeStr)
        const off = d.getTimezoneOffset()
        const sign = off <= 0 ? "+" : "-"
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
        const mm = String(Math.abs(off) % 60).padStart(2, "0")
        const offset = `${sign}${hh}:${mm}`
        const valueWithOffset = `${dateTimeStr}${offset}`

        // Trigger Webhook
        try {
            const { status_history, ...leadWithoutStatusHistory } = lead as any
            const { date: formattedDate } = formatWebhookDate(valueWithOffset)
            
            const bookingLink = buildBookingLink(lead.id)

            const payload = {
                "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
                "Agente Asignado": agent || (agentName ? { Nombre: agentName, Email: agentEmail } : null),
                "Agente Email": agentEmail || null,
                "Direccion de inmueble": advertisement?.Direccion || lead.Inmueble,
                "Direccion": advertisement?.Direccion || lead.Inmueble,
                "Inmueble/Anuncio": advertisement 
                    ? { ...advertisement, Direccion: advertisement.Direccion || lead.Inmueble } 
                    : { Referencia: lead.Inmueble, Direccion: "Pregunta a tu agente", whatsapp_activo: null },
                "Inmobiliaria": inmobiliaria || null,
                "Nombre Inmobiliaria": inmobiliaria?.nombre_inmobiliaria || "Sin nombre",
                "Firma": (inmobiliaria as any)?.firma_html || "",
                "Link de Agendamiento": bookingLink,
                "Fecha Visita": formattedDate,
                "Hora Visita": proposalShift,
                "Turno Preferido": proposalShift,
                "Fecha Completa": dateStr,
                "Comentario cliente": proposalComment.trim() || null,
                ...leadWithoutStatusHistory,
                fecha_de_visita: valueWithOffset,
                Estado: "Visita Propuesta",
                visita_completada: `visita propuesta ${proposalShift.toLowerCase()}`
            }

            fetch("/api/sugerir-fecha-visita", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(e => console.error("Error calling proposal webhook", e))

        } catch (webhookErr) {
            console.error("Error preparing proposal webhook:", webhookErr)
        }

        const agentIdToUse = lead.idag ?? agent?.idag ?? null
        const proposalMeta = {
            inmobiliariaId: (inmobiliaria as any)?.idi ?? (advertisement as any)?.usuario ?? null,
            inmuebleRef: (advertisement as any)?.Referencia ?? lead.Inmueble ?? null,
            inmuebleDireccion: (advertisement as any)?.Direccion ?? lead.Inmueble ?? null,
            inmuebleId: (advertisement as any)?.ida ?? (advertisement as any)?.id ?? null,
            message: proposalComment.trim() || null
        }
        const proposeResult = await proposeVisit(lead.id, valueWithOffset, proposalShift, agentIdToUse, proposalMeta)
        if (proposeResult?.error) throw new Error(proposeResult.error)

        setLead({ ...lead, fecha_de_visita: valueWithOffset, Estado: "Visita Propuesta", visita_completada: `visita propuesta ${proposalShift.toLowerCase()}` })
        setProposalSuccess(true)
        toast({
            title: "Propuesta enviada",
            description: "El agente revisará tu propuesta y te confirmará la disponibilidad.",
        })

    } catch (err: any) {
        console.error("Error proposing visit:", err)
        toast({
            title: "Error",
            description: err?.message || "No se pudo enviar la propuesta. Inténtalo de nuevo.",
            variant: "destructive",
        })
    } finally {
        setSubmittingProposal(false)
    }
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background" suppressHydrationWarning>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">Enlace no válido</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  if (proposalSuccess) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-blue-200 text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                        <Clock className="h-8 w-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl text-blue-800">¡Propuesta Enviada!</CardTitle>
                    <CardDescription className="text-lg">
                        Hemos notificado al agente tu propuesta para:
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                            <div className="rounded-lg bg-muted/30 p-6 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            {proposalDate && format(proposalDate, "d 'de' MMMM", { locale: es })}
                        </div>
                                <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
                            <Clock className="h-6 w-6 text-primary" />
                                    {proposalShift}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        El agente revisará la disponibilidad y te confirmará lo antes posible.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                    <Button 
                        onClick={() => window.location.href = inmobiliaria?.pagina_web || 'https://acesalquiler.com'}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        Salir
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (isCancelled) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-border text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                        <XCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <CardTitle className="text-2xl text-foreground">Visita Cancelada</CardTitle>
                    <CardDescription className="text-lg">
                        Tu visita ha sido anulada correctamente.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground font-medium mb-4">
                        Si necesitas otra fecha, contacta con tu agente.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pb-6">
                    <Button 
                        onClick={() => window.location.href = inmobiliaria?.pagina_web || 'https://acesalquiler.com'}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    >
                        Salir
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (success) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-md border-green-200 text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <CardTitle className="text-2xl text-green-800">¡Visita Confirmada!</CardTitle>
                    <CardDescription className="text-lg">
                        Has agendado tu visita para el:
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg bg-muted/30 p-6 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
                            <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                            {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold text-foreground">
                            <Clock className="h-6 w-6 text-primary" />
                            {selectedSlot}
                        </div>
                    </div>
                    {advertisement && (
                        <div className="flex items-start gap-3 rounded-md border p-3 text-left">
                            <MapPin className="mt-1 h-5 w-5 text-muted-foreground shrink-0" />
                            <div>
                                <p className="font-medium">{advertisement.Direccion}</p>
                                <p className="text-sm text-muted-foreground">{advertisement.Referencia}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2 pb-6">
                    <div className="flex w-full flex-col sm:flex-row gap-3">
                         <Button 
                            onClick={() => {
                                setSuccess(false)
                                setIsRescheduling(true)
                            }} 
                            variant="outline"
                            className="flex-1 gap-2"
                         >
                            <RefreshCw className="h-4 w-4" />
                            Reprogramar
                         </Button>
                         <Button 
                            onClick={() => setIsCancelConfirmOpen(true)} 
                            variant="destructive" 
                            className="flex-1 gap-2"
                            disabled={isCancelling}
                         >
                            {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            Anular
                         </Button>
                    </div>
                    <Button 
                        onClick={() => window.location.href = inmobiliaria?.pagina_web || 'https://acesalquiler.com'}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white mt-2"
                    >
                        Salir
                    </Button>
                </CardFooter>
            </Card>
            <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar anulación</AlertDialogTitle>
                        <AlertDialogDescription>
                            Al anular la cita tu candidatura será descartada, considera elegir otra fecha en lugar de cancelarla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No anular</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                                await handleCancel()
                                setIsCancelConfirmOpen(false)
                            }}
                            disabled={isCancelling}
                        >
                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sí, anular cita
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
  }

  const availableDates = availableSlots.map(s => new Date(s.date))
  const slotsForSelectedDate = selectedDate 
    ? availableSlots.find(s => isSameDay(new Date(s.date), selectedDate))?.slots || []
    : []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-slate-900 pt-12 pb-24 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Agendar Visita</h1>
        <p className="mt-2 text-lg text-white/70">
            Hola{" "}
            <span className={cn(demoMode && "blur-sm select-none")}>{lead?.Nombre}</span>, selecciona la fecha y hora para tu visita.
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 -mt-16 space-y-8 pb-24">
        {/* Property & Agent Info Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Property Info */}
                    <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-border">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-primary/10 p-3">
                                <MapPin className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Inmueble</h3>
                                {advertisement ? (
                                    <>
                                        <p className="text-muted-foreground">{advertisement.Direccion}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{advertisement.Referencia}</p>
                                    </>
                                ) : (
                                    <p className="text-muted-foreground">Información no disponible</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Agent Info */}
                    {agentName && (
                        <div className="flex-1 p-6 bg-muted/30">
                            <div className="flex items-start gap-4">
                                <div className="rounded-full bg-primary/10 p-3">
                                    <User className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground">Agente</h3>
                                    <p className="text-muted-foreground">{agentName}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {lead?.fecha_de_visita && !isRescheduling && !success ? (
        <>
             <Card className="border-l-4 border-l-blue-600 shadow-md">
                 <CardHeader>
                     <div className="flex items-center gap-2 text-blue-600 mb-2">
                         <CalendarIcon className="h-6 w-6" />
                         <span className="font-semibold uppercase tracking-wider text-sm">Visita Programada</span>
                     </div>
                     <CardTitle className="text-2xl">Ya tienes una visita agendada</CardTitle>
                     <CardDescription>
                         Aquí puedes ver los detalles de tu cita. Si necesitas cambiarla o cancelarla, usa los botones de abajo.
                     </CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-6">
                     <div className="flex flex-col md:flex-row gap-6 p-4 bg-muted/30 rounded-lg border border-border">
                         <div className="flex items-center gap-3">
                            <div className="bg-background p-2 rounded-full shadow-sm">
                                 <CalendarIcon className="h-6 w-6 text-muted-foreground" />
                             </div>
                             <div>
                                 <p className="text-sm text-muted-foreground font-medium">Fecha</p>
                                 <p className="text-lg font-bold text-foreground capitalize">
                                     {format(new Date(lead.fecha_de_visita), "EEEE d 'de' MMMM", { locale: es })}
                                 </p>
                             </div>
                         </div>
                         <div className="flex items-center gap-3">
                            <div className="bg-background p-2 rounded-full shadow-sm">
                                 <Clock className="h-6 w-6 text-muted-foreground" />
                             </div>
                             <div>
                                 <p className="text-sm text-muted-foreground font-medium">Hora</p>
                                 <p className="text-lg font-bold text-foreground">
                                     {format(new Date(lead.fecha_de_visita), "HH:mm")}
                                 </p>
                             </div>
                         </div>
                     </div>
                 </CardContent>
                 <CardFooter className="flex flex-col sm:flex-row gap-3 pt-2">
                     <Button 
                        onClick={() => setIsRescheduling(true)} 
                        className="w-full sm:w-auto gap-2"
                     >
                        <RefreshCw className="h-4 w-4" />
                        Reprogramar Visita
                     </Button>
                     <Button 
                        onClick={() => setIsCancelConfirmOpen(true)} 
                        variant="destructive" 
                        className="w-full sm:w-auto gap-2"
                        disabled={isCancelling}
                     >
                        {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Anular Cita
                     </Button>
                    <Button
                       onClick={() => window.location.href = inmobiliaria?.pagina_web || 'https://acesalquiler.com'}
                       variant="outline"
                       className="w-full sm:w-auto"
                    >
                       Salir
                    </Button>
                 </CardFooter>
             </Card>
            <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar anulación</AlertDialogTitle>
                        <AlertDialogDescription>
                            Al anular la cita tu candidatura será descartada, considera elegir otra fecha en lugar de cancelarla.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>No anular</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={async () => {
                                await handleCancel()
                                setIsCancelConfirmOpen(false)
                            }}
                            disabled={isCancelling}
                        >
                            {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sí, anular cita
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
        ) : (
        <>
            {isRescheduling && (
                <div className="flex justify-end">
                    <Button variant="ghost" onClick={() => setIsRescheduling(false)} className="text-muted-foreground gap-1">
                        <XCircle className="h-4 w-4" /> Cancelar Reprogramación
                    </Button>
                </div>
            )}
            
        {/* Date Selection */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                1. Selecciona un día disponible
            </h2>
            
            {availableSlots.length > 0 ? (
                <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x">
                    {availableSlots.map(({ date }) => {
                        const d = new Date(date)
                        const isSelected = selectedDate && isSameDay(d, selectedDate)
                        
                        return (
                            <button
                                key={date}
                                onClick={() => {
                                    setSelectedDate(d)
                                    setSelectedSlot(null)
                                    setIsExpanded(false)
                                    setIsProposing(false)
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[100px] h-24 rounded-xl border-2 transition-all snap-start focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                                    isSelected 
                                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-105" 
                                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:bg-muted/30"
                                )}
                            >
                                <span className="text-xs font-medium uppercase tracking-wider opacity-80">
                                    {format(d, "EEE", { locale: es })}
                                </span>
                                <span className="text-3xl font-bold my-1">
                                    {format(d, "d")}
                                </span>
                                <span className="text-xs font-medium opacity-80">
                                    {format(d, "MMM", { locale: es })}
                                </span>
                            </button>
                        )
                    })}
                </div>
            ) : (
                <Card className="bg-muted/30 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <p className="text-muted-foreground font-medium">No hay fechas disponibles próximamente.</p>
                        <p className="text-sm text-muted-foreground/80">Contacta con el agente para más opciones.</p>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Time Selection */}
        {selectedDate && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    2. Selecciona una hora
                </h2>

                <Card>
                    <CardContent className="p-6">
                        {slotsForSelectedDate.length > 0 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {(isExpanded ? slotsForSelectedDate : slotsForSelectedDate.slice(0, 3)).map((slot) => (
                                        <Button
                                            key={slot}
                                            variant={selectedSlot === slot ? "default" : "outline"}
                                            className={cn(
                                                "h-12 text-lg font-medium transition-all",
                                                selectedSlot === slot ? "shadow-md scale-105" : "hover:border-primary/50"
                                            )}
                                            onClick={() => setSelectedSlot(slot)}
                                        >
                                            {slot}
                                        </Button>
                                    ))}
                                </div>
                                
                                {!isExpanded && slotsForSelectedDate.length > 3 && (
                                    <div className="flex justify-center pt-2">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setIsExpanded(true)}
                                            className="text-primary hover:text-primary/80 hover:bg-primary/5 gap-2"
                                        >
                                            <Clock className="h-4 w-4" />
                                            Ver más horarios disponibles ({slotsForSelectedDate.length - 3} más)
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No hay horarios disponibles para este día.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Proposal Section */}
        {!success && !isCancelled && !proposalSuccess && (
            <div className="space-y-4 pt-8 pb-8 border-t border-border">
                {!isProposing ? (
                    <div className="text-center">
                        <p className="text-muted-foreground mb-3">¿No te encajan estos horarios?</p>
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                setIsProposing(true)
                                setSelectedDate(undefined)
                                setSelectedSlot(null)
                                setProposalShift("")
                                setProposalComment("")
                            }}
                            className="border-primary text-primary hover:bg-primary/5"
                        >
                            Sugerir otra fecha y hora
                        </Button>
                    </div>
                ) : (
                    <Card className="border-primary/20 bg-primary/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <CardTitle className="text-lg text-primary">Sugerir Fecha y Hora</CardTitle>
                            <CardDescription>
                                Propón un horario que te vaya bien y el agente te contactará para confirmar.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-medium text-foreground">Fecha Propuesta</label>
                                    <input
                                        type="date"
                                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={proposalDate ? format(proposalDate, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const val = e.target.value
                                            setProposalDate(val ? new Date(val) : undefined)
                                        }}
                                    />
                                </div>
                                <div className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Turno Preferido</label>
                                        <select
                                            className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                                            value={proposalShift}
                                            onChange={(e) => setProposalShift(e.target.value)}
                                        >
                                            <option value="">Selecciona un turno</option>
                                            <option value="Mañana">Mañana</option>
                                            <option value="Tarde">Tarde</option>
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            Indica el turno en el que te gustaría realizar la visita.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-foreground">Comentario</label>
                                        <Textarea
                                            value={proposalComment}
                                            onChange={(e) => setProposalComment(e.target.value)}
                                            placeholder="Añade un comentario para el agente (opcional)"
                                            className="bg-background"
                                        />
                                    </div>
                                    
                                    {proposalDate && proposalShift && (
                                        <div className="rounded-md bg-primary/10 p-4 text-primary text-sm">
                                            <p className="font-semibold mb-1">Resumen de tu propuesta:</p>
                                            <p>
                                                <span className="capitalize">{format(new Date(proposalDate.getTime() + proposalDate.getTimezoneOffset() * 60000), "EEEE d 'de' MMMM", { locale: es })}</span> en turno {proposalShift.toLowerCase()}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between gap-3 bg-muted/30 border-t border-border p-6">
                            <Button 
                                variant="ghost" 
                                onClick={() => setIsProposing(false)}
                                className="text-muted-foreground"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handlePropose}
                                disabled={!proposalDate || !proposalShift || submittingProposal}
                                className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                            >
                                {submittingProposal ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    "Enviar Propuesta"
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        )}

        {/* Confirm Action */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:transform-none z-50",
            selectedDate && selectedSlot ? "translate-y-0" : "translate-y-full md:translate-y-0 md:opacity-0 md:pointer-events-none",
            selectedDate && selectedSlot && "md:opacity-100 md:pointer-events-auto"
        )}>
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 md:justify-end">
                <div className="hidden md:block text-right mr-4">
                    <p className="text-sm text-muted-foreground">Fecha seleccionada</p>
                    <p className="font-semibold text-foreground">
                        {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })} - {selectedSlot}
                    </p>
                </div>
                <Button 
                    size="lg" 
                    className="w-full md:w-auto md:min-w-[200px] text-lg h-14 shadow-xl shadow-primary/20"
                    disabled={!selectedDate || !selectedSlot || submitting}
                    onClick={handleConfirm}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Confirmando...
                        </>
                    ) : (
                        "Confirmar Visita"
                    )}
                </Button>
            </div>
        </div>
        
        {/* Spacer for mobile fixed footer */}
        <div className="h-24 md:hidden"></div>
        </>
        )}

      </div>
    </div>
  )
}

export default function AgendarVisitaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AgendarVisitaContent />
    </Suspense>
  )
}
