"use client"

// FIX: Removed duplicate imports of DialogContent, DialogHeader, DialogTitle
// import { DialogTitle } from "@/components/ui/dialog"
// import { DialogHeader } from "@/components/ui/dialog"
// import { DialogContent } from "@/components/ui/dialog"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { getAgentsByIdi, resolveUserName, getAgentByEmail } from "@/app/actions/get-agents"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Image from "next/image"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createLeadAction } from "@/app/actions/leads"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Filter, Mail, Phone, MessageSquare, CheckCircle, Edit, Building, Euro, Clock, Star, FileText, User, X, Home, XCircle, MoreVertical, Copy, Check, RefreshCw, ShoppingCart, Loader2, Eye, Download, UploadCloud, IdCard, Image as ImageIcon, Tag, Trash, Trash2, StickyNote, Calendar as CalendarIcon, History as HistoryIcon, CalendarDays } from 'lucide-react'
import { useToast } from "@/hooks/use-toast" // Added useToast hook
import { formatDate, formatDateTime, cn, formatWebhookDate } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import React from "react" // Imported React
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { LeadApproveWrapper } from "@/components/lead-approve-wrapper"
import { LeadDenyWrapper } from "@/components/lead-deny-wrapper"
import { ProposeVisitDialog } from "@/components/propose-visit-dialog"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import { isDocumentInvalid } from "@/lib/lead-validation"
import { 
  generateSlotCandidates, 
  isOverlapping 
} from "@/lib/agenda-utils"

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
)

type Lead = {
  id: string // Added id for consistency with supabase schema
  idc?: number // Added for consistency with WhatsApp messages
  IDC?: number
  created_at?: string
  Estado?:
    | "Incompleto"
    | "Datos Incompletos"
    | "Datos Completos"
    | "Completo"
    | "Aprobado"
    | "Descartado"
    | "Necesidad de Aval"
    | "Pendiente"
    | "Validado"
    | "Completado"
    | "Rechazado"
    | "Aceptado"
    | "Descartado"
    | "Pedir Aval"
    | "Visita Propuesta" // Added for new status
    | "Visita Confirmada" // Added for confirmed visits
  "Pedir Aval"?: boolean
  Apellidos?: string
  Nombre?: string
  Correo?: string
  Telefono?: string
  Inmueble?: string
  Fecha_Entrada?: string
  Ingresos?: number
  Documento?: string
  Tipo_Documento?: string
  Codigo_Postal?: string
  Pais?: string
  Persona_2?: string
  Tipo_Documento_2?: string
  Documento_2?: string
  Pais_2?: string
  Ingresos_2?: number
  "Correo 2"?: string
  "Telefono 2"?: string
  "Codigo_Postal 2"?: string
  tipo2?: string
  Persona_3?: string
  Tipo_Documento_3?: string
  Documento_3?: string
  m_error?: string
  m_errror?: string // Fallback for previous typo
  Ingresos_3?: number
  "Correo 3"?: string
  "Telefono 3"?: string
  "Codigo_Postal 3"?: string
  "Pais 3"?: string
  tipo3?: string
  Persona_4?: string
  "Tipo_Documento 4"?: string
  Documento_4?: string
  "Pais 4"?: string
  Ingresos_4?: number
  "Correo 4"?: string
  "Telefono 4"?: string
  "Codigo_Postal 4"?: string
  tipo4?: string
  Observaciones?: string
  Obsevaciones?: string // Typo in DB
  usuario?: number
  correo_proxy?: string // Added for storing original proxy email
  visita_propuesta?: boolean
  aceptado?: boolean
  Fecha_Datos_Completos?: string
  fecha_de_visita?: string
  resumen_visita?: string
  visita_completada?: string | boolean
  idag?: number | string | null
  origen?: string
  status_history?: LeadHistoryEntry[]
  prev_entrada?: string
  fecha_prev_entrada?: string
}

export type LeadHistoryEntry = {
  status: string
  timestamp: string
  agent_id?: string
  agent_name?: string
}

interface Advertisement {
  ida: string // Changed from 'id' to 'ida' to match database schema
  created_at: string
  Referencia?: string
  Direccion?: string
  Precio?: number
  Pais_Aval?: string
  usuario?: string
  Activacion?: string // Changed from boolean to string to support "Activo", "Pausado", "Archivado"
  Portal?: string
  Descripcion?: string
  fecha_activacion?: string
  Duracion_visita?: number
  Gap_visita?: number
  duracion_visita?: number
  tiempo_entre_visitas?: number
}

interface Communication {
  id: string
  created_at: string
  From?: string
  to?: string
  Email?: string
  Subject?: string
  Text?: string
  Html?: string
  Tipo?: string
  Nombre?: string
  idc?: number // Added for consistency with WhatsApp messages
  Mensaje?: string // WhatsApp message content
  source: "email" | "whatsapp" // To distinguish between email and WhatsApp
}

