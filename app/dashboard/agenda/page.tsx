"use client"

import { useState, useEffect, useMemo, useRef, type TouchEvent } from "react"
import { createClient } from "@/lib/supabase/client"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Clock, CalendarDays, User, Building, Phone, Euro, CheckCircle, FileText, Undo, Check, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { getAgentsByIdi, getAgentByEmail } from "@/app/actions/get-agents"
import { useToast } from "@/hooks/use-toast"
import { format, addDays, startOfToday, startOfWeek, addWeeks, isBefore } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn, formatWebhookDate } from "@/lib/utils"
import { fixUserPermissionsAction } from "@/app/actions/user-config"
import { LeadDetailModal } from "@/components/lead-detail-modal"
import { generateSlotCandidates, isOverlapping, AgendaSlot, AdData } from "@/lib/agenda-utils"

interface TimeSlot {
  id?: number
  hora_inicio: string
  hora_fin: string
  anuncio_id?: string | number | null
  duracion?: number | null
  gap?: number | null
}

interface AgendaItem {
  id: number
  fecha: string | null
  hora_inicio: string
  hora_fin: string
  anuncio_id: string | number | null
  duracion?: number | null
  gap?: number | null
}

interface AnuncioOption {
  ida: string | number
  Referencia: string
  Direccion: string
  duracion_visita?: number
  tiempo_entre_visitas?: number
  Activacion?: string
}

interface ScheduledVisit {
  id: number
  Nombre: string
  Apellidos?: string
  Inmueble: string
  fecha_de_visita: string
  Telefono: string | null
  Ingresos?: number
  visita_completada?: boolean
  resumen_visita?: string
}

interface DayTab {
  date: Date
  label: string
  fullLabel: string
  id: string
  disabled: boolean
}

