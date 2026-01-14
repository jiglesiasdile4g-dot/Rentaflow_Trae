"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { getBookingData, confirmVisit } from "@/app/actions/booking"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle } from "lucide-react"
import { format, addDays, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

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
}

type AgendaItem = {
  id: number
  agente_id: number
  fecha: string
  hora_inicio: string
  hora_fin: string
  anuncio_id?: string
}

function AgendarVisitaContent() {
  const searchParams = useSearchParams()
  const leadId = searchParams.get("leadId")
  const { toast } = useToast()

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
  const [inmobiliaria, setInmobiliaria] = useState<any>(null)

  // Remove client-side supabase
  // const supabase = createClient()

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

        setLead(leadData)
        if (agent) {
          setAgentName(agent.Nombre)
          if (agent.Email) setAgentEmail(agent.Email)
        }
        setAdvertisement(adData)
        if (inmoData) setInmobiliaria(inmoData)

        // Calculate Availability locally using data fetched from server
        calculateAvailability(agenda || [], existingVisits || [], allAds || [], adData)

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

    for (const date of uniqueDates) {
        const dayAgenda = agendaData.filter((a: AgendaItem) => a.fecha === date)
        const dayVisits = existingVisits?.filter((v: any) => v.fecha_de_visita?.startsWith(date)) || []

        // Calculate busy ranges
        const busyRanges: { start: number, end: number }[] = []
        
        dayVisits.forEach((v: any) => {
            if (v.fecha_de_visita) {
                const start = new Date(v.fecha_de_visita).getTime()
                // Find ad duration for THIS visit
                let dur = 30 * 60000
                let gap = 0
                
                if (allAds) {
                    const visitAd = allAds.find((a: any) => 
                        a.Referencia === v.Inmueble || 
                        a.Direccion === v.Inmueble ||
                        (v.Inmueble && a.Direccion && v.Inmueble.includes(a.Direccion))
                    )
                    if (visitAd) {
                        dur = (visitAd.Duracion_visita || visitAd.duracion_visita || 30) * 60000
                        gap = (visitAd.Gap_visita || visitAd.tiempo_entre_visitas || 0) * 60000
                    }
                }
                
                busyRanges.push({ start, end: start + dur + gap })
            }
        })

        const slots: string[] = []
        
        dayAgenda.forEach((range: AgendaItem) => {
            if (!range.hora_inicio || !range.hora_fin) return
            // Filter by property specific agenda if applicable
            if (range.anuncio_id && currentAd && range.anuncio_id !== currentAd.ida) return

            let start = range.hora_inicio.slice(0, 5)
            const end = range.hora_fin.slice(0, 5)
            let [h, m] = start.split(':').map(Number)
            let currentMins = h * 60 + m
            const [endH, endM] = end.split(':').map(Number)
            const endMins = endH * 60 + endM

            while (currentMins < endMins) {
                const slotH = Math.floor(currentMins / 60)
                const slotM = currentMins % 60
                const timeStr = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`

                // Check availability
                let currentDur = 30 * 60000
                let currentGap = 0
                if (currentAd) {
                    currentDur = (currentAd.Duracion_visita || currentAd.duracion_visita || 30) * 60000
                    currentGap = (currentAd.Gap_visita || currentAd.tiempo_entre_visitas || 0) * 60000
                }
                
                const totalDur = currentDur + currentGap
                const slotStart = new Date(`${date}T${timeStr}`).getTime()
                const slotEnd = slotStart + totalDur

                const isBusy = busyRanges.some(r => (slotStart < r.end && slotEnd > r.start))

                // Also check if slot is in the past (if date is today)
                const now = new Date()
                const isPast = new Date(`${date}T${timeStr}`).getTime() < now.getTime()

                if (!isBusy && !isPast) {
                    slots.push(timeStr)
                }

                currentMins += 15 
            }
        })

        if (slots.length > 0) {
            slotsByDate[date] = [...new Set(slots)].sort()
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

        // Use Server Action
        const result = await confirmVisit(lead.id, valueWithOffset)

        if (result.error) throw new Error(result.error)

        // Trigger Confirmation Webhook
        try {
            const { status_history, ...leadWithoutStatusHistory } = lead as any

            const payload = {
                "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
                "Agente Asignado": agentName || null,
                "Agente Email": agentEmail || null,
                "Inmueble/Anuncio": advertisement || { Referencia: lead.Inmueble },
                "Inmobiliaria": inmobiliaria || null,
                "Firma": (inmobiliaria as any)?.firma_html || "",
                "Fecha Visita": dateStr,
                "Hora Visita": selectedSlot,
                "Fecha Completa": valueWithOffset,
                ...leadWithoutStatusHistory
            }

            fetch("/api/confirmar-visita", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }).catch(e => console.error("Error calling webhook proxy", e))

        } catch (webhookErr) {
            console.error("Error preparing webhook payload:", webhookErr)
        }

        setSuccess(true)
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

  if (loading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50" suppressHydrationWarning>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  if (error) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
            <Card className="w-full max-w-md border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600">Enlace no válido</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
            </Card>
        </div>
    )
  }

  if (success) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
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
                    <div className="rounded-lg bg-slate-50 p-6 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-xl font-semibold text-slate-900">
                            <CalendarIcon className="h-5 w-5 text-slate-500" />
                            {selectedDate && format(selectedDate, "d 'de' MMMM", { locale: es })}
                        </div>
                        <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold text-primary">
                            <Clock className="h-6 w-6" />
                            {selectedSlot}
                        </div>
                    </div>
                    {advertisement && (
                        <div className="flex items-start gap-3 rounded-md border p-3 text-left">
                            <MapPin className="mt-1 h-5 w-5 text-slate-400 shrink-0" />
                            <div>
                                <p className="font-medium">{advertisement.Direccion}</p>
                                <p className="text-sm text-slate-500">{advertisement.Referencia}</p>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center pt-2 pb-6">
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

  const availableDates = availableSlots.map(s => new Date(s.date))
  const slotsForSelectedDate = selectedDate 
    ? availableSlots.find(s => isSameDay(new Date(s.date), selectedDate))?.slots || []
    : []

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 pt-12 pb-24 px-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Agendar Visita</h1>
        <p className="mt-2 text-lg text-slate-300">
            Hola {lead?.Nombre}, selecciona la fecha y hora para tu visita.
        </p>
      </div>

      <div className="mx-auto max-w-4xl px-4 -mt-16 space-y-8 pb-24">
        {/* Property & Agent Info Card */}
        <Card className="shadow-xl border-0 overflow-hidden">
            <CardContent className="p-0">
                <div className="flex flex-col md:flex-row">
                    {/* Property Info */}
                    <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-100">
                        <div className="flex items-start gap-4">
                            <div className="rounded-full bg-blue-50 p-3">
                                <MapPin className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-slate-900">Inmueble</h3>
                                {advertisement ? (
                                    <>
                                        <p className="text-slate-600">{advertisement.Direccion}</p>
                                        <p className="text-sm text-slate-400 mt-1">{advertisement.Referencia}</p>
                                    </>
                                ) : (
                                    <p className="text-slate-500">Información no disponible</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Agent Info */}
                    {agentName && (
                        <div className="flex-1 p-6 bg-slate-50/50">
                            <div className="flex items-start gap-4">
                                <div className="rounded-full bg-purple-50 p-3">
                                    <User className="h-6 w-6 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-slate-900">Agente</h3>
                                    <p className="text-slate-600">{agentName}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>

        {/* Date Selection */}
        <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-slate-500" />
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
                                }}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[100px] h-24 rounded-xl border-2 transition-all snap-start focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                                    isSelected 
                                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-105" 
                                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
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
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <CalendarIcon className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">No hay fechas disponibles próximamente.</p>
                        <p className="text-sm text-slate-400">Contacta con el agente para más opciones.</p>
                    </CardContent>
                </Card>
            )}
        </div>

        {/* Time Selection */}
        {selectedDate && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-slate-500" />
                    2. Selecciona una hora
                </h2>

                <Card>
                    <CardContent className="p-6">
                        {slotsForSelectedDate.length > 0 ? (
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                {slotsForSelectedDate.map((slot) => (
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
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                No hay horarios disponibles para este día.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Confirm Action */}
        <div className={cn(
            "fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] transition-transform duration-300 md:relative md:bg-transparent md:border-0 md:shadow-none md:p-0 md:transform-none z-50",
            selectedDate && selectedSlot ? "translate-y-0" : "translate-y-full md:translate-y-0 md:opacity-0 md:pointer-events-none",
            selectedDate && selectedSlot && "md:opacity-100 md:pointer-events-auto"
        )}>
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 md:justify-end">
                <div className="hidden md:block text-right mr-4">
                    <p className="text-sm text-slate-500">Fecha seleccionada</p>
                    <p className="font-semibold text-slate-900">
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

      </div>
    </div>
  )
}

export default function AgendarVisitaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AgendarVisitaContent />
    </Suspense>
  )
}
