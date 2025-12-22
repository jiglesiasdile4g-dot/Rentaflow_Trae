"use client"

import { useState, useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Clock, CalendarDays, User, Building, Phone, Euro, CheckCircle, FileText, Undo, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format, addDays, startOfToday, startOfWeek, addWeeks, isBefore } from "date-fns"
import { es } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TimeSlot {
  id?: number
  hora_inicio: string
  hora_fin: string
}

interface AgendaItem {
  id: number
  fecha: string | null
  hora_inicio: string
  hora_fin: string
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
  const [agentsList, setAgentsList] = useState<Array<{ idag: number, Nombre: string, Email: string }>>([])

  // Tabs state
  const [currentWeekDays, setCurrentWeekDays] = useState<DayTab[]>([])
  const [nextWeekDays, setNextWeekDays] = useState<DayTab[]>([])
  const [selectedDateStr, setSelectedDateStr] = useState<string>("")
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([])
  const [scheduledVisits, setScheduledVisits] = useState<ScheduledVisit[]>([])
  const [currentSlots, setCurrentSlots] = useState<TimeSlot[]>([])
  const [dayVisits, setDayVisits] = useState<ScheduledVisit[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // Visit completion state
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [selectedVisitToComplete, setSelectedVisitToComplete] = useState<ScheduledVisit | null>(null)
  const [visitSummary, setVisitSummary] = useState("")

  const { toast } = useToast()
  const supabase = createClient()
  const { inmobiliariaId } = useInmobiliaria()

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

  // Initialize weeks
  useEffect(() => {
    const today = startOfToday()
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }) // Monday
    const startOfNextWeek = addWeeks(startOfCurrentWeek, 1)

    // Helper to create days
    const createDays = (startDate: Date): DayTab[] => {
      const days: DayTab[] = []
      for (let i = 0; i < 7; i++) {
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

    const current = createDays(startOfCurrentWeek)
    const next = createDays(startOfNextWeek)
    
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

  // Update slots when selected date changes or agendaItems change
  useEffect(() => {
    if (selectedDateStr) {
      if (agentId) {
        const daySlots = agendaItems
          .filter(item => item.fecha === selectedDateStr)
          .map(item => ({
            id: item.id,
            hora_inicio: item.hora_inicio.slice(0, 5),
            hora_fin: item.hora_fin.slice(0, 5)
          }))
          .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
        
        setCurrentSlots(daySlots.length > 0 ? daySlots : [])
      } else {
        setCurrentSlots([])
      }

      // Filter visits for this day
      const visits = scheduledVisits.filter(visit => {
        const visitDate = new Date(visit.fecha_de_visita)
        const visitDateStr = format(visitDate, "yyyy-MM-dd")
        return visitDateStr === selectedDateStr
      }).sort((a, b) => new Date(a.fecha_de_visita).getTime() - new Date(b.fecha_de_visita).getTime())
      
      setDayVisits(visits)
    }
  }, [selectedDateStr, agendaItems, agentId, scheduledVisits])

  const fetchAgentAndSchedule = async (showLoader = true, targetId?: number) => {
    try {
      if (showLoader) setLoading(true)
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

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
             const { data: allAgents } = await supabase
               .from("Agentes")
               .select("idag, Nombre, Email")
               .eq("idi", inmobiliariaId)
               .order("Nombre")
             
             if (allAgents && allAgents.length > 0) {
                setAgentsList(allAgents)
                const self = allAgents.find(a => a.Email.toLowerCase() === user.email?.toLowerCase())
                activeAgentId = self ? self.idag : allAgents[0].idag
             }
          } else {
             const { data: agents } = await supabase
                .from("Agentes")
                .select("idag, Email")
                .ilike("Email", user.email || "")
                .eq("idi", inmobiliariaId)
             
             const agent = agents?.[0]
             if (agent) activeAgentId = agent.idag
          }
          
          if (activeAgentId) setAgentId(activeAgentId)
      } else if (!activeAgentId) {
          // Fallback if no inmobiliariaId yet
          let query = supabase
            .from("Agentes")
            .select("idag, Email")
            .ilike("Email", user.email || "")
            
          if (inmobiliariaId) {
            query = query.eq("idi", inmobiliariaId)
          }
          
          const { data: agents } = await query
          const agent = agents?.[0]
          if (agent) {
             activeAgentId = agent.idag
             setAgentId(agent.idag)
          }
      }

      if (!activeAgentId) {
        if (!inmobiliariaId) {
             setLoading(false)
             return
        }
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
      setCurrentSlots(prev => [...prev, { hora_inicio: foundStart, hora_fin: foundEnd }])
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

  const handleTimeChange = (index: number, field: "hora_inicio" | "hora_fin", value: string) => {
    const newSlots = [...currentSlots]
    const updatedSlot = { ...newSlots[index], [field]: value }
    
    // Check overlap with OTHER slots
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

    newSlots[index] = updatedSlot
    setCurrentSlots(newSlots)
  }

  const handleToggleCompletion = async (visit: ScheduledVisit) => {
    // Determine current status strictly
    const isCompleted = visit.visita_completada === true
    const newStatus = !isCompleted
    
    console.log(`Toggling visit ${visit.id}: ${isCompleted} -> ${newStatus}`)

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

  const handleSave = async () => {
    if (!agentId || !selectedDateStr) return

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
        hora_fin: slot.hora_fin
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

    } catch (err) {
      console.error("Error saving agenda:", err)
      toast({
        title: "Error",
        description: "No se pudieron guardar los cambios.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

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
              value={agentId?.toString()} 
              onValueChange={(val) => {
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
                    {selectedAgent?.Nombre || "Seleccionar agente"}
                  </span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {agentsList.map(agent => (
                  <SelectItem key={agent.idag} value={agent.idag.toString()}>
                    <div className="flex flex-col items-start gap-0.5 py-0.5">
                      <span className="font-medium text-sm leading-none">{agent.Nombre}</span>
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
                              "relative flex flex-col items-center justify-center h-14 w-16 rounded-md border border-muted bg-card data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all",
                              hasSlots && "border-b-4 border-b-primary/40",
                              day.disabled && "opacity-50 cursor-not-allowed bg-muted/50"
                            )}
                          >
                            {visitCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background z-10">
                                {visitCount}
                              </span>
                            )}
                            <span className="text-[10px] font-medium uppercase text-muted-foreground">
                              {day.label.split(' ')[0]}
                            </span>
                            <span className="text-base font-bold">
                              {day.label.split(' ')[1]}
                            </span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">Siguiente Semana</h3>
                  <div className="flex flex-wrap gap-2">
                     <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap justify-start">
                      {nextWeekDays.map((day) => {
                        const hasSlots = agendaItems.some(item => item.fecha === day.id)
                        const visitCount = scheduledVisits.filter(v => format(new Date(v.fecha_de_visita), "yyyy-MM-dd") === day.id).length
                        
                        return (
                          <TabsTrigger
                            key={day.id}
                            value={day.id}
                            disabled={day.disabled}
                            className={cn(
                              "relative flex flex-col items-center justify-center h-14 w-16 rounded-md border border-muted bg-card data-[state=active]:border-primary data-[state=active]:bg-primary/5 transition-all",
                              hasSlots && "border-b-4 border-b-primary/40"
                            )}
                          >
                            {visitCount > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background z-10">
                                {visitCount}
                              </span>
                            )}
                            <span className="text-[10px] font-medium uppercase text-muted-foreground">
                              {day.label.split(' ')[0]}
                            </span>
                            <span className="text-base font-bold">
                              {day.label.split(' ')[1]}
                            </span>
                          </TabsTrigger>
                        )
                      })}
                    </TabsList>
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
                    <div className="flex flex-wrap gap-2">
                      {currentSlots.map((slot, i) => (
                        <div key={i} className="px-2 py-1 bg-muted rounded-full text-[10px] font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {slot.hora_inicio} - {slot.hora_fin}
                        </div>
                      ))}
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
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 space-y-1">
                                    <Label htmlFor={`start-${index}`} className="text-[10px] text-muted-foreground">Inicio</Label>
                                    <div className="relative">
                                      <Clock className="absolute left-2.5 top-2.5 h-3 w-3 text-muted-foreground" />
                                      <select
                                        id={`start-${index}`}
                                        className="w-full pl-8 h-8 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                        value={slot.hora_inicio}
                                        onChange={(e) => handleTimeChange(index, "hora_inicio", e.target.value)}
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
                                        onChange={(e) => handleTimeChange(index, "hora_fin", e.target.value)}
                                      >
                                        {timeOptions.map((time) => (
                                          <option key={time} value={time}>{time}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-destructive/90"
                                  onClick={() => handleRemoveSlot(index)}
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
                {dayVisits.length === 0 ? (
                  <div className="text-center py-6 bg-muted/20 rounded-lg">
                    <p className="text-muted-foreground text-xs">No hay citas programadas para este día.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayVisits.map(visit => (
                      <div key={visit.id} className={cn(
                        "flex items-center justify-between p-3 border rounded-lg shadow-sm hover:shadow-md transition-all",
                        visit.visita_completada 
                          ? "border-green-500/30 bg-green-100" 
                          : "bg-card border-border"
                      )}>
                        <div className="flex items-center gap-3 w-full">
                          <div className={cn(
                            "flex flex-col items-center justify-center w-12 h-12 rounded-md shrink-0 transition-colors",
                            visit.visita_completada 
                              ? "bg-green-200 text-green-800" 
                              : "bg-primary/10 text-primary"
                          )}>
                            <span className="text-sm font-bold">
                              {format(new Date(visit.fecha_de_visita), "HH:mm")}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 w-full">
                            <div className="flex items-center gap-2">
                              <User className={cn("h-4 w-4 shrink-0", visit.visita_completada ? "!text-black" : "text-muted-foreground")} />
                              <h4 className={cn("font-bold text-lg", visit.visita_completada && "!text-black")}>
                                {visit.Nombre} {visit.Apellidos}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Building className={cn("h-4 w-4 shrink-0", visit.visita_completada && "!text-black/70")} />
                              <span className={cn("font-medium text-foreground/80", visit.visita_completada && "!text-black/80")}>{visit.Inmueble}</span>
                            </div>
                            {visit.Telefono && (
                              <a 
                                href={`tel:${visit.Telefono}`}
                                className={cn("flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors group", visit.visita_completada && "!text-black/70")}
                                title="Llamar"
                              >
                                <Phone className="h-4 w-4 shrink-0 group-hover:text-primary" />
                                <span className="font-medium underline decoration-dotted underline-offset-4 group-hover:text-primary">{visit.Telefono}</span>
                              </a>
                            )}
                            {(visit.Ingresos !== null && visit.Ingresos !== undefined) && (
                              <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", visit.visita_completada && "!text-black/70")}>
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
                              visit.visita_completada 
                                ? "bg-green-500 hover:bg-green-600 text-black border-green-500" 
                                : "bg-white hover:bg-green-50 text-muted-foreground border-muted-foreground/30 hover:border-green-500 hover:text-green-600"
                            )}
                            onClick={() => handleToggleCompletion(visit)}
                            title={visit.visita_completada ? "Marcar como pendiente" : "Marcar como realizada"}
                          >
                            <Check className={cn("h-6 w-6 stroke-[3]", visit.visita_completada ? "opacity-100" : "opacity-50")} />
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
                        </div>
                      </div>
                    ))}
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
    </div>
  )
}