export default function AgendaPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [agentId, setAgentId] = useState<number | null>(null)
  const [canManageOthers, setCanManageOthers] = useState(false)
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null)
  const [agentsList, setAgentsList] = useState<Array<{ idag: number; Nombre: string; nombre?: string; Email: string }>>([])

  // Tabs state
  const [currentWeekDays, setCurrentWeekDays] = useState<DayTab[]>([])
  const [nextWeekDays, setNextWeekDays] = useState<DayTab[]>([])
  const [nextWeekOffset, setNextWeekOffset] = useState(0)
  const [selectedDateStr, setSelectedDateStr] = useState<string>("")
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([])
  const [currentSlots, setCurrentSlots] = useState<TimeSlot[]>([])
  const [dayVisits, setDayVisits] = useState<ScheduledVisit[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const nextWeekTouchStartX = useRef<number | null>(null)
  
  // Visit completion state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedVisitToComplete, setSelectedVisitToComplete] = useState<ScheduledVisit | null>(null)
  const [visitSummary, setVisitSummary] = useState("")
  
  // Reschedule state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [visitToReschedule, setVisitToReschedule] = useState<ScheduledVisit | null>(null)
  const [newRescheduleDate, setNewRescheduleDate] = useState<Date | undefined>(undefined)
  const [newRescheduleTime, setNewRescheduleTime] = useState("")
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [availableAnuncios, setAvailableAnuncios] = useState<AnuncioOption[]>([])

  // Cancel state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [visitToCancel, setVisitToCancel] = useState<ScheduledVisit | null>(null)

  // Lead Detail Modal state
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null)
  const [isLeadDetailModalOpen, setIsLeadDetailModalOpen] = useState(false)

  const { toast } = useToast()
  const supabase = createClient()
  const { inmobiliariaId, inmobiliariaNombre } = useInmobiliaria()

  // Helper to safely parse dates
  const safeDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  }

  // Generate time options: 07:00 to 23:00 in 10min intervals
  const timeOptions = useMemo(() => {
    const options: string[] = []
    // Start at 07:00 (7 * 60 = 420 minutes)
    // End at 23:00 (23 * 60 = 1380 minutes)
    for (let minutes = 420; minutes <= 1380; minutes += 10) {
      const h = Math.floor(minutes / 60)
      const m = minutes % 60
      const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
      options.push(time)
    }
    return options
  }, [])

  const visibleNextWeekDays = useMemo(() => {
    return nextWeekDays.slice(nextWeekOffset, nextWeekOffset + 7)
  }, [nextWeekDays, nextWeekOffset])
  const maxNextWeekOffset = Math.max(0, nextWeekDays.length - 7)
  const canShiftPrevNextWeek = nextWeekOffset > 0
  const canShiftNextNextWeek = nextWeekOffset < maxNextWeekOffset

  const shiftNextWeek = (delta: number) => {
    setNextWeekOffset(prev => {
      const maxOffset = Math.max(0, nextWeekDays.length - 7)
      return Math.min(maxOffset, Math.max(0, prev + delta))
    })
  }

  const handleNextWeekTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    nextWeekTouchStartX.current = e.touches[0]?.clientX ?? null
  }

  const handleNextWeekTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
    if (nextWeekTouchStartX.current === null) return
    const endX = e.changedTouches[0]?.clientX ?? nextWeekTouchStartX.current
    const delta = endX - nextWeekTouchStartX.current
    nextWeekTouchStartX.current = null
    if (Math.abs(delta) < 40) return
    shiftNextWeek(delta < 0 ? 7 : -7)
  }

  // Initialize weeks
  useEffect(() => {
    const today = startOfToday()
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const startOfNextWeek = addWeeks(startOfCurrentWeek, 1)

    // Helper to create days
    const createDays = (startDate: Date, count: number): DayTab[] => {
      const days: DayTab[] = []
      for (let i = 0; i < count; i++) {
        const date = addDays(startDate, i)
        const dateStr = format(date, "yyyy-MM-dd")
        days.push({
          date,
          id: dateStr,
          label: format(date, "EEE d", { locale: es }),
          fullLabel: format(date, "EEEE d 'de' MMMM", { locale: es }),
          disabled: isBefore(date, today)
        })
      }
      return days
    }

    const current = createDays(startOfCurrentWeek, 7)
    const next = createDays(startOfNextWeek, 35)
    
    setCurrentWeekDays(current)
    setNextWeekDays(next)
    
    // Set default selected date to today or next available day
    const validDay = current.find(d => !d.disabled) || next[0]
    if (validDay) {
      setSelectedDateStr(validDay.id)
    }
  }, [])

  useEffect(() => {
    fetchAgentAndSchedule()
  }, [inmobiliariaId])

  // Fetch available anuncios for the selector
  useEffect(() => {
    const fetchAnuncios = async () => {
      if (!inmobiliariaId) return

      try {
        console.log("Fetching anuncios for agenda, inmobiliariaId:", inmobiliariaId)
        const { data, error } = await supabase
          .from("Anuncios")
          .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, Activacion")
          .eq("usuario", inmobiliariaId)
          .eq("Activacion", "Activo") // Show all to ensure we can resolve references for existing visits
          .order("Referencia")

        if (error) {
          console.log("Error fetching with new columns, trying fallback:", error.message)
          // Fallback if columns don't exist yet
          if (error.code === 'PGRST204' || error.message.includes('duracion_visita') || error.message.includes('does not exist')) {
             const { data: dataFallback, error: errorFallback } = await supabase
              .from("Anuncios")
              .select("ida, Referencia, Direccion, Activacion")
              .eq("usuario", inmobiliariaId)
              .order("Referencia")
              
             if (!errorFallback) {
                setAvailableAnuncios(dataFallback || [])
                return
             }
          }
          console.error("Error fetching anuncios:", error)
        } else {
          console.log("Anuncios fetched:", data?.length)
          setAvailableAnuncios(data || [])
        }
      } catch (err) {
        console.error("Error loading anuncios:", err)
      }
    }

    fetchAnuncios()
  }, [inmobiliariaId])

  // Calculate preview slots for the dashboard view
  const previewSlots = useMemo(() => {
    if (!selectedDateStr) return []

    // 1. Get availability ranges for this day
    const dayRanges = agendaItems.filter(item => item.fecha === selectedDateStr)
    if (dayRanges.length === 0) return []

    // 2. Generate candidates using shared utility
    // Note: previewSlots doesn't have "visitToReschedule" context, so default is always 20/5
    const candidates = generateSlotCandidates(dayRanges, availableAnuncios, 20, 5)

    return candidates.map(c => {
        // Calculate slot end for collision check
        // generateSlotCandidates returns time (start) and we know duration+gap
        const [h, m] = c.time.split(':').map(Number)
        const startMins = h * 60 + m
        const slotEnd = startMins + c.duration + c.gap

        // Check collision
        const isOccupied = dayVisits.some(visit => {
            const vDate = safeDate(visit.fecha_de_visita)
            if (!vDate) return false
            const [vh, vm] = format(vDate, "HH:mm").split(':').map(Number)
            const vStart = vh * 60 + vm
            
            // Estimate visit duration
            let vDuration = 20
            let vGap = 5
            let configFound = false

            // 1. Check Priority: Agent Configuration (AgendaItem)
            const matchingAgendaItem = dayRanges.find(item => {
                  const [sH, sM] = item.hora_inicio.slice(0, 5).split(':').map(Number)
                  const [eH, eM] = item.hora_fin.slice(0, 5).split(':').map(Number)
                  const startMins = sH * 60 + sM
                  const endMins = eH * 60 + eM
                  return vStart >= startMins && vStart < endMins
            })

            if (matchingAgendaItem) {
                  if (matchingAgendaItem.duracion) {
                      vDuration = Number(matchingAgendaItem.duracion)
                      vGap = (matchingAgendaItem.gap !== undefined && matchingAgendaItem.gap !== null) ? Number(matchingAgendaItem.gap) : 5
                      configFound = true
                  } else if (matchingAgendaItem.anuncio_id) {
                       const ad = availableAnuncios.find(a => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                       if (ad) {
                           vDuration = Number(ad.duracion_visita) || 20
                           const gapVal = ad.tiempo_entre_visitas
                           vGap = (gapVal !== null && gapVal !== undefined) ? Number(gapVal) : 5
                           configFound = true
                       }
                  }
            }

            if (!configFound) {
                 const vInmueble = visit.Inmueble?.toLowerCase() || ""
                 const vAd = availableAnuncios.find(a => {
                      const ref = a.Referencia?.toLowerCase() || ""
                      const dir = a.Direccion?.toLowerCase() || ""
                      return (ref && ref === vInmueble) || (dir && dir.includes(vInmueble)) || (vInmueble && dir && vInmueble.includes(dir))
                 })
                 if (vAd) {
                     vDuration = Number(vAd.duracion_visita) || 20
                     const gapVal = vAd.tiempo_entre_visitas
                     vGap = (gapVal !== null && gapVal !== undefined) ? Number(gapVal) : 5
                 }
            }

            // Visit interval [Start, End)
            const vEnd = vStart + vDuration + vGap

            // Check overlap
            return isOverlapping(startMins, slotEnd, vStart, vEnd)
        })

        return {
            time: c.time,
            status: isOccupied ? 'occupied' : 'available',
            source: c.source,
            duration: c.duration,
            gap: c.gap
        }
    }).sort((a, b) => {
        const [ah, am] = a.time.split(':').map(Number)
        const [bh, bm] = b.time.split(':').map(Number)
        return (ah * 60 + am) - (bh * 60 + bm)
    })
  }, [selectedDateStr, agendaItems, dayVisits, availableAnuncios])

  // Calculate available times when date changes
  useEffect(() => {
    // Logic updated to respect agent configuration hierarchy
    if (!newRescheduleDate || !agentId) {
      setAvailableTimes([])
      return
    }

    const dateStr = format(newRescheduleDate, "yyyy-MM-dd")
    
    // 1. Get availability slots for this day
    const dayAvailability = agendaItems.filter(item => item.fecha === dateStr)
    
    if (dayAvailability.length === 0) {
      setAvailableTimes([])
      return
    }
    
    // Determine default duration/gap based on the visit being rescheduled (if any)
    let defaultDur = 20
    let defaultGap = 5

    if (visitToReschedule) {
        const visitInmueble = visitToReschedule.Inmueble?.toLowerCase() || ""
        const relatedAnuncio = availableAnuncios.find(a => {
            const ref = a.Referencia?.toLowerCase() || ""
            const dir = a.Direccion?.toLowerCase() || ""
            return (ref && ref === visitInmueble) || (dir && dir.includes(visitInmueble)) || (visitInmueble && dir && visitInmueble.includes(dir))
        })
        if (relatedAnuncio) {
            defaultDur = relatedAnuncio.duracion_visita || 20
            defaultGap = relatedAnuncio.tiempo_entre_visitas ?? 5
        }
    }
    
    // 2. Generate all possible start times with their specific duration/gap
    // Use shared utility
    const uniqueCandidates = generateSlotCandidates(dayAvailability, availableAnuncios, defaultDur, defaultGap)

    // 3. Filter out times occupied by other visits
    const existingVisitsOnDay = scheduledVisits.filter(v => {
      if (visitToReschedule && v.id === visitToReschedule.id) return false
      const vDate = safeDate(v.fecha_de_visita)
      if (!vDate) return false
      return format(vDate, "yyyy-MM-dd") === dateStr
    })
    
    const finalTimes = uniqueCandidates.filter(c => {
       const [th, tm] = c.time.split(':').map(Number)
       const tStart = th * 60 + tm
       // Use the candidate's specific duration!
       const tEnd = tStart + c.duration + c.gap

       return !existingVisitsOnDay.some(v => {
          const d = safeDate(v.fecha_de_visita)
          if (!d) return false
          const [vh, vm] = format(d, "HH:mm").split(':').map(Number)
          const vStart = vh * 60 + vm
          
          let vDuration = 20
          let vGap = 5
          let configFound = false
          
          // 1. Check Priority: Agent Configuration (AgendaItem)
          const matchingAgendaItem = dayAvailability.find(item => {
                const [sH, sM] = item.hora_inicio.slice(0, 5).split(':').map(Number)
                const [eH, eM] = item.hora_fin.slice(0, 5).split(':').map(Number)
                const startMins = sH * 60 + sM
                const endMins = eH * 60 + eM
                return vStart >= startMins && vStart < endMins
          })

          if (matchingAgendaItem) {
                if (matchingAgendaItem.duracion) {
                    vDuration = Number(matchingAgendaItem.duracion)
                    vGap = (matchingAgendaItem.gap !== undefined && matchingAgendaItem.gap !== null) ? Number(matchingAgendaItem.gap) : 5
                    configFound = true
                } else if (matchingAgendaItem.anuncio_id) {
                     const ad = availableAnuncios.find(a => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                     if (ad) {
                         vDuration = Number(ad.duracion_visita) || 20
                         const gapVal = ad.tiempo_entre_visitas
                         vGap = (gapVal !== null && gapVal !== undefined) ? Number(gapVal) : 5
                         configFound = true
                     }
                }
          }
          
          if (!configFound) {
               // 2. Check Priority: Property Configuration
               const vInmueble = v.Inmueble?.toLowerCase() || ""
               const vAnuncio = availableAnuncios.find(a => {
                  const ref = a.Referencia?.toLowerCase() || ""
                  const dir = a.Direccion?.toLowerCase() || ""
                  return (ref && ref === vInmueble) || (dir && dir.includes(vInmueble)) || (vInmueble && dir && vInmueble.includes(dir))
               })
               if (vAnuncio) {
                    vDuration = Number(vAnuncio.duracion_visita) || 20
                    const gapVal = vAnuncio.tiempo_entre_visitas
                    vGap = (gapVal !== null && gapVal !== undefined) ? Number(gapVal) : 5
               }
          }
          
          const vEnd = vStart + vDuration + vGap
          
          return isOverlapping(tStart, tEnd, vStart, vEnd)
       })
    }).map(c => c.time)
    
    setAvailableTimes(finalTimes)
    
  }, [newRescheduleDate, agendaItems, scheduledVisits, visitToReschedule, agentId, availableAnuncios])

  // Update slots when selected date changes or agendaItems change
  useEffect(() => {
    if (selectedDateStr) {
      if (agentId) {
        const daySlots = agendaItems
          .filter(item => item.fecha === selectedDateStr)
          .map(item => ({
            id: item.id,
            hora_inicio: item.hora_inicio.slice(0, 5),
            hora_fin: item.hora_fin.slice(0, 5),
            anuncio_id: item.anuncio_id,
            duracion: item.duracion,
            gap: item.gap
          }))
          .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        
        setCurrentSlots(daySlots.length > 0 ? daySlots : [])
      } else {
        setCurrentSlots([])
      }

      // Filter visits for this day
      const visits = scheduledVisits.filter(visit => {
        const visitDate = safeDate(visit.fecha_de_visita)
        if (!visitDate) return false
        const visitDateStr = format(visitDate, "yyyy-MM-dd")
        return visitDateStr === selectedDateStr
      }).sort((a, b) => {
        const dateA = safeDate(a.fecha_de_visita)
        const dateB = safeDate(b.fecha_de_visita)
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0)
      })
      
      setDayVisits(visits)
    }
  }, [selectedDateStr, agendaItems, agentId, scheduledVisits])

  const handleOpenLeadDetail = (visit: ScheduledVisit) => {
    setSelectedLeadId(visit.id)
    setIsLeadDetailModalOpen(true)
  }

  const fetchAgentAndSchedule = async (showLoader = true, targetId?: number) => {
    try {
      if (showLoader) setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setCurrentUserEmail(user.email || null)

      let activeAgentId = targetId || agentId

      // Initial load or permission check
      if (!activeAgentId && inmobiliariaId) {
          const { data: profile } = await supabase
            .from("Perfiles")
            .select("role, is_admin")
            .ilike("usuario", user.email || "")
            .maybeSingle()
          
          const isAdmin = profile?.is_admin === true
          const isSupervisor = profile?.role === 'supervisor'
          const canManage = isAdmin || isSupervisor
          setCanManageOthers(canManage)

          if (canManage) {
             const { data: mappedAgents } = await getAgentsByIdi(inmobiliariaId)
             
             if (mappedAgents && mappedAgents.length > 0) {
                setAgentsList(mappedAgents)
                const self = mappedAgents.find((a: any) => a.Email.toLowerCase() === user.email?.toLowerCase())
                activeAgentId = self ? self.idag : mappedAgents[0].idag
             }
          } else {
             const { data: agent } = await getAgentByEmail(user.email || "")
             if (agent && (!inmobiliariaId || Number(agent.idi) === Number(inmobiliariaId))) {
                 activeAgentId = agent.idag
             }
          }
          
          if (activeAgentId) setAgentId(activeAgentId)
      } else if (!activeAgentId) {
          // Fallback if no inmobiliariaId yet
          const { data: agent } = await getAgentByEmail(user.email || "")
          
          if (agent) {
             if (!inmobiliariaId || Number(agent.idi) === Number(inmobiliariaId)) {
                 activeAgentId = agent.idag
                 setAgentId(agent.idag)
             }
          }
      }

      if (!activeAgentId) {
        if (!inmobiliariaId) {
             setLoading(false)
             return
        }

        console.warn("No se encontró agente para el usuario:", user.email)
        toast({
            title: "Agente no encontrado",
            description: "No hay un perfil de agente asociado a tu cuenta en esta inmobiliaria.",
            variant: "destructive"
        })

        setLoading(false)
        return
      }

      // Fetch agenda for current and next week
      const today = startOfToday()
      const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 })
      const endOfNextWeek = addDays(addWeeks(startOfCurrentWeek, 2), -1)
      
      const startDateStr = format(startOfCurrentWeek, "yyyy-MM-dd")
      const endDateStr = format(endOfNextWeek, "yyyy-MM-dd")
      
      const { data: agendaData, error: agendaError } = await supabase
          .from("Agendas")
          .select("*")
          .eq("agente_id", activeAgentId)
          .gte("fecha", startDateStr)
          .lte("fecha", endDateStr)
          .order("fecha", { ascending: true })

        if (agendaError) {
          console.error("Error fetching agenda:", agendaError)
        } else {
          setAgendaItems(agendaData || [])
        }

      // Fetch scheduled visits from Clientes
      let visitsQuery = supabase
        .from("Clientes")
        .select("*")
        .not("fecha_de_visita", "is", null)
        .gte("fecha_de_visita", startDateStr)
        .lte("fecha_de_visita", endDateStr + "T23:59:59")
        .eq("idag", activeAgentId)

      const { data: visitsData, error: visitsError } = await visitsQuery

      if (visitsError) {
        console.error("Error fetching visits:", visitsError)
      } else {
        setScheduledVisits(visitsData || [])
      }

    } catch (err) {
      console.error("Error loading agenda:", err)
      toast({
        title: "Error",
        description: "No se pudo cargar la agenda.",
        variant: "destructive",
      })
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  const handleAddSlot = () => {
    // Find first available 1-hour slot
    let startMinutes = 7 * 60 // 420 (07:00)
    const endLimit = 23 * 60 // 1380 (23:00)
    
    let foundStart = ""
    let foundEnd = ""
    
    // Try every 10 minutes
    for (let m = startMinutes; m <= endLimit - 60; m += 10) {
      const hStart = Math.floor(m / 60)
      const mStart = m % 60
      const startStr = `${hStart.toString().padStart(2, '0')}:${mStart.toString().padStart(2, '0')}`
      
      const mEnd = m + 60
      const hEnd = Math.floor(mEnd / 60)
      const minEnd = mEnd % 60
      const endStr = `${hEnd.toString().padStart(2, '0')}:${minEnd.toString().padStart(2, '0')}`
      
      // Check overlap with ALL current slots
      const isOverlapping = currentSlots.some(slot => 
        (startStr < slot.hora_fin && slot.hora_inicio < endStr)
      )
      
      if (!isOverlapping) {
        foundStart = startStr
        foundEnd = endStr
        break
      }
    }
    
    if (foundStart) {
      setCurrentSlots(prev => [...prev, { hora_inicio: foundStart, hora_fin: foundEnd, anuncio_id: null, duracion: null, gap: null }])
    } else {
       toast({
        title: "Agenda completa",
        description: "No hay espacio disponible para agregar una hora completa.",
        variant: "destructive",
      })
    }
  }

  const handleRemoveSlot = (index: number) => {
    setCurrentSlots(prev => {
      const newSlots = [...prev]
      newSlots.splice(index, 1)
      return newSlots
    })
  }

  const handleSlotChange = (index: number, field: keyof TimeSlot, value: any) => {
    const newSlots = [...currentSlots]
    const updatedSlot = { ...newSlots[index], [field]: value }
    
    // Check overlap with OTHER slots if time changed
    if (field === "hora_inicio" || field === "hora_fin") {
      const otherSlots = newSlots.filter((_, i) => i !== index)
      const isOverlapping = otherSlots.some(slot => 
         (updatedSlot.hora_inicio < slot.hora_fin && slot.hora_inicio < updatedSlot.hora_fin)
      )
      
      if (isOverlapping) {
         toast({
          title: "Superposición de horarios",
          description: "El horario seleccionado se cruza con otro existente.",
          variant: "destructive",
        })
        return
      }
    }

    newSlots[index] = updatedSlot
    setCurrentSlots(newSlots)
  }

  // Helper to check completion status handling various DB types (boolean/string)
  const isVisitCompleted = (status: any) => {
    if (status === true) return true
    if (typeof status === 'string') {
      const s = status.toLowerCase().trim()
      // "visita propuesta" is NOT completed. "cancelada" is NOT completed.
      // Only explicit "true" or similar affirmative values are completed.
      return s === 'true' || s === 'completada' || s === 'realizada' || s === 'si'
    }
    return false
  }

  const handleToggleCompletion = async (visit: ScheduledVisit) => {
    // Determine current status loosely but safely
    const isCompleted = isVisitCompleted(visit.visita_completada)
    const newStatus = !isCompleted
    
    console.log(`Toggling visit ${visit.id}: ${visit.visita_completada} (${isCompleted}) -> ${newStatus}`)

    // 1. Optimistic Update (Immediate UI change)
    const updateLocalState = (status: boolean) => {
      // Update the global list
      setScheduledVisits(prev => prev.map(v => 
        v.id === visit.id ? { ...v, visita_completada: status } : v
      ))
      // Update the daily list (redundant but ensures speed)
      setDayVisits(prev => prev.map(v => 
        v.id === visit.id ? { ...v, visita_completada: status } : v
      ))
    }

    updateLocalState(newStatus)

    try {
      // 2. Persist to Supabase
      // We send boolean, assuming DB handles it or converts to string "true"/"false" if column is text
      const { error } = await supabase
        .from("Clientes")
        .update({ visita_completada: newStatus })
        .eq("id", visit.id)

      if (error) throw error

      // 3. Feedback
      toast({
        title: newStatus ? "¡Visita Completada!" : "Visita Pendiente",
        description: newStatus 
          ? "La visita ha sido marcada como realizada." 
          : "La visita ha vuelto al estado pendiente.",
        className: newStatus ? "bg-green-600 text-white border-none" : ""
      })

      if (newStatus) {
        console.log("Opening feedback dialog for completed visit", visit.id)
        handleOpenFeedbackDialog({ ...visit, visita_completada: true })
      }
      
      // 4. Background Validation
      // REMOVED: fetchAgentAndSchedule(false)
      // We trust the optimistic update. Re-fetching immediately often returns stale data 
      // from the DB before the write is fully propagated/indexed, causing the UI to revert.
      
    } catch (err) {
      console.error("Error toggling visit:", err)
      // Revert on error
      updateLocalState(isCompleted)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado.",
        variant: "destructive",
      })
    }
  }

  const handleOpenFeedbackDialog = (visit: ScheduledVisit) => {
    setSelectedVisitToComplete(visit)
    setVisitSummary(visit.resumen_visita || "")
    setCompleteDialogOpen(true)
  }

  const handleSaveFeedback = async () => {
    if (!selectedVisitToComplete) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("Clientes")
        .update({
          resumen_visita: visitSummary
        })
        .eq("id", selectedVisitToComplete.id)

      if (error) throw error

      toast({
        title: "Resumen guardado",
        description: "El resumen de la visita ha sido actualizado.",
      })

      setCompleteDialogOpen(false)
      fetchAgentAndSchedule()
    } catch (err) {
      console.error("Error saving feedback:", err)
      toast({
        title: "Error",
        description: "No se pudo guardar el resumen.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteCompletion = async () => {
    if (!selectedVisitToComplete) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("Clientes")
        .update({
          // Only clear the summary, keep completion status
          resumen_visita: null
        })
        .eq("id", selectedVisitToComplete.id)

      if (error) throw error

      toast({
        title: "Resumen eliminado",
        description: "Se ha borrado el comentario de la visita.",
      })

      setCompleteDialogOpen(false)
      fetchAgentAndSchedule()
    } catch (err) {
      console.error("Error deleting summary:", err)
      toast({
        title: "Error",
        description: "No se pudo eliminar el resumen.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenReschedule = (visit: ScheduledVisit) => {
    const date = safeDate(visit.fecha_de_visita)
    if (!date) {
      toast({
        title: "Error",
        description: "La visita tiene una fecha inválida.",
        variant: "destructive",
      })
      return
    }
    setVisitToReschedule(visit)
    setNewRescheduleDate(date)
    setNewRescheduleTime(format(date, "HH:mm"))
    setRescheduleDialogOpen(true)
  }

  const handleSaveReschedule = async () => {
    if (!visitToReschedule || !newRescheduleDate || !newRescheduleTime) return
    
    try {
      setSaving(true)
      
      // Construct Date object in local time to handle timezone correctly
      const [hours, minutes] = newRescheduleTime.split(':').map(Number)
      const localDate = new Date(newRescheduleDate)
      localDate.setHours(hours, minutes, 0, 0)
      
      // Convert to UTC ISO string for Supabase
      const newDateTimeIso = localDate.toISOString()

      // Fetch current user for history
      const { data: { user } } = await supabase.auth.getUser()
      
      // Fetch full lead data for history and webhook
      const { data: fullLead } = await supabase
        .from("Clientes")
        .select("*")
        .eq("id", visitToReschedule.id)
        .single()

      // Update history
      const currentHistory = (fullLead?.status_history as any[]) || []
      const historyEntry = {
          status: "Visita Reprogramada",
          timestamp: new Date().toISOString(),
          agent_id: user?.id,
          agent_name: user?.email || "Agente"
      }
      const updatedHistory = [...currentHistory, historyEntry]
      
      const { error } = await supabase
        .from("Clientes")
        .update({ 
            fecha_de_visita: newDateTimeIso,
            status_history: updatedHistory,
            Estado: "Visita Propuesta" // Ensure status is consistent
        })
        .eq("id", visitToReschedule.id)
        
      if (error) throw error

      // Trigger Webhook
      try {
        console.log("Preparing reschedule webhook payload...")
        
        // Fetch additional data
        let inmobiliariaData = null
        const targetInmoId = inmobiliariaId || (fullLead as any)?.idi || (fullLead as any)?.usuario;

        if (targetInmoId) {
             const { data } = await supabase.from("Inmobiliarias").select("*").eq("idi", targetInmoId).single()
             inmobiliariaData = data
        }

        const currentAd = availableAnuncios.find(a => 
            (visitToReschedule.Inmueble && a.Referencia === visitToReschedule.Inmueble) ||
            (visitToReschedule.Inmueble && a.Direccion === visitToReschedule.Inmueble)
        )
        
        // Fetch Agent Data
        let agentData = null
        if (fullLead?.idag) {
            const { data } = await supabase.from("Agentes").select("*").eq("idag", fullLead.idag).single()
            agentData = data
        }

        const { date: formattedDate, time: formattedTime } = formatWebhookDate(newDateTimeIso)
        const bookingLink = `${typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''}/agendar-visita?leadId=${visitToReschedule.id}`
        
        // Prepare base lead data excluding status_history
        const leadData = { ...(fullLead || visitToReschedule) }
        delete leadData.status_history

        const payload = {
            "Link de Agendamiento": bookingLink,
            "Nombre de lead": `${fullLead?.Nombre || visitToReschedule.Nombre} ${fullLead?.Apellidos || visitToReschedule.Apellidos || ''}`.trim(),
            "Inmueble/Anuncio": currentAd || { Referencia: visitToReschedule.Inmueble },
            "Nombre Inmobiliaria": inmobiliariaNombre || (inmobiliariaData as any)?.nombre_inmobiliaria || "Sin nombre",
            "Inmobiliaria": inmobiliariaData || null,
            "Firma": (inmobiliariaData as any)?.firma_html || "",
            "Agente Asignado": agentData,
            "Agente Email": agentData?.Email,
            "Fecha Visita": formattedDate,
            "Hora Visita": formattedTime,
            "Fecha Completa": newDateTimeIso,
            "Motivo": "Reprogramado por agente",
            ...leadData,
            fecha_de_visita: newDateTimeIso
        }

        await fetch("/api/reprogramar-visita", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        })
      } catch (webhookError) {
        console.error("Error calling reschedule webhook:", webhookError)
      }
      
      toast({ 
        title: "Visita reprogramada", 
        description: "La fecha y hora han sido actualizadas correctamente." 
      })
      
      setRescheduleDialogOpen(false)
      fetchAgentAndSchedule() // Refresh to move it to correct day/time
      
    } catch (err) {
      console.error("Error rescheduling visit:", err)
      toast({
        title: "Error",
        description: "No se pudo reprogramar la visita.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenCancelDialog = (visit: ScheduledVisit) => {
    setVisitToCancel(visit)
    setCancelDialogOpen(true)
  }

  const handleCancelVisit = async () => {
    if (!visitToCancel) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from("Clientes")
        .update({
          visita_completada: "cancelada",
          fecha_de_visita: null
        })
        .eq("id", visitToCancel.id)

      if (error) throw error

      // Call webhook
      try {
        console.log("Preparing cancellation webhook payload...")
        
        // Fetch full lead data to ensure we have email etc.
        const { data: fullLead } = await supabase.from("Clientes").select("*").eq("id", visitToCancel.id).single()

        // Fetch additional data
        let inmobiliariaData = null
        const targetInmoId = inmobiliariaId || (fullLead as any)?.idi || (fullLead as any)?.usuario;

        if (targetInmoId) {
             const { data } = await supabase.from("Inmobiliarias").select("*").eq("idi", targetInmoId).single()
             inmobiliariaData = data
        }

        const currentAd = availableAnuncios.find(a => 
            (visitToCancel.Inmueble && a.Referencia === visitToCancel.Inmueble) ||
            (visitToCancel.Inmueble && a.Direccion === visitToCancel.Inmueble)
        )
        
        // Fetch Agent Data
        let agentData = null
        if (fullLead?.idag) {
            const { data } = await supabase.from("Agentes").select("*").eq("idag", fullLead.idag).single()
            agentData = data
        }

        const { date: formattedDate, time: formattedTime } = formatWebhookDate(visitToCancel.fecha_de_visita)
        const bookingLink = `${typeof window !== 'undefined' && window.location.origin ? window.location.origin : ''}/agendar-visita?leadId=${visitToCancel.id}`
        const cancelPayload = {
            "Link de Agendamiento": bookingLink,
            "Nombre de lead": `${fullLead?.Nombre || visitToCancel.Nombre} ${fullLead?.Apellidos || visitToCancel.Apellidos || ''}`.trim(),
            "Inmueble/Anuncio": currentAd || { Referencia: visitToCancel.Inmueble },
            "Nombre Inmobiliaria": inmobiliariaNombre || (inmobiliariaData as any)?.nombre_inmobiliaria || "Sin nombre",
            "Inmobiliaria": inmobiliariaData || null,
            "Firma": (inmobiliariaData as any)?.firma_html || "",
            "Agente Asignado": agentData,
            "Agente Email": agentData?.Email,
            "Fecha Visita": formattedDate,
            "Hora Visita": formattedTime,
            "Fecha Completa": visitToCancel.fecha_de_visita,
            "Motivo": "Cancelado por agente",
            ...fullLead,
            ...visitToCancel, 
            visita_completada: "cancelada",
            fecha_de_visita: null
        }

        const { status_history, ...webhookPayload } = cancelPayload as any

        await fetch("/api/cancelar-visita-agente", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        })
      } catch (webhookError) {
        console.error("Error calling cancel webhook:", webhookError)
      }

      toast({
        title: "Visita cancelada",
        description: "La visita se ha cancelado correctamente.",
      })

      setCancelDialogOpen(false)
      fetchAgentAndSchedule() // Refresh
    } catch (err) {
      console.error("Error canceling visit:", err)
      toast({
        title: "Error",
        description: "No se pudo cancelar la visita.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!agentId) {
      toast({
        title: "Error de identificación",
        description: "No se ha detectado un perfil de agente activo. Intenta recargar la página.",
        variant: "destructive",
      })
      return
    }

    if (!selectedDateStr) return

    // Validar antes de guardar
    const invalidTime = currentSlots.find(s => s.hora_inicio >= s.hora_fin)
    if (invalidTime) {
      toast({
        title: "Horario inválido",
        description: "La hora de inicio debe ser anterior a la de fin.",
        variant: "destructive",
      })
      return
    }

    // Auto-correction for Email casing if needed
    if (currentUserEmail && !canManageOthers) {
        // Find the current agent's email
        const currentAgent = agentsList.find(a => a.idag === agentId)
        if (currentAgent && currentAgent.Email !== currentUserEmail && currentAgent.Email.toLowerCase() === currentUserEmail.toLowerCase()) {
            console.warn(`[Agenda] Email mismatch detected. Agent: ${currentAgent.Email}, User: ${currentUserEmail}. Attempting to sync casing for RLS compatibility...`)
            try {
                // We attempt to update the agent's email to match the authenticated user's email casing exactly
                // This is required because RLS policies often use case-sensitive comparison
                const { error: updateError } = await supabase
                    .from("Agentes")
                    .update({ Email: currentUserEmail })
                    .eq("idag", agentId)
                
                if (updateError) {
                    console.error("[Agenda] Failed to sync email casing:", updateError)
                } else {
                    console.log("[Agenda] Email casing synced successfully.")
                }
            } catch (syncErr) {
                 console.error("[Agenda] Exception during email sync:", syncErr)
            }
        }
    }

    try {
      setSaving(true)
      
      // 1. Delete existing slots for this specific date
      const { error: deleteError } = await supabase
        .from("Agendas")
        .delete()
        .eq("agente_id", agentId)
        .eq("fecha", selectedDateStr)

      if (deleteError) throw deleteError

      // 2. Insert new slots
      const newSlots = currentSlots.map(slot => ({
        agente_id: agentId,
        fecha: selectedDateStr,
        hora_inicio: slot.hora_inicio,
        hora_fin: slot.hora_fin,
        anuncio_id: slot.anuncio_id ? Number(slot.anuncio_id) : null,
        duracion: slot.duracion ? Number(slot.duracion) : null,
        gap: slot.gap !== null && slot.gap !== undefined ? Number(slot.gap) : null
      }))

      if (newSlots.length > 0) {
        const { error: insertError } = await supabase
          .from("Agendas")
          .insert(newSlots)
        
        if (insertError) throw insertError
      }

      // Update local state
      await fetchAgentAndSchedule()

      // Find day label
      const allDays = [...currentWeekDays, ...nextWeekDays]
      const selectedDay = allDays.find(d => d.id === selectedDateStr)
      
      toast({
        title: "Agenda actualizada",
        description: `Horario para el ${selectedDay?.fullLabel} guardado.`,
      })

      setIsDialogOpen(false)

    } catch (err: any) {
      console.error("Error saving agenda:", JSON.stringify(err, null, 2))
      let message = "No se pudieron guardar los cambios."
      
      // Check for missing column error (PGRST204 or specific message)
      if (err?.code === "PGRST204" || err?.message?.includes("anuncio_id")) {
        message = "Error de configuración: Falta la columna 'anuncio_id' en la base de datos. Por favor, ejecute el script de migración 013."
      } else if (err?.code === "42501" || err?.message?.includes("policy")) {
        const currentAgent = agentsList.find(a => a.idag === agentId)
        message = `Error de permisos: Tu usuario (${currentUserEmail}) no coincide con el agente.`
        
        console.error(`[Agenda RLS Error] User: '${currentUserEmail}', Agent: '${currentAgent?.Email}'`)

        // Attempt to auto-fix via Server Action
        toast({
             title: "Error de permisos detectado",
             description: "Intentando corregir la configuración de tu cuenta automáticamente...",
        })

        try {
            const fixResult = await fixUserPermissionsAction()
            if (fixResult.success) {
                toast({
                    title: "Cuenta corregida",
                    description: "Se han actualizado tus permisos. Intentando guardar de nuevo...",
                    variant: "default"
                })
                // Retry save recursively (once) or just ask user to click again. 
                // To avoid infinite loop, we won't call handleSave recursively here, 
                // but we will tell the user to try again.
                message = "Permisos corregidos. Por favor, haz clic en 'Guardar Cambios' de nuevo."
            } else {
                message = `No se pudo corregir automáticamente: ${fixResult.error}`
            }
        } catch (fixErr) {
            console.error("Auto-fix failed:", fixErr)
        }
      }
      
      toast({
        title: "Error al guardar",
        description: message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const timelineItems = useMemo(() => {
    const visitItems = dayVisits.map(visit => {
      const date = safeDate(visit.fecha_de_visita)
      const time = date ? format(date, "HH:mm") : ""
      const [h, m] = time ? time.split(":").map(Number) : [0, 0]
      return {
        type: "visit" as const,
        time,
        minutes: h * 60 + m,
        visit,
      }
    }).filter(item => item.time)

    const slotItems = previewSlots
      .filter(slot => slot.status === "available")
      .map(slot => {
        const [h, m] = slot.time.split(":").map(Number)
        return {
          type: "slot" as const,
          time: slot.time,
          minutes: h * 60 + m,
          slot,
        }
      })

    return [...visitItems, ...slotItems].sort((a, b) => a.minutes - b.minutes)
  }, [dayVisits, previewSlots])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!agentId) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">No se encontró perfil de agente</h2>
        <p className="text-muted-foreground">Asegúrate de estar registrado como agente para gestionar tu agenda.</p>
      </div>
    )
  }

  // Find currently selected day object
  const allDays = [...currentWeekDays, ...nextWeekDays]
  const selectedDay = allDays.find(d => d.id === selectedDateStr)

  // Find selected agent for display
  const selectedAgent = agentsList.find(a => a.idag === agentId)

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Agenda</h1>
          <p className="text-sm text-muted-foreground">
            Configura disponibilidad y gestiona visitas.
          </p>
        </div>
        {canManageOthers && agentsList.length > 0 && (
          <div className="w-full md:w-[260px]">
            <Select 
              value={agentId?.toString() || ""} 
              onValueChange={(val) => {
                if (!val) return
                const newId = Number(val)
                setAgentId(newId)
                fetchAgentAndSchedule(true, newId)
              }}
            >
              <SelectTrigger className="h-10 bg-background border-input/60 shadow-sm hover:bg-accent/10 hover:border-accent transition-colors">
                <div className="flex items-center gap-2 truncate">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="font-medium truncate text-sm">
                    {selectedAgent?.Nombre || selectedAgent?.nombre || "Seleccionar agente"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {agentsList.map(agent => (
                  <SelectItem key={agent.idag} value={agent.idag.toString()}>
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <span className="font-medium text-sm leading-none">{agent.Nombre || agent.nombre}</span>
                      <span className="text-xs text-muted-foreground">{agent.Email}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="w-full">
        <Tabs value={selectedDateStr} onValueChange={setSelectedDateStr} className="w-full space-y-6">
          
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1 w-full space-y-4">
                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Semana Actual</h3>
                  <div className="flex flex-wrap gap-2">
                    <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap justify-start">
                      {currentWeekDays.map((day) => {
                        const hasSlots = agendaItems.some(item => item.fecha === day.id)
                        const visitCount = scheduledVisits.filter(v => format(new Date(v.fecha_de_visita), "yyyy-MM-dd") === day.id).length
                        
                        return (
                          <TabsTrigger
                            key={day.id}
                            value={day.id}
                            disabled={day.disabled}
                            className={cn(
                              "group relative flex flex-col items-center justify-center h-14 w-16 rounded-md border border-muted bg-card transition-all",
                              hasSlots && "border-primary bg-primary/5",
                              "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                              day.disabled && "opacity-50 cursor-not-allowed bg-muted/50"
                            )}
                          >
                            {visitCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background z-10">
                                {visitCount}
                              </span>
                            )}
                            <span className="text-[10px] font-medium uppercase text-muted-foreground group-data-[state=active]:text-primary-foreground/90">
                              {day.label.split(' ')[0]}
                            </span>
                            <span className="text-base font-bold group-data-[state=active]:text-primary-foreground">
                              {day.label.split(' ')[1]}
                            </span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-1">Proximas fechas</h3>
                  <div className="space-y-0.5">
                    <div
                      className="flex gap-2 overflow-y-visible pb-2 pt-1"
                      onTouchStart={handleNextWeekTouchStart}
                      onTouchEnd={handleNextWeekTouchEnd}
                    >
                       <TabsList className="h-auto bg-transparent p-0 gap-2 flex-nowrap justify-start w-full">
                        {visibleNextWeekDays.map((day) => {
                          const hasSlots = agendaItems.some(item => item.fecha === day.id)
                          const visitCount = scheduledVisits.filter(v => {
                             const d = safeDate(v.fecha_de_visita)
                             return d && format(d, "yyyy-MM-dd") === day.id
                          }).length
                          
                          return (
                            <TabsTrigger
                              key={day.id}
                              value={day.id}
                              disabled={day.disabled}
                              className={cn(
                                "group relative flex flex-col items-center justify-center h-14 w-16 rounded-md border border-muted bg-card transition-all",
                                hasSlots && "border-primary bg-primary/5",
                                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-primary",
                              )}
                            >
                              {visitCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background z-10">
                                  {visitCount}
                                </span>
                              )}
                              <span className="text-[10px] font-medium uppercase text-muted-foreground group-data-[state=active]:text-primary-foreground/90">
                                {day.label.split(' ')[0]}
                              </span>
                              <span className="text-base font-bold group-data-[state=active]:text-primary-foreground">
                                {day.label.split(' ')[1]}
                              </span>
                            </TabsTrigger>
                          )
                        })}
                      </TabsList>
                    </div>
                    <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-muted/40 hover:bg-muted/60"
                        disabled={!canShiftPrevNextWeek}
                        onClick={() => shiftNextWeek(-7)}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40">
                        <span className="font-medium">Proximas fechas</span>
                        <span className="text-muted-foreground/70">•</span>
                        <span>Desliza o usa flechas</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-muted/40 hover:bg-muted/60"
                        disabled={!canShiftNextNextWeek}
                        onClick={() => shiftNextWeek(7)}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="w-full lg:w-80 shrink-0 border-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{selectedDay?.fullLabel}</CardTitle>
                  <CardDescription className="text-xs">
                    {currentSlots.length > 0 
                      ? `${currentSlots.length} franjas configuradas`
                      : "No hay disponibilidad"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {currentSlots.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {currentSlots.map((slot, i) => {
                        const anuncio = availableAnuncios.find(a => a.ida === slot.anuncio_id)
                        return (
                          <div key={i} className="px-2 py-1.5 bg-muted rounded-md text-xs font-medium flex items-center gap-2">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{slot.hora_inicio} - {slot.hora_fin}</span>
                            </div>
                            {anuncio && (
                              <>
                                <div className="h-3 w-[1px] bg-border mx-1" />
                                <div className="flex items-center gap-1.5 min-w-0 overflow-hidden text-muted-foreground">
                                  <Building className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate" title={`${anuncio.Referencia} - ${anuncio.Direccion}`}>
                                    {anuncio.Referencia}
                                  </span>
                                </div>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="w-full gap-2 text-xs bg-black text-white hover:bg-black/90">
                        <Clock className="h-3 w-3" />
                        Gestionar Disponibilidad
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Gestionar Disponibilidad</DialogTitle>
                        <DialogDescription>
                          Configura tus horarios para el {selectedDay?.fullLabel}
                        </DialogDescription>
                      </DialogHeader>

                      <div className="py-4">
                        <div className="flex justify-end mb-4">
                          <Button onClick={handleAddSlot} size="sm" className="gap-1 text-xs">
                            <Plus className="h-3 w-3" />
                            Agregar Hora
                          </Button>
                        </div>

                        {currentSlots.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-lg bg-card/50">
                            <CalendarDays className="h-10 w-10 mb-4 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground mb-2">No disponible este día</p>
                            <Button variant="outline" onClick={handleAddSlot} size="sm" className="text-xs">
                              Agregar Disponibilidad
                            </Button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {currentSlots.map((slot, index) => (
                              <div key={index} className="flex flex-col gap-2 p-3 border rounded-lg bg-card text-card-foreground shadow-sm relative group hover:border-primary/50 transition-colors">
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 space-y-1">
                                      <Label htmlFor={`start-${index}`} className="text-[10px] text-muted-foreground">Inicio</Label>
                                      <div className="relative">
                                        <Clock className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                        <select
                                          id={`start-${index}`}
                                          className="w-full pl-8 h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                          value={slot.hora_inicio}
                                          onChange={(e) => handleSlotChange(index, "hora_inicio", e.target.value)}
                                        >
                                          {timeOptions.map((time) => (
                                            <option key={time} value={time}>{time}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    <span className="text-muted-foreground mt-5">-</span>
                                    <div className="flex-1 space-y-1">
                                      <Label htmlFor={`end-${index}`} className="text-[10px] text-muted-foreground">Fin</Label>
                                      <div className="relative">
                                        <Clock className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                        <select
                                          id={`end-${index}`}
                                          className="w-full pl-8 h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                          value={slot.hora_fin}
                                          onChange={(e) => handleSlotChange(index, "hora_fin", e.target.value)}
                                        >
                                          {timeOptions.map((time) => (
                                            <option key={time} value={time}>{time}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-1">
                                    <Label className="text-[10px] text-muted-foreground">Inmueble (Opcional)</Label>
                                    <div className="relative">
                                      <Select
                                        value={slot.anuncio_id ? String(slot.anuncio_id) : "unassigned"}
                                        onValueChange={(val) => handleSlotChange(index, "anuncio_id", val === "unassigned" ? null : val)}
                                      >
                                        <SelectTrigger className="w-full h-8 pl-8 text-xs bg-background">
                                          <Building className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground z-10" />
                                          <SelectValue placeholder="Cualquiera" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">Cualquiera</SelectItem>
                                          {availableAnuncios.length > 0 ? (
                                            availableAnuncios
                                              .filter(ad => !ad.Activacion || ad.Activacion === 'Activo')
                                              .map(ad => (
                                              <SelectItem key={ad.ida} value={String(ad.ida)}>
                                                {ad.Referencia} - {ad.Direccion}
                                              </SelectItem>
                                            ))
                                          ) : (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                              No hay inmuebles disponibles
                                            </div>
                                          )}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 mt-1">
                                    <div className="space-y-1">
                                        <Label htmlFor={`duration-${index}`} className="text-[10px] text-muted-foreground">Duración (min)</Label>
                                        <Input 
                                            id={`duration-${index}`}
                                            type="number" 
                                            placeholder="Defecto" 
                                            className="h-8 text-xs"
                                            value={slot.duracion || ""}
                                            onChange={(e) => handleSlotChange(index, "duracion", e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label htmlFor={`gap-${index}`} className="text-[10px] text-muted-foreground">Gap (min)</Label>
                                        <Input 
                                            id={`gap-${index}`}
                                            type="number" 
                                            placeholder="Defecto" 
                                            className="h-8 text-xs"
                                            value={slot.gap !== null ? slot.gap : ""}
                                            onChange={(e) => handleSlotChange(index, "gap", e.target.value ? Number(e.target.value) : null)}
                                        />
                                    </div>
                                  </div>
                                </div>
                              
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-100 shadow-sm hover:bg-destructive/90 z-10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleRemoveSlot(index)
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} size="sm">
                          {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                          Guardar Cambios
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="mt-4">
            <Card>
              <CardHeader className="py-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4" />
                  Citas Programadas
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4">
                {timelineItems.length === 0 ? (
                  <div className="text-center py-6 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground text-xs">No hay citas ni franjas disponibles para este día.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {timelineItems.map((item, index) => {
                      if (item.type === "visit") {
                        const visit = item.visit
                        const completed = isVisitCompleted(visit.visita_completada)
                        return (
                          <div key={visit.id} className={cn(
                            "flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition-all",
                            completed 
                              ? "border-green-500/30 bg-green-100" 
                              : "bg-card border-border"
                          )}>
                            <div className="flex items-center gap-3 w-full">
                              <div 
                                onClick={() => handleOpenReschedule(visit)}
                                className={cn(
                                "flex flex-col items-center justify-center w-12 h-12 rounded-md shrink-0 transition-colors cursor-pointer hover:bg-primary/20 hover:scale-105 active:scale-95",
                                completed 
                                  ? "bg-green-200 text-green-800" 
                                  : "bg-primary/10 text-primary"
                              )}
                              title="Click para reprogramar"
                              >
                                <span className="text-sm font-bold">
                                  {format(new Date(visit.fecha_de_visita), "HH:mm")}
                                </span>
                              </div>
                              <div 
                                className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 w-full cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => handleOpenLeadDetail(visit)}
                                title="Ver detalles del lead"
                              >
                                <div className="flex items-center gap-2">
                                  <User className={cn("h-4 w-4 shrink-0", completed ? "!text-black" : "text-muted-foreground")} />
                                  <h4 className={cn("font-bold text-lg", completed && "!text-black")}>
                                    {visit.Nombre} {visit.Apellidos}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Building className={cn("h-4 w-4 shrink-0", completed && "!text-black/70")} />
                                  <span className={cn("font-medium text-foreground/80", completed && "!text-black/80")}>{visit.Inmueble}</span>
                                </div>
                                {visit.Telefono && (
                                  <a 
                                    href={`tel:${visit.Telefono}`}
                                    className={cn("flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group", completed && "!text-black/70")}
                                    title="Llamar"
                                  >
                                    <Phone className="h-4 w-4 shrink-0 group-hover:text-primary" />
                                    <span className="font-medium underline decoration-dotted underline-offset-4 group-hover:text-primary">{visit.Telefono}</span>
                                  </a>
                                )}
                                {(visit.Ingresos !== null && visit.Ingresos !== undefined) && (
                                  <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", completed && "!text-black/70")}>
                                    <Euro className="h-4 w-4 shrink-0" />
                                    <span>Ingresos: {visit.Ingresos}€</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="ml-2 shrink-0 flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "h-9 w-9 transition-all shadow-sm rounded-full",
                                  completed 
                                    ? "bg-green-500 hover:bg-green-600 text-black border-green-500" 
                                    : "bg-white hover:bg-green-50 text-muted-foreground border-muted-foreground/30 hover:border-green-500 hover:text-green-600"
                                )}
                                onClick={() => handleToggleCompletion(visit)}
                                title={completed ? "Marcar como pendiente" : "Marcar como realizada"}
                              >
                                <Check className={cn("h-6 w-6 stroke-[3]", completed ? "opacity-100" : "opacity-50")} />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="icon"
                                className={cn(
                                  "h-9 w-9 transition-all shadow-sm",
                                   visit.resumen_visita ? "text-blue-600 border-blue-200 bg-blue-50" : "text-muted-foreground border-muted-foreground/30"
                                )}
                                onClick={() => handleOpenFeedbackDialog(visit)}
                                title="Añadir feedback / resumen"
                              >
                                <FileText className={cn("h-4 w-4", visit.resumen_visita && "fill-current")} />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 transition-all shadow-sm text-muted-foreground border-muted-foreground/30 hover:border-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => handleOpenCancelDialog(visit)}
                                title="Cancelar visita"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )
                      }

                      const slot = item.slot
                      return (
                        <div key={`slot-${slot.time}-${index}`} className="flex items-center justify-between py-2 px-3 border rounded-lg bg-muted/20">
                          <div className="flex items-center gap-2.5 w-full">
                            <div className="flex flex-col items-center justify-center w-10 h-10 rounded-md shrink-0 bg-muted text-muted-foreground">
                              <span className="text-xs font-bold">{slot.time}</span>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span>Franja disponible</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>
      </div>

      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Resumen de la Visita</DialogTitle>
            <DialogDescription>
              Añade notas o feedback sobre la visita con {selectedVisitToComplete?.Nombre}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="summary">Resumen / Notas</Label>
              <Textarea
                id="summary"
                placeholder="Escribe aquí los detalles importantes de la visita..."
                className="min-h-[150px]"
                value={visitSummary}
                onChange={(e) => setVisitSummary(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-3 sm:justify-between items-center sm:items-end">
            {selectedVisitToComplete?.visita_completada ? (
              <Button 
                variant="destructive" 
                onClick={handleDeleteCompletion} 
                disabled={saving}
                className="w-full sm:w-auto order-2 sm:order-1"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Borrar
              </Button>
            ) : <div className="hidden sm:block order-1" />}
            <div className="flex gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
              <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveFeedback} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Resumen
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reprogramar Visita</DialogTitle>
            <DialogDescription>
              Cambia la fecha y hora para la visita con {visitToReschedule?.Nombre}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Fecha</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newRescheduleDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newRescheduleDate ? format(newRescheduleDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newRescheduleDate}
                    onSelect={setNewRescheduleDate}
                    initialFocus
                    locale={es}
                    disabled={(date) => {
                      // Disable past dates (before today)
                      if (isBefore(date, startOfToday())) return true
                      
                      // Disable dates without any availability slots
                      const dateStr = format(date, "yyyy-MM-dd")
                      const hasSlot = agendaItems.some(item => item.fecha === dateStr)
                      return !hasSlot
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Hora</Label>
              <Select value={newRescheduleTime} onValueChange={setNewRescheduleTime} disabled={!newRescheduleDate || availableTimes.length === 0}>
                <SelectTrigger id="time">
                  <SelectValue placeholder={availableTimes.length === 0 ? "Sin horarios disponibles" : "Seleccionar hora"} />
                </SelectTrigger>
                <SelectContent>
                  {availableTimes.map(time => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveReschedule} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancelar Visita</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas cancelar la visita con {visitToCancel?.Nombre}? Esta acción eliminará la fecha programada.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>No cancelar</Button>
            <Button variant="destructive" onClick={handleCancelVisit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sí, cancelar visita
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LeadDetailModal 
        leadId={selectedLeadId} 
        open={isLeadDetailModalOpen} 
        onOpenChange={setIsLeadDetailModalOpen} 
        onLeadUpdate={() => fetchAgentAndSchedule(false)}
      />
    </div>
  )
}