export default function LeadsPage() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  const [leads, setLeads] = useState<Lead[]>([])
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([])
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([])
  const [selectedAdvertisement, setSelectedAdvertisement] = useState<string | null>(null)
  const [communications, setCommunications] = useState<Communication[]>([])
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null)
  const [isCommDialogOpen, setIsCommDialogOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [adsLoading, setAdsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [availableStatuses, setAvailableStatuses] = useState<string[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [newLeadsToday, setNewLeadsToday] = useState(0)
  const [completedLeads, setCompletedLeads] = useState(0)
  const [conversionRate, setConversionRate] = useState(0)
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({})
  const [selectedPersona, setSelectedPersona] = useState<1 | 2 | 3 | 4>(1)
  const [documentStatus, setDocumentStatus] = useState<{ [key: string]: "pending" | "verified" | "not_verified" }>({
    dni: "pending",
    income: "pending",
    person2: "not_verified",
    person3: "not_verified",
  })
  const [isNewLeadDialogOpen, setIsNewLeadDialogOpen] = useState(false)
  const [newLeadFormData, setNewLeadFormData] = useState<Partial<Lead>>({
    Estado: "Pendiente",
    "Pedir Aval": false,
  })
  const [isSubmittingNewLead, setIsSubmittingNewLead] = useState(false)

  const [isReactivateDialogOpen, setIsReactivateDialogOpen] = useState(false)
  const [advertisementToReactivate, setAdvertisementToReactivate] = useState<Advertisement | null>(null)

  const [isAvalDialogOpen, setIsAvalDialogOpen] = useState(false)
  const [avalCalculation, setAvalCalculation] = useState<{
    income: number // Total combined income from all personas
    persona1Income: number
    persona2Income: number
    persona3Income: number
    persona4Income: number // Added for Persona 4 (Aval)
    actualRent: number | null
    minRequiredIncome: number | null
    idealIncome: number | null
    needsAval: boolean
    incomeRatio: number | null
  } | null>(null)

  // isApprovalDialogOpen state is removed because it's now managed by LeadApproveWrapper
  // const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false)

  // FIX: Added toast hook and copy state management
  const { toast } = useToast()
  const [copiedField, setCopiedField] = React.useState<string | null>(null)

  const { inmobiliariaId, inmobiliariaNombre, loading: inmobiliariaLoading, isAdmin, role, userEmail } = useInmobiliaria()

  const supabase = createClient()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false)
  const [bulkConfirmationOpen, setBulkConfirmationOpen] = useState(false)
  const [pendingBulkStatus, setPendingBulkStatus] = useState<Lead["Estado"] | null>(null)
  
  // Entry Date Editing State
  const [isEditingEntryDate, setIsEditingEntryDate] = useState(false)
  const [entryDateType, setEntryDateType] = useState<string>("Inmediatamente")
  const [customEntryDate, setCustomEntryDate] = useState<string>("")
  
  // Single status change confirmation state
  const [singleStatusConfirmOpen, setSingleStatusConfirmOpen] = useState(false)
  const [pendingSingleStatus, setPendingSingleStatus] = useState<{id: number, status: string} | null>(null)

  const [visitDateDialogOpen, setVisitDateDialogOpen] = useState(false)
  const [proposeVisitDialogOpen, setProposeVisitDialogOpen] = useState(false)
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<Lead | null>(null)
  const [newVisitDateDate, setNewVisitDateDate] = useState("")

  // Persistencia de estado (filtros)
  const [isStateRestored, setIsStateRestored] = useState(false)

  useEffect(() => {
    const restoreState = () => {
      try {
        // Intentar recuperar el estado guardado al montar el componente
        const savedState = sessionStorage.getItem("rf_leads_view_state")
        if (savedState) {
          const parsed = JSON.parse(savedState)
          
          // Solo restaurar si no hay parámetros explícitos en la URL que deban tener prioridad
            const hasUrlParams = searchParams.has("q") || searchParams.has("status") || searchParams.has("ad") || searchParams.has("filter") || searchParams.has("leadId")
          
          if (!hasUrlParams) {
            if (parsed.searchTerm !== undefined) setSearchTerm(parsed.searchTerm)
            if (parsed.statusFilter !== undefined) {
              const sf = parsed.statusFilter
              if (Array.isArray(sf)) {
                setStatusFilter(sf)
              } else if (typeof sf === 'string') {
                setStatusFilter(sf === 'all' ? [] : [sf])
              }
            }
            if (parsed.selectedAdvertisement !== undefined) setSelectedAdvertisement(parsed.selectedAdvertisement)
          }
        }
      } catch (e) {
        console.error("Error restaurando estado de leads:", e)
      } finally {
        setIsStateRestored(true)
      }
    }
    
    restoreState()
  }, [searchParams]) // Se ejecuta solo una vez al montar

  useEffect(() => {
    if (!isStateRestored) return

    // Guardar el estado cada vez que cambien los filtros relevantes
    const stateToSave = {
      searchTerm,
      statusFilter,
      selectedAdvertisement
    }
    sessionStorage.setItem("rf_leads_view_state", JSON.stringify(stateToSave))
  }, [searchTerm, statusFilter, selectedAdvertisement, isStateRestored])

  // Delete Note Confirmation
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [currentAgentId, setCurrentAgentId] = useState<number | null>(null)
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{ open: boolean, index: number, type: 'sidebar' | 'dialog' } | null>(null)

  useEffect(() => {
    const fetchUserName = async () => {
        const supabaseClient = createClient()
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (user) {
            if (user.email) {
                const res = await resolveUserName(user.email)
                if (res.name) setCurrentUserName(res.name)
                
                const agentRes = await getAgentByEmail(user.email)
                if (agentRes.data && agentRes.data.idag) {
                    setCurrentAgentId(agentRes.data.idag)
                }
            }
        }
    }
    fetchUserName()
  }, [])

  const canDeleteNote = (header: string) => {
    // header format: [DD/MM/YYYY HH:mm • Author]
    const clean = header.replace(/^\[|\]$/g, "")
    const parts = clean.split(" • ")
    const author = parts.length > 1 ? parts[1].trim() : ""
    
    if (!author) return isAdmin || role === 'super' || role === 'admin'
    if (isAdmin || role === 'super' || role === 'admin') return true
    
    if (userEmail && author === userEmail) return true
    if (currentUserName && author === currentUserName) return true
    if (userEmail && author.toLowerCase() === userEmail.toLowerCase()) return true
    
    return false
  }

  const handleDeleteNoteRequest = (index: number, notesStr: string, type: 'sidebar' | 'dialog') => {
      const parts = splitNotes(notesStr)
      if (index >= parts.length) return
      
      const note = parts[index]
      if (canDeleteNote(note.header)) {
          setDeleteNoteConfirm({ open: true, index, type })
      } else {
          toast({
              title: "Acceso denegado",
              description: "Solo el autor o un administrador puede eliminar esta nota.",
              variant: "destructive"
          })
      }
  }

  const executeDeleteNote = async () => {
      if (!deleteNoteConfirm) return
      
      if (deleteNoteConfirm.type === 'sidebar') {
          await deleteLeadNoteEntry(deleteNoteConfirm.index)
      } else {
          await deleteNoteEntry(deleteNoteConfirm.index)
      }
      setDeleteNoteConfirm(null)
  }

  const [newVisitDateTime, setNewVisitDateTime] = useState("")
  const [selectedAgenteId, setSelectedAgenteId] = useState("")
  const [isAgentSelectionOnly, setIsAgentSelectionOnly] = useState(false)
  const [agentes, setAgentes] = useState<any[]>([])
  const [inlineNote, setInlineNote] = useState("")

  // State for agent availability
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [availabilityReason, setAvailabilityReason] = useState<"none" | "no_config" | "blocked_by_property" | "available">("none")
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)

  // Fetch agent available dates
  useEffect(() => {
    async function fetchAvailableDates() {
      if (!selectedAgenteId) {
        setAvailableDates([])
        return
      }
      setLoadingDates(true)
      try {
        const supabase = createClient()
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from("Agendas")
          .select("fecha")
          .eq("agente_id", selectedAgenteId)
          .gte("fecha", today)
        
        if (error) throw error
        
        if (data) {
           const dates = data.map(d => d.fecha)
           setAvailableDates([...new Set(dates)])
        }
      } catch (err) {
        console.error("Error fetching available dates:", err)
      } finally {
        setLoadingDates(false)
      }
    }
    fetchAvailableDates()
  }, [selectedAgenteId])

  // Fetch agent availability when agent or date changes (modal de leads)
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedAgenteId || !newVisitDateDate || !selectedLeadForVisit) {
        setAvailableSlots([])
        setAvailabilityReason("none")
        return
      }

      setLoadingAvailability(true)
      setAvailabilityReason("none")
      try {
        const supabaseBrowser = createClient()

        const { data, error } = await supabaseBrowser
          .from("Agendas")
          .select("hora_inicio, hora_fin, anuncio_id, duracion, gap, fecha")
          .eq("agente_id", selectedAgenteId)
          .eq("fecha", newVisitDateDate)

        if (error) throw error

        const agendaData = data || []
        if (agendaData.length === 0) {
          setAvailableSlots([])
          setAvailabilityReason("no_config")
          return
        }

        const dayAvailability = agendaData

        let effectiveDuration = 20
        let effectiveGap = 5
        let relatedAd: any = null

        if (selectedLeadForVisit.Inmueble && advertisements && advertisements.length > 0) {
          const leadInmueble = String(selectedLeadForVisit.Inmueble).toLowerCase()
          relatedAd = advertisements.find((a: any) => {
            const ref = (a.Referencia || "").toLowerCase()
            const dir = (a.Direccion || "").toLowerCase()
            return (ref && ref === leadInmueble) ||
              (dir && dir.includes(leadInmueble)) ||
              (leadInmueble && dir && leadInmueble.includes(dir))
          })

          if (relatedAd) {
            if (typeof relatedAd.duracion_visita === "number") {
              effectiveDuration = relatedAd.duracion_visita || 20
            }
            if (relatedAd.tiempo_entre_visitas !== null && relatedAd.tiempo_entre_visitas !== undefined) {
              effectiveGap = relatedAd.tiempo_entre_visitas
            }
          }
        }

        if (relatedAd) {
          const slotForAd = dayAvailability.find((slot: any) => {
            if (!slot.anuncio_id) return false
            return String(slot.anuncio_id) === String(relatedAd.ida)
          })
          if (slotForAd) {
            if (slotForAd.duracion) {
              effectiveDuration = Number(slotForAd.duracion) || effectiveDuration
            }
            if (slotForAd.gap !== null && slotForAd.gap !== undefined) {
              effectiveGap = Number(slotForAd.gap)
            }
          }
        } else {
          const slotWithDuration = dayAvailability.find((slot: any) => slot.duracion)
          if (slotWithDuration) {
            effectiveDuration = Number(slotWithDuration.duracion) || effectiveDuration
            if (slotWithDuration.gap !== null && slotWithDuration.gap !== undefined) {
              effectiveGap = Number(slotWithDuration.gap)
            }
          }
        }

        let isoDate = newVisitDateDate
        if (newVisitDateDate.includes("/")) {
          const parts = newVisitDateDate.split("/")
          if (parts.length === 3) {
            const [day, month, year] = parts
            isoDate = `${year}-${month}-${day}`
          }
        }

        const startOfDay = `${isoDate}T00:00:00`
        const endOfDay = `${isoDate}T23:59:59`

        const { data: existingVisits } = await supabaseBrowser
          .from("Clientes")
          .select("id, fecha_de_visita, Inmueble")
          .eq("idag", selectedAgenteId)
          .gte("fecha_de_visita", startOfDay)
          .lte("fecha_de_visita", endOfDay)

        const visitsOnDay = (existingVisits || []).filter((v: any) => {
          if (!v.fecha_de_visita) return false
          return v.id !== selectedLeadForVisit.id
        })

        const baseCandidates = generateSlotCandidates(dayAvailability, advertisements, effectiveDuration, effectiveGap)

        const boundaryTimesSet = new Set<string>()
        dayAvailability.forEach((slot: any) => {
          if (!slot.hora_inicio || !slot.hora_fin) return
          const startStr = String(slot.hora_inicio).slice(0, 5)
          const endStr = String(slot.hora_fin).slice(0, 5)
          const [sH, sM] = startStr.split(":").map(Number)
          const [eH, eM] = endStr.split(":").map(Number)
          const slotStart = sH * 60 + sM
          const slotEnd = eH * 60 + eM

          visitsOnDay.forEach((v: any) => {
            if (!v.fecha_de_visita) return
            const d = new Date(v.fecha_de_visita)
            if (isNaN(d.getTime())) return
            const vH = d.getHours()
            const vM = d.getMinutes()
            const vStart = vH * 60 + vM

            let vDuration = effectiveDuration
            let configFound = false

            const matchingAgendaItem = dayAvailability.find((item: any) => {
              if (!item.hora_inicio || !item.hora_fin) return false
              const [sh, sm] = String(item.hora_inicio).slice(0, 5).split(":").map(Number)
              const [eh, em] = String(item.hora_fin).slice(0, 5).split(":").map(Number)
              const aStart = sh * 60 + sm
              const aEnd = eh * 60 + em
              return vStart >= aStart && vStart < aEnd
            })

            if (matchingAgendaItem) {
              if (matchingAgendaItem.duracion) {
                vDuration = Number(matchingAgendaItem.duracion)
                configFound = true
              } else if (matchingAgendaItem.anuncio_id) {
                const ad = advertisements.find((a: any) => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                if (ad && typeof ad.duracion_visita === "number") {
                  vDuration = ad.duracion_visita || vDuration
                  configFound = true
                }
              }
            }

            if (!configFound && v.Inmueble && advertisements && advertisements.length > 0) {
              const vInmueble = String(v.Inmueble).toLowerCase()
              const vAd = advertisements.find((a: any) => {
                const ref = (a.Referencia || "").toLowerCase()
                const dir = (a.Direccion || "").toLowerCase()
                return (ref && ref === vInmueble) ||
                  (dir && dir.includes(vInmueble)) ||
                  (vInmueble && dir && vInmueble.includes(dir))
              })
              if (vAd && typeof vAd.duracion_visita === "number") {
                vDuration = vAd.duracion_visita || vDuration
              }
            }

            const vEndVisit = vStart + vDuration
            if (vEndVisit >= slotStart && (vEndVisit + effectiveDuration + effectiveGap) <= slotEnd) {
              const h = Math.floor(vEndVisit / 60)
              const m = vEndVisit % 60
              const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`
              boundaryTimesSet.add(timeStr)
            }
          })
        })

        const unionTimesSet = new Set<string>(baseCandidates.map(c => c.time))
        boundaryTimesSet.forEach(t => unionTimesSet.add(t))

        const unionTimes = Array.from(unionTimesSet).sort((a, b) => {
          const [ah, am] = a.split(":").map(Number)
          const [bh, bm] = b.split(":").map(Number)
          return ah * 60 + am - (bh * 60 + bm)
        })

        const finalTimes = unionTimes.filter((t) => {
          const [th, tm] = t.split(":").map(Number)
          const tStart = th * 60 + tm
          const tEndVisit = tStart + effectiveDuration
          return !visitsOnDay.some((v: any) => {
            if (!v.fecha_de_visita) return false
            const d = new Date(v.fecha_de_visita)
            if (isNaN(d.getTime())) return false
            const vH = d.getHours()
            const vM = d.getMinutes()
            const vStart = vH * 60 + vM

            let vDuration = effectiveDuration
            let configFound = false

            const matchingAgendaItem = dayAvailability.find((item: any) => {
              if (!item.hora_inicio || !item.hora_fin) return false
              const [sh, sm] = String(item.hora_inicio).slice(0, 5).split(":").map(Number)
              const [eh, em] = String(item.hora_fin).slice(0, 5).split(":").map(Number)
              const aStart = sh * 60 + sm
              const aEnd = eh * 60 + em
              return vStart >= aStart && vStart < aEnd
            })

            if (matchingAgendaItem) {
              if (matchingAgendaItem.duracion) {
                vDuration = Number(matchingAgendaItem.duracion)
                configFound = true
              } else if (matchingAgendaItem.anuncio_id) {
                const ad = advertisements.find((a: any) => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                if (ad && typeof ad.duracion_visita === "number") {
                  vDuration = ad.duracion_visita || vDuration
                  configFound = true
                }
              }
            }

            if (!configFound && v.Inmueble && advertisements && advertisements.length > 0) {
              const vInmueble = String(v.Inmueble).toLowerCase()
              const vAd = advertisements.find((a: any) => {
                const ref = (a.Referencia || "").toLowerCase()
                const dir = (a.Direccion || "").toLowerCase()
                return (ref && ref === vInmueble) ||
                  (dir && dir.includes(vInmueble)) ||
                  (vInmueble && dir && vInmueble.includes(dir))
              })
              if (vAd && typeof vAd.duracion_visita === "number") {
                vDuration = vAd.duracion_visita || vDuration
              }
            }

            const vEndVisit = vStart + vDuration
            return isOverlapping(tStart, tEndVisit, vStart, vEndVisit)
          })
        })

        setAvailableSlots(finalTimes)

        if (finalTimes.length > 0) {
          setAvailabilityReason("available")
        } else {
          setAvailabilityReason("no_config")
        }
      } catch (err) {
        console.error("Error fetching availability:", err)
        setAvailabilityReason("none")
      } finally {
        setLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [selectedAgenteId, newVisitDateDate, selectedLeadForVisit, advertisements])


  const deleteLeadNoteEntry = async (index: number) => {
    if (!selectedLead) return
    const currentNotes = selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? ""
    const parts = splitNotes(currentNotes)
    
    const newParts = parts.filter((_, i) => i !== index)
    const newNotes = newParts.map(p => `${p.header}\n${p.body}`).join("\n\n").trim()
    
    try {
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: newNotes })
        .eq("id", selectedLead.id)

      if (error) throw error

      const updatedLead = { ...selectedLead, Observaciones: newNotes, Obsevaciones: newNotes }
      setSelectedLead(updatedLead as Lead)
      setLeads((prev) => prev.map(l => l.id === selectedLead.id ? updatedLead : l))
      
      toast({
        title: "Nota eliminada",
        description: "La entrada de nota ha sido eliminada.",
      })
    } catch (error) {
      console.error("Error updating notes:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar las notas.",
        variant: "destructive",
      })
    }
  }

  const handleAddLeadNote = async () => {
    if (!selectedLead || !inlineNote.trim()) return

    // Default fallback
    let userStr = "Usuario (Sin Datos)"
    
    try {
      // 1. Get fresh user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        let foundName: string | null = null

        if (user.email) {
             // Strategy: Server Action
             const result = await resolveUserName(user.email)
             if (result.name) {
                 foundName = result.name
             }
        }
        
        // Strategy 2: Metadata
        if (!foundName && user.user_metadata) {
             const metaName = user.user_metadata.name || user.user_metadata.full_name || user.user_metadata.nombre
             if (metaName) {
                 foundName = metaName
             }
        }
        
        // Strategy 3: Email
        if (!foundName && user.email) {
            foundName = user.email
        }

        if (foundName) {
            userStr = foundName
        }
      } else {
         userStr = "Sin Sesión"
      }
    } catch (e) {
      console.error("Error determining user for note:", e)
      userStr = "Error Auth"
    }

    const now = new Date()
    const dateStr = now.toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' })
    const timeStr = now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })
    
    const newEntryHeader = `[${dateStr} ${timeStr} • ${userStr}]`
    const newEntry = `${newEntryHeader}\n${inlineNote.trim()}`
    
    const currentNotes = selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? ""
    const updatedNotes = currentNotes ? `${newEntry}\n\n${currentNotes}` : newEntry

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: updatedNotes })
        .eq("id", selectedLead.id)

      if (error) throw error

      const updatedLead = { ...selectedLead, Observaciones: updatedNotes, Obsevaciones: updatedNotes }
      setSelectedLead(updatedLead as Lead)
      setLeads((prev) => prev.map(l => l.id === selectedLead.id ? updatedLead : l))
      setInlineNote("") 
      
      toast({
        title: "Nota añadida",
        description: `La nota se ha guardado correctamente.`,
      })
    } catch (error) {
      console.error("Error adding note:", error)
      toast({
        title: "Error",
        description: "No se pudo añadir la nota.",
        variant: "destructive",
      })
    }
  }

  const [planLimit, setPlanLimit] = useState<number>(1000000)
  const [planResetAt, setPlanResetAt] = useState<Date | null>(null)
  const [totalEjecuciones, setTotalEjecuciones] = useState<number>(0)
  const [planInactive, setPlanInactive] = useState<boolean>(false)
  const [adsPaused, setAdsPaused] = useState<boolean>(false)
  const [currentPlanId, setCurrentPlanId] = useState<number>(0)
  const [currentPlanName, setCurrentPlanName] = useState<string>("")
  const [scheduledPlanId, setScheduledPlanId] = useState<number>(0)
  const [scheduledEffectiveAt, setScheduledEffectiveAt] = useState<Date | null>(null)

  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false)
  const [docsUploadLoading, setDocsUploadLoading] = useState(false)
  const [docsError, setDocsError] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(100)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("")
  const [isDeletingLead, setIsDeletingLead] = useState(false)
  const [noteDialog, setNoteDialog] = useState<{ open: boolean; leadId: number; leadName: string; value: string; existing: string }>({ open: false, leadId: 0, leadName: "", value: "", existing: "" })
  const [currentUser, setCurrentUser] = useState<{id: string, email: string} | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser({ id: data.user.id, email: data.user.email || "" })
      }
    })
  }, [supabase])

  useEffect(() => {
    const fetchAgentId = async () => {
      if (role === "agente" && userEmail) {
        // Use ilike for case-insensitive email matching
        const { data } = await supabase.from("Agentes").select("idag").ilike("Email", userEmail).maybeSingle()
        if (data) {
          setCurrentAgentId(data.idag)
        } else {
          console.log("[RBAC] No matching agent found for email (checked with ilike):", userEmail)
          // If no agent ID found, they will see only unassigned leads.
        }
      }
    }
    fetchAgentId()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, userEmail])

  const fetchAgentes = useCallback(async (inmobiliariaId: number, signal?: AbortSignal) => {
    try {
      // Use server action to bypass RLS
      const result = await getAgentsByIdi(inmobiliariaId)
      const mappedData = result?.data || []
      const error = result?.error

      if (error) throw new Error(error.message || error)
      
      console.log("[v0] fetchAgentes success, count:", mappedData?.length)
      setAgentes(mappedData || [])
    } catch (error: any) {
        if (error?.name !== 'AbortError' && !error?.message?.includes('Abort')) {
          console.error("[v0] Failed to fetch agentes:", error)
          setAgentes([])
        }
      }
    }, [])

  useEffect(() => {
    if (inmobiliariaId) {
      fetchAgentes(inmobiliariaId)
    }
  }, [inmobiliariaId, fetchAgentes])

  useEffect(() => {
    console.log("[router] leads_mount", { path: pathname })
    return () => {
      console.log("[router] leads_unmount")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250)
    return () => clearTimeout(t)
  }, [searchTerm])

  useEffect(() => {
    setVisibleCount(100)
  }, [debouncedSearchTerm, statusFilter, selectedAdvertisement])

  const openDeleteDialog = (lead: Lead) => {
    setLeadToDelete(lead)
    setDeleteConfirmInput("")
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteLead = async () => {
    if (!leadToDelete) return
    const typed = String(deleteConfirmInput).trim()
    const targetId = String(leadToDelete.id).trim()
    if (typed !== targetId) {
      toast({ title: "ID incorrecto", description: "Debes escribir exactamente el ID del lead.", variant: "destructive" })
      return
    }
    try {
      setIsDeletingLead(true)
      const { error } = await supabase.from("Clientes").delete().eq("id", Number(leadToDelete.id))
      if (error) throw error
      setLeads(leads.filter((l) => String(l.id) !== String(leadToDelete.id)))
      setFilteredLeads(filteredLeads.filter((l) => String(l.id) !== String(leadToDelete.id)))
      if (selectedLead && String(selectedLead.id) === targetId) {
        setSelectedLead(null)
      }
      setIsDeleteDialogOpen(false)
      setLeadToDelete(null)
      toast({ title: "Lead eliminado", description: `Se eliminó el lead con ID ${targetId}` })
    } catch (err) {
      console.error("[v0] Error deleting lead:", err)
      toast({ title: "Error", description: "No se pudo eliminar el lead", variant: "destructive" })
    } finally {
      setIsDeletingLead(false)
    }
  }
  const [docsList, setDocsList] = useState<Array<{ name: string; path: string; href: string; lastModified: string; size: number; contentType: string }>>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsDeletingPath, setDocsDeletingPath] = useState<string | null>(null)
  const [dropActiveDni, setDropActiveDni] = useState(false)
  const [dropActiveIncome, setDropActiveIncome] = useState(false)
  const dniInputRef = useRef<HTMLInputElement | null>(null)
  const incomeInputRef = useRef<HTMLInputElement | null>(null)
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null)
  const [attachmentPreviewKind, setAttachmentPreviewKind] = useState<"pdf" | "image" | "unknown">("unknown")
  const [attachmentPreviewName, setAttachmentPreviewName] = useState<string>("")

  const openNoteDialog = (lead: Lead) => {
    const v = (lead.Observaciones ?? lead.Obsevaciones ?? "")
    console.log("[observ] dialog_open", { id: lead.id, len: String(v).length })
    setNoteDialog({
      open: true,
      leadId: Number(lead.id),
      leadName: lead.Nombre || "Sin nombre",
      value: "",
      existing: v,
    })
  }

  const splitNotes = (text: string | undefined | null) => {
    if (!text) return []
    const t = String(text)
    // Support both DD/MM/YYYY and YYYY-MM-DD formats
    const parts = t.split(/(?=\[\d{2,4}[-\/]\d{2}[-\/]\d{2,4})/)
    return parts
      .map((p) => {
        const match = p.match(/^(\[.*?\])([\s\S]*)/)
        if (match) {
          return { header: match[1], body: match[2].trim(), raw: p }
        }
        return { header: "", body: p.trim(), raw: p }
      })
      .filter((p) => p.body || p.header)
  }

  const deleteNoteEntry = async (idx: number) => {
    try {
      const idStr = String(noteDialog.leadId)
      const idVal = Number.isFinite(Number(noteDialog.leadId)) ? Number(noteDialog.leadId) : idStr
      const entries = splitNotes(noteDialog.existing)
      const remaining = entries.filter((_, i) => i !== idx).map((e) => e.raw).join(entries.length > 1 ? "\n" : "")
      
      const { error } = await supabase.from("Clientes").update({ Obsevaciones: remaining }).eq("id", idVal)
      if (error) throw error
      
      setLeads((prev) => prev.map((l) => (String(l.id) === idStr ? { ...l, Observaciones: remaining, Obsevaciones: remaining } : l)))
      setFilteredLeads((prev) => prev.map((l) => (String(l.id) === idStr ? { ...l, Observaciones: remaining, Obsevaciones: remaining } : l)))
      setSelectedLead((prev) => (prev && String(prev.id) === idStr ? { ...prev, Observaciones: remaining, Obsevaciones: remaining } : prev))
      setNoteDialog((prev) => ({ ...prev, existing: remaining }))
      toast({ title: "Anotación eliminada", description: "Se eliminó de Observaciones", duration: 2000 })
    } catch (err) {
      toast({ title: "Error al eliminar", description: "No se pudo eliminar la anotación", variant: "destructive" })
    }
  }
  const saveNoteDialog = async () => {
    try {
      console.log("[observ] dialog_save_start", { id: noteDialog.leadId, len: noteDialog.value.length })
      const idStr = String(noteDialog.leadId)
      const target = leads.find((l) => String(l.id) === idStr) || selectedLead
      const idVal = Number.isFinite(Number(noteDialog.leadId)) ? Number(noteDialog.leadId) : idStr
      const supabaseUser = await supabase.auth.getUser()
      const user = supabaseUser?.data?.user
      
      let displayName = "Usuario Desconocido"
      let debugSource = "Init"
      if (user) {
         let foundName: string | null = null
         
         if (user.email) {
            // Strategy: Server Action
            const result = await resolveUserName(user.email)
            if (result.name) {
                foundName = result.name
                debugSource = result.source
            } else {
                debugSource = `Server: ${result.source}`
            }
         }

         // Strategy 2: User Metadata
         if (!foundName) {
             const meta = (user.user_metadata || {}) as any
             const metaName = meta.nombre || meta.name || meta.full_name
             if (metaName && metaName.trim() !== "" && metaName.trim().toLowerCase() !== "usuario") {
                 foundName = metaName
                 debugSource = "Metadata"
             }
         }

         // Strategy 3: Email
         if (!foundName && user.email) {
             foundName = user.email
             debugSource += " -> Email Fallback"
         }

         if (foundName && foundName.trim().toLowerCase() !== "usuario") {
             displayName = foundName
         } else {
             displayName = user.email || "Usuario (Sin Datos)"
         }
      }
      
      const now = new Date()
      const dateStr = now.toLocaleDateString("es-ES", { day: '2-digit', month: '2-digit', year: 'numeric' })
      const timeStr = now.toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })
      const entry = `[${dateStr} ${timeStr} • ${displayName}] ${noteDialog.value}`
      
      const existingText = String((target as any)?.Observaciones ?? (target as any)?.Obsevaciones ?? "")
      const joined = existingText ? `${entry}\n\n${existingText}` : entry
      
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: joined })
        .eq("id", idVal)
      
      if (error) throw error

      setLeads((prev) =>
        prev.map((l) =>
          String(l.id) === idStr ? { ...l, Observaciones: joined, Obsevaciones: joined } : l,
        ),
      )
      setFilteredLeads((prev) =>
        prev.map((l) =>
          String(l.id) === idStr ? { ...l, Observaciones: joined, Obsevaciones: joined } : l,
        ),
      )
      setSelectedLead((prev) =>
        prev && String(prev.id) === idStr ? { ...prev, Observaciones: joined, Obsevaciones: joined } : prev,
      )
      setNoteDialog((prev) => ({ ...prev, open: false }))
      toast({ title: "Anotación guardada", description: `La nota se ha guardado correctamente.` })
      console.log("[observ] dialog_save_success", { id: noteDialog.leadId })
    } catch (err) {
      console.error("[observ] dialog_save_error", err)
      toast({ title: "Error al guardar", description: "No se pudo guardar la anotación", variant: "destructive" })
    }
  }
  const uploadLeadDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!selectedLead) {
      toast({ title: "Sin lead seleccionado", description: "Selecciona un lead para subir documentos", variant: "destructive" })
      return
    }
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(selectedLead.id)

    const arr = Array.from(files)
    const onlyPdf = arr.filter((f) => (/application\/pdf/i.test(String(f.type)) || /\.pdf$/i.test(String(f.name))) )
    if (onlyPdf.length !== arr.length) {
      toast({ title: "Formato no permitido", description: "Solo se admiten documentos en PDF", variant: "destructive" })
      return
    }

    setDocsUploadLoading(true)
    setDocsError(null)
    try {
      const fd = new FormData()
      fd.append("referencia", referencia)
      fd.append("inmobiliaria", inmo)
      for (const f of onlyPdf) {
        fd.append("files", f)
      }
      const res = await fetch(`/api/nextcloud/upload`, { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = `No se pudieron subir archivos`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setDocsError(errMsg)
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Archivos subidos correctamente" })
        setIsDocsDialogOpen(false)
      }
    } catch {
      setDocsError("Error al subir archivos")
      toast({ title: "Error", description: "Error al subir archivos", variant: "destructive" })
    } finally {
      setDocsUploadLoading(false)
    }
  }


  const uploadAnyDocuments = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (!selectedLead) {
      toast({ title: "Sin lead seleccionado", description: "Selecciona un lead para subir documentos", variant: "destructive" })
      return
    }
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(selectedLead.id)
    const arr = Array.from(files)
    const allowed = arr.filter((f) => (String(f.type).startsWith("image/") || /application\/pdf/i.test(String(f.type)) || /\.(pdf|png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(String(f.name))))
    if (allowed.length !== arr.length) {
      toast({ title: "Formato no permitido", description: "Solo se admiten imágenes y PDF", variant: "destructive" })
      return
    }
    setDocsUploadLoading(true)
    setDocsError(null)
    try {
      const fd = new FormData()
      fd.append("referencia", referencia)
      fd.append("inmobiliaria", inmo)
      for (const f of allowed) {
        fd.append("files", f)
      }
      const res = await fetch(`/api/nextcloud/upload`, { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = `No se pudieron subir archivos`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setDocsError(errMsg)
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Archivos subidos correctamente" })
        await loadLeadDocsList()
      }
    } catch {
      setDocsError("Error al subir archivos")
      toast({ title: "Error", description: "Error al subir archivos", variant: "destructive" })
    } finally {
      setDocsUploadLoading(false)
    }
  }

  const openAttachmentPreview = (url: string, name?: string, file?: File) => {
    const n = name || url.split("?")[0].split("/").pop() || ""
    const lower = (n || url).toLowerCase()
    const kind: "pdf" | "image" | "unknown" = lower.endsWith(".pdf")
      ? "pdf"
      : lower.match(/\.(png|jpg|jpeg|gif|webp|bmp|svg)$/)
      ? "image"
      : "unknown"
    const effective = url.startsWith("blob:") && file ? URL.createObjectURL(file) : url
    const proxied = kind === "pdf" && !effective.startsWith("blob:") ? `/api/proxy/pdf?url=${encodeURIComponent(effective)}` : effective
    setAttachmentPreviewName(n)
    setAttachmentPreviewKind(kind)
    setAttachmentPreviewUrl(proxied)
  }

  const closeAttachmentPreview = (open?: boolean) => {
    if (open === false || open === undefined) {
      if (attachmentPreviewUrl && attachmentPreviewUrl.startsWith("blob:")) {
        try { URL.revokeObjectURL(attachmentPreviewUrl) } catch {}
      }
      setAttachmentPreviewUrl(null)
      setAttachmentPreviewKind("unknown")
      setAttachmentPreviewName("")
    }
  }


  const loadLeadDocsList = async () => {
    if (!selectedLead) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(selectedLead.id)
    if (!inmo) {
      setDocsError("Inmobiliaria no cargada")
      return
    }
    setDocsLoading(true)
    setDocsError(null)
    try {
      const params = new URLSearchParams({ referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (!res.ok) {
        let errMsg = `Error ${res.status}`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setDocsError(errMsg)
        setDocsList([])
      } else {
        const j = await res.json()
        setDocsList(j.files || [])
      }
    } catch {
      setDocsError("Error cargando documentos")
    } finally {
      setDocsLoading(false)
    }
  }

  const deleteLeadDoc = async (path: string) => {
    if (!path) return
    setDocsDeletingPath(path)
    try {
      const params = new URLSearchParams({ path })
      await fetch(`/api/nextcloud/file?${params.toString()}`, { method: "DELETE" })
      await loadLeadDocsList()
      await updateDocumentStatusFromNextcloud()
      toast({ title: "Archivo eliminado", description: "Archivo eliminado correctamente" })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    } finally {
      setDocsDeletingPath(null)
    }
  }

  const uploadLeadDocWithOverride = async (file: File, baseName: string) => {
    if (!selectedLead) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(selectedLead.id)
    const ok = String(file.type).startsWith("image/") || /application\/pdf/i.test(String(file.type)) || /\.(pdf|png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(String(file.name))
    if (!ok) {
      toast({ title: "Formato no permitido", description: "Solo imágenes o PDF", variant: "destructive" })
      return
    }
    setDocsUploadLoading(true)
    setDocsError(null)
    try {
      const extMatch = (file.name || "").match(/\.([a-zA-Z0-9]+)$/)
      const ext = extMatch ? extMatch[1].toLowerCase() : ""
      const filename = ext ? `${baseName}.${ext}` : baseName
      const fd = new FormData()
      fd.append("referencia", referencia)
      fd.append("inmobiliaria", inmo)
      fd.append("file", file)
      fd.append("filename", filename)
      const res = await fetch(`/api/nextcloud/upload`, { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = `No se pudo subir el archivo`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setDocsError(errMsg)
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Archivo subido correctamente" })
        await loadLeadDocsList()
        await updateDocumentStatusFromNextcloud()
      }
    } catch {
      setDocsError("Error al subir archivo")
      toast({ title: "Error", description: "Error al subir archivo", variant: "destructive" })
    } finally {
      setDocsUploadLoading(false)
    }
  }

  useEffect(() => {
    if (isDocsDialogOpen && selectedLead) {
      loadLeadDocsList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDocsDialogOpen, selectedLead])

  const updateDocumentStatusFromNextcloud = async () => {
    if (!selectedLead) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(selectedLead.id)
    if (!inmo) return
    try {
      const params = new URLSearchParams({ referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (!res.ok) return
      const j = await res.json()
      const files = (j.files || []) as Array<{ name: string; path: string }>
      const hasBase = (base: string) => {
        return files.some((f) => {
          const nm = (f.name || "").toLowerCase()
          const b = nm.replace(/\.[a-z0-9]+$/i, "")
          return b === base || b.startsWith(`${base}-`)
        })
      }
      const dniOk = hasBase("dni")
      const incomeOk = hasBase("ingresos")
      setDocumentStatus((prev) => ({
        ...prev,
        dni: dniOk ? "verified" : "pending",
        income: incomeOk ? "verified" : "pending",
      }))
    } catch {}
  }

  useEffect(() => {
    if (selectedLead) {
      updateDocumentStatusFromNextcloud()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead])

  useEffect(() => {
    if (!selectedLead) return
    const s = String(selectedLead.Estado || "")
    
    // Only auto-correct if status is empty/null (do NOT auto-correct 'Datos Incompletos' to allow manual overrides)
    if (s !== "" && s !== "null" && s !== "Incompleto") return

    if (isPersona1CompleteExceptCP(selectedLead)) {
      ;(async () => {
        console.log("[regla-cp] Auto-corrección en modal lead -> 'Datos Completos':", selectedLead.id)
        await updateLeadStatus(Number(selectedLead.id), "Datos Completos")
        setSelectedLead({ ...selectedLead, Estado: "Datos Completos" })
        setLeads((prev) => prev.map((l) => (String(l.id) === String(selectedLead.id) ? { ...l, Estado: "Datos Completos" } : l)))
      })()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLead])

  useEffect(() => {
    setVisitDateDialogOpen(false)
    setIsCommDialogOpen(false)
    setIsAvalDialogOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!inmobiliariaLoading && inmobiliariaId !== null) {
      const controller = new AbortController()
      const run = async () => {
        try {
          await fetchPlanStatus(controller.signal)
          await Promise.all([
            fetchAgentes(inmobiliariaId, controller.signal),
            fetchAdvertisements(controller.signal)
          ])
        } catch (err: any) {
          if (err?.name !== 'AbortError' && !err?.message?.includes('Abort')) {
            console.error("[v0] Error in plan/ads effect:", err)
          }
        }
      }
      run()
      return () => controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmobiliariaId, inmobiliariaLoading])

  useEffect(() => {
    if (!inmobiliariaLoading) {
      const controller = new AbortController()
      const run = async () => {
        try {
          if (inmobiliariaId !== null) {
            await fetchLeads(controller.signal)
          } else {
            setPlanInactive(false)
            await Promise.all([
              fetchAdvertisements(controller.signal),
              fetchLeads(controller.signal)
            ])
          }
        } catch (err: any) {
             if (err?.name !== 'AbortError' && !err?.message?.includes('Abort')) {
               console.error("[v0] Error in leads effect:", err)
             }
        }
      }
      run()
      return () => controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inmobiliariaId, inmobiliariaLoading, currentAgentId])

  useEffect(() => {
    const adId = searchParams.get("ad")
    const ref = searchParams.get("filter")
    const leadIdParam = searchParams.get("leadId")
    console.log("[nav] leads_filter_param", ref)
    const st = searchParams.get("status")
    console.log("[nav] leads_status_param", st)
    
    if (leadIdParam) {
      setSearchTerm(leadIdParam)
    }

    if (adId) {
      setSelectedAdvertisement(adId)
    } else if (ref && advertisements.length > 0) {
      const ad = advertisements.find((a) => a.Referencia === ref)
      if (ad) {
        console.log("[nav] leads_select_ad_by_ref", ad.ida)
        setSelectedAdvertisement(ad.ida)
      }
    }
    if (st) {
      if (st === "completos") {
        setStatusFilter(["Datos Completos"])
      } else if (st === "all") {
        setStatusFilter([])
      }
    }
  }, [searchParams, advertisements])

  // Effect to auto-open lead detail from URL param
  useEffect(() => {
    const leadIdParam = searchParams.get("leadId")
    if (leadIdParam && leads.length > 0 && !selectedLead) {
      const targetLead = leads.find((l) => String(l.id) === leadIdParam || String(l.IDC) === leadIdParam)
      if (targetLead) {
        openLeadDetail(targetLead)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, searchParams])

  useEffect(() => {
    filterLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, statusFilter, selectedAdvertisement, leads, advertisements])

  useEffect(() => {
    try {
      setAdsLoading(true)
      const t = setTimeout(() => setAdsLoading(false), 300)
      return () => clearTimeout(t)
    } catch {}
  }, [debouncedSearchTerm, statusFilter, selectedAdvertisement, advertisements])

  useEffect(() => {
    const t = setTimeout(() => {
      React.startTransition(() => {
        calculateMetrics()
      })
    }, 200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, selectedAdvertisement, advertisements])

  const calculateMetrics = () => {
    let leadsToAnalyze = leads

    // Filter by selected advertisement if one is selected
    if (selectedAdvertisement && selectedAdvertisement !== "all") {
      const selectedAd = advertisements.find((ad) => ad.ida === selectedAdvertisement)
      if (selectedAd && selectedAd.Referencia) {
        leadsToAnalyze = leads.filter((lead) => lead.Inmueble === selectedAd.Referencia)

        // Filter by activation date if available
        if (selectedAd.fecha_activacion) {
          const activationDate = new Date(selectedAd.fecha_activacion)
          if (!isNaN(activationDate.getTime())) {
            leadsToAnalyze = leadsToAnalyze.filter((lead) => {
              const leadDate = new Date(lead.created_at || Date.now())
              return leadDate >= activationDate
            })
          }
        }
      }
    }

    // Calculate date thresholds
    const now = new Date()
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Total Leads (last 30 days)
    const leadsLast30Days = leadsToAnalyze.filter((lead) => {
      const leadDate = new Date(lead.created_at || Date.now())
      return leadDate >= last30Days
    })
    setTotalLeads(leadsLast30Days.length)

    // Nuevos Hoy (last 24 hours)
    const leadsLast24Hours = leadsToAnalyze.filter((lead) => {
      const leadDate = new Date(lead.created_at || Date.now())
      return leadDate >= last24Hours
    })
    setNewLeadsToday(leadsLast24Hours.length)

    // Completados (leads with complete data created in last 24 hours)
    const completedLast24Hours = leadsToAnalyze.filter((lead) => {
      const leadDate = new Date(lead.created_at || Date.now())
      const isComplete = !!(
        lead.Nombre &&
        lead.Correo &&
        lead.Telefono &&
        lead.Ingresos &&
        lead.Inmueble &&
        lead.Estado
      )
      return isComplete && leadDate >= last24Hours
    })
    setCompletedLeads(completedLast24Hours.length)

    const completedTotal = leadsLast30Days.filter((lead) => {
      return !!(lead.Nombre && lead.Correo && lead.Telefono && lead.Ingresos && lead.Inmueble && lead.Estado)
    }).length
    const rate = leadsLast30Days.length > 0 ? Math.round((completedTotal / leadsLast30Days.length) * 100) : 0
    setConversionRate(rate)
  }

  const fetchPlanStatus = async (signal?: AbortSignal) => {
    try {
      if (!inmobiliariaId) return
      let inmoQuery = supabase
        .from("Inmobiliarias")
        .select("Plan, PlanResetAt, PlanNext, PlanNextEffectiveAt")
        .eq("idi", inmobiliariaId)
      
      if (signal) inmoQuery = inmoQuery.abortSignal(signal)
      
      const { data: inmobiliaria, error: inmobiliariaError } = await inmoQuery.maybeSingle()

      if (inmobiliariaError) throw inmobiliariaError
      if (signal?.aborted) return

      const planId = Number(inmobiliaria?.Plan) || 0
      setCurrentPlanId(planId)
      const scheduledId = Number(inmobiliaria?.PlanNext || 0)
      const scheduledAt = inmobiliaria?.PlanNextEffectiveAt ? new Date(inmobiliaria.PlanNextEffectiveAt) : null
      setScheduledPlanId(scheduledId)
      setScheduledEffectiveAt(scheduledAt)
      let limit = 1000000
      try {
        let planesQuery = supabase.from("Planes").select("*")
        if (signal) planesQuery = planesQuery.abortSignal(signal)
        const { data: planesData } = await planesQuery
        
        if (signal?.aborted) return

        if (planesData && planesData.length > 0) {
          const normalize = (p: any) => ({
            ...p,
            ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
          })
          const normalized = (planesData || []).map(normalize)
          const match = normalized.find((p: any) => p?.idp === planId || (p as any)?.id === planId)
          if (match) {
            limit = Number(match.ejecuciones) || 1000000
            setCurrentPlanName(String(match.Nombre || ""))
          } else {
            const fallback = getPlanData(planId)
            limit = fallback?.ejecuciones ?? 1000000
            setCurrentPlanName(String(fallback?.Nombre || ""))
          }
        } else {
          const fallback = getPlanData(planId)
          limit = fallback?.ejecuciones ?? 1000000
          setCurrentPlanName(String(fallback?.Nombre || ""))
        }
      } catch {
        const fallback = getPlanData(planId)
        limit = fallback?.ejecuciones ?? 1000000
        setCurrentPlanName(String(fallback?.Nombre || ""))
      }
      setPlanLimit(limit)
      const pr = inmobiliaria?.PlanResetAt ? new Date(inmobiliaria.PlanResetAt) : (() => {
        const now = new Date()
        return new Date(now.getFullYear(), now.getMonth(), 1)
      })()
      setPlanResetAt(pr)
      const prIso = pr.toISOString()
      let consumo = 0
      const dateFields = ["created_at", "fecha_creacion", "fecha_registro"]
      for (const field of dateFields) {
        if (signal?.aborted) break
        let q = supabase
          .from("Clientes")
          .select("*", { count: "exact", head: true })
          .gte(field, prIso)
          .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})
        
        if (signal) q = q.abortSignal(signal)
        
        const { count, error } = await q
        if (!error) {
          consumo = count || 0
          break
        }
      }
      
      if (signal?.aborted) return
      
      setTotalEjecuciones(consumo)
      const inactive = limit < 1000000 && consumo >= limit
      setPlanInactive(inactive)
      if (inactive && !adsPaused) {
        await enforceAdvertisementsPaused()
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('Abort')) {
        setPlanInactive(false)
      }
    }
  }

  const enforceAdvertisementsPaused = async () => {
    try {
      if (!inmobiliariaId && !isAdmin) return
      const { data: activeAds, error: listErr } = await supabase
        .from("Anuncios")
        .select("ida")
        .eq("usuario", inmobiliariaId)
        .eq("Activacion", "Activo")
      if (!listErr && Array.isArray(activeAds) && activeAds.length > 0) {
        let anySuccess = false
        for (const ad of activeAds) {
          const { error: updErr } = await supabase.from("Anuncios").update({ Activacion: "Pausado" }).eq("ida", ad.ida)
          if (!updErr) anySuccess = true
        }
        if (anySuccess) setAdsPaused(true)
      } else {
        const { error } = await supabase
          .from("Anuncios")
          .update({ Activacion: "Pausado" })
          .eq("usuario", inmobiliariaId)
          .eq("Activacion", "Activo")
        if (!error) setAdsPaused(true)
      }
      await fetchAdvertisements()
    } catch {}
  }

  const fetchAdvertisements = async (signal?: AbortSignal) => {
    try {
      setAdsLoading(true)
      let query = supabase.from("Anuncios").select("*").order("created_at", { ascending: false })
      if (inmobiliariaId) query = query.eq("usuario", inmobiliariaId)
      
      if (signal) query = query.abortSignal(signal)

      const { data: adsData, error: adsError } = await query

      if (adsError) throw adsError
      console.log("[v0] Advertisements fetched for leads page:", adsData?.length || 0)
      setAdvertisements(adsData || [])
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : String(err)
      if (/Abort|ERR_ABORTED/i.test(msg) || err?.name === 'AbortError') {
        console.log("[v0] Advertisements request aborted")
      } else {
        console.error("[v0] Error fetching advertisements:", err)
      }
    }
    finally {
      if (!signal?.aborted) setAdsLoading(false)
    }
  }

  const fetchLeads = async (signal?: AbortSignal) => {
    try {
      setLoading(true)
      console.log("[leads] fetchLeads:start", {
        inmobiliariaId,
        role,
        currentAgentId
      })

      let dataQuery = supabase
        .from("Clientes")
        .select("*, status_history")
        .order("created_at", { ascending: false })
        .range(0, 4999)
        .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})

      if (role === "agente" && !isAdmin) {
        if (currentAgentId) {
          // Agentes ven sus leads asignados o los que no tienen asignación
          dataQuery = dataQuery.or(`idag.eq.${currentAgentId},idag.is.null`)
        } else {
          // Si no tiene ID de agente (configuración incompleta), mostrar solo unassigned como fallback
          console.log("[RBAC] Agent has no ID (check email match), showing ONLY unassigned leads.")
          dataQuery = dataQuery.is("idag", null)
        }
      }
      
      if (signal) dataQuery = dataQuery.abortSignal(signal)

      // Get leads data
      const { data: leadsData, error: leadsError } = await dataQuery

      if (leadsError) throw leadsError
      console.log("[leads] leadsData:fetched", leadsData?.length || 0)

      let baseRows: any[] = (leadsData || []).map((lead: any) => {
        // Normalize virtual statuses
        const currentStatus = String(lead?.Estado || "").trim()
        const hasDate = Boolean(lead?.fecha_de_visita)
        const isCancelled = lead?.visita_completada === "cancelada"

        let effectiveStatus = (lead?.Estado || null)

        if (currentStatus === "Visita Propuesta" && hasDate) {
          effectiveStatus = "Visita Confirmada"
        }

        // Fix for cancelled visits showing as Visita Propuesta
        // If visit is cancelled, it should show as "Aprobado" (Aceptado), not Visita Propuesta
        if (isCancelled && (effectiveStatus === "Visita Propuesta" || effectiveStatus === "Visita Confirmada")) {
             effectiveStatus = "Aceptado"
        }

        return {
          ...lead,
          Estado: effectiveStatus,
          origen: lead?.origen ?? lead?.Origen ?? lead?.origin ?? null,
        }
      })
      
      console.log("[leads] processed baseRows:", { 
        total: baseRows.length,
        visitaConfirmada: baseRows.filter(l => l.Estado === "Visita Confirmada").length
      })
      
      if (signal?.aborted) return

      const hasInvalidDoc = (lead: any) => {
        return [
          isDocumentInvalid(lead?.Tipo_Documento, lead?.Documento),
          isDocumentInvalid(lead?.Tipo_Documento_2, lead?.Documento_2),
          isDocumentInvalid(lead?.Tipo_Documento_3, lead?.Documento_3),
          isDocumentInvalid(lead?.["Tipo_Documento 4"], lead?.Documento_4),
        ].some(Boolean)
      }
      const invalidToFix = baseRows.filter((lead: any) => {
        const s = String(lead?.Estado || "")
        return (s === "Datos Completos" || s === "Datos Completas" || s === "Pendiente" || s === "" || s === "null") && hasInvalidDoc(lead)
      })
      if (invalidToFix.length > 0) {
        try {
          await Promise.all(
            invalidToFix.map((lead: any) =>
              supabase.from("Clientes").update({ Estado: "Datos Incompletos" }).eq("id", lead.id)
            )
          )
          const invalidIds = new Set(invalidToFix.map((l: any) => String(l.id)))
          baseRows = baseRows.map((l: any) => (invalidIds.has(String(l.id)) ? { ...l, Estado: "Datos Incompletos" } : l))
        } catch (e) {
          console.error("[v0] Error corrigiendo estados inválidos:", e)
        }
      }

      const toCorrect = baseRows.filter((lead: any) => {
        const s = String(lead?.Estado || "")
        // Only auto-correct if status is empty/null or "Incompleto"
        // Do NOT overwrite "Datos Incompletos" to allow users to manually set it
        return (s === "Incompleto" || s === "" || s === "null") && isPersona1CompleteExceptCP(lead) && !hasInvalidDoc(lead)
      })
      console.log("[regla-cp] candidates_to_correct", toCorrect.length)
      if (toCorrect.length > 0) {
        try {
          console.log("[regla-cp] Corrigiendo leads a 'Datos Completos':", toCorrect.map((l: any) => l.id))
          await Promise.all(
            toCorrect.map((lead: any) =>
              supabase.from("Clientes").update({ Estado: "Datos Completos" }).eq("id", lead.id)
            )
          )
          const correctedIds = new Set(toCorrect.map((l: any) => String(l.id)))
          baseRows = baseRows.map((l: any) => (correctedIds.has(String(l.id)) ? { ...l, Estado: "Datos Completos" } : l))
          console.log("[regla-cp] corrected_count", correctedIds.size)
        } catch (e) {
          console.error("[v0] Error corrigiendo estados existentes:", e)
        }
      }

      let rows = baseRows
      if (planInactive) {
        const processed = new Set([
          "Datos Completos",
          "Validado",
          "Completado",
          "Aceptado",
          "Descartado",
          "Rechazado",
          "Visita Propuesta",
          "Visita Confirmada",
          "Visita Completada",
          "Pedir Aval"
        ])
        rows = rows.filter((lead: any) => processed.has(String(lead?.Estado || "")))
      }

      setLeads(rows)

        const statusOrder = [
          "Incompleto",
          "Datos Incompletos",
          "Datos Completos",
          "Pedir Aval",
          "Aceptado",
          "Visita Propuesta",
          "Visita Confirmada",
          "Descartado"
        ]

        const uniqueStatuses = Array.from(new Set((rows || []).map((lead) => {
          const currentStatus = String(lead.Estado || "").trim()
          const hasDate = Boolean(lead.fecha_de_visita)
          return (currentStatus === "Visita Propuesta" && hasDate) 
             ? "Visita Confirmada" 
             : currentStatus
        }).filter(Boolean)))
        
        uniqueStatuses.sort((a, b) => {
           const indexA = statusOrder.indexOf(a)
           const indexB = statusOrder.indexOf(b)
           
           if (indexA !== -1 && indexB !== -1) return indexA - indexB
           if (indexA !== -1) return -1
           if (indexB !== -1) return 1
           return a.localeCompare(b)
        })
        
        setAvailableStatuses(uniqueStatuses)
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : String(err)
      if (/Abort|ERR_ABORTED/i.test(msg) || err?.name === 'AbortError') {
        console.log("[v0] Leads request aborted")
      } else {
        console.error("[v0] Error fetching leads:", err)
        setError("Error al cargar los leads")
      }
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }

  const fetchCommunications = async (leadEmail: string | undefined, leadPhone: string | undefined, leadId?: number) => {
    try {
      if (!leadEmail && !leadPhone && !leadId) {
        setCommunications([])
        return
      }

      console.log("[v0] Fetching communications for Email:", leadEmail, "Phone:", leadPhone, "ID:", leadId)

      // Fetch emails
      let emailsQuery = supabase.from("Correos").select("*").in("Tipo", ["enviado", "recibido"])
      let runEmails = false

      if (leadEmail && leadId) {
        emailsQuery = emailsQuery.or(`Email.eq.${leadEmail},idc.eq.${leadId}`)
        runEmails = true
      } else if (leadEmail) {
        emailsQuery = emailsQuery.eq("Email", leadEmail)
        runEmails = true
      } else if (leadId) {
        emailsQuery = emailsQuery.eq("idc", leadId)
        runEmails = true
      }

      const emailsPromise = runEmails ? emailsQuery : Promise.resolve({ data: [], error: null })

      // Fetch WhatsApp
      let whatsappQuery = supabase.from("Whatsapp").select("*").in("Tipo", ["Enviado", "Recibido"])
      let runWhatsapp = false

      if (leadPhone && leadId) {
         whatsappQuery = whatsappQuery.or(`Telefono.eq.${leadPhone},IDC.eq.${leadId},idc.eq.${leadId}`)
         runWhatsapp = true
      } else if (leadPhone) {
         whatsappQuery = whatsappQuery.eq("Telefono", leadPhone)
         runWhatsapp = true
      } else if (leadId) {
         whatsappQuery = whatsappQuery.or(`IDC.eq.${leadId},idc.eq.${leadId}`)
         runWhatsapp = true
      }

      const whatsappPromise = runWhatsapp ? whatsappQuery : Promise.resolve({ data: [], error: null })

      const [emailsResult, whatsappResult] = await Promise.all([emailsPromise, whatsappPromise])

      if (emailsResult.error) {
        console.error("Error fetching emails:", emailsResult.error)
      }

      if (whatsappResult.error) {
        console.error("Error fetching WhatsApp messages:", whatsappResult.error)
      }

      console.log("[v0] Emails fetched:", emailsResult.data?.length || 0)
      console.log("[v0] WhatsApp messages fetched:", whatsappResult.data?.length || 0)

      // Add source field to distinguish between emails and WhatsApp
      const emails = (emailsResult.data || []).map((item) => ({
        ...item,
        source: "email" as const,
      }))

      const whatsapps = (whatsappResult.data || []).map((item) => ({
        ...item,
        source: "whatsapp" as const,
        // Map WhatsApp fields to Communication interface fields
        Mensaje: item.Mensaje,
        From: item.From,
        to: item.to,
        created_at: item.created_at,
        id: item.id,
        Tipo: item.Tipo,
      }))

      // Combine and sort by created_at descending
      const allCommunications = [...emails, ...whatsapps].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )

      console.log("[v0] Total communications:", allCommunications.length)
      setCommunications(allCommunications)
    } catch (err) {
      console.error("[v0] Error fetching communications:", err)
    }
  }

  const openCommunicationDetail = (comm: Communication) => {
    if (planInactive) {
      toast({
        title: "Plan inactivo",
        description: "Has alcanzado el límite del plan. No puedes abrir mensajes.",
        variant: "destructive",
      })
      return
    }
    setSelectedCommunication(comm)
    setIsCommDialogOpen(true)
  }

  const isCommunicationSent = (comm: Communication) => {
    if (comm.source === "whatsapp") {
      return comm.Tipo === "Enviado"
    }
    return comm.Tipo === "enviado" || (comm.source === "email" && comm.From?.includes(inmobiliariaNombre || ""))
  }

  const cleanHtmlForPreview = (html?: string) => {
    if (!html) return ""
    let s = String(html)
    s = s.replace(/<script[\s\S]*?<\/script>/gi, "")
    s = s.replace(/<style[\s\S]*?<\/style>/gi, "")
    s = s.replace(/<!--[\s\S]*?-->/g, "")
    s = s.replace(/<head[\s\S]*?<\/head>/gi, "")
    s = s.replace(/<br\s*\/?>/gi, "\n")
    s = s.replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    s = s.replace(/<(p|div|li|h[1-6])[^>]*>/gi, "")
    s = s.replace(/<[^>]*>/g, "")
    s = s.replace(/\r/g, "")
    s = s.replace(/\n{2,}/g, "\n")
    s = s.replace(/&nbsp;/g, " ")
    s = s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    s = s.replace(/[ \t]{2,}/g, " ")
    return s.trim()
  }

  const getWhatsAppTitleAndBody = (html?: string) => {
    const text = cleanHtmlForPreview(html)
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
    const title = lines[0] || "Mensaje de WhatsApp"
    const body = lines.slice(1).join(" ")
    return { title, body }
  }

  const reactivateAdvertisement = async () => {
    if (!advertisementToReactivate) return

    try {
      // Fetch to check history
      const { data: currentAd } = await supabase.from("Anuncios").select("fecha_activacion").eq("ida", advertisementToReactivate.ida).single()

      const updates: any = { Activacion: "Activo" }
      if (!currentAd?.fecha_activacion) {
        updates.fecha_activacion = new Date().toISOString()
      }

      const { error } = await supabase
        .from("Anuncios")
        .update(updates)
        .eq("ida", advertisementToReactivate.ida)

      if (error) throw error

      console.log("[v0] Advertisement reactivated successfully")

      // Update local state
      setAdvertisements(
        advertisements.map((ad) => (ad.ida === advertisementToReactivate.ida ? { ...ad, Activacion: "Activo" } : ad)),
      )

      setIsReactivateDialogOpen(false)
      setAdvertisementToReactivate(null)

      // Refresh advertisements
      await fetchAdvertisements()
    } catch (err) {
      console.error("[v0] Error reactivating advertisement:", err)
      alert("Error al reactivar el anuncio. Por favor, intenta de nuevo.")
    }
  }

  const filterLeads = () => {
    let filtered = leads

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase()
      const toLowerStr = (v: unknown) => String(v ?? "").toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          toLowerStr(lead.Nombre).includes(term) ||
          toLowerStr(lead.Correo).includes(term) ||
          toLowerStr(lead.Telefono).includes(term) ||
          toLowerStr(lead.Inmueble).includes(term) ||
          toLowerStr((lead as any).id).includes(term) ||
          toLowerStr((lead as any).idc).includes(term) ||
          toLowerStr((lead as any).IDC).includes(term),
      )
    }

    if (statusFilter.length > 0) {
      filtered = filtered.filter((lead) => {
        const currentStatus = String(lead.Estado || "").trim()
        const hasDate = Boolean(lead.fecha_de_visita)
        const effectiveStatus = (currentStatus === "Visita Propuesta" && hasDate) 
           ? "Visita Confirmada" 
           : currentStatus
        
        return statusFilter.includes(effectiveStatus)
      })
    }

    if (planInactive) {
      const processed = new Set([
        "Datos Completos",
        "Validado",
        "Completado",
        "Aceptado",
        "Descartado",
        "Rechazado",
        "Visita Propuesta",
      ])
      filtered = filtered.filter((lead) => processed.has(String(lead.Estado || "")))
    }

    if (selectedAdvertisement && selectedAdvertisement !== "all") {
      const selectedAd = advertisements.find((ad) => ad.ida === selectedAdvertisement)
      if (selectedAd && selectedAd.Referencia) {
        filtered = filtered.filter((lead) => lead.Inmueble === selectedAd.Referencia)
      }
    }

    React.startTransition(() => setFilteredLeads(filtered))
  }

  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead)
    setEditFormData(lead)
    setIsEditingPersonalInfo(false)
    // Reset selected persona to 1 when opening a new lead
    setSelectedPersona(1)
    if (lead.Correo || lead.Telefono || lead.IDC || lead.idc) {
      // Changed from lead.idc to lead.Telefono
      await fetchCommunications(lead.Correo, lead.Telefono, lead.IDC || lead.idc) // Changed from lead.idc to lead.Telefono
    }
  }

  const handleCloseModal = () => {
    setSelectedLead(null)
    const params = new URLSearchParams(searchParams.toString())
    if (params.has("leadId")) {
      params.delete("leadId")
      router.replace(`${pathname}?${params.toString()}`)
    }
  }


  const savePersonalInfo = async () => {
    if (!selectedLead || !editFormData) return

    try {
      // Logic to preserve old email in correo_proxy
      let finalCorreoProxy = editFormData.correo_proxy;
      if (selectedLead.Correo && editFormData.Correo && selectedLead.Correo !== editFormData.Correo) {
        if (!finalCorreoProxy) {
          finalCorreoProxy = selectedLead.Correo;
        }
      }

      const { error } = await supabase
        .from("Clientes")
        .update({
          Nombre: editFormData.Nombre,
          Correo: editFormData.Correo,
          correo_proxy: finalCorreoProxy,
          Telefono: editFormData.Telefono,
          Ingresos: editFormData.Ingresos,
          Inmueble: editFormData.Inmueble,
          Pais: editFormData.Pais,
          Codigo_Postal: editFormData.Codigo_Postal,
          Tipo_Documento: editFormData.Tipo_Documento,
          Documento: editFormData.Documento,
          Obsevaciones: editFormData.Observaciones ?? editFormData.Obsevaciones,
          // Update persona-specific fields based on selectedPersona
          ...(selectedPersona === 1 && {
            Persona_2: editFormData.Persona_2, // Only update if editing persona 1
            Tipo_Documento_2: editFormData.Tipo_Documento_2,
            Documento_2: editFormData.Documento_2,
            Pais_2: editFormData.Pais_2,
            Ingresos_2: editFormData.Ingresos_2,
            "Correo 2": editFormData["Correo 2"],
            "Telefono 2": editFormData["Telefono 2"],
            "Codigo_Postal 2": editFormData["Codigo_Postal 2"],
            tipo2: editFormData.tipo2,

            Persona_3: editFormData.Persona_3,
            Tipo_Documento_3: editFormData.Tipo_Documento_3,
            Documento_3: editFormData.Documento_3,
            Ingresos_3: editFormData.Ingresos_3,
            "Correo 3": editFormData["Correo 3"],
            "Telefono 3": editFormData["Telefono 3"],
            "Codigo_Postal 3": editFormData["Codigo_Postal 3"],
            tipo3: editFormData.tipo3,

            Persona_4: editFormData.Persona_4,
            "Tipo_Documento 4": editFormData["Tipo_Documento 4"],
            Documento_4: editFormData.Documento_4,
            "Pais 4": editFormData["Pais 4"],
            Ingresos_4: editFormData.Ingresos_4,
            "Correo 4": editFormData["Correo 4"],
            "Telefono 4": editFormData["Telefono 4"],
            "Codigo_Postal 4": editFormData["Codigo_Postal 4"],
            tipo4: editFormData.tipo4,
          }),
          ...(selectedPersona === 2 && {
            Persona_2: editFormData.Persona_2,
            Tipo_Documento_2: editFormData.Tipo_Documento_2,
            Documento_2: editFormData.Documento_2,
            Pais_2: editFormData.Pais_2,
            Ingresos_2: editFormData.Ingresos_2,
            "Correo 2": editFormData["Correo 2"],
            "Telefono 2": editFormData["Telefono 2"],
            "Codigo_Postal 2": editFormData["Codigo_Postal 2"],
            tipo2: editFormData.tipo2,
          }),
          ...(selectedPersona === 3 && {
            Persona_3: editFormData.Persona_3,
            Tipo_Documento_3: editFormData.Tipo_Documento_3,
            Documento_3: editFormData.Documento_3,
            Ingresos_3: editFormData.Ingresos_3,
            "Correo 3": editFormData["Correo 3"],
            "Telefono 3": editFormData["Telefono 3"],
            "Codigo_Postal 3": editFormData["Codigo_Postal 3"],
            tipo3: editFormData.tipo3,
          }),
          ...(selectedPersona === 4 && {
            Persona_4: editFormData.Persona_4,
            "Tipo_Documento 4": editFormData["Tipo_Documento 4"],
            Documento_4: editFormData.Documento_4,
            "Pais 4": editFormData["Pais 4"],
            Ingresos_4: editFormData.Ingresos_4,
            "Correo 4": editFormData["Correo 4"],
            "Telefono 4": editFormData["Telefono 4"],
            "Codigo_Postal 4": editFormData["Codigo_Postal 4"],
            tipo4: editFormData.tipo4,
          }),
        })
        .eq("id", selectedLead.id)

      if (error) throw error

      const mergedObservaciones = editFormData.Observaciones ?? editFormData.Obsevaciones
      const updatedLead = { ...selectedLead, ...editFormData, Observaciones: mergedObservaciones, Obsevaciones: mergedObservaciones }
      setSelectedLead(updatedLead)
      setLeads(leads.map((lead) => (lead.id === selectedLead.id ? updatedLead : lead)))
      setIsEditingPersonalInfo(false)

      const hasInvalidDoc = [
        isDocumentInvalid(updatedLead.Tipo_Documento, updatedLead.Documento),
        isDocumentInvalid(updatedLead.Tipo_Documento_2, updatedLead.Documento_2),
        isDocumentInvalid(updatedLead.Tipo_Documento_3, updatedLead.Documento_3),
        isDocumentInvalid(updatedLead["Tipo_Documento 4"], updatedLead.Documento_4),
      ].some(Boolean)
      if (hasInvalidDoc) {
        await updateLeadStatus(Number(selectedLead.id), "Datos Incompletos")
        setSelectedLead({ ...updatedLead, Estado: "Datos Incompletos" })
      } else if (isPersona1CompleteExceptCP(updatedLead)) {
        // Only auto-upgrade to 'Datos Completos' if the status was previously empty, null, or 'Incompleto'
        // Do not overwrite manual 'Datos Incompletos' or advanced statuses
        const s = String(selectedLead.Estado || "")
        if (s === "" || s === "null" || s === "Incompleto") {
          await updateLeadStatus(Number(selectedLead.id), "Datos Completos")
          setSelectedLead({ ...updatedLead, Estado: "Datos Completos" })
        } else {
          setSelectedLead(updatedLead)
        }
      }

      console.log("[v0] Personal information updated successfully")
    } catch (err) {
      console.error("[v0] Error updating personal information:", err)
    }
  }

  const cancelEdit = () => {
    setEditFormData(selectedLead || {})
    setIsEditingPersonalInfo(false)
  }

  const startEditingEntryDate = () => {
    if (!selectedLead) return
    const isImmediate = selectedLead.prev_entrada?.toLowerCase() === "inmediatamente"
    setEntryDateType(isImmediate ? "Inmediatamente" : "Mas adelante")
    if (selectedLead.fecha_prev_entrada) {
      try {
        const d = new Date(selectedLead.fecha_prev_entrada)
        if (!isNaN(d.getTime())) {
          setCustomEntryDate(d.toISOString().split('T')[0])
        } else {
          setCustomEntryDate("")
        }
      } catch (e) {
        setCustomEntryDate("")
      }
    } else {
      setCustomEntryDate("")
    }
    setIsEditingEntryDate(true)
  }

  const saveEntryDate = async () => {
    if (!selectedLead) return
    
    try {
      const updateData: any = {}
      if (entryDateType === "Inmediatamente") {
        updateData.prev_entrada = "Inmediatamente"
        updateData.fecha_prev_entrada = null
      } else {
        updateData.prev_entrada = "Mas adelante"
        if (!customEntryDate) {
          toast({ title: "Faltan datos", description: "Selecciona una fecha", variant: "destructive" })
          return
        }
        updateData.fecha_prev_entrada = customEntryDate
      }
  
      const { error } = await supabase
        .from("Clientes")
        .update(updateData)
        .eq("id", selectedLead.id)
  
      if (error) throw error
  
      const updatedLead = { ...selectedLead, ...updateData }
      
      // Update local state
      setSelectedLead(updatedLead as Lead)
      setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead as Lead : l))
      setFilteredLeads(filteredLeads.map(l => l.id === updatedLead.id ? updatedLead as Lead : l))
      
      setIsEditingEntryDate(false)
      toast({ title: "Guardado", description: "Fecha de entrada actualizada" })
    } catch (err) {
      console.error("Error updating entry date:", err)
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
    }
  }

  const updateLeadStatus = async (leadId: number, newStatus: string) => {
    // Intercept "Visita Propuesta" or "Visita Confirmada" to force dialog flow
    if (newStatus === "Visita Propuesta" || newStatus === "Visita Confirmada") {
      const lead = leads.find(l => String(l.id) === String(leadId))
      if (lead) {
          console.log("[v0] updateLeadStatus: Visita Propuesta/Confirmada selected. Opening dialog.")
          setSelectedLeadForVisit(lead)
          setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
          setIsAgentSelectionOnly(true)
          setVisitDateDialogOpen(true)
      }
      return // Stop here. Do not update Supabase yet.
    }

    // For other statuses, open confirmation dialog
    setPendingSingleStatus({ id: leadId, status: newStatus })
    setSingleStatusConfirmOpen(true)
  }

  const sendDescartadoWebhook = async (payload: any) => {
    try {
      await fetch("https://acesalquiler-n8n.igc7oi.easypanel.host/webhook/descartado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
    } catch (err) {
      console.error("[v0] Error calling descartado webhook:", err)
    }
  }

  const executeSingleStatusChange = async () => {
    if (!pendingSingleStatus) return
    const { id, status } = pendingSingleStatus

    try {
      let lead = leads.find(l => String(l.id) === String(id))
      // Fallback to selectedLead if not found in list
      if (!lead && selectedLead && String(selectedLead.id) === String(id)) {
          lead = selectedLead
      }

      const updateData: any = { Estado: status }

      // History tracking
      const historyEntry: LeadHistoryEntry = {
        status: status,
        timestamp: new Date().toISOString(),
        agent_id: currentUser?.id,
        agent_name: currentUser?.email
      }

      if (currentUser?.email && agentes.length > 0) {
        const matched = agentes.find(a => a.Email === currentUser.email)
        if (matched) historyEntry.agent_name = matched.Nombre || matched.nombre || matched.Email
      }

      const currentHistory = (lead?.status_history as LeadHistoryEntry[]) || []
      const updatedHistory = [...currentHistory, historyEntry]
      updateData.status_history = updatedHistory

      // Visit cancellation logic
      const previousStatuses = ["Datos Incompletos", "Datos Completos", "Necesidad de Aval", "Pedir Aval", "Aceptado"]
      if (lead && lead.Estado === "Visita Propuesta" && previousStatuses.includes(status)) {
         updateData.visita_completada = "cancelada"
         updateData.fecha_de_visita = null
      }

      const { error } = await supabase.from("Clientes").update(updateData).eq("id", id)

      if (error) throw error

      const updatedLeadForWebhook = lead ? { ...lead, ...updateData } : { id, ...updateData }
      if (status === "Descartado") {
        await sendDescartadoWebhook({
          leadId: id,
          Estado: "Descartado",
          lead: updatedLeadForWebhook,
          source: "leads-single",
          timestamp: new Date().toISOString()
        })
      }

      // Update local state
      setLeads(leads.map((l) => (String(l.id) === String(id) ? { ...l, ...updateData } : l)))

      // Update selectedLead if it matches the modified lead
      setSelectedLead((prev) => {
        if (!prev) return prev
        if (String(prev.id) !== String(id)) return prev
        return { ...prev, ...updateData }
      })

      toast({
         title: "Estado actualizado",
         description: `Estado cambiado a ${status === "Aceptado" ? "Aprobado" : status}`,
      })

      console.log("[v0] Lead status updated successfully")
    } catch (err) {
      console.error("[v0] Error updating lead status:", err)
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    } finally {
      setSingleStatusConfirmOpen(false)
      setPendingSingleStatus(null)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Validado":
        return "bg-green-100 text-green-800"
      case "Completado":
        return "bg-blue-100 text-blue-800"
      case "Pendiente":
        return "bg-yellow-100 text-yellow-800"
      case "Rechazado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Added "Datos Completos" and "Datos Incompletos" cases with appropriate colors.
  const getStatusColors = (estado: string | null | undefined) => {
    switch (estado) {
      case "Datos Completos":
      case "Completo":
        return {
          bg: "#dcfce7",
          border: "#22c55e",
          text: "#16a34a",
          label: "Datos Completos",
        }
      case "Incompleto":
      case "Datos Incompletos":
        return {
          bg: "#F8FBF8",
          border: "#f59e0b",
          text: "#92400e",
          label: estado === "Incompleto" ? "Incompleto" : "Datos Incompletos",
        }
      case "Validado":
        return {
          bg: "#dbeafe",
          border: "#3b82f6",
          text: "#2563eb",
          label: estado,
        }
      case "Pendiente":
        return {
          bg: "#fef3c7",
          border: "#f59e0b",
          text: "#d97706",
          label: estado,
        }
      case "Rechazado":
        return {
          bg: "#fee2e2",
          border: "#ef4444",
          text: "#dc2626",
          label: estado,
        }
      case "Pedir Aval":
        return {
          bg: "#f3e8ff",
          border: "#a855f7",
          text: "#9333ea",
          label: "Aval Pedido",
        }

    case "Visita Propuesta":
      return {
        bg: "#dbeafe",
        border: "#3b82f6",
        text: "#2563eb",
        label: "Visita Propuesta",
      }

    case "Visita Confirmada":
      return {
        bg: "#e0e7ff", // indigo-100
        border: "#6366f1", // indigo-500
        text: "#4338ca", // indigo-700
        label: "Visita Confirmada",
      }

    case "Visita Completada":
      return {
        bg: "#f3e8ff", // purple-100
        border: "#a855f7", // purple-500
        text: "#7e22ce", // purple-700
        label: "Visita Completada",
      }
    
    case "Aceptado":
        return {
          bg: "#d1fae5",
          border: "#10b981",
          text: "#059669",
          label: "Aprobado",
        }
      
        case "Descartado":
          return {
            bg: "#f3f4f6",
            border: "#9ca3af",
            text: "#6b7280",
            label: estado,
          }
        default:
          // For any other Estado value, use neutral colors but display the actual value
          return {
            bg: "#f3f4f6",
            border: "#9ca3af",
            text: "#374151",
            label: estado || "Sin Estado",
          }
      }
    }

    const calculateCompleteness = (lead: Lead) => {
      let totalFields = 10 // Base fields for main person
      let filledFields = 0

      // Main person fields (10 fields)
      const mainFields = [
        lead.Nombre,
        lead.Correo,
        lead.Telefono,
        lead.Documento,
        lead.Tipo_Documento,
        lead.Codigo_Postal,
        lead.Pais,
        lead.Ingresos,
        lead.Fecha_Entrada,
        lead.Inmueble,
      ]
      filledFields += mainFields.filter((field) => field !== null && field !== undefined && field !== "").length

      // Persona 2 fields (8 fields) - only count if Persona_2 name exists
      if (lead.Persona_2) {
        const persona2Fields = [
          lead.Persona_2,
          lead.Pais_2,
          lead.Ingresos_2,
          lead.Tipo_Documento_2,
          lead.Documento_2,
          lead["Correo 2"],
          lead["Telefono 2"],
          lead["Codigo_Postal 2"],
        ]
        totalFields += 8
        filledFields += persona2Fields.filter((field) => field !== null && field !== undefined && field !== "").length
      }

      // Persona 3 fields (7 fields) - only count if Persona_3 name exists
      if (lead.Persona_3) {
        const persona3Fields = [
          lead.Persona_3,
          lead.Ingresos_3,
          lead.Tipo_Documento_3,
          lead.Documento_3,
          lead["Correo 3"],
          lead["Telefono 3"],
          lead["Codigo_Postal 3"],
        ]
        totalFields += 7
        filledFields += persona3Fields.filter((field) => field !== null && field !== undefined && field !== "").length
      }

      // Persona 4 (AVAL) fields (8 fields) - only count if Persona_4 name exists
      if (lead.Persona_4) {
        const persona4Fields = [
          lead.Persona_4,
          lead["Pais 4"],
          lead.Ingresos_4,
          lead["Tipo_Documento 4"],
          lead.Documento_4,
          lead["Correo 4"],
          lead["Telefono 4"],
          lead["Codigo_Postal 4"],
        ]
        totalFields += 8
        filledFields += persona4Fields.filter((field) => field !== null && field !== undefined && field !== "").length
      }

      const percentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0
      return { percentage, filledFields, totalFields }
    }

    const isPersona1CompleteExceptCP = (lead: Lead) => {
      const requiredStrings = [
        lead.Nombre,
        lead.Correo,
        lead.Telefono,
        lead.Documento,
        lead.Tipo_Documento,
        lead.Pais,
      ]
      const stringsOk = requiredStrings.every((field) => field !== null && field !== undefined && String(field).trim() !== "")
      const ingresosOk = typeof lead.Ingresos === "number" ? lead.Ingresos > 0 : String(lead.Ingresos || "").trim() !== ""
      const docInvalid = isDocumentInvalid(lead.Tipo_Documento, lead.Documento)
      return stringsOk && ingresosOk && !docInvalid
    }

    const countPersonas = (lead: Lead) => {
      let count = 1 // Always at least Persona 1
      if (lead.Persona_2) count++
      if (lead.Persona_3) count++
      if (lead.Persona_4) count++ // Count Persona 4 (Aval)
      return count
    }

    const calculateIAScore = (lead: Lead) => {
      let score = 0
      if (lead.Nombre) score += 20
      if (lead.Correo) score += 20
      if (lead.Telefono) score += 20
      if (lead.Ingresos && lead.Ingresos > 0) score += 25
      if (lead.Documento) score += 15
      return Math.min(score, 100)
    }

    const formatCurrency = (amount?: number) => {
      if (!amount || amount === 0) return "- €"
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
      }).format(amount)
    }



    const getDaysAgo = (dateString?: string) => {
      if (!dateString) return "N/A"
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0) return "Hoy"
      if (diffDays === 1) return "Ayer"
      return `Hace ${diffDays} días`
    }

    const getLastCommunication = () => {
      if (communications.length === 0) return null

      const lastComm = communications[0] // Already sorted by created_at desc
      const daysAgo = getDaysAgo(lastComm.created_at)
      // Check if it's an email sent by the current inmobiliaria or a WhatsApp message
      const isSent =
        lastComm.source === "email"
          ? lastComm.From?.includes(inmobiliariaNombre || "")
          : lastComm.source === "whatsapp" && lastComm.Tipo === "Enviado" // Changed from "enviado" to "Enviado" for WhatsApp

      return {
        daysAgo,
        type: isSent ? "enviado" : "recibido",
        isSent,
      }
    }

    const updateDocumentStatus = (docType: string, status: "pending" | "verified" | "not_verified") => {
      setDocumentStatus((prev) => ({
        ...prev,
        [docType]: status,
      }))
    }

    const createNewLead = async () => {
      if (!newLeadFormData.Nombre) {
        alert("Por favor, completa el nombre")
        return
      }

      if (!newLeadFormData.Correo && !newLeadFormData.Telefono) {
        alert("Por favor, completa el teléfono o el correo electrónico")
        return
      }

      if (!newLeadFormData.Inmueble) {
        alert("Por favor, selecciona un inmueble")
        return
      }

      try {
        setIsSubmittingNewLead(true)

        // Get current user for history tracking
        const { data: { user: currentUser } } = await supabase.auth.getUser()

        const { Observaciones, Obsevaciones, ...restLeadData } = newLeadFormData
        
        const docInvalid = isDocumentInvalid(newLeadFormData.Tipo_Documento, newLeadFormData.Documento)
        const initialStatus = docInvalid ? "Datos Incompletos" : newLeadFormData.Estado || "Pendiente"
        const initialHistoryEntry = {
          status: initialStatus,
          timestamp: new Date().toISOString(),
          agent_id: currentUser?.id,
          agent_name: userEmail || currentUser?.email
        }

        const leadData = {
          ...restLeadData,
          Estado: initialStatus,
          ...(Observaciones || Obsevaciones ? { Obsevaciones: Observaciones ?? Obsevaciones } : {}),
          usuario: inmobiliariaId,
          created_at: new Date().toISOString(),
          status_history: [initialHistoryEntry]
        }

        const { data, error } = await createLeadAction(leadData)

        if (error) throw new Error(typeof error === 'string' ? error : JSON.stringify(error))

        console.log("[v0] New lead created successfully:", data)

        // Add the new lead to the list
        if (data && data.length > 0) {
          const created = data[0] as Lead
          if (isPersona1CompleteExceptCP(created)) {
            await updateLeadStatus(Number(created.id), "Datos Completos")
            created.Estado = "Datos Completos"
          }
          setLeads([created, ...leads])
        }

        // Reset form and close dialog
        setNewLeadFormData({
          Estado: "Pendiente",
          "Pedir Aval": false,
        })
        setIsNewLeadDialogOpen(false)

        // Refresh leads
        fetchLeads()
      } catch (err) {
        console.error("[v0] Error creating new lead:", err)
        alert("Error al crear el lead. Por favor, intenta de nuevo.")
      } finally {
        setIsSubmittingNewLead(false)
      }
    }

    const getDocumentBadge = (status: "pending" | "verified" | "not_verified") => {
      switch (status) {
        case "verified":
          return { className: "bg-green-100 text-green-800 border-green-200 text-xs", text: "✓ Verificado" }
        case "pending":
          return { className: "bg-yellow-100 text-yellow-800 border-yellow-200 text-xs", text: "⏳ Pendiente" }
        case "not_verified":
          return { className: "bg-red-100 text-red-800 border-red-200 text-xs", text: "✗ No verificado" }
        default:
          return { className: "bg-gray-100 text-gray-800 border-gray-200 text-xs", text: "Sin estado" }
      }
    }

    const isLeadComplete = (lead: Lead) => {
      const checks = {
        hasNombre: !!lead.Nombre?.trim(),
        hasCorreo: !!lead.Correo?.trim(),
        hasTelefono: !!lead.Telefono?.trim(),
        hasIngresos: !!(lead.Ingresos && lead.Ingresos > 0),
        hasInmueble: !!lead.Inmueble?.trim(),
      }

      return Object.values(checks).every(Boolean)
    }

    // FIX: Declare openAvalDialog function
    const openAvalDialog = () => {
      if (!selectedLead) return

      // Find the advertisement details to get the rent price
      let actualRent: number | null = null
      if (selectedLead.Inmueble) {
        const ad = advertisements.find((ad) => ad.Referencia === selectedLead.Inmueble)
        actualRent = ad?.Precio || null
      }

      // Calculate total income from all personas
      const persona1Income = selectedLead.Ingresos || 0
      const persona2Income = selectedLead.Ingresos_2 || 0
      const persona3Income = selectedLead.Ingresos_3 || 0
      const persona4Income = selectedLead.Ingresos_4 || 0 // Income from Persona 4 (Aval)
      const totalIncome = persona1Income + persona2Income + persona3Income + persona4Income

      // Calculate required income thresholds
      const minRequiredIncome = actualRent ? actualRent * 2.5 : null // 40% ratio (rent should be max 40% of income)
      const idealIncome = actualRent ? actualRent * 3.33 : null // 30% ratio (rent should be ideally 30% of income)

      // Calculate if aval is needed: total income must be at least 2.5x the rent
      const needsAval = actualRent ? totalIncome < minRequiredIncome! : false

      // Calculate what percentage of income the rent represents
      const incomeRatio = actualRent && totalIncome > 0 ? (actualRent / totalIncome) * 100 : null

      setAvalCalculation({
        income: totalIncome,
        persona1Income,
        persona2Income,
        persona3Income,
        persona4Income, // Include Persona 4 income
        actualRent,
        minRequiredIncome,
        idealIncome,
        needsAval,
        incomeRatio,
      })
      setIsAvalDialogOpen(true)
    }

    // FIX: Added copyToClipboard function
    const copyToClipboard = async (text: string, fieldName: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopiedField(fieldName)
        toast({
          title: "Copiado",
          description: `${fieldName} copiado al portapapeles`,
        })
        setTimeout(() => setCopiedField(null), 2000)
      } catch (err) {
        toast({
          title: "Error",
          description: "No se pudo copiar al portapapeles",
          variant: "destructive",
        })
      }
    }

    const updateBulkLeadStatus = async (newStatus: Lead["Estado"]) => {
      setPendingBulkStatus(newStatus)
      setBulkConfirmationOpen(true)
    }

    const executeBulkStatusChange = async () => {
      if (!pendingBulkStatus) return

      const updateData: any = { Estado: pendingBulkStatus }
      const targetStatuses = ["Datos Incompletos", "Datos Completos", "Necesidad de Aval", "Pedir Aval", "Aceptado"];
      
      if (targetStatuses.includes(pendingBulkStatus)) {
        updateData.visita_completada = "cancelada"
        updateData.fecha_de_visita = null
      }

      // History tracking
      const historyEntry: LeadHistoryEntry = {
        status: pendingBulkStatus,
        timestamp: new Date().toISOString(),
        agent_id: currentUser?.id,
        agent_name: currentUser?.email
      }

      if (currentUser?.email && agentes.length > 0) {
        const matched = agentes.find(a => a.Email === currentUser.email)
        if (matched) historyEntry.agent_name = matched.Nombre || matched.nombre || matched.Email
      }

      // Perform updates individually to preserve history
      const updates = selectedLeadIds.map(async (id) => {
        const lead = leads.find(l => String(l.id) === String(id))
        const currentHistory = (lead?.status_history as LeadHistoryEntry[]) || []
        const updatedHistory = [...currentHistory, historyEntry]
        
        const rowUpdateData = { ...updateData, status_history: updatedHistory }
        return supabase.from("Clientes").update(rowUpdateData).eq("id", id)
      })

      const results = await Promise.all(updates)
      const successIds: string[] = []
      const failedIds: string[] = []

      results.forEach((r, index) => {
        if (r.error) {
          failedIds.push(selectedLeadIds[index])
          console.error(`[bulk-update] Error updating lead ${selectedLeadIds[index]}:`, r.error)
        } else {
          successIds.push(selectedLeadIds[index])
        }
      })

      if (failedIds.length > 0) {
        toast({
          title: successIds.length > 0 ? "Actualización parcial" : "Error",
          description: `Se actualizaron ${successIds.length} leads. Fallaron ${failedIds.length}. Revise la consola para más detalles.`,
          variant: "destructive",
        })
      }

      if (successIds.length === 0) {
        return
      }

      if (pendingBulkStatus === "Descartado") {
        const timestamp = new Date().toISOString()
        const payloads = successIds.map((id) => {
          const lead = leads.find((l) => String(l.id) === String(id))
          const currentHistory = (lead?.status_history as LeadHistoryEntry[]) || []
          return {
            leadId: id,
            Estado: "Descartado",
            lead: lead
              ? { ...lead, ...updateData, status_history: [...currentHistory, historyEntry] }
              : { id, ...updateData, status_history: [historyEntry] },
            source: "leads-bulk",
            timestamp
          }
        })
        await Promise.all(payloads.map((payload) => sendDescartadoWebhook(payload)))
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) => {
           if (successIds.includes(String(lead.id))) {
              const currentHistory = (lead.status_history as LeadHistoryEntry[]) || []
              return { 
                ...lead, 
                ...updateData, 
                status_history: [...currentHistory, historyEntry] 
              }
           }
           return lead
        }),
      )

      if (successIds.length > 0) {
        toast({
          title: "Estado actualizado",
          description: `Se actualizó el estado de ${successIds.length} lead(s) a ${pendingBulkStatus === "Aceptado" ? "Aprobado" : pendingBulkStatus}`,
        })
      }

      setSelectedLeadIds([])
      setIsBulkSelectionMode(false)
      setBulkConfirmationOpen(false)
      setPendingBulkStatus(null)
    }

    const toggleLeadInConfirmation = (leadId: string) => {
      setSelectedLeadIds((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]))
    }

    const toggleLeadSelection = (leadId: string) => {
      setSelectedLeadIds((prev) => (prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]))
    }

    const toggleSelectAll = () => {
      if (selectedLeadIds.length === filteredLeads.length) {
        setSelectedLeadIds([])
      } else {
        setSelectedLeadIds(filteredLeads.map((lead) => lead.id))
      }
    }

    const getFutureAvailability = async (agentId: number, lead: Lead, days = 7) => {
      if (!agentId) return []
      
      const supabase = createClient()
      const today = new Date()
      const future = new Date(today)
      future.setDate(today.getDate() + days)
      
      const startDateStr = today.toISOString().split('T')[0]
      const endDateStr = future.toISOString().split('T')[0]

      // 1. Get Agent Agenda (Available blocks)
      const { data: agendaData } = await supabase
        .from("Agendas")
        .select("fecha, hora_inicio, hora_fin, anuncio_id")
        .eq("agente_id", agentId)
        .gte("fecha", startDateStr)
        .lte("fecha", endDateStr)

      // 2. Get Existing Visits (Busy blocks)
      const { data: existingVisits } = await supabase
        .from("Clientes")
        .select("fecha_de_visita, Inmueble")
        .eq("idag", agentId)
        .gte("fecha_de_visita", `${startDateStr}T00:00:00`)
        .lte("fecha_de_visita", `${endDateStr}T23:59:59`)

      if (!agendaData) return []

      // Group agenda by date
      const slotsByDate: Record<string, string[]> = {}
      
      // Helper to determine target ad ID
      let targetAnuncioId: string | null = null
      if (lead.Inmueble) {
         const ad = advertisements.find(a => 
           a.Referencia === lead.Inmueble ||
           a.Direccion === lead.Inmueble ||
           (lead.Inmueble && a.Direccion && lead.Inmueble.includes(a.Direccion))
         )
         if (ad) targetAnuncioId = ad.ida
      }

      // Process each day
      const uniqueDates = [...new Set(agendaData.map(a => a.fecha))]
      
      for (const date of uniqueDates) {
        const dayAgenda = agendaData.filter(a => a.fecha === date)
        const dayVisits = existingVisits?.filter(v => v.fecha_de_visita?.startsWith(date)) || []
        
        // Calculate busy ranges for this day
        const busyRanges: { start: number, end: number }[] = []
        dayVisits.forEach(v => {
           if (v.fecha_de_visita) {
              const start = new Date(v.fecha_de_visita).getTime()
              // Find ad duration logic... reused from existing code
              const visitAd = advertisements.find(a => 
                a.Referencia === v.Inmueble || 
                a.Direccion === v.Inmueble ||
                (v.Inmueble && a.Direccion && v.Inmueble.includes(a.Direccion)) ||
                (v.Inmueble && a.Referencia && v.Inmueble.includes(a.Referencia))
              )
              const dur = (visitAd?.Duracion_visita || 30) * 60000
              const gap = (visitAd?.Gap_visita || 0) * 60000
              busyRanges.push({ start, end: start + dur + gap })
           }
        })

        const slots: string[] = []
        // Use shared utility to generate candidates
        const relevantSlots = dayAgenda.filter(range => {
           if (!range.hora_inicio || !range.hora_fin) return false
           if (range.anuncio_id && targetAnuncioId && range.anuncio_id !== targetAnuncioId) return false
           return true
        })

        const candidates = generateSlotCandidates(relevantSlots, advertisements, 20, 5)

        candidates.forEach(candidate => {
           const slotStart = new Date(`${date}T${candidate.time}`).getTime()
           const durationMs = candidate.duration * 60000
           const gapMs = candidate.gap * 60000
           const slotEnd = slotStart + durationMs + gapMs
           
           const isBusy = busyRanges.some(r => isOverlapping(slotStart, slotEnd, r.start, r.end))
           
           if (!isBusy) {
              slots.push(candidate.time)
           }
        })
        
        if (slots.length > 0) {
            slotsByDate[date] = [...new Set(slots)].sort()
        }
      }
      
      return Object.entries(slotsByDate).map(([date, slots]) => ({ date, slots }))
    }

    const handleReprogramVisit = async () => {
      if (!selectedLeadForVisit) return
      
      // Validate dates only if NOT in agent-only mode
      if (!isAgentSelectionOnly && (!newVisitDateDate || !newVisitDateTime)) return
      
      if (!selectedAgenteId) {
        toast({
          title: "Agente requerido",
          description: "Selecciona un agente antes de guardar la visita.",
          variant: "destructive",
        })
        return
      }

      // Parse DD/MM/YYYY to ISO YYYY-MM-DD if needed
      let isoDate = newVisitDateDate
      if (newVisitDateDate.includes('/')) {
        const [day, month, year] = newVisitDateDate.split('/')
        isoDate = `${year}-${month}-${day}`
      }

      // If NOT agent-only selection, check for collision
      if (!isAgentSelectionOnly) {
        // Check for collision with other visits
        const proposedTimeStart = new Date(`${isoDate}T${newVisitDateTime}`).getTime()
      
      const collision = leads.find(lead => {
        // Skip current lead
        if (String(lead.id) === String(selectedLeadForVisit.id)) return false
        // Must have a visit date
        if (!lead.fecha_de_visita) return false
        
        const visitDate = new Date(lead.fecha_de_visita)
        // Check if same time (within 1 minute tolerance)
        const isSameTime = Math.abs(visitDate.getTime() - proposedTimeStart) < 60 * 1000

        if (!isSameTime) return false

        // Collision if:
        // 1. Same Property (Property double-booked)
        if (lead.Inmueble === selectedLeadForVisit.Inmueble) return true
        
        // 2. Same Agent (Agent double-booked)
        if (lead.idag && selectedAgenteId && String(lead.idag) === String(selectedAgenteId)) return true
        
        return false
      })

      if (collision) {
        const isPropertyCollision = collision.Inmueble === selectedLeadForVisit.Inmueble
        toast({
          title: isPropertyCollision ? "Propiedad ocupada" : "Agente ocupado",
          description: isPropertyCollision 
            ? `El inmueble ya tiene una visita a esa hora con ${collision.Nombre}.`
            : `El agente ya tiene una visita programada a esa hora con ${collision.Nombre}.`,
          variant: "destructive",
        })
        return
      }
      }

      console.log("[v0] handleReprogramVisit started. Lead:", selectedLeadForVisit.id)

      try {
        const supabase = createClient()
        
        const hasDate = !isAgentSelectionOnly && newVisitDateDate && newVisitDateTime
        const targetStatus = hasDate ? "Visita Confirmada" : "Visita Propuesta"

        let updateData: any = {
          Estado: targetStatus,
          idag: selectedAgenteId ? Number(selectedAgenteId) : null,
        }

        // History tracking
        const historyEntry: LeadHistoryEntry = {
          status: targetStatus,
          timestamp: new Date().toISOString(),
          agent_id: currentUser?.id,
          agent_name: currentUser?.email
        }
  
        if (currentUser?.email && agentes.length > 0) {
          const matched = agentes.find(a => a.Email === currentUser.email)
          if (matched) historyEntry.agent_name = matched.Nombre || matched.nombre || matched.Email
        }
  
        const currentHistory = (selectedLeadForVisit.status_history as LeadHistoryEntry[]) || []
        const updatedHistory = [...currentHistory, historyEntry]
        updateData.status_history = updatedHistory

        if (hasDate) {
          const d = new Date(`${isoDate}T${newVisitDateTime}`)
          const off = d.getTimezoneOffset()
          const sign = off <= 0 ? "+" : "-"
          const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
          const mm = String(Math.abs(off) % 60).padStart(2, "0")
          const offset = `${sign}${hh}:${mm}`
          const valueWithOffset = `${isoDate}T${newVisitDateTime}:00${offset}`
          
          updateData.fecha_de_visita = valueWithOffset
          updateData.visita_completada = "visita confirmada"
        } else if (isAgentSelectionOnly) {
          // If agent only, clear the visit date
          updateData.fecha_de_visita = null
          // Also clear visita_completada to avoid inconsistent state
          updateData.visita_completada = null
        }

        console.log("[v0] Sending update to Supabase. Data:", updateData)

        // Robust update strategy using ID
        const { data, error } = await supabase
          .from("Clientes")
          .update(updateData)
          .eq("id", selectedLeadForVisit.id)
          .select()

        if (error) {
            console.error("Supabase update error:", error)
            throw error
        }
        
        // Log success
        console.log("[v0] Update successful", data)

        // Trigger Webhook if status is "Visita Propuesta" or "Visita Confirmada"
        // (Logic moved to async block below to avoid double sending and UI blocking)


        toast({
          title: isAgentSelectionOnly ? "Agente asignado" : "Fecha de visita actualizada",
          description: isAgentSelectionOnly 
            ? "Se ha asignado el agente y cambiado el estado a Visita Propuesta."
            : "La fecha de visita se ha reprogramado correctamente.",
        })

        // Optimistically update local state
        const updatedLead = {
          ...selectedLeadForVisit,
          ...updateData,
          idag: selectedAgenteId ? Number(selectedAgenteId) : (selectedLeadForVisit as any).idag,
        } as any

        setLeads((prev) => prev.map((l) => (String(l.id) === String(selectedLeadForVisit.id) ? { ...l, ...updatedLead } : l)))
        setFilteredLeads((prev) => prev.map((l) => (String(l.id) === String(selectedLeadForVisit.id) ? { ...l, ...updatedLead } : l)))
        
        // Update selectedLead panel immediately
        setSelectedLead((prev) => {
            if (!prev) return prev
            if (prev.id !== selectedLeadForVisit.id) return prev
            return {
              ...prev,
              ...updatedLead
            }
        })

        // Refresh data from server to ensure consistency
        setTimeout(() => {
            fetchLeads()
        }, 500)
        
        if (updateData.Estado === "Visita Propuesta" || updateData.Estado === "Visita Confirmada") {
            // Async webhook call (fire and forget)
            (async () => {
                try {
                    const currentAd = advertisements.find(a => 
                      (a.Referencia && selectedLeadForVisit.Inmueble && a.Referencia.trim() === selectedLeadForVisit.Inmueble.trim()) || 
                      (a.Direccion && selectedLeadForVisit.Inmueble && a.Direccion.trim() === selectedLeadForVisit.Inmueble.trim()) ||
                      (selectedLeadForVisit.Inmueble && a.Direccion && selectedLeadForVisit.Inmueble.includes(a.Direccion))
                    )

                    const assignedAgent = agentes.find(a => String(a.idag) === String(selectedAgenteId))
                    
                    // Calculate future slots
                    const futureSlots = await getFutureAvailability(Number(selectedAgenteId), selectedLeadForVisit)

                    const bookingLink = `https://app.rentaflow.es/agendar-visita?leadId=${selectedLeadForVisit.id}`
                    
                    // Fetch Inmobiliaria data
                    let inmobiliariaData = null
                    const targetInmoId = inmobiliariaId || (selectedLeadForVisit as any).idi || (selectedLeadForVisit as any).usuario
                    if (targetInmoId) {
                        const { data: inmoData } = await supabase
                           .from("Inmobiliarias")
                           .select("*")
                           .eq("idi", targetInmoId)
                           .single()
                        inmobiliariaData = inmoData
                    }

                    console.log("[v0] Triggering Webhook...")
                    
                    const { date: formattedDate, time: formattedTime } = formatWebhookDate(updateData.fecha_de_visita)

                    const payload = {
                      "Nombre de lead": `${selectedLeadForVisit.Nombre || ''} ${selectedLeadForVisit.Apellidos || ''}`.trim(),
                      "Agente Asignado": assignedAgent || { idag: selectedAgenteId },
                      "Agente Email": assignedAgent?.Email || null,
                      "Inmueble/Anuncio": currentAd 
                        ? { ...currentAd, Direccion: currentAd.Direccion || "Pregunta a tu agente" } 
                        : { Referencia: selectedLeadForVisit.Inmueble, Direccion: "Pregunta a tu agente" },
                      "Direccion": currentAd?.Direccion || "Pregunta a tu agente",
                      "Direccion del Anuncio": currentAd?.Direccion || "Pregunta a tu agente",
                      "Nombre Inmobiliaria": inmobiliariaNombre || (inmobiliariaData as any)?.nombre_inmobiliaria || "Sin nombre",
                      "Inmobiliaria": inmobiliariaData || null,
                      "Firma": (inmobiliariaData as any)?.firma_html || "",
                      "Franjas/Huecos libres": futureSlots,
                      "Link de Agendamiento": bookingLink,
                      "Fecha Visita": formattedDate,
                      "Hora Visita": formattedTime,
                      "Fecha Completa": updateData.fecha_de_visita || null,
                      ...selectedLeadForVisit,
                      ...updateData
                    }

                    // Use API route instead of Server Action to avoid CORS/Network issues
                    const { status_history, ...webhookPayload } = payload as any
                    const hasConfirmedDate = Boolean(updateData.fecha_de_visita)
                    const endpoint = hasConfirmedDate ? "/api/confirmar-visita" : "/api/proponer-visita"
                    const response = await fetch(endpoint, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(webhookPayload)
                    })
                    const result = await response.json()

                    if (!result.success) {
                        console.error("Webhook failed:", result.error)
                    } else {
                        console.log("Webhook sent successfully")
                    }
                } catch(e) { console.error("Error calling webhook", e) }
            })()
        }

        setVisitDateDialogOpen(false)
        setSelectedLeadForVisit(null)
        setNewVisitDateDate("")
        setNewVisitDateTime("")
      } catch (error) {
        console.error("[v0] Error updating visit date:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar la fecha de visita.",
          variant: "destructive",
        })
      }
    }

    const handleCancelVisit = async () => {
      if (!selectedLeadForVisit) return

      try {
        const supabase = createClient()
        const { error } = await supabase
          .from("Clientes")
          .update({
            visita_completada: "cancelada",
            fecha_de_visita: null,
            Estado: "Aceptado"
          })
          .eq("id", selectedLeadForVisit.id)

        if (error) throw error

        // Call cancel webhook
        try {
            console.log("Preparing cancellation webhook payload in leads/page...")

            let inmobiliariaData = null
            if (inmobiliariaId) {
                 const { data } = await supabase.from("Inmobiliarias").select("*").eq("idi", inmobiliariaId).single()
                 inmobiliariaData = data
            }

            let agentData = null
            if (selectedLeadForVisit.idag) {
                 const { data } = await supabase.from("Agentes").select("*").eq("idag", selectedLeadForVisit.idag).single()
                 agentData = data
            }

            const currentAd = advertisements.find(a => {
              if (!selectedLeadForVisit.Inmueble) return false
              const leadInmueble = selectedLeadForVisit.Inmueble.trim().toLowerCase()
              const adRef = (a.Referencia || "").trim().toLowerCase()
              const adDir = (a.Direccion || "").trim().toLowerCase()
              
              return leadInmueble === adRef || 
                     leadInmueble === adDir ||
                     leadInmueble.includes(adDir) ||
                     adDir.includes(leadInmueble)
            })

            const bookingLink = `https://app.rentaflow.es/agendar-visita?leadId=${selectedLeadForVisit.id}`

            const cancelPayload = {
                "Link de Agendamiento": bookingLink,
                "Nombre de lead": `${selectedLeadForVisit.Nombre || ''} ${selectedLeadForVisit.Apellidos || ''}`.trim(),
                "Inmueble/Anuncio": currentAd || { Referencia: selectedLeadForVisit.Inmueble },
                "Direccion": currentAd?.Direccion || "Pregunta a tu agente",
                "Direccion del Anuncio": currentAd?.Direccion || "Pregunta a tu agente",
                "Nombre Inmobiliaria": inmobiliariaNombre || "Sin nombre",
                "Inmobiliaria": inmobiliariaData || null,
                "Firma": (inmobiliariaData as any)?.firma_html || "",
                "Agente Asignado": agentData,
                "Agente Email": agentData?.Email,
                "Fecha Visita": selectedLeadForVisit.fecha_de_visita ? selectedLeadForVisit.fecha_de_visita.split("T")[0] : null,
                "Hora Visita": selectedLeadForVisit.fecha_de_visita ? selectedLeadForVisit.fecha_de_visita.split("T")[1]?.substring(0,5) : null,
                "Fecha Completa": selectedLeadForVisit.fecha_de_visita,
                "Motivo": "Cancelado por agente",
                ...selectedLeadForVisit,
                visita_completada: "cancelada",
                fecha_de_visita: null,
                Estado: "Aceptado"
            }

            const { status_history, ...webhookPayload } = cancelPayload as any
            await fetch("/api/cancelar-visita-agente", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(webhookPayload)
            })
        } catch (webhookError) {
            console.error("Error calling cancel webhook:", webhookError)
        }

        toast({
          title: "Visita cancelada",
          description: "La visita se ha cancelado correctamente.",
        })

        // Refresh leads to show updated status
        fetchLeads()
        // Update selectedLead panel immediately
        setSelectedLead((prev) => {
          if (!prev) return prev
          if (prev.id !== selectedLeadForVisit!.id) return prev
          return {
            ...prev,
            fecha_de_visita: null as any,
            visita_completada: "cancelada" as any,
            Estado: "Aceptado",
          }
        })
        setVisitDateDialogOpen(false)
        setSelectedLeadForVisit(null)
        setNewVisitDateDate("")
        setNewVisitDateTime("")
      } catch (error) {
        console.error("[v0] Error canceling visit:", error)
        toast({
          title: "Error",
          description: "No se pudo cancelar la visita.",
          variant: "destructive",
        })
      }
    }


    if (loading || inmobiliariaLoading) {
      return (
        <div className="p-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando leads...</p>
            </div>
          </div>
        </div>
      )
    }

    const handleAdvertisementClick = (ad: Advertisement) => {
      console.log("[v0] Clicking advertisement:", ad.ida)
      setSelectedAdvertisement(ad.ida)
    }

    return (
      <>
        <div className="flex h-screen bg-background">
          {" "}
          {/* Changed from p-8 */}
          {/* Sidebar and other layout elements would go here if present */}
          <main className="flex-1 overflow-auto">
            {" "}
            {/* Changed from p-8 */}
            <div className="p-6">
              {" "}
              {/* Changed from p-8 */}
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-foreground">Leads</h2>
                  <p className="text-muted-foreground mt-2">Gestión de clientes potenciales</p>
                </div>
                {role !== "agente" && (
                  <Button onClick={() => setIsNewLeadDialogOpen(true)}>
                    <Users className="h-4 w-4 mr-2" />
                    Nuevo Lead
                  </Button>
                )}
              </div>
              {
                (() => {
                  const percentageUsed = planLimit < 1000000 ? (totalEjecuciones / planLimit) * 100 : 0
                  const today = new Date()
                  const defaultMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
                  const resetBase = planResetAt ? planResetAt : defaultMonthStart
                  const msPerDay = 1000 * 60 * 60 * 24
                  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - resetBase.getTime()) / msPerDay))
                  const remainingExecutions = planLimit - totalEjecuciones
                  const dailyRate = daysElapsed > 0 ? totalEjecuciones / daysElapsed : 0
                  const daysUntilLimit = dailyRate > 0 ? Math.floor(remainingExecutions / dailyRate) : 999
                  const nextRenewalDate = (() => {
                    const y = resetBase.getFullYear()
                    const mNext = resetBase.getMonth() + 1
                    const d = resetBase.getDate()
                    const last = new Date(y, mNext + 1, 0).getDate()
                    return new Date(y, mNext, Math.min(d, last))
                  })()
                  const showCritical = planLimit < 1000000 && percentageUsed >= 90
                  return (
                    <>
                      {planInactive && (
                        <Alert variant="destructive" className="sticky top-2 z-10">
                          <AlertDescription>
                            Plan inactivo: Has alcanzado el límite. Mensajes y acciones están deshabilitados hasta la renovación.
                          </AlertDescription>
                        </Alert>
                      )}
                    <Card
                      className={`mt-4 border rounded-lg p-2 transition-all duration-300 ${
                        showCritical
                          ? `border-red-500/50 shadow-lg shadow-red-500/20 bg-gradient-to-br from-[#F8FBF8] via-red-50/30 to-red-100/40 ring-2 ring-red-500/20`
                          : "bg-card border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">Consumo del Plan</h3>
                            {showCritical && (
                              <Badge variant="outline" className="text-red-600 border-current font-semibold text-xs px-1.5 py-0">
                                🚨 Uso Elevado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground mr-2">
                            <span>Renovación: {formatDate(nextRenewalDate)}</span>
                            <span>• Plan: {currentPlanName || (() => { const pd = getPlanData(currentPlanId); return pd ? pd.Nombre : String(currentPlanId || "") })()}</span>
                            {scheduledPlanId > 0 && scheduledEffectiveAt && (
                              <span>• Downgrade programado: {formatDate(scheduledEffectiveAt)}</span>
                            )}
                          </div>
                            <Button
                              size="sm"
                              className={`h-7 text-xs ${
                                showCritical
                                  ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
                                  : "border border-muted-foreground/30 bg-transparent hover:bg-muted/50 text-foreground"
                              }`}
                              onClick={() => router.push("/dashboard/informacion")}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Cambiar Plan
                            </Button>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">Leads</div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold">{totalEjecuciones.toLocaleString()}</div>
                            <div className="text-[10px] text-muted-foreground">Usadas</div>
                          </div>
                          <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                            <div className={`text-lg font-bold ${showCritical ? "text-red-600" : "text-foreground"}`}>
                              {planLimit < 1000000 ? Math.max(0, remainingExecutions).toLocaleString() : "∞"}
                            </div>
                            <div className="text-[10px] text-muted-foreground">Restantes</div>
                          </div>
                          <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                            <div className="text-lg font-bold">{planLimit < 1000000 ? (daysUntilLimit >= 0 ? daysUntilLimit : 0) : "∞"}</div>
                            <div className="text-[10px] text-muted-foreground">Días estimados</div>
                          </div>
                        </div>
                        {planLimit < 1000000 && (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>
                                {totalEjecuciones.toLocaleString()} / {formatPlanValue(planLimit)} leads
                              </span>
                              <span className="font-semibold">{percentageUsed.toFixed(1)}% usado</span>
                            </div>
                            <Progress value={percentageUsed} className={`h-2 ${showCritical ? "bg-red-600" : "bg-blue-500"}`} />
                          {showCritical && (
                              <div className="flex items-start gap-3 p-3 rounded-lg border border-red-600 bg-red-50 shadow-sm">
                                <span className="text-lg">🚨</span>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-red-700 leading-tight">
                                    Has consumido el {percentageUsed.toFixed(0)}% de tu plan. Leads {totalEjecuciones}/{formatPlanValue(planLimit)}.
                                  </p>
                                  <p className="text-xs font-medium text-red-600/90 mt-1">💡 Considera ampliar tu plan para evitar interrupciones.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </Card>
                    </>
                  )
                })()
              }
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                {" "}
                {/* Added mt-8 */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Total Leads</CardTitle>
                    <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">{totalLeads}</div>
                    <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Nuevos Hoy</CardTitle>
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{newLeadsToday}</div>
                    <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Completados</CardTitle>
                    <CheckCircle className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{completedLeads}</div>
                    <p className="text-xs text-muted-foreground">Últimas 24 horas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">Tasa Conversión</CardTitle>
                    <Star className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{conversionRate}%</div>
                    <p className="text-xs text-muted-foreground">Conversión total</p>
                  </CardContent>
                </Card>
              </div>
              {/* Updated section for Active Advertisements */}
              <div className="mt-8 space-y-2">
                {" "}
                {/* Added mt-8 */}
                <div className="flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold">Anuncios Activos</h3>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {advertisements.filter((ad) => ad.Activacion !== "Archivado").length} anuncios
                  </Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1">
                  {adsLoading && (
                    <div className="col-span-full flex items-center justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Cargando anuncios…</span>
                    </div>
                  )}
                  <Card
                    className={`cursor-pointer transition-all hover:shadow-md border-2 px-1 ${
                      selectedAdvertisement === null || selectedAdvertisement === "all"
                        ? "border-primary bg-primary/5"
                        : "border-gray-200"
                    }`}
                    onClick={() => {
                      console.log("[v0] Selecting all advertisements")
                      setSelectedAdvertisement(null)
                    }}
                  >
                    {/* CHANGE: Reduced padding from p-1 to p-0.5 for more compact cards */}
                    <CardContent className="p-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">Todos los Anuncios</p>
                          <p className="text-[10px] text-muted-foreground">Ver todos los leads</p>
                        </div>
                        <Building className="h-6 w-6 text-primary flex-shrink-0" />
                      </div>
                    </CardContent>
                  </Card>

                  {advertisements
                    .filter((ad) => ad.Activacion !== "Archivado")
                    .map((ad) => {
                      const isPaused = ad.Activacion === "Pausado"
                      const isActive = ad.Activacion === "Activo"

                      return (
                        <Card
                          key={ad.ida}
                          className={`cursor-pointer transition-all hover:shadow-md border-2 px-5 ${
                            selectedAdvertisement === ad.ida
                              ? "border-primary bg-primary/5"
                              : isPaused
                                ? "border-gray-300 bg-gray-100 opacity-60"
                                : "border-gray-200"
                          }`}
                          onClick={() => handleAdvertisementClick(ad)}
                        >
                          {/* CHANGE: Reduced padding from p-1 to p-0.5 for more compact cards */}
                          <CardContent className="p-0.5">
                            <div className="space-y-0">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1">
                                  <p className={`font-medium text-base ${isPaused ? "text-gray-500" : ""}`}>
                                    {ad.Referencia || "Sin referencia"}
                                  </p>
                                  {isPaused && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[8px] px-1 py-0 h-3 bg-yellow-100 text-yellow-800"
                                    >
                                      Pausado
                                    </Badge>
                                  )}
                                </div>
                                <Home
                                  className={`h-6 w-6 flex-shrink-0 ${isPaused ? "text-gray-400" : "text-primary"}`}
                                />
                              </div>
                              <p
                                className={`text-[10px] truncate pl-0 ${isPaused ? "text-gray-400" : "text-muted-foreground"}`}
                              >
                                {ad.Direccion || "Sin dirección"}
                              </p>
                              <div className="flex items-center justify-between pl-0">
                                <span
                                  className={`text-[10px] font-medium ${isPaused ? "text-gray-500" : "text-green-600"}`}
                                >
                                  {formatCurrency(ad.Precio)}
                                </span>
                                <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                                  {ad.Portal || "Portal"}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </div>
              {/* Filters */}
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                {" "}
                {/* Added mt-8 */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, email, teléfono, inmueble o ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Limpiar búsqueda"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full sm:w-auto justify-between border-dashed">
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>Estados</span>
                          {statusFilter.length > 0 && (
                            <Badge variant="secondary" className="ml-2 h-5 rounded-sm px-1 font-normal lg:hidden">
                              {statusFilter.length}
                            </Badge>
                          )}
                        </div>
                        {statusFilter.length > 0 && (
                          <div className="hidden space-x-1 lg:flex ml-2">
                             {statusFilter.length > 2 ? (
                                <Badge variant="secondary" className="h-5 rounded-sm px-1 font-normal">
                                  {statusFilter.length} seleccionados
                                </Badge>
                             ) : (
                                statusFilter.map((option) => (
                                  <Badge
                                    variant="secondary"
                                    key={option}
                                    className="h-5 rounded-sm px-1 font-normal"
                                  >
                                    {option === "Pedir Aval" ? "Aval Pedido" : option === "Visita Propuesta" ? "Visita Propuesta" : option === "Aceptado" ? "Aprobado" : option}
                                  </Badge>
                                ))
                             )}
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuItem
                        className="justify-center text-center font-medium text-primary cursor-pointer"
                        onClick={() => setStatusFilter([])}
                      >
                        Limpiar filtros
                      </DropdownMenuItem>
                      {(() => {
                        const statusOrder = [
                          "Datos Incompletos",
                          "Datos Completos",
                          "Pedir Aval",
                          "Aceptado",
                          "Visita Propuesta",
                          "Visita Confirmada",
                          "Descartado"
                        ]
                        
                        const sortedStatuses = Array.from(new Set([...availableStatuses, ...statusOrder])).sort((a, b) => {
                          const indexA = statusOrder.indexOf(a)
                          const indexB = statusOrder.indexOf(b)
                          if (indexA !== -1 && indexB !== -1) return indexA - indexB
                          if (indexA !== -1) return -1
                          if (indexB !== -1) return 1
                          return a.localeCompare(b)
                        })

                        return sortedStatuses.map((status) => (
                        <DropdownMenuCheckboxItem
                          key={status}
                          checked={statusFilter.includes(status)}
                          className="pl-2 [&>span]:hidden"
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setStatusFilter([...statusFilter, status])
                            } else {
                              setStatusFilter(statusFilter.filter((s) => s !== status))
                            }
                          }}
                        >
                          <Checkbox checked={statusFilter.includes(status)} className="pointer-events-none mr-2" />
                          {status === "Pedir Aval" ? "Aval Pedido" : status === "Visita Propuesta" ? "Visita Propuesta" : status === "Aceptado" ? "Aprobado" : status}
                        </DropdownMenuCheckboxItem>
                      ))
                      })()}
                    </DropdownMenuContent>
                  </DropdownMenu>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchLeads()}
                    disabled={loading}
                    className="gap-2 bg-transparent"
                  >
                    <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Actualizar
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="h-4 w-4 mr-2" />
                        Acciones
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setIsBulkSelectionMode(!isBulkSelectionMode)
                          if (isBulkSelectionMode) {
                            setSelectedLeadIds([])
                          }
                        }}
                        className="font-medium text-blue-600"
                      >
                        <Checkbox checked={isBulkSelectionMode} className="mr-2" />
                        Selección Múltiple
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {/* Leads List */}
              {isBulkSelectionMode ? (
                <Card className="mt-8">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {filteredLeads.length > 0 && (
                          <Checkbox
                            checked={selectedLeadIds.length === filteredLeads.length && filteredLeads.length > 0}
                            onCheckedChange={toggleSelectAll}
                            aria-label="Seleccionar todos"
                          />
                        )}
                        <CardTitle>Leads ({filteredLeads.length})</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedLeadIds.length > 0 && (
                      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {selectedLeadIds.length} lead{selectedLeadIds.length > 1 ? "s" : ""} seleccionado
                            {selectedLeadIds.length > 1 ? "s" : ""}
                          </span>
                          <Button 
                            size="sm" 
                            variant="default"
                            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              const selectedLeadsList = leads.filter(lead => selectedLeadIds.includes(lead.id))
                              const invalidLeads = selectedLeadsList.filter(lead => 
                                lead.Estado !== "Aceptado" && lead.Estado !== "Visita Propuesta"
                              )
                              
                              if (invalidLeads.length > 0) {
                                toast({
                                  title: "Acción no permitida",
                                  description: "Solo se puede proponer visita a leads con estado 'Aprobado' o 'Visita Propuesta'.",
                                  variant: "destructive"
                                })
                                return
                              }
                              setProposeVisitDialogOpen(true)
                            }}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Proponer Visita
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                Cambiar estado
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Datos Incompletos")}>
                                Datos Incompletos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Datos Completos")}>
                                Datos Completos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Pedir Aval")}>
                                Aval Pedido
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Aceptado")}>
                                Aprobado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Visita Propuesta")}>
                                Visita Propuesta
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Visita Confirmada")}>
                                Visita Confirmada
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Descartado")}>
                                Descartado
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedLeadIds([])}>
                          Limpiar selección
                        </Button>
                      </div>
                    )}

                    {error ? (
                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="text-red-600">Error al cargar leads</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-red-600">{error}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="grid gap-3">
                        {filteredLeads.length > 0 ? (
                          filteredLeads.slice(0, visibleCount).map((lead) => {
                            const isComplete = isLeadComplete(lead)
                            const isDescartado = lead.Estado === "Descartado"
                            const isAceptado = lead.Estado === "Aceptado"
                            const { percentage: completionPercentage, totalFields } = calculateCompleteness(lead)
                            const docInvalid = [
                              isDocumentInvalid(lead.Tipo_Documento, lead.Documento),
                              isDocumentInvalid(lead.Tipo_Documento_2, lead.Documento_2),
                              isDocumentInvalid(lead.Tipo_Documento_3, lead.Documento_3),
                              isDocumentInvalid(lead["Tipo_Documento 4"], lead.Documento_4),
                            ].some(Boolean)
                            const isDataComplete = completionPercentage >= 80 && !docInvalid
                            const personaCount = countPersonas(lead)

                            // Add checkbox for individual selection
                            const isSelected = selectedLeadIds.includes(lead.id)

                            return (
                              <Card
                                key={lead.id}
                                className={`relative hover:shadow-md transition-all cursor-pointer ${
                                  isSelected // Highlight selected leads
                                    ? "ring-2 ring-primary ring-offset-2"
                                    : ""
                                  } ${
                                  isDescartado
                                    ? "opacity-40 bg-gray-50 border-gray-300 dark:bg-card dark:border-gray-600"
                                    : isAceptado
                                      ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/30 hover:bg-emerald-50/50 dark:bg-card dark:hover:bg-card"
                                      : isDataComplete
                                        ? "border-green-200 dark:border-green-700 bg-green-50/30 hover:bg-green-50/50 dark:bg-card dark:hover:bg-card"
                                        : "border-amber-200 dark:border-amber-700 bg-amber-50/30 hover:bg-amber-50/50 dark:bg-card dark:hover:bg-card"
                                  }`}
                                onClick={() => openLeadDetail(lead)}
                              >
                                <Badge variant="secondary" className="absolute top-1 left-1 z-10 font-mono text-xs text-muted-foreground">
                                  ID: {String((lead as any).id ?? (lead as any).idc ?? (lead as any).IDC ?? "")}
                                </Badge>
                                <CardContent className="p-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                      {isBulkSelectionMode && (
                                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                          <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={() => toggleLeadSelection(lead.id)}
                                            className="mr-3"
                                          />
                                        </div>
                                      )}

                                      <div className="relative w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center flex-shrink-0">
                                        {personaCount === 1 ? (
                                          <User className="h-4 w-4 text-primary" />
                                        ) : (
                                          <Users className="h-4 w-4 text-primary" />
                                        )}
                                        {personaCount > 1 && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                            {personaCount}
                                          </div>
                                        )}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h3 className="font-semibold text-sm truncate">
                                            {lead.Nombre || "Sin nombre"}
                                          </h3>

                                          <div className="flex items-center gap-1.5">
                                            {(() => {
                                              const currentStatus = String(lead.Estado || "").trim()
                                              const hasDate = Boolean(lead.fecha_de_visita)
                                              const statusForDisplay = docInvalid
                                                ? "Datos Incompletos"
                                                : (currentStatus === "Visita Propuesta" && hasDate)
                                                  ? "Visita Confirmada"
                                                  : (currentStatus || "Pendiente")

                                              const statusColors = getStatusColors(statusForDisplay)
                                              const showEstadoBadge = Boolean(statusForDisplay) && statusForDisplay !== "Completo"

                                            if (showEstadoBadge) {
                                              return (
                                                <div
                                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                                    ["Visita Propuesta", "Visita Confirmada", "Completo", "Completado"].includes(String(statusForDisplay || "")) ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                                                  }`}
                                                  style={{
                                                    backgroundColor: statusColors.bg,
                                                    borderColor: statusColors.border,
                                                  }}
                                                  onClick={async () => {
                                                    console.log("[v0] Estado div clicked, Estado:", lead.Estado)
                                                    if (statusForDisplay === "Visita Propuesta" || statusForDisplay === "Visita Confirmada") {
                                                      console.log("[v0] Opening visit date dialog for lead:", lead.Nombre, lead.Apellidos)
                                                      console.log("[v0] Current fecha_de_visita:", lead.fecha_de_visita)
                                                  setSelectedLeadForVisit(lead)
                                                      setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                      if (lead.fecha_de_visita) {
                                                        const d = new Date(lead.fecha_de_visita)
                                                        const yyyy = d.getFullYear()
                                                        const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                        const dd = String(d.getDate()).padStart(2, "0")
                                                        const hh = String(d.getHours()).padStart(2, "0")
                                                        const min = String(d.getMinutes()).padStart(2, "0")
                                                        setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                        setNewVisitDateTime(`${hh}:${min}`)
                                                      } else {
                                                        setNewVisitDateDate("")
                                                        setNewVisitDateTime("12:00")
                                                      }
                                                      setVisitDateDialogOpen(true)
                                                      console.log("[v0] Dialog should now be open")
                                                    } else if (statusForDisplay === "Completo" || statusForDisplay === "Completado") {
                                                      setSelectedLeadForVisit(lead)
                                                      setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                      if (lead.fecha_de_visita) {
                                                        const d = new Date(lead.fecha_de_visita)
                                                        const yyyy = d.getFullYear()
                                                        const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                        const dd = String(d.getDate()).padStart(2, "0")
                                                        const hh = String(d.getHours()).padStart(2, "0")
                                                        const min = String(d.getMinutes())
                                                        setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                        setNewVisitDateTime(`${hh}:${String(min).padStart(2, "0")}`)
                                                      } else {
                                                        setNewVisitDateDate("")
                                                        setNewVisitDateTime("12:00")
                                                      }
                                                      setVisitDateDialogOpen(true)
                                                    }
                                                  }}
                                                >
                                                    <span
                                                      className="text-xs font-semibold"
                                                      style={{ color: statusColors.text }}
                                                    >
                                                      {statusForDisplay === "Aceptado" ? "✓ " : ""}
                                                      {(statusForDisplay === "Visita Propuesta" || statusForDisplay === "Visita Confirmada") && lead.fecha_de_visita ? (
                                                        <>
                                                          {statusForDisplay} -{" "}
                                                          {formatDate(lead.fecha_de_visita) + " " + new Date(lead.fecha_de_visita).toLocaleTimeString("es-ES", {
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                          })}
                                                        </>
                                                      ) : (
                                                        statusColors.label
                                                      )}
                                                    </span>
                                                    <div
                                                      className="h-3 w-px"
                                                      style={{ backgroundColor: statusColors.border }}
                                                    />
                                                    <div className="flex items-center gap-0.5">
                                                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                      <span
                                                        className="text-xs font-semibold"
                                                        style={{ color: statusColors.text }}
                                                      >
                                                        {completionPercentage}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                )
                                              } else if (isDataComplete) {
                                                return (
                                                  <div
                                                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 cursor-pointer hover:opacity-80 transition-opacity"
                                                    onClick={async () => {
                                                      setSelectedLeadForVisit(lead)
                                                      setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                      if (lead.fecha_de_visita) {
                                                        const d = new Date(lead.fecha_de_visita)
                                                        const yyyy = d.getFullYear()
                                                        const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                        const dd = String(d.getDate()).padStart(2, "0")
                                                        const hh = String(d.getHours()).padStart(2, "0")
                                                        const min = String(d.getMinutes()).padStart(2, "0")
                                                        setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                        setNewVisitDateTime(`${hh}:${min}`)
                                                      } else {
                                                        setNewVisitDateDate("")
                                                        setNewVisitDateTime("12:00")
                                                      }
                                                      setIsAgentSelectionOnly(false)
                                                      setVisitDateDialogOpen(true)
                                                    }}
                                                  >
                                                    <span className="text-xs font-semibold text-green-800">
                                                      Datos Completos
                                                    </span>
                                                    <div className="h-3 w-px bg-green-400" />
                                                    <div className="flex items-center gap-0.5">
                                                      <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                      <span className="text-xs font-semibold text-green-700">
                                                        {completionPercentage}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                )
                                              } else {
                                                return (
                                                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100! border border-amber-300 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
                                                    <span className="text-xs font-semibold text-amber-800! dark:text-amber-200 whitespace-nowrap">
                                                      Incompleto
                                                    </span>
                                                    <div className="h-3 w-px bg-amber-400 dark:bg-amber-700" />
                                                    <div className="flex items-center gap-0.5">
                                                      <Star className="h-2.5 w-2.5 fill-amber-600 text-amber-600" />
                                                      <span className="text-xs font-semibold text-amber-800! dark:text-amber-300">
                                                        {completionPercentage}%
                                                      </span>
                                                    </div>
                                                  </div>
                                                )
                                              }
                                            })()}
                                          </div>
                                        </div>
                                        {lead.origen && (
                                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                                            <Tag className="h-3 w-3" />
                                            Origen: {lead.origen}
                                          </Badge>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 text-xs text-muted-foreground mb-2">
                                          <div className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate">{lead.Correo || "Sin email"}</span>
                                            {lead.correo_proxy && (
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <span className="ml-1 text-xs text-muted-foreground cursor-help border rounded-full px-1.5 py-0.5 bg-muted">
                                                      Proxy
                                                    </span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>
                                                    <p>Email original: {lead.correo_proxy}</p>
                                                  </TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            <span>{lead.Telefono || "Sin teléfono"}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <Building className="h-3 w-3" />
                                            <span className="truncate">{lead.Inmueble || "Sin inmueble"}</span>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 text-xs">
                                          <div className="flex items-center gap-1 text-green-600">
                                            <Euro className="h-3 w-3" />
                                            <span className="font-medium">
                                              {formatCurrency(
                                                (lead.Ingresos || 0) +
                                                  (lead.Ingresos_2 || 0) +
                                                  (lead.Ingresos_3 || 0) +
                                                  (lead.Ingresos_4 || 0),
                                              )}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-1 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDateTime(lead.created_at)}</span>
                                          </div>
                                        </div>
                                        

                                    </div>
                                  </div>

                                    {/* Quick Actions */}
                                    <TooltipProvider>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className={`h-6 w-6 p-0 ${
                                                lead.Observaciones || lead.Obsevaciones
                                                  ? "bg-amber-400 border-amber-500 hover:bg-amber-500 dark:bg-amber-600 dark:border-amber-700 dark:hover:bg-amber-700"
                                                  : "bg-transparent"
                                              }`}
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openNoteDialog(lead)
                                              }}
                                            >
                                              <MessageSquare className={`h-3 w-3 ${lead.Observaciones || lead.Obsevaciones ? "text-black dark:text-white" : ""}`} />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Ver/Editar Notas</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 w-6 p-0 bg-transparent"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (lead.Correo) {
                                              window.open(`mailto:${lead.Correo}`, "_blank")
                                            }
                                          }}
                                          disabled={planInactive || !lead.Correo}
                                        >
                                          <Mail className="h-3 w-3" />
                                        </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Enviar correo</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 w-6 p-0 bg-transparent"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            if (lead.Telefono) {
                                              window.open(
                                                `https://wa.me/${lead.Telefono.replace(/\D/g, "")}`,
                                                "_blank",
                                              )
                                            }
                                          }}
                                          disabled={planInactive || !lead.Telefono}
                                        >
                                          <WhatsAppIcon className="h-3 w-3" />
                                        </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Contactar por WhatsApp</p>
                                          </TooltipContent>
                                        </Tooltip>

                                        <DropdownMenu>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <DropdownMenuTrigger asChild>
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="h-6 w-6 p-0 bg-transparent"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                  }}
                                                  disabled={planInactive}
                                                >
                                                  <MoreVertical className="h-3 w-3" />
                                                </Button>
                                              </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Cambiar estado</p>
                                            </TooltipContent>
                                          </Tooltip>
                                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                updateLeadStatus(Number(lead.id), "Datos Incompletos")
                                              }}
                                            >
                                              Datos Incompletos
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                updateLeadStatus(Number(lead.id), "Datos Completos")
                                              }}
                                            >
                                              Datos Completos
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedLeadForVisit(lead)
                                                setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                if (lead.fecha_de_visita) {
                                                  const d = new Date(lead.fecha_de_visita)
                                                  const yyyy = d.getFullYear()
                                                  const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                  const dd = String(d.getDate()).padStart(2, "0")
                                                  const hh = String(d.getHours()).padStart(2, "0")
                                                  const min = String(d.getMinutes()).padStart(2, "0")
                                                  setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                  setNewVisitDateTime(`${hh}:${min}`)
                                                } else {
                                                  setNewVisitDateDate("")
                                                  setNewVisitDateTime("12:00")
                                                }
                                                setVisitDateDialogOpen(true)
                                                updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                              }}
                                            >
                                              Visita Propuesta
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                updateLeadStatus(Number(lead.id), "Descartado")
                                              }}
                                            >
                                              Descartado
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedLead(lead)
                                                openAvalDialog()
                                                updateLeadStatus(Number(lead.id), "Pedir Aval")
                                              }}
                                            >
                                              Aval Pedido
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              className="text-red-600"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openDeleteDialog(lead)
                                              }}
                                            >
                                              Eliminar Lead
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      </TooltipProvider>
                                  </div>
                                </CardContent>
                              </Card>
                            )
                          })
                        ) : (
                          <Card>
                            <CardContent className="p-8 text-center">
                              <p className="text-muted-foreground">No se encontraron leads</p>
                            </CardContent>
                          </Card>
                        )}
                        {filteredLeads.length > visibleCount && (
                          <div className="flex justify-center mt-2">
                            <Button size="sm" variant="outline" onClick={() => setVisibleCount((c) => c + 100)}>
                              Mostrar más
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="mt-8">
                  {error ? (
                    <Card className="border-red-200">
                      <CardHeader>
                        <CardTitle className="text-red-600">Error al cargar leads</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-red-600">{error}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {filteredLeads.length > 0 ? (
                        filteredLeads.slice(0, visibleCount).map((lead) => {
                          const isComplete = isLeadComplete(lead)
                          const isDescartado = lead.Estado === "Descartado"
                          const isAceptado = lead.Estado === "Aceptado"
                          const { percentage: completionPercentage } = calculateCompleteness(lead)
                          const docInvalid = [
                            isDocumentInvalid(lead.Tipo_Documento, lead.Documento),
                            isDocumentInvalid(lead.Tipo_Documento_2, lead.Documento_2),
                            isDocumentInvalid(lead.Tipo_Documento_3, lead.Documento_3),
                            isDocumentInvalid(lead["Tipo_Documento 4"], lead.Documento_4),
                          ].some(Boolean)
                          const isDataComplete = completionPercentage >= 80 && !docInvalid
                          const personaCount = countPersonas(lead)
                          const isSelected = selectedLeadIds.includes(lead.id)

                          return (
                            <Card
                              key={lead.id}
                              className={`relative hover:shadow-md transition-all cursor-pointer ${
                                isDescartado
                                  ? "opacity-40 bg-gray-50 border-gray-300 dark:bg-card dark:border-gray-600"
                                  : isAceptado
                                    ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/30 hover:bg-emerald-50/50 dark:bg-card dark:hover:bg-card"
                                    : isDataComplete
                                      ? "border-green-200 dark:border-green-700 bg-green-50/30 hover:bg-green-50/50 dark:bg-card dark:hover:bg-card"
                                      : "border-amber-200 dark:border-amber-700 bg-amber-50/30 hover:bg-amber-50/50 dark:bg-card dark:hover:bg-card"
                              }`}
                              onClick={() => openLeadDetail(lead)}
                            >
                              <Badge variant="secondary" className="absolute top-1 left-1 z-10 font-mono text-xs text-muted-foreground">
                                ID: {String((lead as any).id ?? (lead as any).idc ?? (lead as any).IDC ?? "")}
                              </Badge>
                              <CardContent className="p-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3 flex-1">
                                    {isBulkSelectionMode && (
                                      <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleLeadSelection(lead.id)}
                                          className="mr-3"
                                        />
                                      </div>
                                    )}

                                    <div className="relative w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/5 rounded-full flex items-center justify-center flex-shrink-0">
                                      {personaCount === 1 ? (
                                        <User className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Users className="h-4 w-4 text-primary" />
                                      )}
                                      {personaCount > 1 && (
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                                          {personaCount}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-sm truncate">{lead.Nombre || "Sin nombre"}</h3>

                                        <div className="flex items-center gap-1.5">
                                          {(() => {
                                            const currentStatus = String(lead.Estado || "").trim()
                                            const hasDate = Boolean(lead.fecha_de_visita)
                                            const statusForDisplay = docInvalid
                                              ? "Datos Incompletos"
                                              : (currentStatus === "Visita Propuesta" && hasDate)
                                                ? "Visita Confirmada"
                                                : (currentStatus || "Pendiente")
                                            const statusColors = getStatusColors(statusForDisplay)
                                            const showEstadoBadge = Boolean(statusForDisplay) && statusForDisplay !== "Completo"

                                            if (showEstadoBadge) {
                                              return (
                                                <div
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                                      ["Visita Propuesta", "Visita Confirmada", "Datos Completos", "Completo", "Completado"].includes(String(statusForDisplay || "")) ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                                                    }`}
                                                  style={{
                                                    backgroundColor: statusColors.bg,
                                                    borderColor: statusColors.border,
                                                  }}
                                                    onClick={async () => {
                                                      console.log("[v0] Estado div clicked, Estado:", lead.Estado)
                                                      if (statusForDisplay === "Visita Propuesta" || statusForDisplay === "Visita Confirmada") {
                                                        console.log("[v0] Opening visit date dialog for lead:", lead.Nombre, lead.Apellidos)
                                                      console.log("[v0] Current fecha_de_visita:", lead.fecha_de_visita)
                                                    setSelectedLeadForVisit(lead)
                                                      setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                      if (lead.fecha_de_visita) {
                                                        const d = new Date(lead.fecha_de_visita)
                                                        const yyyy = d.getFullYear()
                                                        const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                        const dd = String(d.getDate()).padStart(2, "0")
                                                        const hh = String(d.getHours()).padStart(2, "0")
                                                        const min = String(d.getMinutes()).padStart(2, "0")
                                                        setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                        setNewVisitDateTime(`${hh}:${min}`)
                                                      } else {
                                                        setNewVisitDateDate("")
                                                        setNewVisitDateTime("12:00")
                                                      }
                                                      setVisitDateDialogOpen(true)
                                                        console.log("[v0] Dialog should now be open")
                                                      } else if (statusForDisplay === "Datos Completos" || statusForDisplay === "Completo" || statusForDisplay === "Completado") {
                                                        setSelectedLeadForVisit(lead)
                                                        setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                        if (lead.fecha_de_visita) {
                                                          const d = new Date(lead.fecha_de_visita)
                                                          const yyyy = d.getFullYear()
                                                          const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                          const dd = String(d.getDate()).padStart(2, "0")
                                                          const hh = String(d.getHours()).padStart(2, "0")
                                                          const min = String(d.getMinutes()).padStart(2, "0")
                                                          setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                          setNewVisitDateTime(`${hh}:${min}`)
                                                        } else {
                                                          setNewVisitDateDate("")
                                                          setNewVisitDateTime("12:00")
                                                        }
                                                        setVisitDateDialogOpen(true)
                                                      } else {
                                                        console.log("[v0] Estado is not 'Visita Propuesta', dialog not opened")
                                                      }
                                                    }}
                                                >
                                                  <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: statusColors.text }}
                                                  >
                                                    {statusForDisplay === "Aceptado" ? "✓ " : ""}
                                                    {/* Show only the visit date without "Visita Propuesta" text */}
                                                    {(statusForDisplay === "Visita Propuesta" || statusForDisplay === "Visita Confirmada") && lead.fecha_de_visita ? (
                                                      <>
                                                          {statusForDisplay} -{" "}
                                                          {formatDate(lead.fecha_de_visita) + " " + new Date(lead.fecha_de_visita).toLocaleTimeString("es-ES", {
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                          })}
                                                        </>
                                                    ) : (
                                                      statusColors.label
                                                    )}
                                                  </span>
                                                  <div
                                                    className="h-3 w-px"
                                                    style={{ backgroundColor: statusColors.border }}
                                                  />
                                                  <div className="flex items-center gap-0.5">
                                                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                    <span
                                                      className="text-xs font-semibold"
                                                      style={{ color: statusColors.text }}
                                                    >
                                                      {completionPercentage}%
                                                    </span>
                                                  </div>
                                                </div>
                                              )
                                              } else if (isDataComplete) {
                                              return (
                                                <div
                                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 cursor-pointer hover:opacity-80 transition-opacity"
                                                  onClick={async () => {
                                                    setSelectedLeadForVisit(lead)
                                                    setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                                    if (lead.fecha_de_visita) {
                                                      const d = new Date(lead.fecha_de_visita)
                                                      const yyyy = d.getFullYear()
                                                      const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                      const dd = String(d.getDate()).padStart(2, "0")
                                                      const hh = String(d.getHours()).padStart(2, "0")
                                                      const min = String(d.getMinutes()).padStart(2, "0")
                                                      setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                      setNewVisitDateTime(`${hh}:${min}`)
                                                    } else {
                                                      setNewVisitDateDate("")
                                                      setNewVisitDateTime("12:00")
                                                    }
                                                    setIsAgentSelectionOnly(false)
                                                    setVisitDateDialogOpen(true)
                                                  }}
                                                >
                                                  <span className="text-xs font-semibold text-green-800">
                                                    Datos Completos
                                                  </span>
                                                  <div className="h-3 w-px bg-green-400" />
                                                  <div className="flex items-center gap-0.5">
                                                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                                    <span className="text-xs font-semibold text-green-700">
                                                      {completionPercentage}%
                                                    </span>
                                                  </div>
                                                </div>
                                              )
                                            } else {
                                              return (
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-orange-100! border border-amber-300 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:border-amber-700">
                                                  <span className="text-xs font-semibold text-amber-800! dark:text-amber-200 whitespace-nowrap">
                                                    Incompleto
                                                  </span>
                                                  <div className="h-3 w-px bg-amber-400 dark:bg-amber-700" />
                                                  <div className="flex items-center gap-0.5">
                                                    <Star className="h-2.5 w-2.5 fill-amber-600 text-amber-600" />
                                                      <span className="text-xs font-semibold text-amber-800! dark:text-amber-300">
                                                        {completionPercentage}%
                                                      </span>
                                                  </div>
                                                </div>
                                              )
                                            }
                                          })()}
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 text-xs text-muted-foreground mb-2">
                                        <div className="flex items-center gap-1">
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate">{lead.Correo || "Sin email"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Phone className="h-3 w-3" />
                                          <span>{lead.Telefono || "Sin teléfono"}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Building className="h-3 w-3" />
                                          <span className="truncate">{lead.Inmueble || "Sin inmueble"}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3 text-xs">
                                        <div className="flex items-center gap-1 text-green-600">
                                          <Euro className="h-3 w-3" />
                                          <span className="font-medium">
                                            {formatCurrency(
                                              (lead.Ingresos || 0) +
                                                (lead.Ingresos_2 || 0) +
                                                (lead.Ingresos_3 || 0) +
                                                (lead.Ingresos_4 || 0),
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDateTime(lead.created_at)}</span>
                                          </div>
                                      </div>
                                      

                                    </div>
                                  </div>

                                    {/* Quick Actions */}
                                    <TooltipProvider>
                                      <div className="flex items-center gap-1 ml-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className={`h-6 w-6 p-0 ${
                                            lead.Observaciones || lead.Obsevaciones
                                              ? "bg-amber-400 border-amber-500 hover:bg-amber-500 dark:bg-amber-600 dark:border-amber-700 dark:hover:bg-amber-700"
                                              : "bg-transparent"
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openNoteDialog(lead)
                                          }}
                                        >
                                          <MessageSquare className={`h-3 w-3 ${lead.Observaciones || lead.Obsevaciones ? "text-black dark:text-white" : ""}`} />
                                        </Button>
                                          </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Ver/Editar Notas</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 w-6 p-0 bg-transparent"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (lead.Correo) {
                                                window.open(`mailto:${lead.Correo}`, "_blank")
                                              }
                                            }}
                                            disabled={planInactive || !lead.Correo}
                                          >
                                            <Mail className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Enviar correo</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-6 w-6 p-0 bg-transparent"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              if (lead.Telefono) {
                                                window.open(`https://wa.me/${lead.Telefono.replace(/\D/g, "")}`, "_blank")
                                              }
                                            }}
                                            disabled={planInactive || !lead.Telefono}
                                          >
                                            <WhatsAppIcon className="h-3 w-3" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Contactar por WhatsApp</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      <DropdownMenu>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="h-6 w-6 p-0 bg-transparent"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                }}
                                                disabled={planInactive}
                                              >
                                                <MoreVertical className="h-3 w-3" />
                                              </Button>
                                            </DropdownMenuTrigger>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Cambiar estado</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              updateLeadStatus(Number(lead.id), "Datos Incompletos")
                                            }}
                                          >
                                            Datos Incompletos
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              updateLeadStatus(Number(lead.id), "Datos Completos")
                                            }}
                                          >
                                            Datos Completos
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedLeadForVisit(lead)
                                              setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
                                              if (lead.fecha_de_visita) {
                                                const d = new Date(lead.fecha_de_visita)
                                                const yyyy = d.getFullYear()
                                                const mm = String(d.getMonth() + 1).padStart(2, "0")
                                                const dd = String(d.getDate()).padStart(2, "0")
                                                const hh = String(d.getHours()).padStart(2, "0")
                                                const min = String(d.getMinutes()).padStart(2, "0")
                                                setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                                setNewVisitDateTime(`${hh}:${min}`)
                                              } else {
                                                setNewVisitDateDate("")
                                                setNewVisitDateTime("12:00")
                                              }
                                              setVisitDateDialogOpen(true)
                                              updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                            }}
                                          >
                                            Visita Propuesta
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              updateLeadStatus(Number(lead.id), "Descartado")
                                            }}
                                          >
                                            Descartado
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setSelectedLead(lead)
                                              openAvalDialog()
                                              updateLeadStatus(Number(lead.id), "Pedir Aval")
                                            }}
                                          >
                                            Aval Pedido
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-red-600"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              openDeleteDialog(lead)
                                            }}
                                          >
                                            Eliminar Lead
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TooltipProvider>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <p className="text-muted-foreground">No se encontraron leads</p>
                          </CardContent>
                        </Card>
                      )}
                      {filteredLeads.length > visibleCount && (
                        <div className="flex justify-center mt-2">
                          <Button size="sm" variant="outline" onClick={() => setVisibleCount((c) => c + 100)}>
                            Mostrar más
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {selectedLead && mounted && createPortal(
          <>
            <div className="fixed inset-0 bg-black/50 z-[20050]" onClick={handleCloseModal} />

            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[20051] bg-background rounded-lg max-w-[1200px] w-[95vw] max-h-[90vh] shadow-xl flex flex-col h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full max-w-full">
                <div className="border-b border-border p-5 px-6 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h1 className="text-2xl font-bold m-0">{selectedLead.Nombre || "Sin nombre"}</h1>
                    <span className="text-sm text-muted-foreground font-normal">| {selectedLead.Inmueble || "Sin inmueble"}</span>
                    <span className="text-xs text-muted-foreground ml-2">Fecha Entrada: {selectedLead.created_at ? formatDateTime(selectedLead.created_at) : "N/A"}</span>
                    {selectedLead.origen && (
                      <Badge variant="secondary" className="text-xs ml-2 flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        Origen: {selectedLead.origen}
                      </Badge>
                    )}
                  </div>
                  <button className="p-1 text-muted-foreground hover:text-foreground cursor-pointer z-[9995]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCloseModal(); }}>
                    <X size={20} />
                  </button>
                </div>

                <div className="p-4 px-6 border-b border-border flex-shrink-0">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-transparent text-muted-foreground border border-input rounded-md text-sm ${planInactive ? "opacity-50 cursor-not-allowed" : selectedLead.Telefono ? "cursor-pointer" : "cursor-not-allowed"}`}
                        onClick={() => {
                          if (selectedLead.Telefono) {
                            window.open(`https://wa.me/${selectedLead.Telefono.replace(/\D/g, "")}`, "_blank")
                          }
                        }}
                        disabled={planInactive || !selectedLead.Telefono}
                      >
                        <Phone size={16} />
                        WhatsApp
                      </button>
                      <button
                        className={`inline-flex items-center gap-2 px-4 py-2 bg-transparent text-muted-foreground border border-input rounded-md text-sm ${planInactive ? "opacity-50 cursor-not-allowed" : selectedLead.Correo ? "cursor-pointer" : "cursor-not-allowed"}`}
                        onClick={() => {
                          if (selectedLead.Correo) {
                            window.open(`mailto:${selectedLead.Correo}`, "_blank")
                          }
                        }}
                        disabled={planInactive || !selectedLead.Correo}
                      >
                        <Mail size={16} />
                        Correo
                      </button>
                    </div>
                    <div className={`${planInactive ? "pointer-events-none opacity-50" : ""} flex gap-2 flex-wrap`}>
                      <LeadApproveWrapper
                        lead={selectedLead}
                        updateLeadStatus={updateLeadStatus}
                        onLeadUpdated={(updatedLead) => {
                          setSelectedLead(updatedLead)
                          setLeads((prev) => prev.map((l) => (String(l.id) === String(updatedLead.id) ? { ...l, ...updatedLead } : l)))
                          setFilteredLeads((prev) => prev.map((l) => (String(l.id) === String(updatedLead.id) ? { ...l, ...updatedLead } : l)))
                        }}
                      />
                      <button
                        className={`flex items-center gap-0.5 px-3 py-2 text-sm font-medium border border-blue-700 text-blue-700 dark:border-blue-400 dark:text-blue-400 rounded-md transition-all ${planInactive ? "pointer-events-none opacity-50 cursor-not-allowed" : "hover:bg-blue-100 hover:border-blue-800 hover:text-blue-800 dark:hover:bg-blue-900/40"}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (planInactive) return
                          openAvalDialog()
                        }}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Pedir Aval
                      </button>
                      <LeadDenyWrapper
                        lead={selectedLead}
                        updateLeadStatus={updateLeadStatus}
                        onLeadUpdated={(updatedLead) => {
                          setSelectedLead(updatedLead)
                          setLeads((prev) => prev.map((l) => (String(l.id) === String(updatedLead.id) ? { ...l, ...updatedLead } : l)))
                          setFilteredLeads((prev) => prev.map((l) => (String(l.id) === String(updatedLead.id) ? { ...l, ...updatedLead } : l)))
                        }}
                      />

                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-6">
                  <div className="flex gap-6 min-h-full">
                    <div className="flex-[2] flex flex-col gap-5 min-w-0">
                      {/* Vintage File Folder Tabs */}
                      {(selectedLead?.Persona_2 || selectedLead?.Persona_3 || selectedLead?.Persona_4) && (
                        <div className="flex gap-1 mb-0 justify-between items-center">
                          <div className="flex gap-1">
                            {/* Persona 1 Tab */}
                            <button
                              onClick={() => setSelectedPersona(1)}
                              className={`
                              relative px-6 py-2.5 text-sm font-medium
                              border border-border rounded-t-lg
                              transition-all duration-200
                              ${
                                selectedPersona === 1
                                  ? "bg-background text-foreground border-b-transparent z-10 -mb-px shadow-sm"
                                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                              }
                            `}
                            >
                              <span className="tracking-wide">{selectedLead?.Nombre || "Persona 1"}</span>
                              {selectedPersona === 1 && (
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-background" />
                              )}
                            </button>

                            {/* Persona 2 Tab */}
                            {selectedLead?.Persona_2 && (
                              <button
                                onClick={() => setSelectedPersona(2)}
                                className={`
                                relative px-6 py-2.5 text-sm font-medium
                                border-2 rounded-t-lg
                                transition-all duration-200
                                ${
                                  selectedPersona === 2
                                    ? selectedLead.tipo2 === "Avalista"
                                      ? "bg-emerald-100 text-emerald-950 border-emerald-600 border-b-transparent z-10 -mb-px shadow-md font-bold dark:bg-emerald-800 dark:text-white dark:border-emerald-400"
                                      : "bg-background text-foreground border-b-transparent z-10 -mb-px shadow-sm"
                                    : selectedLead.tipo2 === "Avalista"
                                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/60"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                }
                              `}
                              >
                                <span className="tracking-wide font-semibold">
                                  {selectedLead.tipo2 === "Avalista" ? "🛡️ AVALISTA: " : ""}{selectedLead.Persona_2}
                                </span>
                                {selectedPersona === 2 && (
                                  <div className="absolute bottom-0 left-0 right-0 h-px bg-background" />
                                )}
                              </button>
                            )}

                            {/* Persona 3 Tab */}
                            {selectedLead?.Persona_3 && (
                              <button
                                onClick={() => setSelectedPersona(3)}
                                className={`
                                relative px-6 py-2.5 text-sm font-medium
                                border-2 rounded-t-lg
                                transition-all duration-200
                                ${
                                  selectedPersona === 3
                                    ? selectedLead.tipo3 === "Avalista"
                                      ? "bg-emerald-100 text-emerald-950 border-emerald-600 border-b-transparent z-10 -mb-px shadow-md font-bold dark:bg-emerald-800 dark:text-white dark:border-emerald-400"
                                      : "bg-background text-foreground border-b-transparent z-10 -mb-px shadow-sm"
                                    : selectedLead.tipo3 === "Avalista"
                                      ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/60"
                                      : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                }
                              `}
                              >
                                <span className="tracking-wide font-semibold">
                                  {selectedLead.tipo3 === "Avalista" ? "🛡️ AVALISTA: " : ""}{selectedLead.Persona_3}
                                </span>
                                {selectedPersona === 3 && (
                                  <div className="absolute bottom-0 left-0 right-0 h-px bg-background" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Persona 4 (AVAL) Tab - Aligned to the right with different style */}
                          {selectedLead?.Persona_4 && (
                            <button
                              onClick={() => setSelectedPersona(4)}
                              className={`
                              relative px-6 py-2.5 text-sm font-medium
                              border-2 rounded-t-lg
                              transition-all duration-200
                              ${
                                selectedPersona === 4
                                  ? selectedLead.tipo4 === "Avalista" 
                                    ? "bg-emerald-100 text-emerald-950 border-emerald-600 border-b-transparent z-10 -mb-px shadow-md font-bold dark:bg-emerald-800 dark:text-white dark:border-emerald-400"
                                    : "bg-amber-50 text-amber-900 border-amber-500 border-b-transparent z-10 -mb-px shadow-md dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-500"
                                  : selectedLead.tipo4 === "Avalista"
                                    ? "bg-emerald-50 text-emerald-900 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700 dark:hover:bg-emerald-900/60"
                                    : "bg-amber-100/50 text-amber-700 border-amber-300 hover:bg-amber-100 hover:border-amber-400 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800 dark:hover:bg-amber-900/40"
                              }
                            `}
                            >
                              <span className="tracking-wide font-semibold">
                                🛡️ {selectedLead.tipo4 === "Avalista" ? "AVALISTA" : "AVAL"}: {selectedLead.Persona_4}
                              </span>
                              {selectedPersona === 4 && (
                                <div className="absolute bottom-0 left-0 right-0 h-px bg-amber-50" />
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {selectedPersona === 1 && (
                        <div
                          className={`
                            border border-border bg-background p-5 shadow-sm
                            ${selectedLead?.Persona_2 || selectedLead?.Persona_3 || selectedLead?.Persona_4 ? "rounded-tr-lg rounded-b-lg" : "rounded-lg"}
                          `}
                        >
                          <div className="flex justify-between items-center mb-5">
                            <div className="flex flex-col gap-1">
                              <h2 className="text-lg font-semibold">Información Personal</h2>
                            </div>
                            {!isEditingPersonalInfo ? (
                              <button
                                className="flex items-center gap-2 bg-none border-none text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => setIsEditingPersonalInfo(true)}
                              >
                                <Edit size={14} />
                                Editar
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                  onClick={savePersonalInfo}
                                >
                                  <Check size={14} />
                                  Guardar
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-4">
                            {/* Row 1 */}
                            <div style={{ display: "flex", gap: "1.5rem" }}>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <span className="text-[10px] text-muted-foreground/70 font-normal">ID: {selectedLead.id}</span>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Email
                                  {!isEditingPersonalInfo && selectedLead.Correo && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead.Correo!, "Email")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Email" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar email</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Correo || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Correo: e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm break-words ${selectedLead.Correo ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Correo || "No especificado"}
                                    {selectedLead.correo_proxy && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <div className="text-xs text-muted-foreground cursor-help border-b border-dotted border-muted-foreground/50 max-w-full truncate">
                                                Proxy: {selectedLead.correo_proxy.substring(0, 10)}...{selectedLead.correo_proxy.includes("@") ? selectedLead.correo_proxy.split("@")[1] : selectedLead.correo_proxy.slice(-10)}
                                              </div>
                                            </TooltipTrigger>
                                            <TooltipContent side="bottom" className="max-w-[300px] break-all">
                                              <p>{selectedLead.correo_proxy}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>

                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  copyToClipboard(selectedLead.correo_proxy!, "Proxy Email")
                                                }}
                                                className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                              >
                                                {copiedField === "Proxy Email" ? (
                                                  <Check size={12} className="text-emerald-500" />
                                                ) : (
                                                  <Copy size={12} />
                                                )}
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>Copiar proxy</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Teléfono
                                  {!isEditingPersonalInfo && selectedLead.Telefono && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead.Telefono!, "Teléfono")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Teléfono" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar teléfono</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Telefono || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Telefono: e.target.value })}
                                    placeholder="+34 600 000 000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-foreground">
                                    {selectedLead.Telefono || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  País
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Pais || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Pais: e.target.value })}
                                    placeholder="España"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Pais ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Pais || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 2 */}
                            <div style={{ display: "flex", gap: "1.5rem" }}>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Ingresos
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    type="number"
                                    value={editFormData.Ingresos || ""}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        Ingresos: Number.parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="2000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Ingresos ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Ingresos ? formatCurrency(selectedLead.Ingresos) : "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Código Postal
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Codigo_Postal || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Codigo_Postal: e.target.value })}
                                    placeholder="28001"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Codigo_Postal ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Codigo_Postal || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Tipo Documento
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Tipo_Documento || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Tipo_Documento: e.target.value })}
                                    placeholder="DNI, NIE, Pasaporte"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Tipo_Documento ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Tipo_Documento || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 3 */}
                            <div style={{ display: "flex", gap: "1.5rem" }}>
                              <div style={{ flex: "1", minWidth: 0 }}>
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Documento de Identidad
                                  {!isEditingPersonalInfo && selectedLead.Documento && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() =>
                                              copyToClipboard(selectedLead.Documento!, "Documento de Identidad")
                                            }
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Documento de Identidad" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar documento</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Documento || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Documento: e.target.value })}
                                    placeholder="12345678A"
                                    className={`h-9 text-sm ${isDocumentInvalid(editFormData.Tipo_Documento, editFormData.Documento) ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento ? "not-italic text-foreground" : "italic text-muted-foreground"} ${isDocumentInvalid(selectedLead.Tipo_Documento, selectedLead.Documento) ? "text-red-600" : ""}`}>
                                    {selectedLead.Documento || "No proporcionado"}
                                  </div>
                                )}
                                {(isEditingPersonalInfo
                                  ? isDocumentInvalid(editFormData.Tipo_Documento, editFormData.Documento)
                                  : isDocumentInvalid(selectedLead.Tipo_Documento, selectedLead.Documento)) && (
                                  <div className="text-xs text-red-600">Número de documento no válido</div>
                                )}
                              </div>
                              <div style={{ flex: "2" }}>
                                {(selectedLead.m_error || selectedLead.m_errror) && (
                                  <>
                                    <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                      Datos faltantes o erroneos:
                                    </div>
                                    <div className="text-sm not-italic text-red-600 font-medium">
                                      {selectedLead.m_error || selectedLead.m_errror}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      )}

                      {selectedPersona === 2 && selectedLead?.Persona_2 && (
                        <div className="border border-border bg-background p-5 shadow-sm rounded-lg">
                          <div className="flex justify-between items-center mb-5">
                            <div className="flex flex-col gap-1">
                              <h2 className="text-lg font-semibold m-0">
                                Información Persona 2
                              </h2>
                              <div className="text-xs text-muted-foreground font-medium">
                                Tipo: {selectedLead.tipo2 || "No especificado"}
                              </div>
                            </div>
                            {!isEditingPersonalInfo ? (
                              <button
                                className="flex items-center gap-2 bg-none border-none text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => setIsEditingPersonalInfo(true)}
                              >
                                <Edit size={14} />
                                Editar
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                  onClick={savePersonalInfo}
                                >
                                  <Check size={14} />
                                  Guardar
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-4">
                            {/* Row 1: Nombre and Correo */}
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Nombre Persona 2
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Persona_2 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Persona_2: e.target.value })}
                                    placeholder="Nombre del familiar/contacto"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Persona_2 ? "not-italic text-foreground font-medium" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Persona_2 || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Correo Persona 2
                                  {!isEditingPersonalInfo && selectedLead["Correo 2"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Correo 2"]!, "Correo Persona 2")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Correo Persona 2" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar correo</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Correo 2"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Correo 2": e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm break-words ${selectedLead["Correo 2"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Correo 2"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 2: Telefono and Pais */}
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Teléfono Persona 2
                                  {!isEditingPersonalInfo && selectedLead["Telefono 2"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Telefono 2"]!, "Teléfono Persona 2")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Teléfono Persona 2" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar teléfono</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Telefono 2"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Telefono 2": e.target.value })}
                                    placeholder="+34 600 000 000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-foreground">
                                    {selectedLead["Telefono 2"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  País Persona 2
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Pais_2 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Pais_2: e.target.value })}
                                    placeholder="España"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Pais_2 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Pais_2 || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 3: Ingresos and Codigo Postal */}
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Ingresos Persona 2 (€)
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    type="number"
                                    value={editFormData.Ingresos_2 || ""}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        Ingresos_2: Number.parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="2000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Ingresos_2 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Ingresos_2 ? formatCurrency(selectedLead.Ingresos_2) : "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Código Postal Persona 2
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Codigo_Postal 2"] || ""}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, "Codigo_Postal 2": e.target.value })
                                    }
                                    placeholder="28001"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Codigo_Postal 2"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Codigo_Postal 2"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Row 4: Tipo Documento and Documento */}
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">
                                  Tipo Documento Persona 2
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Tipo_Documento_2 || ""}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, Tipo_Documento_2: e.target.value })
                                    }
                                    placeholder="DNI, NIE, Pasaporte"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Tipo_Documento_2 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Tipo_Documento_2 || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">
                                  Documento Persona 2
                                  {!isEditingPersonalInfo && selectedLead.Documento_2 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead.Documento_2!, "Documento Persona 2")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Documento Persona 2" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar documento</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Documento_2 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Documento_2: e.target.value })}
                                    placeholder="12345678A"
                                    className={`h-9 text-sm ${isDocumentInvalid(editFormData.Tipo_Documento_2, editFormData.Documento_2) ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_2 ? "not-italic text-foreground" : "italic text-muted-foreground"} ${isDocumentInvalid(selectedLead.Tipo_Documento_2, selectedLead.Documento_2) ? "text-red-600" : ""}`}>
                                    {selectedLead.Documento_2 || "No especificado"}
                                  </div>
                                )}
                                {(isEditingPersonalInfo
                                  ? isDocumentInvalid(editFormData.Tipo_Documento_2, editFormData.Documento_2)
                                  : isDocumentInvalid(selectedLead.Tipo_Documento_2, selectedLead.Documento_2)) && (
                                  <div className="text-xs text-red-600">Número de documento no válido</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {selectedPersona === 4 && selectedLead?.Persona_4 && (
                        <div className="border border-border bg-background p-5 shadow-sm rounded-lg">
                          <div className="flex justify-between items-center mb-5">
                            <div className="flex flex-col gap-1">
                              <h2 className="text-lg font-semibold m-0">🛡️ Información del AVAL</h2>
                              <div className="text-xs text-muted-foreground">Datos del avalista o garante</div>
                              <div className="text-xs text-muted-foreground font-medium">
                                Tipo: {selectedLead.tipo4 || "No especificado"}
                              </div>
                            </div>
                            {!isEditingPersonalInfo ? (
                              <button
                                className="flex items-center gap-2 bg-none border-none text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => setIsEditingPersonalInfo(true)}
                              >
                                <Edit size={14} />
                                Editar
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                  onClick={savePersonalInfo}
                                >
                                  <Check size={14} />
                                  Guardar
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Nombre del AVAL</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Persona_4 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Persona_4: e.target.value })}
                                    placeholder="Nombre del avalista"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Persona_4 ? "not-italic text-foreground font-medium" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Persona_4 || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Correo del AVAL
                                  {!isEditingPersonalInfo && selectedLead["Correo 4"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Correo 4"]!, "Correo del AVAL")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Correo del AVAL" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar correo</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Correo 4"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Correo 4": e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm break-words ${selectedLead["Correo 4"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Correo 4"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Teléfono del AVAL
                                  {!isEditingPersonalInfo && selectedLead["Telefono 4"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Telefono 4"]!, "Teléfono del AVAL")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Teléfono del AVAL" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar teléfono</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Telefono 4"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Telefono 4": e.target.value })}
                                    placeholder="+34 600 000 000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-foreground">
                                    {selectedLead["Telefono 4"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">País del AVAL</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Pais 4"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Pais 4": e.target.value })}
                                    placeholder="España"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Pais 4"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Pais 4"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Ingresos del AVAL (€)</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    type="number"
                                    value={editFormData.Ingresos_4 || ""}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        Ingresos_4: Number.parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="2000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Ingresos_4 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Ingresos_4 ? formatCurrency(selectedLead.Ingresos_4) : "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Código Postal del AVAL</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Codigo_Postal 4"] || ""}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, "Codigo_Postal 4": e.target.value })
                                    }
                                    placeholder="28001"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Codigo_Postal 4"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Codigo_Postal 4"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Tipo Documento del AVAL</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Tipo_Documento 4"] || ""}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, "Tipo_Documento 4": e.target.value })
                                    }
                                    placeholder="DNI, NIE, Pasaporte"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Tipo_Documento 4"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Tipo_Documento 4"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Documento del AVAL
                                  {!isEditingPersonalInfo && selectedLead.Documento_4 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead.Documento_4!, "Documento del AVAL")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Documento del AVAL" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar documento</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Documento_4 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Documento_4: e.target.value })}
                                    placeholder="12345678A"
                                    className={`h-9 text-sm ${isDocumentInvalid(editFormData["Tipo_Documento 4"], editFormData.Documento_4) ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_4 ? "not-italic text-foreground" : "italic text-muted-foreground"} ${isDocumentInvalid(selectedLead["Tipo_Documento 4"], selectedLead.Documento_4) ? "text-red-600" : ""}`}>
                                    {selectedLead.Documento_4 || "No especificado"}
                                  </div>
                                )}
                                {(isEditingPersonalInfo
                                  ? isDocumentInvalid(editFormData["Tipo_Documento 4"], editFormData.Documento_4)
                                  : isDocumentInvalid(selectedLead["Tipo_Documento 4"], selectedLead.Documento_4)) && (
                                  <div className="text-xs text-red-600">Número de documento no válido</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Add Persona 3 section */}
                      {selectedPersona === 3 && selectedLead?.Persona_3 && (
                        <div className="border border-border bg-background p-5 shadow-sm rounded-lg">
                          <div className="flex justify-between items-center mb-5">
                            <div className="flex flex-col gap-1">
                              <h2 className="text-lg font-semibold m-0">Información Persona 3</h2>
                              <div className="text-xs text-muted-foreground font-medium">
                                Tipo: {selectedLead.tipo3 || "No especificado"}
                              </div>
                            </div>
                            {!isEditingPersonalInfo ? (
                              <button
                                className="flex items-center gap-2 bg-none border-none text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                                onClick={() => setIsEditingPersonalInfo(true)}
                              >
                                <Edit size={14} />
                                Editar
                              </button>
                            ) : (
                              <div className="flex gap-2">
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                  onClick={savePersonalInfo}
                                >
                                  <Check size={14} />
                                  Guardar
                                </button>
                                <button
                                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white border-none rounded-md text-sm cursor-pointer font-medium hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                  Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Nombre Persona 3</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Persona_3 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Persona_3: e.target.value })}
                                    placeholder="Nombre del familiar/contacto"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Persona_3 ? "not-italic text-foreground font-medium" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Persona_3 || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Correo Persona 3
                                  {!isEditingPersonalInfo && selectedLead["Correo 3"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Correo 3"]!, "Correo Persona 3")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Correo Persona 3" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar correo</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Correo 3"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Correo 3": e.target.value })}
                                    placeholder="email@ejemplo.com"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm break-words ${selectedLead["Correo 3"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Correo 3"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Teléfono Persona 3
                                  {!isEditingPersonalInfo && selectedLead["Telefono 3"] && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead["Telefono 3"]!, "Teléfono Persona 3")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Teléfono Persona 3" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar teléfono</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Telefono 3"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Telefono 3": e.target.value })}
                                    placeholder="+34 600 000 000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className="text-sm font-medium text-foreground">
                                    {selectedLead["Telefono 3"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">País Persona 3</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Pais 3"] || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, "Pais 3": e.target.value })}
                                    placeholder="España"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Pais 3"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Pais 3"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Ingresos Persona 3 (€)</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    type="number"
                                    value={editFormData.Ingresos_3 || ""}
                                    onChange={(e) =>
                                      setEditFormData({
                                        ...editFormData,
                                        Ingresos_3: Number.parseFloat(e.target.value) || 0,
                                      })
                                    }
                                    placeholder="2000"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Ingresos_3 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Ingresos_3 ? formatCurrency(selectedLead.Ingresos_3) : "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Código Postal Persona 3</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData["Codigo_Postal 3"] || ""}
                                    onChange={(e) =>
                                      setEditFormData({ ...editFormData, "Codigo_Postal 3": e.target.value })
                                    }
                                    placeholder="28001"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead["Codigo_Postal 3"] ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead["Codigo_Postal 3"] || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5">Tipo Documento Persona 3</div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Tipo_Documento_3 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Tipo_Documento_3: e.target.value })}
                                    placeholder="DNI, NIE, Pasaporte"
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Tipo_Documento_3 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Tipo_Documento_3 || "No especificado"}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs text-muted-foreground font-medium mb-1.5 flex items-center gap-2">Documento Persona 3
                                  {!isEditingPersonalInfo && selectedLead.Documento_3 && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            onClick={() => copyToClipboard(selectedLead.Documento_3!, "Documento Persona 3")}
                                            className="bg-transparent border-none cursor-pointer p-0 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                                          >
                                            {copiedField === "Documento Persona 3" ? (
                                              <Check size={14} className="text-emerald-500" />
                                            ) : (
                                              <Copy size={14} />
                                            )}
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Copiar documento</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                </div>
                                {isEditingPersonalInfo ? (
                                  <Input
                                    value={editFormData.Documento_3 || ""}
                                    onChange={(e) => setEditFormData({ ...editFormData, Documento_3: e.target.value })}
                                    placeholder="12345678A"
                                    className={`h-9 text-sm ${isDocumentInvalid(editFormData.Tipo_Documento_3, editFormData.Documento_3) ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_3 ? "not-italic text-foreground" : "italic text-muted-foreground"} ${isDocumentInvalid(selectedLead.Tipo_Documento_3, selectedLead.Documento_3) ? "text-red-600" : ""}`}>
                                    {selectedLead.Documento_3 || "No especificado"}
                                  </div>
                                )}
                                {(isEditingPersonalInfo
                                  ? isDocumentInvalid(editFormData.Tipo_Documento_3, editFormData.Documento_3)
                                  : isDocumentInvalid(selectedLead.Tipo_Documento_3, selectedLead.Documento_3)) && (
                                  <div className="text-xs text-red-600">Número de documento no válido</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4">
                        <div className="flex gap-4">
                          {/* Status Card */}
                          <div className="border border-border rounded-lg p-3 flex-1 flex flex-col">
                            <div className="text-xs font-semibold uppercase tracking-wider mb-2 pl-1">Estado</div>
                            {(() => {
                              const currentStatus = String(selectedLead.Estado || "").trim()
                              const effectiveStatus = (currentStatus === "Visita Propuesta" && selectedLead.fecha_de_visita) 
                                ? "Visita Confirmada" 
                                : selectedLead.Estado
                              const colors = getStatusColors(effectiveStatus)

                              return (
                                <Select
                                  value={String(selectedLead.Estado || "Pendiente")}
                                  onValueChange={(value) => updateLeadStatus(Number(selectedLead.id), value)}
                                >
                                  <SelectTrigger 
                                    className="w-full h-auto flex-1 p-4 border-2 rounded-lg flex flex-col items-center justify-center gap-2 hover:opacity-90 transition-all focus:ring-0 shadow-sm outline-none [&>svg]:hidden"
                                    style={{
                                      backgroundColor: colors.bg,
                                      borderColor: colors.border,
                                    }}
                                  >
                                    <div 
                                      className="text-xl font-bold text-center leading-tight whitespace-pre-wrap"
                                      style={{ color: colors.text }}
                                    >
                                      {effectiveStatus === "Datos Completos" ? (
                                        <>
                                          Datos<br />Completos
                                        </>
                                      ) : (
                                        effectiveStatus === "Aceptado" ? "Aprobado" : (effectiveStatus || "Pendiente")
                                      )}
                                    </div>
                                    
                                    {((effectiveStatus === "Visita Propuesta" || effectiveStatus === "Visita Confirmada") && selectedLead.fecha_de_visita) && (
                                      <div 
                                        className="font-medium text-sm mt-1"
                                        style={{ color: colors.text }}
                                      >
                                        {new Date(selectedLead.fecha_de_visita).toLocaleString("es-ES", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </div>
                                    )}
                                    
                                    <div 
                                      className="text-[10px] uppercase tracking-wider opacity-60 mt-2 font-medium"
                                      style={{ color: colors.text }}
                                    >
                                      Click para cambiar el estado
                                    </div>

                                    {(selectedLead.status_history && selectedLead.status_history.length > 0) && (() => {
                                      const last = selectedLead.status_history[selectedLead.status_history.length - 1]
                                      return (
                                        <div className="mt-2 pt-2 border-t w-full text-center" style={{ borderColor: colors.border + "40" }}>
                                          <div className="text-[10px] flex flex-col items-center justify-center gap-0.5" style={{ color: colors.text }}>
                                            <span className="font-semibold">
                                              {(() => {
                                                  try {
                                                      return new Date(last.timestamp).toLocaleString("es-ES", {
                                                          day: "2-digit",
                                                          month: "2-digit",
                                                          year: "numeric",
                                                          hour: "2-digit",
                                                          minute: "2-digit"
                                                      })
                                                  } catch { return "" }
                                              })()}
                                            </span>
                                            <span className="opacity-80">
                                              Por: {(last.agent_name?.split('@')[0] === "Sistema" || !last.agent_name) ? "RaF" : last.agent_name.split('@')[0]}
                                            </span>
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </SelectTrigger>
                                  <SelectContent className="z-[99999] max-h-[300px]">
                                      {(() => {
                                        const statusOrder = [
                                          "Datos Incompletos",
                                          "Datos Completos",
                                          "Pedir Aval",
                                          "Aceptado",
                                          "Visita Propuesta",
                                          "Visita Confirmada",
                                          "Descartado"
                                        ]
                                        
                                        const uniqueStatuses = Array.from(new Set([
                                          ...availableStatuses,
                                          "Datos Completos", 
                                          "Datos Incompletos", 
                                          "Pedir Aval", 
                                          "Aceptado", 
                                          "Descartado", 
                                          "Visita Propuesta", 
                                          "Visita Completada",
                                          "Visita Confirmada"
                                        ]))

                                        const sortedStatuses = uniqueStatuses.sort((a, b) => {
                                          const indexA = statusOrder.indexOf(a)
                                          const indexB = statusOrder.indexOf(b)
                                          if (indexA !== -1 && indexB !== -1) return indexA - indexB
                                          if (indexA !== -1) return -1
                                          if (indexB !== -1) return 1
                                          return a.localeCompare(b)
                                        })

                                        return sortedStatuses.map((status) => (
                                          <SelectItem key={status} value={status}>
                                            {status === "Aceptado" ? "Aprobado" : status === "Pedir Aval" ? "Aval Pedido" : status}
                                          </SelectItem>
                                        ))
                                      })()}
                                    </SelectContent>
                                </Select>
                              )
                            })()}
                          </div>

                          {/* Visit Information - Full Width */}
                          <div className="border border-border rounded-lg p-3 flex-1 flex flex-col">
                            <h2 className="text-xs font-semibold uppercase tracking-wider mb-2 pl-1">Información de la visita</h2>
                            <div 
                              className="w-full flex-1 p-4 border-2 rounded-lg flex flex-col justify-between"
                              style={{
                                backgroundColor: "#F8FBF8",
                                borderColor: "#3b82f6",
                              }}
                            >
                            <div className="space-y-3">
                              <div className="flex gap-2">
                                <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200">
                                  <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">NOMBRE</div>
                                  <div className="relative">
                                    <select
                                      className="w-full h-6 text-black font-bold border-0 bg-transparent p-0 focus:ring-0 shadow-none hover:bg-gray-100 text-xs cursor-pointer appearance-none"
                                      value={selectedLead.idag ? String(selectedLead.idag) : "unassigned"}
                                      onChange={async (e) => {
                                        const value = e.target.value;
                                        try {
                                          const newIdag = value === "unassigned" ? null : Number(value)
                                          
                                          const { error } = await supabase
                                            .from("Clientes")
                                            .update({ idag: newIdag })
                                            .eq("id", selectedLead.id)

                                          if (error) throw error

                                          const updatedLead = { ...selectedLead, idag: newIdag }
                                          setSelectedLead(updatedLead)
                                          setLeads((prev) =>
                                            prev.map((l) => (l.id === selectedLead.id ? updatedLead : l))
                                          )
                                          toast({
                                            title: "Agente actualizado",
                                            description: "El agente ha sido reasignado correctamente",
                                          })
                                        } catch (err) {
                                          console.error("Error updating agent:", err)
                                          toast({
                                            title: "Error",
                                            description: "No se pudo actualizar el agente",
                                            variant: "destructive",
                                          })
                                        }
                                      }}
                                    >
                                      <option value="unassigned" className="text-gray-500 font-normal">Sin asignar</option>
                                      {agentes.map((agente) => (
                                        <option key={agente.idag} value={String(agente.idag)} className="text-black font-normal">
                                          {agente.Nombre || agente.nombre}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1 text-gray-700">
                                      <svg className="fill-current h-3 w-3 opacity-50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex-1 bg-gray-50 p-2 rounded border border-gray-200">
                                  <div className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-wider">FECHA</div>
                                  <div className="font-bold text-xs text-black h-6 flex items-center">
                                    {selectedLead.fecha_de_visita ? (
                                      <div className="flex flex-col leading-tight">
                                        <span>{formatDate(selectedLead.fecha_de_visita)}</span>
                                        <span className="text-[10px] text-gray-600 font-semibold">
                                          {new Date(selectedLead.fecha_de_visita).toLocaleTimeString("es-ES", {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-gray-400 italic">No programada</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                              <div className="flex gap-2 mt-4">
                                  <Button 
                                    variant="default" 
                                    size="sm" 
                                    className="flex-1 h-8 text-xs bg-black text-white hover:bg-black/90 border-0"
                                    onClick={() => {
                                      setSelectedLeadForVisit(selectedLead)
                                      setSelectedAgenteId(selectedLead.idag ? String(selectedLead.idag) : "")
                                      if (selectedLead.fecha_de_visita) {
                                        const d = new Date(selectedLead.fecha_de_visita)
                                        const yyyy = d.getFullYear()
                                        const mm = String(d.getMonth() + 1).padStart(2, "0")
                                        const dd = String(d.getDate()).padStart(2, "0")
                                        const hh = String(d.getHours()).padStart(2, "0")
                                        const min = String(d.getMinutes()).padStart(2, "0")
                                        setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
                                        setNewVisitDateTime(`${hh}:${min}`)
                                      } else {
                                        setNewVisitDateDate("")
                                        setNewVisitDateTime("12:00")
                                      }
                                      setIsAgentSelectionOnly(false)
                                      setVisitDateDialogOpen(true)
                                    }}
                                  >
                                    {selectedLead.fecha_de_visita ? "Reprogramar" : "Programar"}
                                  </Button>
                                  {selectedLead.fecha_de_visita && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="flex-1 h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                      onClick={() => {
                                        setSelectedLeadForVisit(selectedLead)
                                        setIsCancelConfirmOpen(true)
                                      }}
                                    >
                                      Cancelar
                                    </Button>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Communications - Moved Here */}
                        <div className="border rounded-lg bg-card flex flex-col h-[300px] w-full shrink-0">
                          <div className="p-4 border-b flex justify-between items-center bg-muted/20">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-semibold text-sm">Comunicaciones</h3>
                            </div>
                            <Badge variant="secondary" className="text-xs">{communications.length}</Badge>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {communications.length > 0 ? (
                              communications.map((comm) => (
                                <Card 
                                  key={comm.id} 
                                  className={`cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden ${
                                    comm.Tipo?.toLowerCase() === "recibido" 
                                      ? "border-r-4 border-r-rose-500 border-l-0" 
                                      : (comm.source === "whatsapp" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-blue-500")
                                  }`}
                                  onClick={() => openCommunicationDetail(comm)}
                                >
                                  <div className={`p-3 space-y-1 ${comm.Tipo?.toLowerCase() === "recibido" ? "ml-auto text-right" : ""}`}>
                                    <div className={`flex items-start gap-2 ${comm.Tipo?.toLowerCase() === "recibido" ? "flex-row-reverse justify-start" : "justify-between"}`}>
                                      <div className={`flex items-center gap-1.5 min-w-0 ${comm.Tipo?.toLowerCase() === "recibido" ? "flex-row-reverse" : ""}`}>
                                        {comm.source === "whatsapp" ? <Phone className="h-3 w-3 text-emerald-600" /> : <Mail className="h-3 w-3 text-blue-600" />}
                                        <span className="font-medium text-xs">{comm.source === "whatsapp" ? "WhatsApp" : "Email"}</span>
                                        <span className="text-[10px] text-muted-foreground">•</span>
                                        <span className="text-xs font-medium truncate">{comm.Subject || (comm.source === "whatsapp" ? "Mensaje" : "Sin asunto")}</span>
                                      </div>
                                      <span className="text-[10px] text-muted-foreground">{new Date(comm.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {comm.source === "whatsapp"
                                        ? cleanHtmlForPreview(comm.Mensaje) || "Sin contenido"
                                        : cleanHtmlForPreview(comm.Html || comm.Text) || "Sin contenido"}
                                    </p>
                                  </div>
                                </Card>
                              ))
                            ) : (
                              <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
                                <MessageSquare className="h-8 w-8" />
                                <p className="text-xs">No hay comunicaciones</p>
                              </div>
                            )}
                          </div>
                        </div>

                        {selectedLead?.status_history && selectedLead.status_history.length > 0 && (() => {
                          const lastEntry = selectedLead.status_history[selectedLead.status_history.length - 1]
                          const lastColors = getStatusColors(lastEntry?.status)
                          return (
                            <div className="space-y-2 shrink-0">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Historial de Estados</h3>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs border border-black"
                                  onClick={() => setShowStatusHistory((prev) => !prev)}
                                >
                                  {showStatusHistory ? "Ocultar historial" : "Ver historial"}
                                </Button>
                              </div>
                              <div className="p-4 border rounded-lg bg-card shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="px-2.5 py-1 rounded-full border text-xs font-semibold"
                                    style={{
                                      backgroundColor: lastColors.bg,
                                      borderColor: lastColors.border,
                                      color: lastColors.text,
                                    }}
                                  >
                                    {lastColors.label}
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate">
                                    {lastEntry?.agent_name ? `por ${lastEntry.agent_name}` : "Sistema/Desconocido"}
                                  </span>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {lastEntry?.timestamp ? formatDateTime(lastEntry.timestamp) : ""}
                                </span>
                              </div>
                              {showStatusHistory && (
                                <div className="p-4 border rounded-lg bg-card shadow-sm space-y-2 max-h-40 overflow-y-auto">
                                  {[...selectedLead.status_history].reverse().map((entry, idx) => {
                                    const colors = getStatusColors(entry.status)
                                    return (
                                      <div key={idx} className="flex justify-between items-center text-xs border-b last:border-0 pb-2 last:pb-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                          <div
                                            className="px-2 py-0.5 rounded-full border text-[11px] font-semibold"
                                            style={{
                                              backgroundColor: colors.bg,
                                              borderColor: colors.border,
                                              color: colors.text,
                                            }}
                                          >
                                            {colors.label}
                                          </div>
                                          <span className="text-muted-foreground truncate">
                                            {entry.agent_name ? `por ${entry.agent_name}` : "Sistema/Desconocido"}
                                          </span>
                                        </div>
                                        <span className="text-muted-foreground whitespace-nowrap">
                                          {formatDateTime(entry.timestamp)}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Right Column */}
                    <div
                      style={{
                        width: "280px",
                        flexShrink: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {/* Documentos */}
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              Documentos
                            </CardTitle>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => setIsDocsDialogOpen(true)}>
                              Gestionar
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">DNI/NIE</span>
                              <Badge variant={documentStatus.dni === "verified" ? "feature" : "refactor"} className="rounded-full">
                                {documentStatus.dni === "verified" ? "Completado" : "Pendiente"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Just. Ingresos</span>
                              <Badge variant={documentStatus.income === "verified" ? "feature" : "refactor"} className="rounded-full">
                                {documentStatus.income === "verified" ? "Completado" : "Pendiente"}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Fecha Prevista de Entrada */}
                      <Card>
                        <div className="py-2 px-4">
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              Fecha Prevista Entrada
                            </h4>
                            {!isEditingEntryDate && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-muted" onClick={startEditingEntryDate}>
                                <Edit className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            )}
                          </div>
                          
                          {isEditingEntryDate ? (
                            <div className="pl-6 space-y-3 mt-1">
                               <div className="flex gap-2">
                                 <Button 
                                    variant={entryDateType === "Inmediatamente" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEntryDateType("Inmediatamente")}
                                    className={cn("flex-1 text-xs h-7", entryDateType === "Inmediatamente" && "bg-primary text-primary-foreground")}
                                 >
                                    Inmediatamente
                                 </Button>
                                 <Button 
                                    variant={entryDateType === "Mas adelante" ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setEntryDateType("Mas adelante")}
                                    className={cn("flex-1 text-xs h-7", entryDateType === "Mas adelante" && "bg-primary text-primary-foreground")}
                                 >
                                    Fecha específica
                                 </Button>
                               </div>
                               
                               {entryDateType === "Mas adelante" && (
                                 <Input 
                                    type="date" 
                                    value={customEntryDate}
                                    onChange={(e) => setCustomEntryDate(e.target.value)}
                                    className="h-8 text-sm"
                                    min={selectedLead.created_at ? new Date(selectedLead.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                                 />
                               )}
                               
                               <div className="flex justify-end gap-2 pt-1">
                                 <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setIsEditingEntryDate(false)}>Cancelar</Button>
                                 <Button size="sm" className="h-7 text-xs" onClick={saveEntryDate}>Guardar</Button>
                               </div>
                            </div>
                          ) : (
                            <div className="pl-6 text-sm">
                              <span className="font-medium">
                                {selectedLead.prev_entrada?.toLowerCase() === "inmediatamente" ? "Inmediatamente" : 
                                 selectedLead.prev_entrada?.toLowerCase() === "mas adelante" ? "Más adelante" : 
                                 selectedLead.prev_entrada || "No especificado"}
                              </span>
                              {selectedLead.prev_entrada?.toLowerCase() === "mas adelante" && selectedLead.fecha_prev_entrada && (
                                <span className="ml-2 text-muted-foreground">
                                  {formatDate(selectedLead.fecha_prev_entrada)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Card>

                      {/* Anotaciones */}
                      <div className="border rounded-lg bg-card flex flex-col h-[400px] w-full shrink-0 shadow-sm overflow-hidden">
                        <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                          <div className="flex items-center gap-2">
                            <StickyNote className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm">Anotaciones</h3>
                          </div>
                          <Badge variant="secondary" className="text-[10px] h-5 bg-background border shadow-sm">
                            {splitNotes((selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? "").trim()).length}
                          </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                          {/* Resumen de visita */}
                          {selectedLead.resumen_visita && (
                             <div className="bg-[#DCFCE7] border border-[#16A34A] rounded-xl p-3 text-xs shadow-sm relative">
                                 <div className="flex justify-between items-start mb-2.5 pb-2 border-b border-[#16A34A]/30">
                                     <div className="flex items-center gap-2.5">
                                         <div className="h-7 w-7 rounded-full bg-[#16A34A]/10 flex items-center justify-center shrink-0 border border-[#16A34A]/30">
                                             <CalendarDays className="h-3.5 w-3.5 text-[#16A34A]" />
                                         </div>
                                         <div className="flex flex-col">
                                             <span className="font-bold text-[#16A34A] text-[11px]">Resumen de Visita</span>
                                             <span className="text-[10px] font-medium text-[#16A34A]/80">
                                                 {selectedLead.fecha_de_visita ? formatDate(selectedLead.fecha_de_visita) : "Fecha no disponible"}
                                             </span>
                                         </div>
                                     </div>
                                 </div>
                                 <div className="pl-1">
                                     <p className="whitespace-pre-wrap text-[#16A34A] leading-relaxed font-medium">{selectedLead.resumen_visita}</p>
                                 </div>
                             </div>
                          )}

                          {splitNotes((selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? "").trim()).length > 0 ? (
                            splitNotes(selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? "").map((n, idx) => {
                              const cleanHeader = n.header.replace(/^\[|\]$/g, "")
                              const [dateStr, userStr] = cleanHeader.includes(" • ")
                                ? cleanHeader.split(" • ")
                                : [cleanHeader, null]
                              return (
                                <div key={idx} className="bg-background border border-border/50 rounded-xl p-3 text-xs shadow-sm hover:shadow-md transition-all duration-200 group relative">
                                  <div className="flex justify-between items-start mb-2.5 pb-2 border-b border-border/30">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/5">
                                        <User className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-semibold text-foreground text-[11px]">{userStr || "Usuario"}</span>
                                        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1"
                                      onClick={() => handleDeleteNoteRequest(idx, selectedLead.Observaciones ?? selectedLead.Obsevaciones ?? "", 'sidebar')}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <div className="pl-1">
                                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed font-normal">{n.body}</p>
                                  </div>
                                </div>
                              )
                            })
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-40 space-y-3">
                              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                                <StickyNote className="h-6 w-6" />
                              </div>
                              <p className="text-xs font-medium">No hay anotaciones registradas</p>
                            </div>
                          )}
                        </div>
                        <div className="p-3 border-t bg-background space-y-2">
                          <Textarea
                            value={inlineNote}
                            onChange={(e) => setInlineNote(e.target.value)}
                            placeholder="Escribe una nota..."
                            className="min-h-[60px] text-xs resize-none bg-muted/30 focus-visible:ring-1 focus-visible:bg-background transition-colors"
                          />
                          <Button
                            size="sm"
                            className="w-full h-7 text-xs"
                            onClick={handleAddLeadNote}
                            disabled={!inlineNote.trim()}
                          >
                            Añadir Nota
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

        <Dialog open={isNewLeadDialogOpen} onOpenChange={setIsNewLeadDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] max-w-3xl max-h-[90vh] overflow-y-auto z-[30000]">
            <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <DialogTitle className="text-lg font-semibold">Crear Nuevo Lead</DialogTitle>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Completa la información del nuevo cliente potencial
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsNewLeadDialogOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Información Personal */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Información Personal
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Nombre Completo <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={newLeadFormData.Nombre || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Nombre: e.target.value })}
                        placeholder="Juan Pérez García"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        value={newLeadFormData.Correo || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Correo: e.target.value })}
                        placeholder="juan@ejemplo.com"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Teléfono</label>
                      <Input
                        value={newLeadFormData.Telefono || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Telefono: e.target.value })}
                        placeholder="+34 600 000 000"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">País</label>
                      <Input
                        value={newLeadFormData.Pais || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Pais: e.target.value })}
                        placeholder="España"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Código Postal</label>
                      <Input
                        value={newLeadFormData.Codigo_Postal || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Codigo_Postal: e.target.value })}
                        placeholder="28001"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Ingresos Mensuales (€)</label>
                      <Input
                        type="number"
                        value={newLeadFormData.Ingresos || ""}
                        onChange={(e) =>
                          setNewLeadFormData({ ...newLeadFormData, Ingresos: Number.parseFloat(e.target.value) || 0 })
                        }
                        placeholder="2000"
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documentación */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    Documentación
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Tipo de Documento</label>
                      <Select
                        value={String(newLeadFormData.Tipo_Documento || "")}
                        onValueChange={(value) => setNewLeadFormData({ ...newLeadFormData, Tipo_Documento: value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DNI">DNI</SelectItem>
                          <SelectItem value="NIE">NIE</SelectItem>
                          <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Número de Documento</label>
                      <Input
                        value={newLeadFormData.Documento || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Documento: e.target.value })}
                        placeholder="12345678A"
                        className={`h-9 text-sm ${isDocumentInvalid(newLeadFormData.Tipo_Documento, newLeadFormData.Documento) ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`}
                      />
                      {isDocumentInvalid(newLeadFormData.Tipo_Documento, newLeadFormData.Documento) && (
                        <div className="text-xs text-red-600">Número de documento no válido</div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Información del Inmueble */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Building className="h-4 w-4" />
                    Información del Inmueble
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Referencia del Inmueble <span className="text-red-500">*</span>
                      </label>
                      <Select
                        value={String(newLeadFormData.Inmueble || "")}
                        onValueChange={(value) => setNewLeadFormData({ ...newLeadFormData, Inmueble: value })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar inmueble" />
                        </SelectTrigger>
                        <SelectContent>
                          {advertisements.map((ad) => (
                            <SelectItem key={ad.ida} value={ad.Referencia || ""}>
                              {ad.Referencia} - {ad.Direccion}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>


                  </div>
                </CardContent>
              </Card>

              {/* Estado y Opciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <Star className="h-4 w-4" />
                    Estado y Opciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Estado</label>
                      <Select
                        value={String(newLeadFormData.Estado || "Pendiente")}
                        onValueChange={(value) => setNewLeadFormData({ ...newLeadFormData, Estado: value as Lead["Estado"] })}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pendiente">Pendiente</SelectItem>
                          <SelectItem value="Validado">Validado</SelectItem>
                          <SelectItem value="Completado">Completado</SelectItem>
                          <SelectItem value="Rechazado">Rechazado</SelectItem>
                          <SelectItem value="Aceptado">Aprobado</SelectItem>
                          <SelectItem value="Descartado">Descartado</SelectItem>
                          {/* Added 'Datos Completos' and 'Datos Incompletos' to the select options */}
                          <SelectItem value="Datos Completos">Datos Completos</SelectItem>
                          <SelectItem value="Datos Incompletos">Datos Incompletos</SelectItem>
                          <SelectItem value="Incompleto">Incompleto</SelectItem>
                          <SelectItem value="Visita Propuesta">Visita Propuesta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">¿Pedir Aval?</label>
                      <Select
                        value={newLeadFormData["Pedir Aval"] ? "true" : "false"}
                        onValueChange={(value) =>
                          setNewLeadFormData({ ...newLeadFormData, "Pedir Aval": value === "true" })
                        }
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Sí</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Observaciones */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium">
                    <MessageSquare className="h-4 w-4" />
                    Notas Adicionales
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Observaciones</label>
                      <Input
                        value={newLeadFormData.Observaciones || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Observaciones: e.target.value })}
                        placeholder="Notas sobre el candidato..."
                        className="h-9 text-sm"
                      />
                    </div>


                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setIsNewLeadDialogOpen(false)}
                disabled={isSubmittingNewLead}
              >
                Cancelar
              </Button>
              <Button className="flex-1" onClick={createNewLead} disabled={isSubmittingNewLead}>
                {isSubmittingNewLead ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    Crear Lead
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isReactivateDialogOpen} onOpenChange={setIsReactivateDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Home className="h-5 w-5 text-primary" />
                Reactivar Anuncio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <p className="text-sm text-muted-foreground">
                ¿Estás seguro de que quieres reactivar el anuncio{" "}
                <span className="font-semibold text-foreground">{advertisementToReactivate?.Referencia}</span>?
              </p>
              {advertisementToReactivate && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium">{advertisementToReactivate.Referencia}</p>
                  <p className="text-xs text-muted-foreground">{advertisementToReactivate.Direccion}</p>
                  <p className="text-sm font-semibold text-green-600 mt-1">
                    {formatCurrency(advertisementToReactivate.Precio)}
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => {
                  setIsReactivateDialogOpen(false)
                  setAdvertisementToReactivate(null)
                }}
              >
                Cancelar
              </Button>
              <Button className="flex-1 bg-primary" onClick={reactivateAdvertisement}>
                Reactivar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isAvalDialogOpen} onOpenChange={setIsAvalDialogOpen}>
          <DialogContent className="sm:max-w-lg z-[30000]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Solicitud de Aval
              </DialogTitle>
            </DialogHeader>

            {selectedLead && avalCalculation && (
              <div className="space-y-4 py-4">
                {/* Lead Information */}
                <div className="p-4 bg-gray-50 dark:bg-muted/50 rounded-lg border space-y-2 w-full overflow-hidden">
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground min-w-0">Nombre:</span>
                    <span className="text-sm font-semibold text-right whitespace-normal break-words">{selectedLead.Nombre}</span>
                  </div>
                  <div className="flex justify-between gap-2 flex-wrap">
                    <span className="text-sm font-medium text-muted-foreground min-w-0">Email:</span>
                    <span className="text-sm text-right whitespace-normal break-words">{selectedLead.Correo}</span>
                  </div>

                  <div className="pt-2 border-t space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Ingresos por Persona:</div>
                    {avalCalculation.persona1Income > 0 && (
                      <div className="flex justify-between gap-2 flex-wrap pl-2">
                        <span className="text-xs text-muted-foreground min-w-0">{selectedLead.Nombre || "Persona 1"}:</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 text-right whitespace-normal break-words">
                          {formatCurrency(avalCalculation.persona1Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona2Income > 0 && (
                      <div className="flex justify-between gap-2 flex-wrap pl-2">
                        <span className="text-xs text-muted-foreground min-w-0">{selectedLead.Persona_2 || "Persona 2"}:</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 text-right whitespace-normal break-words">
                          {formatCurrency(avalCalculation.persona2Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona3Income > 0 && (
                      <div className="flex justify-between gap-2 flex-wrap pl-2">
                        <span className="text-xs text-muted-foreground min-w-0">{selectedLead.Persona_3 || "Persona 3"}:</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 text-right whitespace-normal break-words">
                          {formatCurrency(avalCalculation.persona3Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona4Income > 0 && (
                      <div className="flex justify-between gap-2 flex-wrap pl-2">
                        <span className="text-xs text-muted-foreground min-w-0">{selectedLead.Persona_4 || "Avalista"}:</span>
                        <span className="text-xs font-medium text-green-600 dark:text-green-400 text-right whitespace-normal break-words">
                          {formatCurrency(avalCalculation.persona4Income)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2 flex-wrap pt-1.5 border-t">
                      <span className="text-sm font-medium text-muted-foreground min-w-0">Total Ingresos:</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 text-right whitespace-normal break-words">{formatCurrency(avalCalculation.income)}</span>
                    </div>
                  </div>

                  {avalCalculation.actualRent && (
                    <div className="flex justify-between gap-2 flex-wrap pt-2 border-t">
                      <span className="text-sm font-medium text-muted-foreground min-w-0">Precio alquiler:</span>
                      <span className="text-sm font-semibold text-right whitespace-normal break-words">{formatCurrency(avalCalculation.actualRent)}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-lg border space-y-4 bg-[#F8FBF8] dark:bg-zinc-600 border-gray-200 dark:border-gray-500 w-full overflow-hidden">
                  <h3
                    className="text-base font-bold text-gray-900 dark:text-gray-100"
                  >
                    Análisis de Requisito de Aval
                  </h3>

                  {(!avalCalculation.income || avalCalculation.income === 0) && (
                    <div className="p-3 rounded-md bg-orange-50 border border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
                      <p className="text-sm font-bold text-orange-800 dark:text-orange-300">⚠️ Datos de Ingresos No Disponibles</p>
                      <p className="text-sm text-orange-900 dark:text-orange-200 mt-1">
                        No se han proporcionado los ingresos del solicitante. El análisis de aval no puede ser preciso sin
                        esta información.
                      </p>
                    </div>
                  )}

                  {avalCalculation.actualRent ? (
                    <>
                      {avalCalculation.income > 0 && (
                        <div
                          className={`p-4 rounded-md border-l-4 shadow-sm ${
                            avalCalculation.needsAval
                              ? "bg-[#F8FBF8] border-red-600"
                              : "bg-[#F8FBF8] border-green-600"
                          }`}
                        >
                          <p
                            className={`text-base font-bold mb-1 ${
                              avalCalculation.needsAval ? "text-red-700" : "text-green-700"
                            }`}
                          >
                            {avalCalculation.needsAval ? "⚠️ REQUIERE AVAL" : "✓ NO REQUIERE AVAL"}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {avalCalculation.needsAval
                              ? "Los ingresos son insuficientes para cubrir el alquiler sin aval."
                              : "Los ingresos son suficientes para cubrir el alquiler sin necesidad de aval."}
                          </p>
                        </div>
                      )}

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-2 flex-wrap items-center">
                          <span className="text-gray-700 dark:text-gray-300 font-medium min-w-0">Ingresos mínimos requeridos:</span>
                          <span className="font-bold text-gray-900 dark:text-white text-base text-right whitespace-normal break-words">{formatCurrency(avalCalculation.minRequiredIncome!)}</span>
                        </div>
                        <div className="flex justify-between gap-2 flex-wrap items-center">
                          <span className="text-gray-700 dark:text-gray-300 font-medium min-w-0">Ingresos ideales:</span>
                          <span className="font-bold text-gray-900 dark:text-white text-base text-right whitespace-normal break-words">{formatCurrency(avalCalculation.idealIncome!)}</span>
                        </div>
                        {avalCalculation.incomeRatio && avalCalculation.income > 0 && (
                          <div className="flex justify-between gap-2 flex-wrap items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-gray-700 dark:text-gray-300 font-medium min-w-0">Tasa de esfuerzo:</span>
                            <span
                              className={`font-bold text-base text-right whitespace-normal break-words ${avalCalculation.incomeRatio <= 40 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {avalCalculation.incomeRatio.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 italic font-medium leading-relaxed">
                          💡 Los ingresos deben ser al menos 2.5x el precio del alquiler (máximo 40% de tasa de esfuerzo).
                          Idealmente 3.3x (30% de tasa de esfuerzo).
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300 dark:bg-yellow-900/20 dark:border-yellow-800">
                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-300">
                        ⚠ No se encontró el precio del alquiler para este inmueble
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsAvalDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      if (selectedLead.Correo) {
                        try {
                          await updateLeadStatus(Number(selectedLead.id), "Pedir Aval")

                          // Update selectedLead state to reflect the change immediately
                          setSelectedLead({ ...selectedLead, Estado: "Pedir Aval" })

                          toast({
                            title: "Solicitud enviada",
                            description: "Se ha solicitado el aval correctamente.",
                          })
                          
                          setIsAvalDialogOpen(false)
                        } catch (err) {
                          console.error("Error sending aval request:", err)
                          toast({
                            title: "Error",
                            description: "No se pudo procesar la solicitud.",
                            variant: "destructive"
                          })
                        }
                      }
                    }}
                    disabled={!selectedLead.Correo}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Enviar Solicitud
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={visitDateDialogOpen} onOpenChange={setVisitDateDialogOpen}>
          <DialogContent className="z-[30000]">
            <DialogHeader>
              <DialogTitle>
                {isAgentSelectionOnly 
                  ? "Asignar Agente" 
                  : (selectedLeadForVisit?.fecha_de_visita ? "Reprogramar Visita" : "Programar Visita")}
              </DialogTitle>
              <DialogDescription>
                {isAgentSelectionOnly
                  ? "Selecciona un agente para gestionar la visita propuesta."
                  : (selectedLeadForVisit?.fecha_de_visita
                      ? "Selecciona una nueva fecha y hora para la visita del lead."
                      : "Selecciona la fecha y hora para la visita del lead.")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Lead: {selectedLeadForVisit?.Nombre} {selectedLeadForVisit?.Apellidos}
                </label>
                <p className="text-sm text-muted-foreground">
                  Estado: <span className="font-semibold text-blue-600">Visita Propuesta</span>
                </p>
              </div>

              <div className="flex items-center space-x-2 py-2">
                <Checkbox 
                  id="agent-only" 
                  checked={isAgentSelectionOnly} 
                  onCheckedChange={(checked) => setIsAgentSelectionOnly(checked as boolean)} 
                />
                <label
                  htmlFor="agent-only"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Solo asignar agente (sin fecha)
                </label>
              </div>

              <div className="space-y-2">
                <label htmlFor="visit-agent" className="text-sm font-medium">
                  Seleccionar Agente
                </label>
                <select
                  id="visit-agent"
                  value={selectedAgenteId}
                  onChange={(e) => {
                    setSelectedAgenteId(e.target.value)
                    setNewVisitDateDate("")
                    setNewVisitDateTime("")
                  }}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Seleccionar agente</option>
                  {agentes.map((agente) => (
                    <option key={agente.idag} value={String(agente.idag)}>
                      {agente.Nombre}
                    </option>
                  ))}
                </select>
              </div>

              {!isAgentSelectionOnly && (
              <div className="space-y-2">
                <label htmlFor="visit-date" className="text-sm font-medium">
                  {selectedLeadForVisit?.fecha_de_visita ? "Nueva fecha y hora de visita" : "Fecha y hora de visita"}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Select
                      value={newVisitDateDate}
                      onValueChange={(val) => {
                        setNewVisitDateDate(val)
                        setNewVisitDateTime("")
                      }}
                      disabled={!selectedAgenteId || loadingDates}
                    >
                      <SelectTrigger className={cn(
                        "w-full justify-start text-left font-normal",
                        !newVisitDateDate && "text-muted-foreground"
                      )}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        <SelectValue placeholder={loadingDates ? "Cargando..." : "Seleccionar fecha"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] z-[80000]">
                      {availableDates.length > 0 ? (
                        availableDates.map((dateStr) => (
                          <SelectItem key={dateStr} value={dateStr}>
                            {format(new Date(dateStr), "PPP", { locale: es })}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          No hay fechas disponibles
                        </div>
                      )}
                    </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    {loadingAvailability ? (
                      <div className="flex items-center gap-2 p-2 h-10 border rounded-md bg-muted/50">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Cargando...</span>
                      </div>
                    ) : (
                      <>
                        <Select 
                          value={newVisitDateTime} 
                          onValueChange={setNewVisitDateTime}
                          disabled={!newVisitDateDate || availableSlots.length === 0 || availableDates.length === 0}
                        >
                          <SelectTrigger className="w-full justify-start text-left font-normal">
                            <SelectValue placeholder={
                            !selectedAgenteId ? "Selecciona agente" :
                            loadingDates ? "Cargando fechas..." :
                            availableDates.length === 0 ? "No hay fechas disponibles" :
                            !newVisitDateDate ? "Selecciona fecha" :
                            availableSlots.length > 0 ? "Seleccionar hora" : 
                            "Sin disponibilidad"
                          } />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] z-[80000]">
                            {availableSlots.length > 0 ? (
                              availableSlots.map(slot => (
                                <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground text-center flex flex-col gap-1">
                                <span>No hay huecos disponibles</span>
                                {availabilityReason === "no_config" && (
                                   <span className="text-xs text-red-400">El agente no tiene horario configurado para este día.</span>
                                )}
                                {availabilityReason === "blocked_by_property" && (
                                   <span className="text-xs text-orange-400">Los huecos existentes están reservados para otros inmuebles.</span>
                                )}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        {availableSlots.length === 0 && availabilityReason !== "none" && (
                          <div className="mt-2 p-2 rounded-md border text-sm bg-muted/30">
                             {availabilityReason === "no_config" && (
                                <div className="text-red-500 font-medium">
                                  ⚠️ Sin horario configurado para este día.
                                </div>
                             )}
                             {availabilityReason === "blocked_by_property" && (
                                <div className="text-orange-500 font-medium">
                                  🚫 Horarios reservados para otros inmuebles.
                                </div>
                             )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
              )}
            </div>
            <div className="flex justify-between">
              {selectedLeadForVisit?.fecha_de_visita ? (
                <Button
                  variant="destructive"
                  onClick={() => setIsCancelConfirmOpen(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Cancelar Visita
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setVisitDateDialogOpen(false)
                  setSelectedAgenteId("")
                  setNewVisitDateDate("")
                  setNewVisitDateTime("")
                }}>
                  Cerrar
                </Button>
                <Button onClick={handleReprogramVisit} disabled={isAgentSelectionOnly ? !selectedAgenteId : (!newVisitDateDate || !newVisitDateTime || !selectedAgenteId)}>
                  Guardar
                </Button>
              </div>
            </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
        <AlertDialogContent className="z-[30000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cancelación</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción cancelará la visita y eliminará la fecha programada. ¿Deseas continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsCancelConfirmOpen(false)}>No cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                await handleCancelVisit()
                setIsCancelConfirmOpen(false)
              }}
            >
              Sí, cancelar visita
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
          <DialogContent className="sm:max-w-2xl z-[50000]">
            <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestionar documentos
            </DialogTitle>
            <DialogDescription>
              Sube imágenes o PDF para este lead. Se guardarán en la carpeta del lead (ID {selectedLead?.id ?? "sin id"}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IdCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">DNI/NIE</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Haz clic o arrastra aquí</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDropActiveDni(true) }}
                    onDragLeave={() => setDropActiveDni(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDropActiveDni(false);
                      const files = Array.from(e.dataTransfer.files || [])
                      files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "dni" : `dni-${idx+1}`))
                    }}
                    onClick={() => { if (!docsUploadLoading) { dniInputRef.current?.click() } }}
                    className={`relative rounded-md border-2 border-dashed p-6 transition-colors cursor-pointer ${dropActiveDni ? "border-primary bg-primary/10 dark:bg-primary/20" : "border-input bg-muted/50 dark:bg-input/30"}`}
                  >
                    <input
                      ref={dniInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "dni" : `dni-${idx+1}`))
                        e.currentTarget.value = ""
                      }}
                    />
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UploadCloud className="h-4 w-4" />
                      <span className="text-sm">Admite imágenes y PDF</span>
                    </div>
                    {docsUploadLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">Justificante de ingresos</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">Haz clic o arrastra aquí</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDropActiveIncome(true) }}
                    onDragLeave={() => setDropActiveIncome(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDropActiveIncome(false);
                      const files = Array.from(e.dataTransfer.files || [])
                      files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "ingresos" : `ingresos-${idx+1}`))
                    }}
                    onClick={() => { if (!docsUploadLoading) { incomeInputRef.current?.click() } }}
                    className={`relative rounded-md border-2 border-dashed p-6 transition-colors cursor-pointer ${dropActiveIncome ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/40 dark:border-emerald-900/40" : "border-input bg-muted/50 dark:bg-input/30"}`}
                  >
                    <input
                      ref={incomeInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "ingresos" : `ingresos-${idx+1}`))
                        e.currentTarget.value = ""
                      }}
                    />
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UploadCloud className="h-4 w-4" />
                      <span className="text-sm">Admite imágenes y PDF</span>
                    </div>
                    {docsUploadLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Archivos del lead</span>
                  {docsLoading && <span className="inline-flex items-center text-xs text-muted-foreground"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Cargando...</span>}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {docsList.length === 0 && !docsLoading ? (
                  <div className="text-sm text-muted-foreground">Sin archivos</div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {docsList.map((f) => {
                      const isPdf = /pdf/i.test(String(f.contentType)) || /\.pdf$/i.test(String(f.name))
                      const fileUrl = `/api/nextcloud/file?path=${encodeURIComponent(f.path)}`
                      return (
                        <div key={f.path} className="group flex items-center justify-between border rounded-md p-2">
                          <div className="flex items-center gap-2">
                            {isPdf ? <FileText className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                            <div>
                              <div className="text-sm font-semibold">{f.name}</div>
                              <div className="text-xs text-muted-foreground">{new Date(f.lastModified).toLocaleString("es-ES")}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">{isPdf ? "PDF" : "Imagen"}</Badge>
                            <Button variant="outline" size="sm" className="h-8" onClick={() => openAttachmentPreview(fileUrl, f.name)}>
                              <Eye className="mr-1 h-3 w-3" />
                              Visualizar
                            </Button>
                            <a href={fileUrl} target="_blank" rel="noreferrer" download>
                              <Button variant="outline" size="sm" className="h-8">
                                <Download className="mr-1 h-3 w-3" />
                                Descargar
                              </Button>
                            </a>
                            <Button variant="destructive" size="sm" className="h-8" onClick={() => deleteLeadDoc(f.path)} disabled={docsDeletingPath === f.path}>
                              {docsDeletingPath === f.path ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline" disabled={docsUploadLoading}>
                  Cerrar
                </Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md z-[30000]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Eliminar Lead
            </DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Para confirmar, escribe el ID exacto del lead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {leadToDelete && (
              <div className="p-3 bg-gray-50 rounded-lg border max-w-full">
                <div className="text-sm">
                  <span className="text-muted-foreground">ID:</span> <span className="font-semibold">{String(leadToDelete.id)}</span>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Nombre:</span> <span className="font-semibold">{leadToDelete.Nombre || "Sin nombre"}</span>
                </div>
                <div className="text-sm max-w-full">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  <span className="font-semibold break-all">{leadToDelete.Correo || "Sin email"}</span>
                </div>
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Escribe el ID para confirmar</label>
              <Input
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="ID del lead"
                className="h-9 text-sm"
              />
              {leadToDelete && deleteConfirmInput && String(deleteConfirmInput).trim() !== String(leadToDelete.id).trim() && (
                <p className="text-xs text-red-600">El ID no coincide</p>
              )}
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeletingLead}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={confirmDeleteLead}
              disabled={isDeletingLead || !leadToDelete || String(deleteConfirmInput).trim() !== String(leadToDelete?.id || "").trim()}
            >
              {isDeletingLead ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!attachmentPreviewUrl} onOpenChange={closeAttachmentPreview}>
        <DialogContent className="z-[80000]" overlayClassName="z-[79999]">
          <DialogHeader>
            <DialogTitle>Vista previa de archivo</DialogTitle>
            <DialogDescription>{attachmentPreviewName}</DialogDescription>
          </DialogHeader>
          <div>
            {attachmentPreviewUrl && (
              attachmentPreviewKind === "image" ? (
                <Image
                  src={attachmentPreviewUrl}
                  alt={attachmentPreviewName}
                  width={1600}
                  height={1200}
                  unoptimized
                  style={{ maxHeight: "70vh", maxWidth: "100%", borderRadius: 8, width: "100%", height: "auto" }}
                />
              ) : (
                <iframe src={attachmentPreviewUrl} style={{ width: "100%", height: "70vh", borderRadius: 8 }} />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCommDialogOpen} onOpenChange={setIsCommDialogOpen}>
          <DialogContent
            className="sm:max-w-3xl max-h-[90vh] overflow-y-auto z-[30000]"
            onInteractOutside={(e) => {
              e.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {selectedCommunication && selectedCommunication.source === "whatsapp" ? (
                  <>
                    <span className={isCommunicationSent(selectedCommunication) ? "text-blue-600 dark:text-blue-400" : "text-green-600 dark:text-green-400"}>
                      💬 WhatsApp {isCommunicationSent(selectedCommunication) ? "Enviado" : "Recibido"}
                    </span>
                  </>
                ) : selectedCommunication && isCommunicationSent(selectedCommunication) ? (
                  <>
                    <span className="text-blue-600 dark:text-blue-400">📤 Correo Enviado</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-600 dark:text-green-400">📥 Correo Recibido</span>
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedCommunication && (
              <div className="space-y-4">
                {/* Communication Header Info */}
                <div
                  className={`p-4 rounded-lg border ${
                    isCommunicationSent(selectedCommunication)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800"
                      : "bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800"
                  }`}
                >
                  <div className="space-y-2 text-sm text-foreground">
                    {selectedCommunication.source === "whatsapp" ? (
                      <>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Tipo:</span>
                          <span>Mensaje de WhatsApp</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Fecha:</span>
                          <span>
                            {formatDate(selectedCommunication.created_at) + " " + new Date(selectedCommunication.created_at).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </>
                    ) : selectedCommunication.From ? ( // Check if 'From' exists before assuming it's an email
                      <>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">De:</span>
                          <span>{selectedCommunication.From || "Sin remitente"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Para:</span>
                          <span>{selectedCommunication.to || "Sin destinatario"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Asunto:</span>
                          <span>{selectedCommunication.Subject || "Sin asunto"}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Fecha:</span>
                          <span>
                            {new Date(selectedCommunication.created_at).toLocaleString("es-ES", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 italic">Información de remitente/destinatario no disponible.</p>
                    )}
                  </div>
                </div>

                {/* Message Body */}
                <div className="border rounded-lg p-4 bg-[#F8FBF8] dark:bg-muted/30 dark:text-foreground overflow-x-hidden">
                  <h3 className="text-sm font-semibold mb-3">Mensaje:</h3>
                  <div className="break-words" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                    {selectedCommunication.source === "whatsapp" ? (
                      <div
                        className="prose prose-sm max-w-full dark:prose-invert [&_*]:!max-w-full [&_*]:!whitespace-pre-wrap [&_*]:!break-words"
                        dangerouslySetInnerHTML={{ __html: selectedCommunication.Mensaje || "Sin contenido" }}
                      />
                    ) : selectedCommunication.Html ? (
                      <div
                        className="prose prose-sm max-w-full dark:prose-invert [&_*]:!max-w-full [&_*]:!whitespace-pre-wrap [&_*]:!break-words"
                        dangerouslySetInnerHTML={{ __html: selectedCommunication.Html }}
                      />
                    ) : selectedCommunication.Text ? (
                      <div className="whitespace-pre-wrap break-words text-sm">{selectedCommunication.Text}</div>
                    ) : (
                      <p className="text-sm text-gray-500 italic dark:text-gray-400">Sin contenido</p>
                    )}
                  </div>
                </div>
              </div>
            )}
        </DialogContent>
        </Dialog>
      <Dialog
        open={noteDialog.open}
        onOpenChange={(open) => {
          console.log("[observ] dialog_open_change", open)
          setNoteDialog((prev) => ({ ...prev, open }))
        }}
      >
        <DialogContent className="sm:max-w-md z-[30000]">
          <DialogHeader>
            <DialogTitle>Anotaciones</DialogTitle>
            <DialogDescription>{noteDialog.leadName ? `Lead: ${noteDialog.leadName}` : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              rows={6}
              value={noteDialog.value}
              onChange={(e) => {
                console.log("[observ] dialog_text_change", { len: e.target.value.length })
                setNoteDialog((prev) => ({ ...prev, value: e.target.value }))
              }}
              placeholder="Escribe las anotaciones..."
            />
            <div className="flex gap-3">
              <DialogClose asChild>
                <Button variant="outline" className="flex-1 bg-transparent">
                  Cancelar
                </Button>
              </DialogClose>
              <div className="flex-1 flex flex-col gap-1">
                 <Button className="w-full" onClick={saveNoteDialog}>
                   Guardar
                 </Button>
              </div>
            </div>
            {splitNotes(noteDialog.existing).length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground font-medium">Anotaciones existentes</div>
                <div className="space-y-2">
                  {splitNotes(noteDialog.existing).map((n, idx) => {
                    const cleanHeader = n.header.replace(/^\[|\]$/g, "")
                    const [dateStr, userStr] = cleanHeader.includes(" • ")
                      ? cleanHeader.split(" • ")
                      : [cleanHeader, null]

                    return (
                      <div key={idx} className="border rounded-md p-2 bg-muted/50 dark:bg-input/30">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground/80">{dateStr}</span>
                            {userStr && (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> {userStr}
                              </span>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2"
                            onClick={() => handleDeleteNoteRequest(idx, noteDialog.existing, 'dialog')}
                          >
                            <Trash className="h-3.5 w-3.5 mr-1" />
                            Eliminar
                          </Button>
                        </div>
                        {n.body && <div className="text-sm whitespace-pre-wrap mt-2">{n.body}</div>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={bulkConfirmationOpen} onOpenChange={setBulkConfirmationOpen}>
        <AlertDialogContent className="z-[30000]">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cambio de estado masivo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres cambiar el estado de {selectedLeadIds.length} leads a &quot;{pendingBulkStatus === "Aceptado" ? "Aprobado" : pendingBulkStatus}&quot;?
              Esta acción activará notificaciones automáticas y otros procesos asociados a estos leads.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
               setBulkConfirmationOpen(false)
               setPendingBulkStatus(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkStatusChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={singleStatusConfirmOpen} onOpenChange={setSingleStatusConfirmOpen}>
        <AlertDialogContent className="z-[30000]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de cambiar el estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar el estado a &quot;{pendingSingleStatus?.status === "Aceptado" ? "Aprobado" : pendingSingleStatus?.status}&quot; activará notificaciones automáticas y otros procesos asociados a este lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
               setSingleStatusConfirmOpen(false)
               setPendingSingleStatus(null)
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeSingleStatusChange}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteNoteConfirm} onOpenChange={(open) => !open && setDeleteNoteConfirm(null)}>
        <AlertDialogContent className="z-[30000]">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar anotación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta nota?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteNoteConfirm(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {
        (() => {
          const firstSelectedLead = leads.find(l => selectedLeadIds.includes(l.id))
          const leadInmueble = firstSelectedLead?.Inmueble
          const inferredAdvertisement = leadInmueble ? advertisements.find(a => 
            a.Referencia === leadInmueble || 
            (a.Direccion && leadInmueble.includes(a.Direccion)) ||
            (a.Direccion && a.Direccion.includes(leadInmueble))
          ) : null;

          return (
            <ProposeVisitDialog 
              open={proposeVisitDialogOpen}
              onOpenChange={setProposeVisitDialogOpen}
              selectedLeadIds={selectedLeadIds}
              selectedAdvertisement={
                selectedAdvertisement 
                  ? advertisements.find(a => a.ida === selectedAdvertisement) 
                  : inferredAdvertisement
              }
              inmobiliariaId={inmobiliariaId || 0}
              currentAgentId={currentAgentId}
              isAdminOrSuperuser={isAdmin || role === 'super' || role === 'admin'}
              agentes={agentes}
            />
          )
        })()
      }
      </>
    )
  }
