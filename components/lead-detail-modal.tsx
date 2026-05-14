"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"

// Función auxiliar para fetch con timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 8000): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') throw new Error(`Timeout después de ${timeoutMs}ms`)
    throw error
  }
}

function pickLeadPersonalData(lead: any) {
  const src = lead || {}
  const data: Record<string, any> = {
    id: src.id ?? src.ID ?? src.Id ?? null,
    idc: src.idc ?? src.IDC ?? null,
    Nombre: src.Nombre ?? null,
    Apellidos: src.Apellidos ?? null,
    Correo: src.Correo ?? null,
    Telefono: src.Telefono ?? null,
    Pais: src.Pais ?? null,
    Tipo_Documento: src.Tipo_Documento ?? null,
    Documento: src.Documento ?? null,
    Ingresos: src.Ingresos ?? null,

    Persona_2: src.Persona_2 ?? null,
    tipo2: src.tipo2 ?? null,
    "Correo 2": src["Correo 2"] ?? null,
    "Telefono 2": src["Telefono 2"] ?? null,
    Pais_2: src.Pais_2 ?? null,
    Tipo_Documento_2: src.Tipo_Documento_2 ?? null,
    Documento_2: src.Documento_2 ?? null,
    Ingresos_2: src.Ingresos_2 ?? null,

    Persona_3: src.Persona_3 ?? null,
    tipo3: src.tipo3 ?? null,
    "Correo 3": src["Correo 3"] ?? null,
    "Telefono 3": src["Telefono 3"] ?? null,
    "Pais 3": src["Pais 3"] ?? null,
    Tipo_Documento_3: src.Tipo_Documento_3 ?? null,
    Documento_3: src.Documento_3 ?? null,
    Ingresos_3: src.Ingresos_3 ?? null,

    Persona_4: src.Persona_4 ?? null,
    tipo4: src.tipo4 ?? null,
    "Correo 4": src["Correo 4"] ?? src["Coreo 4"] ?? null,
    "Telefono 4": src["Telefono 4"] ?? null,
    "Pais 4": src["Pais 4"] ?? null,
    "Tipo_Documento 4": src["Tipo_Documento 4"] ?? null,
    Documento_4: src.Documento_4 ?? null,
    Ingresos_4: src.Ingresos_4 ?? null,
  }

  return data
}

function pickLeadInmuebleData(lead: any, advertisements: any[]) {
  const leadInmueble = String(lead?.Inmueble || "").trim()
  const norm = leadInmueble.toLowerCase()
  const ads = Array.isArray(advertisements) ? advertisements : []

  const ad =
    norm && ads.length > 0
      ? ads.find((a) => {
          const ref = String(a?.Referencia || "").trim().toLowerCase()
          const dir = String(a?.Direccion || "").trim().toLowerCase()
          const id = String(a?.ida || "").trim().toLowerCase()

          return (
            (ref && ref === norm) ||
            (dir && dir === norm) ||
            (id && id === norm) ||
            (dir && norm.includes(dir)) ||
            (ref && norm.includes(ref)) ||
            (dir && dir.includes(norm)) ||
            (ref && ref.includes(norm))
          )
        })
      : null

  if (ad) {
    return {
      ida: ad.ida ?? null,
      Referencia: ad.Referencia ?? null,
      Direccion: ad.Direccion ?? null,
      Precio: ad.Precio ?? null,
      Portal: ad.Portal ?? null,
      Pais_Aval: ad.Pais_Aval ?? null,
    }
  }

  return {
    ida: null,
    Referencia: leadInmueble || null,
    Direccion: null,
    Precio: null,
    Portal: null,
    Pais_Aval: null,
  }
}
import { resolveUserName } from "@/app/actions/get-agents"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Checkbox } from "@/components/ui/checkbox"
import Image from "next/image"
import { 
  User, Building, Phone, Mail, Euro, FileText, Calendar, 
  MapPin, MessageSquare, Clock, Check, X, Copy, Loader2,
  Trash2, ExternalLink, RefreshCw, Edit, Plus, Upload, Eye, Download, CalendarIcon, StickyNote, CalendarDays
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn, formatDateTime, formatWebhookDate, getWebhookUrl, buildBookingLink } from "@/lib/utils"
import { isDocumentInvalid } from "@/lib/lead-validation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { generateSlotCandidates, isOverlapping } from "@/lib/agenda-utils"
import { logClientEventAction } from "@/app/actions/audit"

// Types duplicated to avoid circular deps
export type Lead = {
  id: string | number
  idc?: number
  IDC?: number
  created_at?: string
  Estado?: string
  Nombre?: string
  Apellidos?: string
  Correo?: string
  Telefono?: string
  Inmueble?: string
  Observaciones?: string
  Ingresos?: number
  "Pedir Aval"?: boolean
  "Tipo de Contrato"?: string
  Mascota?: boolean
  Fumador?: boolean
  Pareja?: boolean
  "Niños"?: boolean
  "Trabajo"?: string
  "Antigüedad"?: string
  "Nóminas"?: boolean
  "Avalista"?: boolean
  "Renta Máxima"?: number
  "Zona"?: string
  "Habitaciones"?: number
  "Baños"?: number
  "Ascensor"?: boolean
  "Garaje"?: boolean
  "Terraza"?: boolean
  "Trastero"?: boolean
  "Amueblado"?: boolean
  "Aire Acondicionado"?: boolean
  "Calefacción"?: boolean
  "Jardín"?: boolean
  "Piscina"?: boolean
  "Referencia"?: string
  fecha_de_visita?: string
  resumen_visita?: string
  visita_completada?: string | boolean
  idag?: number
  status_history?: LeadHistoryEntry[]
  m_error?: string
  m_errror?: string
  situacion_laboral?: string
  [key: string]: any
}

export type LeadHistoryEntry = {
  status: string
  timestamp: string
  agent_id?: string
  agent_name?: string
}

const getStatusColors = (estado?: string | null) => {
  switch (estado) {
    case "Datos Completos":
    case "Completo":
      return {
        bg: "#dcfce7",
        border: "#22c55e",
        text: "#16a34a",
        label: estado === "Datos Completos" ? "Datos Completos" : "Completado",
      }
    case "Incompleto":
    case "Datos Incompletos":
      return {
        bg: "#ffffff",
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
    case "Necesidad de Aval":
      return {
        bg: "#f3e8ff",
        border: "#a855f7",
        text: "#9333ea",
        label: estado === "Pedir Aval" ? "Aval Pedido" : "Necesidad de Aval",
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
        bg: "#e0e7ff",
        border: "#6366f1",
        text: "#4f46e5",
        label: "Visita Confirmada",
      }
    case "Visita Completada":
      return {
        bg: "#f3e8ff",
        border: "#a855f7",
        text: "#7e22ce",
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
      return {
        bg: "#f3f4f6",
        border: "#9ca3af",
        text: "#374151",
        label: estado || "Sin Estado",
      }
  }
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
  idc?: number
  Mensaje?: string
  source: "email" | "whatsapp"
}

interface LeadDetailModalProps {
  leadId: string | number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdate?: (lead: Lead) => void
  onRescheduleClick?: (lead: Lead) => void
  onDeleteClick?: (lead: Lead) => void
}

export function LeadDetailModal({ 
  leadId, 
  open, 
  onOpenChange, 
  onLeadUpdate,
  onRescheduleClick,
  onDeleteClick
}: LeadDetailModalProps) {
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(false)
  const { inmobiliariaId, inmobiliariaNombre, isAdmin, role, userEmail, demoMode, demoSince } = useInmobiliaria()
  const shouldBlurPii = (() => {
    if (!demoMode) return false
    if (!demoSince) return true
    const createdAt = lead?.created_at
    if (!createdAt) return true
    const created = new Date(String(createdAt))
    const since = new Date(String(demoSince))
    if (Number.isNaN(created.getTime()) || Number.isNaN(since.getTime())) return true
    return created.getTime() < since.getTime()
  })()
  const displayLeadName = (() => {
    const nombreRaw = String(lead?.Nombre || "").trim()
    const apellidosRaw = String(lead?.Apellidos || "").trim()
    const full = `${nombreRaw}${nombreRaw && apellidosRaw ? " " : ""}${apellidosRaw}`.trim()
    if (!full) return "Sin nombre"
    if (!shouldBlurPii) return full

    const baseForFirst = nombreRaw || apellidosRaw
    const baseParts = baseForFirst.split(/\s+/).filter(Boolean)
    const first = baseParts[0] || ""
    if (!first) return "Sin nombre"

    const nombreParts = nombreRaw.split(/\s+/).filter(Boolean)
    const nombreRemainder = nombreParts.length > 1 ? nombreParts.slice(1).join(" ") : ""
    const remainder = [nombreRemainder, apellidosRaw].filter(Boolean).join(" ").trim()
    if (!remainder) return first

    return (
      <span>
        <span>{first}</span>
        <span className="ml-1 blur-sm select-none">{remainder}</span>
      </span>
    )
  })()

  const renderBlurredIdentityDoc = (value: any) => {
    const raw = String(value ?? "").trim()
    if (!raw) return "—"
    if (!shouldBlurPii) return raw
    const n = Math.min(5, raw.length)
    const blurred = raw.slice(0, n)
    const rest = raw.slice(n)
    return (
      <span className="inline-flex items-center">
        <span className="blur-sm select-none">{blurred}</span>
        <span>{rest}</span>
      </span>
    )
  }
  const [communications, setCommunications] = useState<Communication[]>([])
  const [commsLoading, setCommsLoading] = useState(false)
  const [selectedCommunication, setSelectedCommunication] = useState<Communication | null>(null)
  const [isCommDialogOpen, setIsCommDialogOpen] = useState(false)
  const [showStatusHistory, setShowStatusHistory] = useState(false)
  const [agentes, setAgentes] = useState<any[]>([])
  
  // Visit Management State
  const [visitDateDialogOpen, setVisitDateDialogOpen] = useState(false)
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false)
  const [selectedAgenteId, setSelectedAgenteId] = useState<string>("")
  const [newVisitDateDate, setNewVisitDateDate] = useState<string>("")
  const [newVisitDateTime, setNewVisitDateTime] = useState<string>("")
  const [isAgentSelectionOnly, setIsAgentSelectionOnly] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [isEditingEntryDate, setIsEditingEntryDate] = useState(false)
  const [entryDateType, setEntryDateType] = useState<string>("Inmediatamente")
  const [customEntryDate, setCustomEntryDate] = useState<string>("")
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [availabilityReason, setAvailabilityReason] = useState<string>("none")
  const [advertisements, setAdvertisements] = useState<any[]>([])
  const [isAvalDialogOpen, setIsAvalDialogOpen] = useState(false)
  const [avalCalculation, setAvalCalculation] = useState<{
    income: number
    persona1Income: number
    persona2Income: number
    persona3Income: number
    persona4Income: number
    actualRent: number | null
    minRequiredIncome: number | null
    idealIncome: number | null
    needsAval: boolean
    incomeRatio: number | null
  } | null>(null)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [inlineNote, setInlineNote] = useState("")

  // Tabs/Persona state
  const [selectedPersona, setSelectedPersona] = useState(1)
  const [isEditingPersonalInfo, setIsEditingPersonalInfo] = useState(false)
  const [editFormData, setEditFormData] = useState<Partial<Lead>>({})
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Documents state
  const [docsList, setDocsList] = useState<any[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false)
  const [docsUploadLoading, setDocsUploadLoading] = useState(false)
  const [dropActiveDni, setDropActiveDni] = useState(false)
  const dniInputRef = useRef<HTMLInputElement | null>(null)
  const [dropActiveIngresos, setDropActiveIngresos] = useState(false)
  const ingresosInputRef = useRef<HTMLInputElement | null>(null)
  
  // Attachment Preview State
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null)
  const [attachmentPreviewName, setAttachmentPreviewName] = useState<string>("")
  const [attachmentPreviewKind, setAttachmentPreviewKind] = useState<"image" | "pdf">("image")

  // Delete Lead State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("")
  const [isDeletingLead, setIsDeletingLead] = useState(false)
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)

  const { toast } = useToast()
  const supabase = createClient()
  
  // Delete Note Confirmation
  const [currentUserName, setCurrentUserName] = useState<string | null>(null)
  const [deleteNoteConfirm, setDeleteNoteConfirm] = useState<{ open: boolean, index: number } | null>(null)

  useEffect(() => {
    const fetchUserName = async () => {
        const supabaseClient = createClient()
        const { data: { user } } = await supabaseClient.auth.getUser()
        if (user && user.email) {
            const res = await resolveUserName(user.email)
            if (res.name) setCurrentUserName(res.name)
        }
    }
    fetchUserName()
  }, [])

  const canDeleteNote = (header: string) => {
    const clean = header.replace(/^\[|\]$/g, "")
    const parts = clean.split(" • ")
    const author = parts.length > 1 ? parts[1].trim() : ""
    
    const isLocalAdmin = role === 'super' || role === 'admin' || role === 'administrador'
    
    if (!author) return isAdmin || isLocalAdmin
    if (isAdmin || isLocalAdmin) return true
    
    if (userEmail && author === userEmail) return true
    if (currentUserName && author === currentUserName) return true
    if (userEmail && author.toLowerCase() === userEmail.toLowerCase()) return true
    
    return false
  }

  const handleDeleteNoteRequest = (index: number) => {
    if (!lead) return
    const currentNotes = String(lead.Obsevaciones || lead.Observaciones || "")
    const parts = splitNotes(currentNotes)
    if (index >= parts.length) return
    
    const note = parts[index]
    if (canDeleteNote(note.header)) {
       setDeleteNoteConfirm({ open: true, index })
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
      await deleteNoteEntry(deleteNoteConfirm.index)
      setDeleteNoteConfirm(null)
  }

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase])

  // Format currency helper
  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return "No especificado"
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(value)
  }

  // Helper to format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return ""
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Fetch lead data
  useEffect(() => {
    if (open && leadId) {
      fetchLeadData()
      if (inmobiliariaId) {
        fetchAgentes()
        fetchAdvertisements()
      }
    } else {
      setLead(null)
      setCommunications([])
      setDocsList([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId, inmobiliariaId])

  // Fetch docs when dialog opens
  useEffect(() => {
    if (isDocsDialogOpen && lead) {
      loadLeadDocsList()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDocsDialogOpen, lead])

  const fetchAgentes = async () => {
    if (!inmobiliariaId) return
    const { data } = await supabase
      .from("Agentes")
      .select("idag, Nombre, idi, Email")
      .eq("idi", inmobiliariaId.toString())
    if (data) setAgentes(data)
  }

  const fetchAdvertisements = async () => {
    if (!inmobiliariaId) return
    try {
      const { data, error } = await supabase
        .from("Anuncios")
        .select("ida, Referencia, Direccion, duracion_visita, tiempo_entre_visitas, Activacion")
        .eq("usuario", inmobiliariaId.toString())
        .eq("Activacion", "Activo")
        .order("Referencia")

      if (error) {
        if (error.code === "PGRST204" || error.message.includes("duracion_visita") || error.message.includes("does not exist")) {
          const { data: dataFallback, error: errorFallback } = await supabase
            .from("Anuncios")
            .select("ida, Referencia, Direccion, Activacion")
            .eq("usuario", inmobiliariaId.toString())
            .order("Referencia")

          if (!errorFallback) {
            setAdvertisements(dataFallback || [])
            return
          }
        }
        console.error("Error fetching advertisements:", error)
      } else {
        setAdvertisements(data || [])
      }
    } catch (error) {
      console.error("Error fetching advertisements:", error)
    }
  }

  // Fetch agent available dates
  useEffect(() => {
    async function fetchAvailableDates() {
      if (!selectedAgenteId) {
        setAvailableDates([])
        return
      }
      setLoadingDates(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from("Agendas")
          .select("fecha")
          .eq("agente_id", selectedAgenteId)
          .gte("fecha", today)
        
        if (error) throw error
        
        if (data) {
           const dates = data.map((d: any) => d.fecha)
           setAvailableDates([...new Set(dates)] as string[])
        }
      } catch (err) {
        console.error("Error fetching available dates:", err)
      } finally {
        setLoadingDates(false)
      }
    }
      fetchAvailableDates()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAgenteId])

  // Fetch agent availability when agent or date changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!selectedAgenteId || !newVisitDateDate) {
        setAvailableSlots([])
        setAvailabilityReason("none")
        return
      }

      setLoadingAvailability(true)
      setAvailabilityReason("none")
      try {
        const { data, error } = await supabase
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

        if (lead && lead.Inmueble && advertisements && advertisements.length > 0) {
          const leadInmueble = String(lead.Inmueble).toLowerCase()
          relatedAd = advertisements.find((a) => {
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

        const { data: existingVisits } = await supabase
          .from("Clientes")
          .select("id, fecha_de_visita, Inmueble")
          .eq("idag", selectedAgenteId)
          .gte("fecha_de_visita", startOfDay)
          .lte("fecha_de_visita", endOfDay)

        const visitsOnDay = (existingVisits || []).filter((v: any) => {
          if (!v.fecha_de_visita) return false
          if (!lead) return true
          return v.id !== lead.id
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
                const ad = advertisements.find((a) => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                if (ad && typeof ad.duracion_visita === "number") {
                  vDuration = ad.duracion_visita || vDuration
                  configFound = true
                }
              }
            }

            if (!configFound && v.Inmueble && advertisements && advertisements.length > 0) {
              const vInmueble = String(v.Inmueble).toLowerCase()
              const vAd = advertisements.find((a) => {
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
                const ad = advertisements.find((a) => String(a.ida) === String(matchingAgendaItem.anuncio_id))
                if (ad && typeof ad.duracion_visita === "number") {
                  vDuration = ad.duracion_visita || vDuration
                  configFound = true
                }
              }
            }

            if (!configFound && v.Inmueble && advertisements && advertisements.length > 0) {
              const vInmueble = String(v.Inmueble).toLowerCase()
              const vAd = advertisements.find((a) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAgenteId, newVisitDateDate, lead, advertisements])

  const fetchLeadData = async () => {
    if (!leadId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("Clientes")
        .select("*")
        .eq("id", leadId)
        .single()

      if (error) throw error
      const candidates = ["Obsevaciones", "Observaciones", "obsevaciones", "observaciones"]
      const mergedObservaciones =
        candidates
          .map((key) => {
            const v = (data as any)[key]
            return typeof v === "string" ? v.trim() : ""
          })
          .find((v) => v.length > 0) || ""
      const normalizedLead = {
        ...data,
        Observaciones: mergedObservaciones,
        Obsevaciones: mergedObservaciones,
      }
      const hasInvalidDoc = [
        isDocumentInvalid(normalizedLead?.Tipo_Documento, normalizedLead?.Documento),
        isDocumentInvalid(normalizedLead?.Tipo_Documento_2, normalizedLead?.Documento_2),
        isDocumentInvalid(normalizedLead?.Tipo_Documento_3, normalizedLead?.Documento_3),
        isDocumentInvalid(normalizedLead?.["Tipo_Documento 4"], normalizedLead?.Documento_4),
      ].some(Boolean)
      let finalLead: Lead = normalizedLead as Lead
      const currentStatus = String(normalizedLead?.Estado || "").trim().toLowerCase()
      if (hasInvalidDoc && ["datos completos", "datos completas", "pendiente", "", "null"].includes(currentStatus)) {
        await supabase.from("Clientes").update({ Estado: "Datos Incompletos" }).eq("id", leadId)
        finalLead = { ...(normalizedLead as Lead), Estado: "Datos Incompletos" }
      }
      setLead(finalLead)
      setEditFormData(finalLead)
      setSelectedPersona(1)
      setIsEditingPersonalInfo(false)
      
      const emails = [
        data.Correo,
        data["Correo 2"],
        data["Correo 3"],
        data["Correo 4"],
      ]
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean)

      const phones = [
        data.Telefono,
        data["Telefono 2"],
        data["Telefono 3"],
        data["Telefono 4"],
      ]
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean)

      if (emails.length > 0 || phones.length > 0) {
        fetchCommunications(emails, phones)
      }
      
      // Load docs status (checking file existence logic is complex, assume lead has status fields)
      // Actually we will load the list when needed or if we want to show badges
    } catch (error) {
      console.error("Error fetching lead:", error)
      toast({
        title: "Error",
        description: "No se pudo cargar la información del lead",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchCommunications = async (emails: string[] = [], phones: string[] = []) => {
    if (emails.length === 0 && phones.length === 0) {
      setCommunications([])
      return
    }
    setCommsLoading(true)
    try {
      const uniqueEmails = Array.from(new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)))
      const emailFilter = uniqueEmails
        .flatMap((email) => [`Email.ilike.${email}`, `From.ilike.${email}`, `to.ilike.${email}`])
        .join(",")

      const phoneVariants = Array.from(
        new Set(
          phones
            .flatMap((phone) => {
              const raw = phone.trim()
              const digits = raw.replace(/\D/g, "")
              return [raw, digits, digits ? `+${digits}` : ""]
            })
            .filter(Boolean),
        ),
      )

      const emailsPromise = uniqueEmails.length > 0
        ? supabase.from("Correos").select("*").in("Tipo", ["enviado", "recibido"]).or(emailFilter)
        : Promise.resolve({ data: [], error: null })

      const whatsappPromise = phoneVariants.length > 0
        ? supabase.from("Whatsapp").select("*").in("Telefono", phoneVariants).in("Tipo", ["Enviado", "Recibido"])
        : Promise.resolve({ data: [], error: null })

      const [emailsResult, whatsappResult] = await Promise.all([emailsPromise, whatsappPromise])

      if (emailsResult.error) {
        console.error("Error fetching emails:", emailsResult.error)
      }

      if (whatsappResult.error) {
        console.error("Error fetching WhatsApp messages:", whatsappResult.error)
      }

      // Add source field to distinguish between emails and WhatsApp
      const emailComms = (emailsResult.data || []).map((item) => ({
        ...item,
        source: "email" as const,
      }))

      const whatsappComms = (whatsappResult.data || []).map((item) => ({
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
      const allComms = [...emailComms, ...whatsappComms].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      
      setCommunications(allComms)
    } catch (error) {
      console.error("Error fetching communications:", error)
    } finally {
      setCommsLoading(false)
    }
  }


  const savePersonalInfo = async () => {
    if (!lead || !editFormData) return

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({
            Nombre: editFormData.Nombre,
            Apellidos: editFormData.Apellidos,
            Correo: editFormData.Correo,
            Telefono: editFormData.Telefono,
            Pais: editFormData.Pais,
            Ingresos: editFormData.Ingresos,
            Obsevaciones: editFormData.Observaciones ?? editFormData.Obsevaciones,
            Documento: editFormData.Documento,
            Tipo_Documento: editFormData.Tipo_Documento,
            // Persona 2
            Persona_2: editFormData.Persona_2,
            Tipo_Documento_2: editFormData.Tipo_Documento_2,
            Documento_2: editFormData.Documento_2,
            Pais_2: editFormData.Pais_2,
            Ingresos_2: editFormData.Ingresos_2,
            "Correo 2": editFormData["Correo 2"],
            "Telefono 2": editFormData["Telefono 2"],
            tipo2: editFormData.tipo2,
             // Persona 3
            Persona_3: editFormData.Persona_3,
            Tipo_Documento_3: editFormData.Tipo_Documento_3,
            Documento_3: editFormData.Documento_3,
            "Pais 3": editFormData["Pais 3"],
            Ingresos_3: editFormData.Ingresos_3,
            "Correo 3": editFormData["Correo 3"],
            "Telefono 3": editFormData["Telefono 3"],
            tipo3: editFormData.tipo3,
             // Persona 4
            Persona_4: editFormData.Persona_4,
            "Tipo_Documento 4": editFormData["Tipo_Documento 4"],
            Documento_4: editFormData.Documento_4,
            "Pais 4": editFormData["Pais 4"],
            Ingresos_4: editFormData.Ingresos_4,
            "Correo 4": editFormData["Correo 4"],
            "Telefono 4": editFormData["Telefono 4"],
            tipo4: editFormData.tipo4,
        })
        .eq("id", lead.id)

      if (error) throw error

      const mergedObservaciones = editFormData.Observaciones ?? editFormData.Obsevaciones
      const updatedLead = { ...lead, ...editFormData, Observaciones: mergedObservaciones, Obsevaciones: mergedObservaciones }
      const hasInvalidDoc = [
        isDocumentInvalid(editFormData.Tipo_Documento, editFormData.Documento),
        isDocumentInvalid(editFormData.Tipo_Documento_2, editFormData.Documento_2),
        isDocumentInvalid(editFormData.Tipo_Documento_3, editFormData.Documento_3),
        isDocumentInvalid(editFormData["Tipo_Documento 4"], editFormData.Documento_4),
      ].some(Boolean)
      let finalLead = updatedLead
      if (hasInvalidDoc) {
        await updateLeadStatus("Datos Incompletos")
        finalLead = { ...updatedLead, Estado: "Datos Incompletos" }
      }
      setLead(finalLead as Lead)
      if (onLeadUpdate) onLeadUpdate(finalLead as Lead)
      
      setIsEditingPersonalInfo(false)
      toast({
        title: "Guardado",
        description: "Información personal actualizada correctamente",
      })
    } catch (err) {
      console.error("Error updating personal information:", err)
      toast({
        title: "Error",
        description: "No se pudo actualizar la información",
        variant: "destructive",
      })
    }
  }

  const startEditingEntryDate = () => {
    if (!lead) return
    const isImmediate = lead.prev_entrada?.toLowerCase() === "inmediatamente"
    setEntryDateType(isImmediate ? "Inmediatamente" : "Mas adelante")
    if (lead.fecha_prev_entrada) {
      try {
        const d = new Date(lead.fecha_prev_entrada)
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
    if (!lead) return
    
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
        .eq("id", lead.id)
  
      if (error) throw error
  
      const updatedLead = { ...lead, ...updateData }
      setLead(updatedLead as Lead)
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)
      
      setIsEditingEntryDate(false)
      toast({ title: "Guardado", description: "Fecha de entrada actualizada" })
    } catch (err) {
      console.error("Error updating entry date:", err)
      toast({ title: "Error", description: "No se pudo actualizar", variant: "destructive" })
    }
  }

  const updateLeadStatus = async (newStatus: string) => {
    if (!lead) return

    // Special handling for "Visita Propuesta" or "Visita Confirmada"
    if (newStatus === "Visita Propuesta" || newStatus === "Visita Confirmada") {
      setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
      setIsAgentSelectionOnly(true)
      setVisitDateDialogOpen(true)
      return
    }

    // Logic to cancel visit if moving to previous status
    const previousStatuses = ["Incompleto", "Datos Incompletos", "Datos Completos", "Necesidad de Aval", "Pedir Aval", "Aceptado"];
    const shouldCancelVisit = (lead.Estado === "Visita Propuesta" || lead.Estado === "Visita Confirmada") && previousStatuses.includes(newStatus);

    try {
      const updateData: any = { Estado: newStatus };

      // History tracking
      const historyEntry: LeadHistoryEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        agent_id: currentUser?.id,
        agent_name: currentUser?.email
      }

      if (currentUser?.email && agentes.length > 0) {
        const matched = agentes.find(a => a.Email === currentUser.email)
        if (matched) historyEntry.agent_name = matched.Nombre || matched.nombre || matched.Email
      }

      const currentHistory = (lead.status_history as LeadHistoryEntry[]) || []
      const updatedHistory = [...currentHistory, historyEntry]
      updateData.status_history = updatedHistory
      
      if (shouldCancelVisit) {
        updateData.visita_completada = "cancelada";
        updateData.fecha_de_visita = null;
      }

      const { error } = await supabase
        .from("Clientes")
        .update(updateData)
        .eq("id", lead.id)

      if (error) throw error

      if (currentUser?.id) {
        await logClientEventAction(
          "STATUS_CHANGE",
          "OPERATIONAL",
          "SUCCESS",
          `Lead ${lead.id}`,
          currentUser.email,
          currentUser.id,
          { oldStatus: lead.Estado, newStatus: newStatus }
        )
      }

      const updatedLead = { ...lead, ...updateData }
      setLead(updatedLead as Lead)
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)

      if (newStatus === "Descartado") {
        try {
          const webhookUrl = getWebhookUrl("descartado")
          if (webhookUrl) {
            await fetchWithTimeout(webhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leadId: lead.id,
                Estado: "Descartado",
                lead: updatedLead,
                source: "lead-detail-modal",
                timestamp: new Date().toISOString()
              })
            })
          }
        } catch (webhookErr) {
          console.error("Error calling descartado webhook:", webhookErr)
        }
      }

      if (newStatus === "Pedir Aval") {
        try {
          const targetInmoId = inmobiliariaId || (updatedLead as any)?.idi || (updatedLead as any)?.usuario || null
          let inmobiliaria: any = null
          if (targetInmoId) {
            const { data, error } = await supabase.from("Inmobiliarias").select("*").eq("idi", targetInmoId).maybeSingle()
            if (!error) {
              inmobiliaria = data || null
            }
          }

          const res = await fetchWithTimeout("/api/peticion-aval", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: lead.id,
              lead: pickLeadPersonalData(updatedLead),
              inmueble: pickLeadInmuebleData(updatedLead, advertisements),
              inmobiliariaId: targetInmoId,
              inmobiliariaNombre: inmobiliariaNombre || null,
              inmobiliaria,
            }),
          })
          if (!res.ok) {
            const t = await res.text().catch(() => "")
            let parsed: any = null
            try {
              parsed = t ? JSON.parse(t) : null
            } catch {}
            console.error("peticion_aval failed:", res.status, parsed || t.slice(0, 300))
          } else {
            const j = await res.json().catch(() => null)
            if (j?.webhook) console.log("peticion_aval ok:", j.webhook)
          }
        } catch (webhookErr) {
          console.error("Error calling peticion_aval webhook:", webhookErr)
        }
      }

      if (newStatus === "Aceptado") {
        try {
          const res = await fetchWithTimeout("/api/aprobado", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              leadId: lead.id,
              lead: pickLeadPersonalData(updatedLead),
            }),
          })
          if (!res.ok) {
            const t = await res.text().catch(() => "")
            console.error("aprobado failed:", res.status, t.slice(0, 200))
          }
        } catch (webhookErr) {
          console.error("Error calling aprobado webhook:", webhookErr)
        }
      }

      if (shouldCancelVisit) {
        toast({
            title: "Visita cancelada",
            description: `Se ha cancelado la visita al cambiar el estado a ${newStatus}`,
        })
      } else {
        toast({
            title: "Estado actualizado",
            description: `El estado se ha actualizado a ${newStatus === "Aceptado" ? "Aprobado" : newStatus}`,
        })
      }
    } catch (err) {
      console.error("Error updating lead status:", err)
      const code = (err as any)?.code
      const msg = String((err as any)?.message || "")
      if (code === "42883" && msg.toLowerCase().includes("http_post")) {
        toast({
          title: "Error de base de datos",
          description: "Falta la función http_post en Supabase (trigger). No se pudo cambiar el estado.",
          variant: "destructive",
        })
        return
      }
      if (code === "22P02" && msg.toLowerCase().includes("invalid input syntax for type json")) {
        toast({
          title: "Error de base de datos",
          description: "Trigger http_post recibiendo parámetros en formato incorrecto (JSON inválido). No se pudo cambiar el estado.",
          variant: "destructive",
        })
        return
      }
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      })
    }
  }

  const updateAgent = async (newIdag: number | null) => {
    if (!lead) return
    try {
        const { error } = await supabase
        .from("Clientes")
        .update({ idag: newIdag })
        .eq("id", lead.id)

        if (error) throw error

        const updatedLead = { ...lead, idag: newIdag }
        setLead(updatedLead as Lead)
        if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)
        
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
  }

  const loadLeadDocsList = async () => {
    if (!lead) return
    setDocsLoading(true)
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(lead.id)
    
    // Crear un controller para manejar el timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 segundos de timeout
    
    try {
      const params = new URLSearchParams({ referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`, {
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Error desconocido" }))
        console.error("[LeadDetailModal] Error al cargar documentos:", errorData)
        toast({
          title: "Error al cargar documentos",
          description: errorData.error || "No se pudieron cargar los documentos de Nextcloud",
          variant: "destructive",
        })
        setDocsList([])
      } else {
        const j = await res.json()
        setDocsList(j.files || [])
      }
    } catch (error: any) {
      console.error("[LeadDetailModal] Error en loadLeadDocsList:", error)
      if (error.name === 'AbortError') {
        toast({
          title: "Timeout al cargar documentos",
          description: "La conexión con Nextcloud tardó demasiado tiempo. Los documentos no se cargarán.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error de conexión",
          description: "No se pudo conectar con Nextcloud para cargar los documentos",
          variant: "destructive",
        })
      }
      setDocsList([])
    } finally {
      clearTimeout(timeoutId)
      setDocsLoading(false)
    }
  }

  const uploadLeadDocWithOverride = async (file: File, baseName: string) => {
    if (!lead) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    const referencia = String(lead.id)
    
    const ok = String(file.type).startsWith("image/") || /application\/pdf/i.test(String(file.type)) || /\.(pdf|png|jpg|jpeg|gif|webp|bmp|svg)$/i.test(String(file.name))
    if (!ok) {
      toast({ title: "Formato no permitido", description: "Solo imágenes o PDF", variant: "destructive" })
      return
    }

    setDocsUploadLoading(true)
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
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        if (currentUser?.id) {
          await logClientEventAction(
            "DOCUMENT_UPLOAD",
            "OPERATIONAL",
            "SUCCESS",
            filename,
            currentUser.email,
            currentUser.id,
            { leadId: lead.id }
          )
        }
        toast({ title: "Éxito", description: "Archivo subido correctamente" })
        await loadLeadDocsList()
      }
    } catch {
      toast({ title: "Error", description: "Error al subir archivo", variant: "destructive" })
    } finally {
      setDocsUploadLoading(false)
    }
  }

  const deleteLeadDoc = async (path: string) => {
    if (!path) return
    try {
      const params = new URLSearchParams({ path })
      await fetch(`/api/nextcloud/file?${params.toString()}`, { method: "DELETE" })
      await loadLeadDocsList()
      toast({ title: "Archivo eliminado", description: "Archivo eliminado correctamente" })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(label)
    toast({
      title: "Copiado",
      description: `${label} copiado al portapapeles`,
    })
    setTimeout(() => setCopiedField(null), 2000)
  }

  const openAttachmentPreview = async (url: string, name: string) => {
    const isPdf = /\.pdf$/i.test(name) || url.toLowerCase().includes(".pdf")
    const proxied = isPdf ? `/api/proxy/pdf?url=${encodeURIComponent(url)}` : url
    setAttachmentPreviewUrl(proxied)
    setAttachmentPreviewName(name)
    setAttachmentPreviewKind(isPdf ? "pdf" : "image")
    
    if (currentUser?.id) {
      await logClientEventAction(
        "DOCUMENT_VIEW",
        "SENSITIVE_ACCESS",
        "SUCCESS",
        name,
        currentUser.email,
        currentUser.id,
        { leadId: lead?.id }
      )
    }
  }

  const closeAttachmentPreview = () => {
    setAttachmentPreviewUrl(null)
    setAttachmentPreviewName("")
  }

  const confirmDeleteLead = async () => {
    if (!lead || !deleteConfirmInput) return
    if (String(deleteConfirmInput).trim() !== String(lead.id).trim()) return

    setIsDeletingLead(true)
    try {
      const { error } = await supabase.from("Clientes").delete().eq("id", lead.id)
      if (error) throw error

      toast({
        title: "Lead eliminado",
        description: "El lead ha sido eliminado correctamente",
      })
      
      if (onDeleteClick) onDeleteClick(lead)
      setIsDeleteDialogOpen(false)
      onOpenChange(false)
    } catch (error) {
      console.error("Error deleting lead:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar el lead",
        variant: "destructive",
      })
    } finally {
      setIsDeletingLead(false)
    }
  }

  const splitNotes = (notes: string) => {
    if (!notes) return []
    // Regex to split by entries like "[Date • User]"
    // We look for patterns that start a new line with [DD/MM/YYYY or [YYYY-MM-DD
    const parts = notes.split(/(?=\[\d{2,4}[-\/]\d{2}[-\/]\d{2,4})/)
    return parts
      .map((p) => {
        const match = p.match(/^(\[.*?\])([\s\S]*)/)
        if (match) {
          return { header: match[1], body: match[2].trim() }
        }
        return { header: "", body: p.trim() }
      })
      .filter((p) => p.body || p.header)
  }

  const deleteNoteEntry = async (index: number) => {
    if (!lead) return
    const currentNotes = String(lead.Obsevaciones || lead.Observaciones || "")
    const parts = splitNotes(currentNotes)
    
    // Remove the entry at index
    const newParts = parts.filter((_, i) => i !== index)
    const newNotes = newParts.map(p => `${p.header}\n${p.body}`).join("\n\n").trim()
    
    try {
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: newNotes })
        .eq("id", lead.id)

      if (error) throw error

      if (currentUser?.id) {
        await logClientEventAction(
          "NOTES_MODIFIED",
          "OPERATIONAL",
          "SUCCESS",
          `Lead ${lead.id}`,
          currentUser.email,
          currentUser.id,
          { action: "delete_note" }
        )
      }

      const updatedLead = { ...lead, Observaciones: newNotes, Obsevaciones: newNotes }
      setLead(updatedLead as Lead)
      setNoteContent(newNotes) // Update current editing content too if needed? 
      // Actually noteContent is for *new* notes or editing *all* notes. 
      // If we are in the dialog, we might want to refresh the view.
      
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)
      
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

  const handleAddNote = async () => {
    if (!lead || !inlineNote.trim()) return
    
    // Default fallback
    let userStr = "Usuario Desconocido"
    
    try {
      // 1. Get fresh user
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // Update state if needed (side effect)
        if (!currentUser) setCurrentUser(user)
        
        let foundName: string | null = null

        if (user.email) {
            // Strategy: Server Action (Bypass RLS)
            const result = await resolveUserName(user.email)
            if (result.name) {
                foundName = result.name
            }
        }

        // Strategy 2: User Metadata (Fallback)
        if (!foundName) {
            const meta = (user.user_metadata || {}) as any
            const metaName = meta.nombre || meta.name || meta.full_name
            if (metaName && metaName.trim() !== "" && metaName.trim().toLowerCase() !== "usuario") {
                foundName = metaName
            }
        }

        // Strategy 3: Email
        if (!foundName && user.email) {
            foundName = user.email
        }

        // Final assignment
        if (foundName && foundName.trim().toLowerCase() !== "usuario") {
            userStr = foundName
        } else {
            userStr = user.email || "Usuario (Sin Datos)"
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
    
    const currentNotes = String(lead.Obsevaciones || lead.Observaciones || "")
    const updatedNotes = currentNotes ? `${newEntry}\n\n${currentNotes}` : newEntry

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: updatedNotes })
        .eq("id", lead.id)

      if (error) throw error

      if (currentUser?.id) {
        await logClientEventAction(
          "NOTES_MODIFIED",
          "OPERATIONAL",
          "SUCCESS",
          `Lead ${lead.id}`,
          currentUser.email,
          currentUser.id,
          { action: "add_inline_note" }
        )
      }

      const updatedLead = { ...lead, Observaciones: updatedNotes, Obsevaciones: updatedNotes }
      setLead(updatedLead as Lead)
      setInlineNote("") 
      
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)

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

  const isCommunicationSent = (comm: Communication) => {
    if (comm.source === "whatsapp") {
      return comm.Tipo === "Enviado"
    }
    return comm.Tipo === "enviado" || (comm.source === "email" && comm.From?.includes(inmobiliariaNombre || ""))
  }

  const openCommunicationDetail = (comm: Communication) => {
    setSelectedCommunication(comm)
    setIsCommDialogOpen(true)
  }

  const handleReprogramVisit = async () => {
    if (!lead) return
    if (!isAgentSelectionOnly && (!newVisitDateDate || !newVisitDateTime)) return
    
    if (!selectedAgenteId) {
      toast({
        title: "Agente requerido",
        description: "Selecciona un agente antes de guardar la visita.",
        variant: "destructive",
      })
      return
    }

    try {
      let updateData: any = {
        Estado: "Visita Propuesta",
        idag: selectedAgenteId ? Number(selectedAgenteId) : null,
      }

      // History tracking
      let newStatus = "Visita Propuesta";
      if (!isAgentSelectionOnly && newVisitDateDate && newVisitDateTime) {
          newStatus = "Visita Confirmada";
      }
      updateData.Estado = newStatus;

      const visitHistoryEntry: LeadHistoryEntry = {
        status: newStatus,
        timestamp: new Date().toISOString(),
        agent_id: currentUser?.id,
        agent_name: currentUser?.email
      }

      if (currentUser?.email && agentes.length > 0) {
        const matched = agentes.find(a => a.Email === currentUser.email)
        if (matched) visitHistoryEntry.agent_name = matched.Nombre || matched.nombre || matched.Email
      }

      const currentHistory = (lead.status_history as LeadHistoryEntry[]) || []
      const updatedHistory = [...currentHistory, visitHistoryEntry]
      updateData.status_history = updatedHistory

      if (!isAgentSelectionOnly && newVisitDateDate && newVisitDateTime) {
        const d = new Date(`${newVisitDateDate}T${newVisitDateTime}`)
        const off = d.getTimezoneOffset()
        const sign = off <= 0 ? "+" : "-"
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
        const mm = String(Math.abs(off) % 60).padStart(2, "0")
        const offset = `${sign}${hh}:${mm}`
        const valueWithOffset = `${newVisitDateDate}T${newVisitDateTime}:00${offset}`
        
        updateData.fecha_de_visita = valueWithOffset
        updateData.visita_completada = "visita confirmada"
      } else if (isAgentSelectionOnly) {
         // If agent only, clear the visit date
         updateData.fecha_de_visita = null
         // Also clear visita_completada to avoid inconsistent state
         updateData.visita_completada = null
      }
      
      const { error } = await supabase
        .from("Clientes")
        .update(updateData)
        .eq("id", lead.id)

      if (error) throw error

      toast({
        title: isAgentSelectionOnly ? "Agente asignado" : "Fecha de visita actualizada",
        description: isAgentSelectionOnly 
           ? "Se ha asignado el agente y cambiado el estado a Visita Propuesta."
           : "La fecha de visita se ha reprogramado correctamente.",
      })



      // Trigger Webhook if status is "Visita Propuesta" or "Visita Confirmada"
      if (updateData.Estado === "Visita Propuesta" || updateData.Estado === "Visita Confirmada") {
        const assignedAgent = agentes.find(a => String(a.idag) === String(selectedAgenteId))
        const currentAd = advertisements.find(a => 
           (a.Referencia && lead.Inmueble && a.Referencia.trim() === lead.Inmueble.trim()) || 
           (a.Direccion && lead.Inmueble && a.Direccion.trim() === lead.Inmueble.trim()) ||
           (lead.Inmueble && a.Direccion && lead.Inmueble.includes(a.Direccion))
        )
        
        const bookingLink = buildBookingLink(lead.id)

        // Fetch Inmobiliaria data
        let inmobiliariaData = null
        // Try context ID first, then lead.idi if available
        const targetInmoId = inmobiliariaId || (lead as any).idi || (lead as any).usuario;
        
        if (targetInmoId) {
           const { data: inmoData } = await supabase
              .from("Inmobiliarias")
              .select("*")
              .eq("idi", targetInmoId)
              .single()
           inmobiliariaData = inmoData
        }

        const { date: formattedDate, time: formattedTime } = formatWebhookDate(updateData.fecha_de_visita)

        const payload = {
          "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
          "Agente Asignado": assignedAgent || null,
          "Agente Email": assignedAgent?.Email || null,
          "Inmueble/Anuncio": currentAd 
            ? { ...currentAd, Direccion: currentAd.Direccion || "Pregunta a tu agente" } 
            : { Referencia: lead.Inmueble, Direccion: "Pregunta a tu agente" },
          "Direccion": currentAd?.Direccion || "Pregunta a tu agente",
          "Direccion del Anuncio": currentAd?.Direccion || "Pregunta a tu agente",
          "Nombre Inmobiliaria": inmobiliariaNombre || (inmobiliariaData as any)?.nombre_inmobiliaria || "Sin nombre",
          "Inmobiliaria": inmobiliariaData || null,
          "Firma": (inmobiliariaData as any)?.firma_html || "",
          "Link de Agendamiento": bookingLink,
          "Fecha Visita": formattedDate,
          "Hora Visita": formattedTime,
          "Fecha Completa": updateData.fecha_de_visita || null,
          ...lead,
          ...updateData
        }

        const { status_history, ...webhookPayload } = payload as any
        
        const hasConfirmedDate = Boolean(updateData.fecha_de_visita)
        const endpoint = hasConfirmedDate ? "/api/confirmar-visita" : "/api/proponer-visita"

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload)
        }).catch(e => console.error("Error calling webhook proxy", e))
      }

      const updatedLead = { 
        ...lead, 
        ...updateData
      }
      setLead(updatedLead as Lead)
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)

      setVisitDateDialogOpen(false)
      setNewVisitDateDate("")
      setNewVisitDateTime("")
      setIsAgentSelectionOnly(false)
    } catch (error) {
      console.error("Error updating visit date:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la fecha de visita.",
        variant: "destructive",
      })
    }
  }

  const handleCancelVisit = async () => {
    if (!lead) return

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({
          visita_completada: "cancelada",
          fecha_de_visita: null,
          Estado: "Aceptado"
        })
        .eq("id", lead.id)

      if (error) throw error

      // Call cancellation webhook
      try {
        console.log("Calling cancellation webhook from modal...")
        let inmobiliariaData = null
        const targetInmoId = inmobiliariaId || (lead as any).idi || (lead as any).usuario;

        if (targetInmoId) {
             const { data } = await supabase.from("Inmobiliarias").select("*").eq("idi", targetInmoId).single()
             inmobiliariaData = data
        }

        let agentData = null
        if (lead.idag) {
             const { data } = await supabase.from("Agentes").select("*").eq("idag", lead.idag).single()
             agentData = data
        }

        const currentAd = advertisements.find(a => 
            (a.Referencia && lead.Inmueble && a.Referencia.trim() === lead.Inmueble.trim()) || 
            (a.Direccion && lead.Inmueble && a.Direccion.trim() === lead.Inmueble.trim()) ||
            (lead.Inmueble && a.Direccion && lead.Inmueble.includes(a.Direccion))
        )

        const { date: formattedDate, time: formattedTime } = formatWebhookDate(lead.fecha_de_visita)

        const bookingLink = buildBookingLink(lead.id)

        const cancelPayload = {
            "Link de Agendamiento": bookingLink,
            "Nombre de lead": `${lead.Nombre || ''} ${lead.Apellidos || ''}`.trim(),
            "Inmueble/Anuncio": currentAd 
              ? { ...currentAd, Direccion: currentAd.Direccion || "Pregunta a tu agente" } 
              : { Referencia: lead.Inmueble, Direccion: "Pregunta a tu agente" },
            "Direccion": currentAd?.Direccion || "Pregunta a tu agente",
            "Direccion del Anuncio": currentAd?.Direccion || "Pregunta a tu agente",
            "Nombre Inmobiliaria": inmobiliariaNombre || "Sin nombre",
            "Inmobiliaria": inmobiliariaData || null,
            "Firma": (inmobiliariaData as any)?.firma_html || "",
            "Agente Asignado": agentData,
            "Agente Email": agentData?.Email,
            "Fecha Visita": formattedDate,
            "Hora Visita": formattedTime,
            "Fecha Completa": lead.fecha_de_visita,
            "Motivo": "Cancelado por agente",
            ...lead,
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

      const updatedLead = { 
        ...lead, 
        fecha_de_visita: undefined,
        visita_completada: "cancelada",
        Estado: "Aceptado"
      }
      setLead(updatedLead as Lead)
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)

      setVisitDateDialogOpen(false)
      setNewVisitDateDate("")
      setNewVisitDateTime("")
    } catch (error) {
      console.error("Error canceling visit:", error)
      toast({
        title: "Error",
        description: "No se pudo cancelar la visita.",
        variant: "destructive",
      })
    }
  }

  const openVisitDialog = () => {
    if (!lead) return
    console.log("Opening visit dialog for lead:", lead.id)
    setSelectedAgenteId(lead.idag ? String(lead.idag) : "")
    
    if (lead.fecha_de_visita) {
      try {
        const d = new Date(lead.fecha_de_visita)
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, "0")
          const dd = String(d.getDate()).padStart(2, "0")
          const hh = String(d.getHours()).padStart(2, "0")
          const min = String(d.getMinutes()).padStart(2, "0")
          setNewVisitDateDate(`${yyyy}-${mm}-${dd}`)
          setNewVisitDateTime(`${hh}:${min}`)
        } else {
          console.error("Invalid date:", lead.fecha_de_visita)
          setNewVisitDateDate("")
          setNewVisitDateTime("12:00")
        }
      } catch (e) {
        console.error("Error parsing date:", e)
        setNewVisitDateDate("")
        setNewVisitDateTime("12:00")
      }
    } else {
      setNewVisitDateDate("")
      setNewVisitDateTime("12:00")
    }
    setVisitDateDialogOpen(true)
  }

  const openAvalDialog = () => {
    if (!lead) return

    console.log("[DEBUG] openAvalDialog called")
    console.log("[DEBUG] Lead Inmueble:", lead.Inmueble)
    console.log("[DEBUG] Advertisements available:", advertisements.length)

    // Find the advertisement details to get the rent price
    let actualRent: number | null = null
    if (lead.Inmueble) {
      const normalize = (s: string) => s ? String(s).trim().toLowerCase() : ""
      const leadInmueble = normalize(lead.Inmueble)

      // Try exact match first, then partial matches, including ID check
      const ad = advertisements.find((a) => {
        const ref = normalize(a.Referencia)
        const dir = normalize(a.Direccion)
        const id = String(a.ida || "")
        
        const match = (
          ref === leadInmueble || 
          dir === leadInmueble ||
          id === leadInmueble || // Check if Inmueble stores the ID
          (leadInmueble && dir && leadInmueble.includes(dir)) ||
          (leadInmueble && ref && leadInmueble.includes(ref)) ||
          (dir && leadInmueble && dir.includes(leadInmueble)) ||
          (ref && leadInmueble && ref.includes(leadInmueble))
        )
        if (match) console.log("[DEBUG] Match found with ad:", a)
        return match
      })
      
      if (ad) {
        console.log("[DEBUG] Ad found:", ad)
        if (ad.Precio) {
            console.log("[DEBUG] Ad has price:", ad.Precio)
            // Ensure price is a number
            // Handle string prices like "1.200" or "1,200" if necessary, but standard is number or simple string
            let priceVal = ad.Precio
            if (typeof priceVal === 'string') {
                // Remove currency symbols and normalize
                priceVal = priceVal.replace(/[€$]/g, '').trim()
                // If it has dot as thousand separator and comma as decimal (Spanish format)
                // or just dot as decimal.
                // Simple heuristic: if it has only dots, and looks like 1.200, it's likely 1200.
                // But safer to just try parseFloat.
                // Let's assume standard float format for now, or integer.
            }
            const price = Number(priceVal)
            if (!isNaN(price)) {
                actualRent = price
            }
        }
      }
    }

    // Calculate total income from all personas
    const persona1Income = lead.Ingresos || 0
    const persona2Income = lead.Ingresos_2 || 0
    const persona3Income = lead.Ingresos_3 || 0
    const persona4Income = lead.Ingresos_4 || 0

    const totalIncome = persona1Income + persona2Income + persona3Income + persona4Income

    let minRequiredIncome: number | null = null
    let idealIncome: number | null = null
    let needsAval = false
    let incomeRatio: number | null = null

    if (actualRent) {
      // Logic: Rent should not exceed 40% of income (approx factor of 2.5)
      // Or usually: Income >= 2.5 * Rent
      minRequiredIncome = actualRent * 2.5
      idealIncome = actualRent * 3

      if (totalIncome > 0) {
        incomeRatio = totalIncome / actualRent
        if (totalIncome < minRequiredIncome) {
          needsAval = true
        }
      } else {
        needsAval = true
      }
    }

    setAvalCalculation({
      income: totalIncome,
      persona1Income,
      persona2Income,
      persona3Income,
      persona4Income,
      actualRent,
      minRequiredIncome,
      idealIncome,
      needsAval,
      incomeRatio,
    })
    setIsAvalDialogOpen(true)
  }

  const openNoteDialog = (lead: Lead) => {
    setNoteContent(lead.Observaciones || lead.Obsevaciones || "")
    setIsNoteDialogOpen(true)
  }

  const saveNoteDialog = async () => {
    if (!lead) return
    try {
      const { error } = await supabase
        .from("Clientes")
        .update({ Obsevaciones: noteContent })
        .eq("id", lead.id)

      if (error) throw error

      if (currentUser?.id) {
        await logClientEventAction(
          "NOTES_MODIFIED",
          "OPERATIONAL",
          "SUCCESS",
          `Lead ${lead.id}`,
          currentUser.email,
          currentUser.id,
          { action: "edit_notes_dialog" }
        )
      }

      const updatedLead = { ...lead, Observaciones: noteContent, Obsevaciones: noteContent }
      setLead(updatedLead as Lead)
      if (onLeadUpdate) onLeadUpdate(updatedLead as Lead)
      
      setIsNoteDialogOpen(false)
      toast({
        title: "Nota guardada",
        description: "La nota se ha guardado correctamente.",
      })
    } catch (error) {
      console.error("Error saving note:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la nota.",
        variant: "destructive",
      })
    }
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1200px] sm:max-w-[1200px] h-[90vh] max-h-[90vh] p-0 gap-0 shadow-xl flex flex-col overflow-hidden bg-background z-[30000]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <DialogTitle className="sr-only">Cargando detalles</DialogTitle>
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Cargando información...</p>
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className="border-b p-6 bg-muted/10">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-bold mb-1">
                      {displayLeadName}
                    </DialogTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground items-center">
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        {lead.Inmueble || "Sin inmueble asignado"}
                      </span>
                      <span className="h-3 w-[1px] bg-border mx-1" />
                      <span className="flex items-center gap-1">
                        <Badge variant="outline" className="text-xs font-normal">
                          ID: {lead.id}
                        </Badge>
                      </span>
                      <span className="h-3 w-[1px] bg-border mx-1" />
                      <span className="text-xs text-muted-foreground">
                        Fecha Entrada: {lead.created_at ? formatDateTime(lead.created_at) : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="flex flex-col items-end">
                     <div className="relative">
                      {(() => {
                        const currentStatus = String(lead.Estado || "").trim()
                        const effectiveStatus = (currentStatus === "Visita Propuesta" && lead.fecha_de_visita) 
                          ? "Visita Confirmada" 
                          : (lead.Estado || "Pendiente")

                        return (
                          <Select
                            value={effectiveStatus}
                            onValueChange={(value) => {
                              setPendingStatus(value)
                              setStatusConfirmOpen(true)
                            }}
                          >
                            {(() => {
                              const statusColors = getStatusColors(effectiveStatus)
                              return (
                                <SelectTrigger 
                                  className="h-auto w-auto px-3 py-1 rounded-md text-sm font-medium border focus:ring-0 focus:outline-none transition-colors gap-2 [&>svg]:hidden"
                                  style={{
                                    backgroundColor: statusColors.bg,
                                    borderColor: statusColors.border,
                                    color: statusColors.text,
                                  }}
                                >
                                   <SelectValue placeholder="Estado">
                                     {statusColors.label}
                                   </SelectValue>
                                </SelectTrigger>
                              )
                            })()}
                            <SelectContent className="z-[50000]">
                              {[
                                "Datos Completos", 
                                "Datos Incompletos", 
                                "Incompleto",
                                "Pedir Aval", 
                                "Aceptado", 
                                "Descartado", 
                                "Visita Propuesta", 
                                "Visita Completada",
                                "Visita Confirmada"
                              ].map((status) => (
                                <SelectItem key={status} value={status}>
                                  {status === "Aceptado" ? "Aprobado" : status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )
                      })()}
                     </div>

                   </div>
                   {onDeleteClick && (
                      <Button variant="ghost" size="icon" onClick={() => onDeleteClick(lead)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                   )}
                </div>
              </div>
            </div>

            {/* Main Content - 2 Columns */}
            <div className="flex flex-col gap-6 p-6 overflow-y-auto flex-1">
                
                {/* Communications - Moved Here */}
                <div className="border rounded-lg bg-card flex flex-col h-[300px] w-full shrink-0">
                        <div className="p-4 border-b flex justify-between items-center">
                             <h3 className="font-semibold text-sm">Comunicaciones</h3>
                             <Badge variant="secondary" className="text-xs">{communications.length}</Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {commsLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : communications.length > 0 ? (
                                communications.map((comm) => (
                                    <Card 
                                        key={comm.id} 
                                        className={cn(
                                            "cursor-pointer hover:bg-muted/50 transition-colors overflow-hidden",
                                            comm.Tipo?.toLowerCase() === "recibido" 
                                              ? "border-r-4 border-r-rose-500 border-l-0" 
                                              : (comm.source === "whatsapp" ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-blue-500")
                                        )}
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
                                                {(comm.Mensaje || comm.Text || "Sin contenido").replace(/<[^>]*>?/gm, '')}
                                            </p>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                                    <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                                    <p className="text-xs">No hay comunicaciones</p>
                                </div>
                            )}
                        </div>
                </div>

                {lead.status_history && lead.status_history.length > 0 && (() => {
                  const lastEntry = lead.status_history[lead.status_history.length - 1]
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
                          {[...lead.status_history].reverse().map((entry, idx) => {
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

                {/* Visit Info - Moved Here (Full Width) */}
                <div className="space-y-2 shrink-0">
                         <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Información de la visita</h3>
                         <div className="p-4 border rounded-lg bg-card shadow-sm space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">AGENTE</Label>
                                    <Select 
                                        value={lead.idag ? String(lead.idag) : "unassigned"} 
                                        onValueChange={(val) => updateAgent(val === "unassigned" ? null : Number(val))}
                                    >
                                        <SelectTrigger className="h-8 text-xs font-medium">
                                            <SelectValue placeholder="Sin asignar" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Sin asignar</SelectItem>
                                            {agentes.map(a => (
                                                <SelectItem key={a.idag} value={String(a.idag)}>{a.Nombre || a.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex-1 space-y-1">
                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">FECHA</Label>
                                    <div className="h-8 flex items-center text-sm font-medium">
                                        {lead.fecha_de_visita ? (
                                            <div className="flex flex-col leading-tight">
                                                <span>{formatDate(lead.fecha_de_visita)}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(lead.fecha_de_visita).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : <span className="text-muted-foreground italic text-xs">No programada</span>}
                                    </div>
                                </div>
                                <div className="flex items-end">
                                   <Button 
                                     type="button"
                                     variant="default" 
                                     size="sm" 
                                     className="h-8 text-xs bg-black text-white hover:bg-black/90 border-0"
                                     onClick={openVisitDialog}
                                   >
                                     <CalendarIcon className="mr-2 h-3 w-3" />
                                     {lead.fecha_de_visita ? "Reprogramar" : "Programar"}
                                   </Button>
                                </div>
                            </div>
                         </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Left Column */}
                <div className="flex-1 space-y-6 min-w-0">
                    
                    {/* Visit Info Moved Up */}

                    {/* Persona Tabs & Info */}
                    <div className="space-y-4">
                        {/* Tabs */}
                        {(lead.Persona_2 || lead.Persona_3 || lead.Persona_4) && (
                            <div className="flex gap-1 overflow-x-auto pb-1">
                            <button
                                onClick={() => setSelectedPersona(1)}
                                className={cn(
                                    "px-4 py-2 text-xs font-medium border rounded-t-lg transition-all whitespace-nowrap",
                                    selectedPersona === 1 
                                        ? "bg-background border-b-transparent relative z-10" 
                                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                                )}
                            >
                                {lead.Nombre || "Persona 1"}
                            </button>
                            {[2, 3, 4].map(num => {
                                const pName = lead[`Persona_${num}`]
                                if (!pName) return null
                                const isAval = lead[`tipo${num}`] === "Avalista"
                                return (
                                    <button
                                        key={num}
                                        onClick={() => setSelectedPersona(num)}
                                        className={cn(
                                            "px-4 py-2 text-xs font-medium border rounded-t-lg transition-all whitespace-nowrap flex items-center gap-1",
                                            selectedPersona === num 
                                                ? (isAval ? "bg-green-50 border-green-200 text-green-900 border-b-transparent z-10" : "bg-background border-b-transparent z-10") 
                                                : (isAval ? "bg-green-100/50 text-green-700 hover:bg-green-100" : "bg-muted text-muted-foreground hover:bg-muted/80")
                                        )}
                                    >
                                        {isAval && "🛡️"} {pName}
                                    </button>
                                )
                            })}
                            </div>
                        )}

                        {/* Personal Info Card */}
                        <div className={cn(
                            "border rounded-lg bg-card p-5 shadow-sm",
                            (lead.Persona_2 || lead.Persona_3 || lead.Persona_4) ? "rounded-tl-none" : ""
                        )}>
                            <div className="flex justify-between items-center mb-5">
                                <h2 className="text-sm font-semibold">
                                    {selectedPersona === 1 ? "Información Personal" : `Información Persona ${selectedPersona}`}
                                </h2>
                                {!isEditingPersonalInfo ? (
                                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsEditingPersonalInfo(true)}>
                                        <Edit className="h-3 w-3 mr-1" /> Editar
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={savePersonalInfo}>
                                            <Check className="h-3 w-3 mr-1" /> Guardar
                                        </Button>
                                        <Button size="sm" variant="destructive" className="h-8 text-xs" onClick={() => {setIsEditingPersonalInfo(false); setEditFormData(lead)}}>
                                            <X className="h-3 w-3 mr-1" /> Cancelar
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Fields */}
                            {(() => {
                                // Define explicit key mappings due to inconsistent DB column names
                                const getKeys = (p: number) => {
                                    if (p === 1) return { 
                                        email: "Correo", phone: "Telefono", country: "Pais", 
                                        income: "Ingresos", docType: "Tipo_Documento", doc: "Documento" 
                                    }
                                    if (p === 2) return { 
                                        email: "Correo 2", phone: "Telefono 2", country: "Pais_2", 
                                        income: "Ingresos_2", docType: "Tipo_Documento_2", doc: "Documento_2" 
                                    }
                                    if (p === 3) return { 
                                        email: "Correo 3", phone: "Telefono 3", country: "Pais 3", 
                                        income: "Ingresos_3", docType: "Tipo_Documento_3", doc: "Documento_3" 
                                    }
                                    return { 
                                        email: "Correo 4", phone: "Telefono 4", country: "Pais 4", 
                                        income: "Ingresos_4", docType: "Tipo_Documento 4", doc: "Documento_4" 
                                    }
                                }
                                
                                const keys = getKeys(selectedPersona)
                                const { email: emailKey, phone: phoneKey, country: countryKey, income: incomeKey, docType: docTypeKey, doc: docKey } = keys
                                
                                const getVal = (key: string) => editFormData[key] || ""
                                const setVal = (key: string, val: any) => setEditFormData({ ...editFormData, [key]: val })
                                const editingDocInvalid = isDocumentInvalid(getVal(docTypeKey), getVal(docKey))
                                const viewDocInvalid = isDocumentInvalid(lead[docTypeKey], lead[docKey])
                                const docInvalid = isEditingPersonalInfo ? editingDocInvalid : viewDocInvalid

                                return (
                                    <div className="space-y-4">
                                        <div className={`grid grid-cols-1 md:grid-cols-${selectedPersona === 1 ? '4' : '3'} gap-4`}>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Email</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input value={getVal(emailKey)} onChange={e => setVal(emailKey, e.target.value)} className="h-8 text-xs" />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm min-h-[2rem]">
                                                        <span className={cn("truncate", shouldBlurPii && "blur-sm select-none")}>{lead[emailKey] || "—"}</span>
                                                        {lead[emailKey] && <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(lead[emailKey], "Email")}><Copy className="h-3 w-3" /></Button>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Teléfono</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input value={getVal(phoneKey)} onChange={e => setVal(phoneKey, e.target.value)} className="h-8 text-xs" />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm min-h-[2rem]">
                                                        <span className={cn("truncate", shouldBlurPii && "blur-sm select-none")}>{lead[phoneKey] || "—"}</span>
                                                        {lead[phoneKey] && <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(lead[phoneKey], "Teléfono")}><Copy className="h-3 w-3" /></Button>}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">País</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input value={getVal(countryKey)} onChange={e => setVal(countryKey, e.target.value)} className="h-8 text-xs" />
                                                ) : (
                                                    <div className="text-sm min-h-[2rem] flex items-center">{lead[countryKey] || "—"}</div>
                                                )}
                                            </div>
                                        </div>

                                        <div className={`grid grid-cols-1 md:grid-cols-${selectedPersona === 1 ? '4' : '3'} gap-4`}>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Ingresos</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input type="number" value={getVal(incomeKey)} onChange={e => setVal(incomeKey, Number(e.target.value))} className="h-8 text-xs" />
                                                ) : (
                                                    <div className="text-sm min-h-[2rem] flex items-center font-medium">{lead[incomeKey] ? formatCurrency(lead[incomeKey]) : "—"}</div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Tipo Doc.</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input value={getVal(docTypeKey)} onChange={e => setVal(docTypeKey, e.target.value)} className="h-8 text-xs" />
                                                ) : (
                                                    <div className="text-sm min-h-[2rem] flex items-center">{lead[docTypeKey] || "—"}</div>
                                                )}
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs text-muted-foreground">Documento</Label>
                                                {isEditingPersonalInfo ? (
                                                    <Input value={getVal(docKey)} onChange={e => setVal(docKey, e.target.value)} className={`h-8 text-xs ${docInvalid ? "border-red-500 text-red-600 focus-visible:ring-red-500" : ""}`} />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-sm min-h-[2rem]">
                                                        <span className={`truncate ${docInvalid ? "text-red-600" : ""}`}>{renderBlurredIdentityDoc(lead[docKey])}</span>
                                                        {lead[docKey] && <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => copyToClipboard(lead[docKey], "Documento")}><Copy className="h-3 w-3" /></Button>}
                                                    </div>
                                                )}
                                                {docInvalid && (
                                                    <div className="text-xs text-red-600">Número de documento no válido</div>
                                                )}
                                            </div>
                                            {selectedPersona === 1 && (
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Situación Laboral</Label>
                                                    {isEditingPersonalInfo ? (
                                                        <Input value={getVal("situacion_laboral")} onChange={e => setVal("situacion_laboral", e.target.value)} className="h-8 text-xs" />
                                                    ) : (
                                                        <div className="text-sm min-h-[2rem] flex items-center">{lead.situacion_laboral || "—"}</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {selectedPersona === 1 && 
                                        ((lead.m_error && String(lead.m_error).trim() !== "" && String(lead.m_error).trim().toLowerCase() !== "null") || 
                                         (lead.m_errror && String(lead.m_errror).trim() !== "" && String(lead.m_errror).trim().toLowerCase() !== "null")) && (
                                            <div className="grid grid-cols-1 gap-4 pt-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Datos faltantes o erroneos:</Label>
                                                    <div className="text-sm min-h-[2rem] flex items-center text-red-600 font-medium">
                                                        {lead.m_error || lead.m_errror}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* {selectedPersona === 1 && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Trabajo</Label>
                                                    {isEditingPersonalInfo ? (
                                                        <Input value={getVal("Trabajo")} onChange={e => setVal("Trabajo", e.target.value)} className="h-8 text-xs" />
                                                    ) : (
                                                        <div className="text-sm min-h-[2rem] flex items-center">{lead.Trabajo || "—"}</div>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs text-muted-foreground">Otros datos</Label>
                                                    <div className="flex flex-wrap gap-4 pt-1">
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="mascota" 
                                                                checked={isEditingPersonalInfo ? !!getVal("Mascota") : !!lead.Mascota}
                                                                onCheckedChange={c => isEditingPersonalInfo && setVal("Mascota", c)}
                                                                disabled={!isEditingPersonalInfo}
                                                            />
                                                            <label htmlFor="mascota" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Mascota</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="fumador" 
                                                                checked={isEditingPersonalInfo ? !!getVal("Fumador") : !!lead.Fumador}
                                                                onCheckedChange={c => isEditingPersonalInfo && setVal("Fumador", c)}
                                                                disabled={!isEditingPersonalInfo}
                                                            />
                                                            <label htmlFor="fumador" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Fumador</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="pareja" 
                                                                checked={isEditingPersonalInfo ? !!getVal("Pareja") : !!lead.Pareja}
                                                                onCheckedChange={c => isEditingPersonalInfo && setVal("Pareja", c)}
                                                                disabled={!isEditingPersonalInfo}
                                                            />
                                                            <label htmlFor="pareja" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Pareja</label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <Checkbox 
                                                                id="ninos" 
                                                                checked={isEditingPersonalInfo ? !!getVal("Niños") : !!lead["Niños"]}
                                                                onCheckedChange={c => isEditingPersonalInfo && setVal("Niños", c)}
                                                                disabled={!isEditingPersonalInfo}
                                                            />
                                                            <label htmlFor="ninos" className="text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Niños</label>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )} */}
                                    </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-full lg:w-[300px] flex-shrink-0 space-y-6">
                    
                    {/* Aval Card */}
                    <Card 
                       className={cn(
                          "cursor-pointer hover:bg-muted/50 transition-colors border-l-4", 
                          lead["Pedir Aval"] ? "border-l-emerald-500" : "border-l-transparent"
                       )}
                       onClick={() => openAvalDialog()}
                    >
                        <CardHeader className="py-3 px-4 pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Euro className="h-4 w-4 text-muted-foreground" />
                                    Solvencia
                                </span>
                                {lead["Pedir Aval"] && (
                                    <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 bg-emerald-50">
                                        Aval solicitado
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Ingresos Totales</span>
                                    <span className="font-medium">
                                        {formatCurrency(
                                            (lead.Ingresos || 0) + 
                                            (lead.Ingresos_2 || 0) + 
                                            (lead.Ingresos_3 || 0) + 
                                            (lead.Ingresos_4 || 0)
                                        )}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Estado</span>
                                    <span className={cn("font-medium text-xs", lead["Pedir Aval"] ? "text-emerald-600" : "text-muted-foreground")}>
                                        {lead["Pedir Aval"] ? "Solvente con Aval" : "Pendiente análisis"}
                                    </span>
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
                                    min={lead.created_at ? new Date(lead.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
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
                                {lead.prev_entrada?.toLowerCase() === "inmediatamente" ? "Inmediatamente" : 
                                 lead.prev_entrada?.toLowerCase() === "mas adelante" ? "Más adelante" : 
                                 lead.prev_entrada || "No especificado"}
                              </span>
                              {lead.prev_entrada?.toLowerCase() === "mas adelante" && lead.fecha_prev_entrada && (
                                <span className="ml-2 text-muted-foreground">
                                  {formatDate(lead.fecha_prev_entrada)}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                    </Card>

                    {/* Annotations Section */}
                    <div className="border rounded-lg bg-card flex flex-col h-[400px] w-full shrink-0 shadow-sm overflow-hidden">
                        <div className="p-3 border-b flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-2">
                                <StickyNote className="h-4 w-4 text-primary" />
                                <h3 className="font-semibold text-sm">
                                    Anotaciones
                                    <span className="ml-2 text-[9px] text-muted-foreground font-normal">
                                        (Debug: {currentUser?.email || "..."})
                                    </span>
                                </h3>
                            </div>
                            <Badge variant="secondary" className="text-[10px] h-5 bg-background border shadow-sm">
                                {splitNotes(String(lead.Obsevaciones || lead.Observaciones || "").trim()).length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
                             {/* Resumen de visita */}
                             {lead.resumen_visita && (
                                <div className="bg-[#DCFCE7] border border-[#16A34A] rounded-xl p-3 text-xs shadow-sm relative">
                                    <div className="flex justify-between items-start mb-2.5 pb-2 border-b border-[#16A34A]/30">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-7 w-7 rounded-full bg-[#16A34A]/10 flex items-center justify-center shrink-0 border border-[#16A34A]/30">
                                                <CalendarDays className="h-3.5 w-3.5 text-[#16A34A]" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-[#16A34A] text-[11px]">Resumen de Visita</span>
                                                <span className="text-[10px] font-medium text-[#16A34A]/80">
                                                    {lead.fecha_de_visita ? formatDate(lead.fecha_de_visita) : "Fecha no disponible"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pl-1">
                                        <p className="whitespace-pre-wrap text-[#16A34A] leading-relaxed font-medium">{lead.resumen_visita}</p>
                                    </div>
                                </div>
                             )}

                             {splitNotes(String(lead.Obsevaciones || lead.Observaciones || "").trim()).length > 0 ? (
                                splitNotes(String(lead.Obsevaciones || lead.Observaciones || "")).map((n, idx) => {
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
                                                        <span className="font-semibold text-foreground text-[11px]">{userStr || "Usuario (Sin Datos)"}</span>
                                                        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                                                        <span className="text-[9px] text-muted-foreground/50 font-mono mt-0.5">Raw: {n.header}</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-6 w-6 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1"
                                                    onClick={() => handleDeleteNoteRequest(idx)}
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
                                onClick={handleAddNote}
                                disabled={!inlineNote.trim()}
                             >
                                Añadir Nota
                             </Button>
                             {/* VISIBLE DEBUG FOR USER - REMOVED */}
                             {/* 
                             <div className="text-[10px] text-muted-foreground text-center mt-1 p-1 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-900/50">
                                <strong>Debug Usuario:</strong> {currentUser?.email || "Sin email"}
                             </div> 
                             */}
                        </div>
                    </div>

                    {/* Documents Card */}
                    <Card>
                        <CardHeader className="py-3 px-4 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    Documentos
                                </CardTitle>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setIsDocsDialogOpen(true)}>
                                    Gestionar
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="py-3 px-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span>DNI/NIE</span>
                                    <Badge variant={lead.Documento ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                                        {lead.Documento ? "Completado" : "Pendiente"}
                                    </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span>Nóminas</span>
                                    <Badge variant={lead["Nóminas"] ? "default" : "secondary"} className="text-[10px] px-2 py-0.5">
                                        {lead["Nóminas"] ? "Completado" : "Pendiente"}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>



                </div>
                </div>

                {/* Communications Moved Up */}
            </div>

            {/* Documents Dialog */}
            <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
                <DialogContent className="max-w-md z-[70000]">
                    <DialogHeader>
                        <DialogTitle>Gestionar documentos</DialogTitle>
                        <DialogDescription>Subir y gestionar documentos del lead</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">DNI/NIE</h4>
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDropActiveDni(true) }}
                                onDragLeave={() => setDropActiveDni(false)}
                                onDrop={(e) => {
                                    e.preventDefault(); setDropActiveDni(false);
                                    const files = Array.from(e.dataTransfer.files || [])
                                    files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "dni" : `dni-${idx+1}`))
                                }}
                                onClick={() => { if (!docsUploadLoading) { dniInputRef.current?.click() } }}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
                                    dropActiveDni ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/50"
                                )}
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
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Click o arrastra archivos aquí</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF o Imágenes</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="text-sm font-medium">Nóminas</h4>
                            <div 
                                onDragOver={(e) => { e.preventDefault(); setDropActiveIngresos(true) }}
                                onDragLeave={() => setDropActiveIngresos(false)}
                                onDrop={(e) => {
                                    e.preventDefault(); setDropActiveIngresos(false);
                                    const files = Array.from(e.dataTransfer.files || [])
                                    files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "ingresos" : `ingresos-${idx+1}`))
                                }}
                                onClick={() => { if (!docsUploadLoading) { ingresosInputRef.current?.click() } }}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
                                    dropActiveIngresos ? "border-primary bg-primary/5" : "border-muted hover:bg-muted/50"
                                )}
                            >
                                <input
                                    ref={ingresosInputRef}
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
                                <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                <p className="text-sm font-medium">Click o arrastra archivos aquí</p>
                                <p className="text-xs text-muted-foreground mt-1">PDF o Imágenes</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 mt-4">
                        <h4 className="text-sm font-medium">Archivos subidos</h4>
                        {docsLoading ? (
                            <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                        ) : docsList.length > 0 ? (
                            <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                {docsList.map((file: any) => {
                                    const fileUrl = `/api/nextcloud/file?path=${encodeURIComponent(file.path)}`
                                    return (
                                        <div key={file.path} className="flex items-center justify-between p-2 border rounded text-sm">
                                            <div className="flex items-center gap-2 truncate">
                                                <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <span className="truncate max-w-[180px]">{file.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openAttachmentPreview(fileUrl, file.name)}>
                                                    <Eye className="h-3 w-3" />
                                                </Button>
                                                <a href={fileUrl} target="_blank" rel="noreferrer" download onClick={async () => {
                                                    if (currentUser?.id) {
                                                        await logClientEventAction(
                                                            "DOCUMENT_DOWNLOAD",
                                                            "SENSITIVE_ACCESS",
                                                            "SUCCESS",
                                                            file.name,
                                                            currentUser.email,
                                                            currentUser.id,
                                                            { leadId: lead?.id }
                                                        )
                                                    }
                                                }}>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        <Download className="h-3 w-3" />
                                                    </Button>
                                                </a>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => deleteLeadDoc(file.path)}>
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No hay archivos subidos</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Visit Date Dialog */}
            <Dialog open={visitDateDialogOpen} onOpenChange={setVisitDateDialogOpen}>
              <DialogContent className="z-[70000]">
                <DialogHeader>
                  <DialogTitle>Reprogramar Visita</DialogTitle>
                  <DialogDescription>
                    Selecciona una nueva fecha y hora para la visita del lead.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Lead: {displayLeadName}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Estado: <span className="font-semibold text-blue-600 dark:text-blue-400">{lead.Estado || "Desconocido"}</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-agent" className="text-sm font-medium">
                      Seleccionar Agente
                    </Label>
                    <Select value={selectedAgenteId} onValueChange={(value) => setSelectedAgenteId(value)}>
                      <SelectTrigger id="visit-agent" className="h-10 text-sm bg-background">
                        <SelectValue placeholder="Seleccionar agente" />
                      </SelectTrigger>
                      <SelectContent>
                        {agentes.map((agente) => (
                          <SelectItem key={agente.idag} value={String(agente.idag)}>
                            {agente.Nombre || agente.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit-date" className="text-sm font-medium">
                      Nueva fecha y hora de visita
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        id="visit-date"
                        type="date"
                        value={newVisitDateDate}
                        onChange={(e) => setNewVisitDateDate(e.target.value)}
                        className="w-full"
                      />
                      
                      <div className="relative">
                        <Select
                          value={newVisitDateTime}
                          onValueChange={(value) => setNewVisitDateTime(value)}
                          disabled={loadingAvailability || availableSlots.length === 0}
                        >
                          <SelectTrigger className="h-10 text-sm">
                            <SelectValue placeholder={
                               loadingAvailability ? "Cargando..." : 
                               availableSlots.length > 0 ? "Hora" : "Sin horas"
                            } />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSlots.length > 0 ? (
                               availableSlots.map((slot) => (
                                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                               ))
                            ) : (
                               <div className="p-2 text-xs text-muted-foreground text-center">
                                 {availabilityReason === "no_config" ? "Sin disponibilidad" : 
                                  availabilityReason === "blocked_by_property" ? "Bloqueado por otra propiedad" : 
                                  "No hay huecos disponibles"}
                               </div>
                            )}
                          </SelectContent>
                        </Select>
                        {loadingAvailability && (
                           <div className="absolute right-8 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button 
                    variant="destructive" 
                    onClick={() => setIsCancelConfirmOpen(true)}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={!lead.fecha_de_visita}
                  >
                    Cancelar Visita
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setVisitDateDialogOpen(false)
                      setNewVisitDateDate("")
                      setNewVisitDateTime("")
                    }}>
                      Cerrar
                    </Button>
                    <Button onClick={handleReprogramVisit} disabled={!newVisitDateDate || !newVisitDateTime || !selectedAgenteId}>
                      Guardar
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isCancelConfirmOpen} onOpenChange={setIsCancelConfirmOpen}>
              <AlertDialogContent className="z-[70001]">
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

            {/* Communication Detail Dialog */}
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
                                {format(new Date(selectedCommunication.created_at), "PPP p", { locale: es })}
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
                                {format(new Date(selectedCommunication.created_at), "PPP p", { locale: es })}
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

            {/* Aval Dialog */}
            <Dialog open={isAvalDialogOpen} onOpenChange={setIsAvalDialogOpen}>
              <DialogContent className="sm:max-w-lg z-[30000]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Solvencia
                  </DialogTitle>
                </DialogHeader>

                {lead && avalCalculation && (
                  <div className="space-y-4 py-4">
                    {/* Lead Information */}
                    <div className="p-4 bg-gray-50 dark:bg-muted/50 rounded-lg border space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Nombre:</span>
                    <span className="text-sm font-semibold">{displayLeadName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-muted-foreground">Email:</span>
                        <span className={cn("text-sm", shouldBlurPii && "blur-sm select-none")}>{lead.Correo}</span>
                      </div>

                      <div className="pt-2 border-t space-y-1.5">
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Ingresos por Persona:</div>
                        {avalCalculation.persona1Income > 0 && (
                          <div className="flex justify-between pl-2">
                            <span className="text-xs text-muted-foreground">{(lead.Nombre || "Persona 1")}:</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(avalCalculation.persona1Income)}
                            </span>
                          </div>
                        )}
                        {avalCalculation.persona2Income > 0 && (
                          <div className="flex justify-between pl-2">
                            <span className="text-xs text-muted-foreground">{lead.Persona_2 || "Persona 2"}:</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(avalCalculation.persona2Income)}
                            </span>
                          </div>
                        )}
                        {avalCalculation.persona3Income > 0 && (
                          <div className="flex justify-between pl-2">
                            <span className="text-xs text-muted-foreground">{lead.Persona_3 || "Persona 3"}:</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(avalCalculation.persona3Income)}
                            </span>
                          </div>
                        )}
                        {avalCalculation.persona4Income > 0 && (
                          <div className="flex justify-between pl-2">
                            <span className="text-xs text-muted-foreground">{lead.Persona_4 || "Avalista"}:</span>
                            <span className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatCurrency(avalCalculation.persona4Income)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between pt-1.5 border-t">
                          <span className="text-sm font-medium text-muted-foreground">Total Ingresos:</span>
                          <span className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(avalCalculation.income)}</span>
                        </div>
                      </div>

                      {avalCalculation.actualRent && (
                        <div className="flex justify-between pt-2 border-t">
                          <span className="text-sm font-medium text-muted-foreground">Precio alquiler:</span>
                          <span className="text-sm font-semibold">{formatCurrency(avalCalculation.actualRent)}</span>
                        </div>
                      )}
                    </div>

                    <div
                      className="p-4 rounded-lg border space-y-4 bg-[#F8FBF8] dark:bg-zinc-600 border-gray-200 dark:border-gray-500"
                    >
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
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Ingresos mínimos requeridos:</span>
                              <span className="font-bold text-gray-900 dark:text-white text-base">{formatCurrency(avalCalculation.minRequiredIncome!)}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-gray-700 dark:text-gray-300 font-medium">Ingresos ideales:</span>
                              <span className="font-bold text-gray-900 dark:text-white text-base">{formatCurrency(avalCalculation.idealIncome!)}</span>
                            </div>
                            {avalCalculation.incomeRatio && avalCalculation.income > 0 && (
                              <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Tasa de esfuerzo:</span>
                                <span
                                  className={`font-bold text-base ${avalCalculation.incomeRatio <= 40 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
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
                          <details className="mt-2 text-xs text-yellow-700 cursor-pointer">
                            <summary>Ver detalles técnicos</summary>
                            <div className="mt-2 p-2 bg-[#F8FBF8]/50 rounded border border-yellow-200 font-mono text-[10px] overflow-auto max-h-40">
                              <p>Lead Inmueble: {lead.Inmueble || "N/A"}</p>
                              <p>Ads Fetched: {advertisements.length}</p>
                              <p>InmobiliariaID: {inmobiliariaId}</p>
                              <p>--- Primeros 5 Ads ---</p>
                              {advertisements.slice(0, 5).map((ad, i) => (
                                <div key={i} className="mb-1 border-b pb-1 last:border-0">
                                  <p>Ref: {ad.Referencia}</p>
                                  <p>Dir: {ad.Direccion}</p>
                                  <p>ID: {ad.ida}</p>
                                  <p>Precio: {ad.Precio} ({typeof ad.Precio})</p>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <Button className="flex-1" onClick={() => setIsAvalDialogOpen(false)}>
                        Cerrar
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Notes Dialog */}
            <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
              <DialogContent className="sm:max-w-md z-[30000]">
                <DialogHeader>
                  <DialogTitle>Anotaciones</DialogTitle>
                  <DialogDescription>
                    {lead ? `Lead: ${String(lead.Nombre || "").trim().split(/\s+/).filter(Boolean)[0] || "Sin nombre"}` : ""}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <Textarea
                    rows={6}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Escribe las anotaciones..."
                  />
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setIsNoteDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button className="flex-1" onClick={saveNoteDialog}>
                      Guardar
                    </Button>
                  </div>
                  {lead && splitNotes(String(lead.Obsevaciones || lead.Observaciones || "").trim()).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground font-medium">Anotaciones existentes</div>
                      <div className="space-y-2">
                        {splitNotes(String(lead.Obsevaciones || lead.Observaciones || "")).map((n, idx) => {
                          const cleanHeader = n.header.replace(/^\[|\]$/g, "")
                          const [dateStr, userStr] = cleanHeader.includes(" • ")
                            ? cleanHeader.split(" • ")
                            : [cleanHeader, null]

                          return (
                            <div key={idx} className="bg-background border rounded-lg p-3 text-xs shadow-sm group relative">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <User className="h-3 w-3 text-primary" />
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-foreground">{userStr || "Usuario (Sin Datos)"}</span>
                                    <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                  onClick={() => handleDeleteNoteRequest(idx)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <div className="pl-8">
                                <p className="whitespace-pre-wrap text-foreground leading-relaxed">{n.body}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>

            {/* Delete Lead Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <DialogContent className="sm:max-w-md z-[30000]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    Eliminar Lead
                  </DialogTitle>
                  <DialogDescription>
                    Esta acción es irreversible. Para confirmar, escribe el ID exacto del lead.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  {lead && (
                    <div className="p-3 bg-gray-50 rounded-lg border max-w-full">
                      <div className="text-sm">
                        <span className="text-muted-foreground">ID:</span> <span className="font-semibold">{String(lead.id)}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Nombre:</span>{" "}
                        <span className="font-semibold">{displayLeadName}</span>
                      </div>
                      <div className="text-sm max-w-full">
                        <span className="text-muted-foreground">Email:</span>{" "}
                        <span className={cn("font-semibold break-all", shouldBlurPii && "blur-sm select-none")}>{lead.Correo || "Sin email"}</span>
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
                    {lead && deleteConfirmInput && String(deleteConfirmInput).trim() !== String(lead.id).trim() && (
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
                    disabled={isDeletingLead || !lead || String(deleteConfirmInput).trim() !== String(lead.id || "").trim()}
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

            {/* Attachment Preview Dialog */}
            <Dialog open={!!attachmentPreviewUrl} onOpenChange={() => {
               setAttachmentPreviewUrl(null)
               setAttachmentPreviewName("")
            }}>
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

            {/* Status Change Confirmation Dialog */}
            <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
              <AlertDialogContent style={{ zIndex: 60000 }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de cambiar el estado?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cambiar el estado a &quot;{pendingStatus === "Aceptado" ? "Aprobado" : pendingStatus}&quot; activará notificaciones automáticas y otros procesos asociados a este lead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setPendingStatus(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => {
                    if (pendingStatus) updateLeadStatus(pendingStatus)
                    setStatusConfirmOpen(false)
                  }}>
                    Confirmar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Note Deletion Confirmation Dialog */}
            <AlertDialog open={!!deleteNoteConfirm} onOpenChange={(open) => !open && setDeleteNoteConfirm(null)}>
              <AlertDialogContent style={{ zIndex: 60000 }}>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Eliminar anotación?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. ¿Estás seguro de que quieres eliminar esta nota?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteNoteConfirm(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={executeDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </>
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No se ha seleccionado ningún lead
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
