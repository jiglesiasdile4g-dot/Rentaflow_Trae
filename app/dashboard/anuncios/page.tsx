"use client"

import { createAnuncioAction } from "@/app/actions/anuncios"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useRef, useCallback, useMemo } from "react"
import { useRouter, usePathname } from 'next/navigation'
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { TooltipProvider, Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Target, CheckCircle, Settings, Loader2, MoreVertical, Calendar, Plus, Eye, Edit, ShoppingCart, BarChart3, X, Archive, UserCheck, Lock, LockOpen, AlertCircle, Trash2, Info, RefreshCw, FileText, Image as ImageIcon, File, ExternalLink, Copy, History as HistoryIcon, MessageSquare } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { loadStripe, type Stripe as StripeJS } from "@stripe/stripe-js"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import { formatDate, cn, formatWebhookDate } from "@/lib/utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import ChangePlanButton from "@/components/change-plan-button"
import { createBrowserClient } from "@/lib/supabase/client" // Added for createBrowserClient
import { generateSlotCandidates, isOverlapping } from "@/lib/agenda-utils"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import Link from "next/link"
import Image from "next/image"

interface AnuncioCard {
  id: string
  codPortal: string // From Anuncios.CodPortal
  referencia: string // From Anuncios.Referencia
  direccion: string // From Anuncios.Direccion
  precio: number // From Anuncios.Precio
  portal: string // From Anuncios.Portal
  descripcion: string // From Anuncios.Descripcion
  activacion: string // From Anuncios.Activacion
  fotoUrl: string // From Anuncios.Foto_Url
  adjuntos?: string[]
  created_at?: string // From Anuncios.created_at
  whatsapp_activo?: boolean // From Anuncios.whatsapp_activo
  // Calculated metrics
  nuevosHoy: number // Count where created_at is today
  emailsEnviados: number // Count from Correos table
  whatsappsTotal: number
  emailsPeriodo: number
  whatsappsPeriodo: number
  datosCompletos: number // Count from Clientes where Estado = "Datos completos"
  leadsTotales: number // Total count from Clientes
  aLaEspera: number // Count from Clientes where Estado != "Datos completos"
  tiempoAhorrado: number // Calculated based on emails/whatsapp in periodo
  tiempoAhorradoTotal: number
  ultimaActividad: string
  fechaUltimaActividad: Date | null
  estado: "activo" | "pausado" | "error" | "archivado" // Added "archivado"
  // Health score components
  healthScore: number
  porcentajeCompletos: number
  // Sparkline data (7 days)
  sparklineData: number[]
  activityStartDate?: Date
  activityData?: number[]
  // Consumption metrics
  ejecuciones: number
  consumoMes: number
  // Stats modal specific fields - might not be in DB schema directly
  rebotesAltos?: boolean
  incompletosAlto?: boolean
  necesidadAval?: boolean
  Fecha_Activacion_Programada?: string | null // Added for scheduled activation
  fechaCreacion?: string // Added for activation date in stats
  fecha_activacion?: string | null // Added for tracking activation date
  // Phase metrics from database
  phaseMetrics?: {
    aceptados: number
    visitaPropuesta: number
    visitaCompletada: number
    datosCompletos: number
  }
  // Added descartados field
  descartados?: number
  // Availability indicator
  hasAvailability?: boolean
  // Fields for agenda-utils
  ida?: string
  duracion_visita?: number
  tiempo_entre_visitas?: number
}

interface CreationStep {
  step: number
  data: {
    codPortal: string
    referencia: string
    direccion: string
    portal: string
    descripcion: string
    precio: string
    activacion: string
  }
}

interface EditFormData {
  codPortal: string
  referencia: string
  direccion: string
  descripcion: string
  precio: string
  portal: string
  activacion: string
  duracion_visita?: string
  tiempo_entre_visitas?: string
}

const DEFAULT_FAQ_QUESTIONS = [
  "¿La vivienda es amueblada?",
  "¿Incluye electrodomésticos?",
  "¿Puedo llevar mascotas?",
  "¿La propiedad tiene terraza, balcón o patio?",
  "¿Tiene aire acondicionado o calefacción?",
  "¿Cuántos baños tiene?",
  "¿Cuántos ocupantes admite la vivienda?",
  "¿Hay vecinos ruidosos?",
]

export default function AnunciosPage() {
  const [user, setUser] = useState<any>(null)
  const [anunciosCards, setAnunciosCards] = useState<(AnuncioCard & { localMetricsPeriod?: "hoy" | "esteMes" | "ultimoMes" | "periodoActual" })[]>([])
  const [anunciosError, setAnunciosError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editingAnuncio, setEditingAnuncio] = useState<AnuncioCard | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData>({
    codPortal: "",
    referencia: "",
    direccion: "",
    descripcion: "",
    precio: "",
    portal: "",
    activacion: "Pausado",
  })
  const [totalAnuncios, setTotalAnuncios] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalCompletos, setTotalCompletos] = useState(0)
  const [totalEjecuciones, setTotalEjecuciones] = useState(0)
  const [planLimit, setPlanLimit] = useState(1000)
  const [anunciosLimit, setAnunciosLimit] = useState(0)
  const [cardsLoading, setCardsLoading] = useState(false)
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [showPlanSelector, setShowPlanSelector] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
  const [planResetAt, setPlanResetAt] = useState<Date | null>(null)
  const [scheduledPlanId, setScheduledPlanId] = useState<number>(0)
  const [scheduledEffectiveAt, setScheduledEffectiveAt] = useState<Date | null>(null)
  const [selectedAnuncios, setSelectedAnuncios] = useState<Set<string>>(new Set())
  const [showFilters, setShowFilters] = useState(false)
  const [showProcessingDrawer, setShowProcessingDrawer] = useState(false)
  const [processingAnuncio, setProcessingAnuncio] = useState<AnuncioCard | null>(null)
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreationModal, setShowCreationModal] = useState(false)
  const [showScheduleDialog, setShowScheduleDialog] = useState(false)
  const [schedulingAnuncioId, setSchedulingAnuncioId] = useState<string | null>(null)
  const [scheduledDate, setScheduledDate] = useState<string>("")
  const [creationStep, setCreationStep] = useState<CreationStep>({
    step: 1,
    data: {
      codPortal: "",
      referencia: "",
      direccion: "",
      portal: "",
      descripcion: "",
      precio: "",
      activacion: "Pausado",
    },
  })
  const [filterPortal, setFilterPortal] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [showInfoFaqsModal, setShowInfoFaqsModal] = useState(false)
  const [showStatsModal, setShowStatsModal] = useState(false)
  const [selectedAnuncioForStats, setSelectedAnuncioForStats] = useState<AnuncioCard & { statsPeriod?: string } | null>(null)
  const whatsappActivoRef = useRef<boolean | undefined>(undefined)
  const [statsLeads, setStatsLeads] = useState<any[]>([]) // Leads for the currently selected stats anuncio
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archivingAnuncio, setArchivingAnuncio] = useState<AnuncioCard | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAnuncio, setDeletingAnuncio] = useState<AnuncioCard | null>(null)
  const [expandedLeadsAnuncio, setExpandedLeadsAnuncio] = useState<string | null>(null)
  const [nextcloudDialog, setNextcloudDialog] = useState<{ open: boolean; inmobiliaria: string; referencia: string; folder?: string; files: any[]; recent: any[]; loading: boolean; error: string | null }>({ open: false, inmobiliaria: "", referencia: "", folder: undefined, files: [], recent: [], loading: false, error: null })
  const [nextcloudUploading, setNextcloudUploading] = useState(false)
  const [nextcloudDragActive, setNextcloudDragActive] = useState(false)
  const [creationUploadUploading, setCreationUploadUploading] = useState(false)
  const [editUploadUploading, setEditUploadUploading] = useState(false)
  const [creationDragActive, setCreationDragActive] = useState(false)
  const [editDragActive, setEditDragActive] = useState(false)
  const [editFilesList, setEditFilesList] = useState<any[]>([])
  const [editFilesLoading, setEditFilesLoading] = useState(false)
  const [creationFilesList, setCreationFilesList] = useState<any[]>([])
  const [creationFilesLoading, setCreationFilesLoading] = useState(false)
  const [nextcloudDeletingPath, setNextcloudDeletingPath] = useState<string | null>(null)
  const [completosLeads, setCompletosLeads] = useState<any[]>([])
  const [loadingCompletos, setLoadingCompletos] = useState(false)
  const [visitDateDialog, setVisitDateDialog] = useState<{
    open: boolean
    leadId: string
    leadName: string
    selectedDate: string
    selectedTime: string
    selectedAgenteId: string
  }>({
    open: false,
    leadId: "",
    leadName: "",
    selectedDate: "",
    selectedTime: "",
    selectedAgenteId: "",
  })
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingAvailability, setLoadingAvailability] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)

  // Fetch agent available dates
  useEffect(() => {
    async function fetchAvailableDates() {
      if (!visitDateDialog.selectedAgenteId) {
        setAvailableDates([])
        return
      }
      setLoadingDates(true)
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const today = new Date().toISOString().split('T')[0]
        const { data, error } = await supabase
          .from("Agendas")
          .select("fecha")
          .eq("agente_id", visitDateDialog.selectedAgenteId)
          .gte("fecha", today)
        
        if (error) throw error
        
        if (data) {
           const dates = data.map((d: any) => d.fecha)
           setAvailableDates([...new Set(dates)])
        }
      } catch (err) {
        console.error("Error fetching available dates:", err)
      } finally {
        setLoadingDates(false)
      }
    }
    fetchAvailableDates()
  }, [visitDateDialog.selectedAgenteId])

  // Fetch agent availability when agent or date changes
  useEffect(() => {
    async function fetchAvailability() {
      if (!visitDateDialog.selectedAgenteId || !visitDateDialog.selectedDate) {
        setAvailableSlots([])
        return
      }

      setLoadingAvailability(true)
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const [agendaResult, visitsResult] = await Promise.all([
          supabase
            .from("Agendas")
            .select("hora_inicio, hora_fin, anuncio_id, duracion, gap")
            .eq("agente_id", visitDateDialog.selectedAgenteId)
            .eq("fecha", visitDateDialog.selectedDate),
          supabase
            .from("Clientes")
            .select("fecha_de_visita, Inmueble")
            .eq("idag", visitDateDialog.selectedAgenteId)
            .gte("fecha_de_visita", `${visitDateDialog.selectedDate}T00:00:00`)
            .lte("fecha_de_visita", `${visitDateDialog.selectedDate}T23:59:59`)
        ])

        if (agendaResult.error) throw agendaResult.error

        const data = agendaResult.data || []
        const visits = visitsResult.data || []

        if (data.length > 0) {
          // Use shared utility to generate candidates
          const candidates = generateSlotCandidates(data, anunciosCards as any[], 20, 5)
          
          // Filter out busy slots
          const availableCandidates = candidates.filter(candidate => {
             const [h, m] = candidate.time.split(':').map(Number)
             const startMins = h * 60 + m
             const slotEnd = startMins + candidate.duration + candidate.gap
             
             // Check against visits
             const isBusy = visits.some((visit: any) => {
                if (!visit.fecha_de_visita) return false
                const vDate = new Date(visit.fecha_de_visita)
                if (isNaN(vDate.getTime())) return false
                
                const vh = vDate.getHours()
                const vm = vDate.getMinutes()
                const vStart = vh * 60 + vm
                
                // Default duration/gap for existing visits if unknown
                let vDuration = 20
                let vGap = 5
                
                // Try to find matching ad to get specific duration
                const vInmueble = (visit.Inmueble || "").toLowerCase()
                const vAd = anunciosCards.find(a => {
                     const ref = (a.referencia || "").toLowerCase()
                     const dir = (a.direccion || "").toLowerCase()
                     return (ref && ref === vInmueble) || (dir && dir.includes(vInmueble)) || (vInmueble && dir && vInmueble.includes(dir))
                })
                
                if (vAd) {
                    // Check editFormData for duration if it's the current one? No, use card data
                    // But card data might not have duracion_visita if not fetched?
                    // The interface AnuncioCard doesn't list duracion_visita...
                    // Wait, I should check AnuncioCard interface in this file.
                }
                
                const vEnd = vStart + vDuration + vGap
                return isOverlapping(startMins, slotEnd, vStart, vEnd)
             })
             
             return !isBusy
          })

          const slots = availableCandidates.map(c => c.time)
          slots.sort()
          setAvailableSlots([...new Set(slots)])
        } else {
          setAvailableSlots([])
        }
      } catch (err) {
        console.error("Error fetching availability:", err)
        toast({
          title: "Error",
          description: "No se pudo cargar la disponibilidad del agente.",
          variant: "destructive",
        })
      } finally {
        setLoadingAvailability(false)
      }
    }

    fetchAvailability()
  }, [visitDateDialog.selectedAgenteId, visitDateDialog.selectedDate, anunciosCards])
  const [infoFaqsData, setInfoFaqsData] = useState({
    informacionDetallada: "",
    faqs: [{ pregunta: "", respuesta: "" }],
  })

  const rawDataRef = useRef<{ leads: any[]; emails: any[]; whatsapp: any[] } | null>(null)

  const calculateAnuncioMetrics = (
    anuncio: AnuncioCard,
    period: "hoy" | "esteMes" | "ultimoMes" | "periodoActual",
    allLeads: any[],
    allEmails: any[],
    allWhatsapp: any[],
  ) => {
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    // Determine cutoffDate for "periodoActual"
    const cutoffDate = planResetAt ? planResetAt : thisMonthStart

    const periodStart =
      period === "hoy"
        ? dayStart
        : period === "ultimoMes"
          ? prevMonthStart
          : period === "esteMes"
            ? thisMonthStart
            : cutoffDate
    const periodEnd =
      period === "hoy"
        ? dayEnd
        : period === "ultimoMes"
          ? prevMonthEnd
          : now

    // Leads filtering
    let leads = allLeads
    // if (anuncio.fecha_activacion) {
    //   const activationDate = new Date(anuncio.fecha_activacion)
    //   if (!isNaN(activationDate.getTime())) {
    //     leads = leads.filter((l) => new Date(l.created_at) >= activationDate)
    //   }
    // }

    const leadsTotales = leads.length

    const nuevosHoy = leads.filter((l) => {
      const d = new Date(l.created_at)
      return d >= periodStart && d < periodEnd
    }).length

    const datosCompletosCount = leads.filter((l) => {
      const estado = l.Estado?.toLowerCase() || ""
      const fdc = l.Fecha_Datos_Completos ? new Date(l.Fecha_Datos_Completos) : null
      return estado === "datos completos" && fdc && fdc >= periodStart && fdc < periodEnd
    }).length

    const aLaEspera = leadsTotales - datosCompletosCount

    // Emails
    const leadEmails = leads.map((l) => l.Correo).filter(Boolean)
    const emailsMatch = allEmails.filter((c) => leadEmails.includes(c.to))
    const emailsEnviados = emailsMatch.filter((c) => {
      const d = new Date(c.created_at)
      return d >= periodStart && d < periodEnd
    }).length

    // Whatsapp
    const leadIDCs = leads.map((l) => l.IDC).filter((id: any) => Number.isFinite(id))
    const whatsMatch = allWhatsapp.filter((w) => leadIDCs.includes(w.IDC) && w.Tipo === "Enviado")
    const whatsappsPeriodo = whatsMatch.filter((w) => {
      const d = new Date(w.created_at)
      return d >= periodStart && d < periodEnd
    }).length

    const tiempoAhorrado = ((emailsEnviados + whatsappsPeriodo) * 1.27) / 60

    // Health Score
    let healthScore = 100
    const porcentajeCompletos = leadsTotales > 0 ? (datosCompletosCount / leadsTotales) * 100 : 0

    if (porcentajeCompletos < 20) healthScore -= 25
    if (aLaEspera > leadsTotales * 0.7) healthScore -= 20
    if (nuevosHoy === 0 && leadsTotales > 0) healthScore -= 15
    if (leadsTotales === 0) healthScore -= 40

    return {
      nuevosHoy,
      datosCompletos: datosCompletosCount,
      emailsPeriodo: emailsEnviados,
      emailsEnviados,
      whatsappsPeriodo,
      aLaEspera,
      tiempoAhorrado,
      healthScore: Math.max(0, healthScore),
      porcentajeCompletos,
    }
  }

  const handleLocalMetricsPeriodChange = (
    anuncioId: string,
    period: "hoy" | "esteMes" | "ultimoMes" | "periodoActual",
  ) => {
    setAnunciosCards((prev) =>
      prev.map((card) => {
        // Ensure strictly string comparison for IDs to avoid type mismatches
        if (String(card.id) !== String(anuncioId)) return card

        if (!rawDataRef.current) {
            return { ...card, localMetricsPeriod: period }
        }

        const { leads, emails, whatsapp } = rawDataRef.current
        const normalize = (s: string | null | undefined) => (s ? s.trim().toLowerCase() : "")
        // Filter leads for this anuncio
        const leadsForAnuncio = leads.filter((l) => {
          if (!l.Inmueble) return false
          const inmueble = normalize(l.Inmueble)
          const refNorm = normalize(card.referencia)
          const dirNorm = normalize(card.direccion)
          return inmueble && (inmueble === refNorm || (dirNorm && inmueble === dirNorm))
        })

        const metrics = calculateAnuncioMetrics(card, period, leadsForAnuncio, emails, whatsapp)

        return { ...card, ...metrics, localMetricsPeriod: period }
      }),
    )
  }
  const startStripeCheckout = async (planId: number) => {
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, email: user?.email || "" }),
      })
      if (!res.ok) {
        toast({ title: "Error", description: "No se pudo iniciar el pago", variant: "destructive" })
        return
      }
      const data = await res.json()
      const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
      const stripeJs = (await loadStripe(publishable)) as StripeJS | null
      if (!stripeJs) {
        toast({ title: "Error", description: "Stripe no está configurado", variant: "destructive" })
        return
      }
      await (stripeJs as any).redirectToCheckout({ sessionId: data.sessionId })
    } catch {
      toast({ title: "Error", description: "Fallo iniciando Checkout", variant: "destructive" })
    }
  }

  const handleCheckout = async () => {
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: currentPlanId, email: user?.email || "" }),
      })
      if (!res.ok) {
        toast({ title: "Error", description: "No se pudo iniciar el pago", variant: "destructive" })
        return
      }
      const data = await res.json()
      const publishable = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
      const stripeJs = (await loadStripe(publishable)) as StripeJS | null
      if (!stripeJs) {
        toast({ title: "Error", description: "Stripe no está configurado", variant: "destructive" })
        return
      }
      await (stripeJs as any).redirectToCheckout({ sessionId: data.sessionId })
    } catch {
      toast({ title: "Error", description: "Fallo iniciando Checkout", variant: "destructive" })
    }
  }

  const [isReferenciaEditable, setIsReferenciaEditable] = useState(false)
  const [isCodPortalEditable, setIsCodPortalEditable] = useState(false)

  const [trendTimeframe, setTrendTimeframe] = useState<"24h" | "7d" | "1m">("7d")
  const [trendData, setTrendData] = useState<any[]>([]) // Add state to store trend data
  const [loadingTrendData, setLoadingTrendData] = useState(false) // Add state for loading trend data
  const [phaseLeadsDialog, setPhaseLeadsDialog] = useState<{
    open: boolean
    status: string
    leads: any[]
  }>({ open: false, status: "", leads: [] })
  const [qualityMetrics, setQualityMetrics] = useState<{
    leadsRebotados: number
    datosIncompletos: number
    necesidadAval: number
  }>({
    leadsRebotados: 0,
    datosIncompletos: 0,
    necesidadAval: 0,
  })

  const [consumptionMetrics, setConsumptionMetrics] = useState({
    leads: 0,
    tiempoAhorrado: 0,
    planUtilizado: 0,
    whatsappsEnviados: 0,
    emailsEnviados: 0,
  })


  // Add isStatsModalOpen state to track the visibility of the stats modal
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)
  const [statsEmails, setStatsEmails] = useState<any[]>([])
  const [statsWhatsapps, setStatsWhatsapps] = useState<any[]>([])

  

  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  // Variables needed for linting fixes
  const [creatingAnuncio, setCreatingAnuncio] = useState(false)
  const [metricsPeriod, setMetricsPeriod] = useState<"hoy" | "esteMes" | "ultimoMes" | "periodoActual">("hoy")
  const [statsPeriod, setStatsPeriod] = useState<"hoy" | "esteMes" | "ultimoMes" | "periodoActual" | "esteAno">("esteMes")
  const periodBadgeText = (metricsPeriod: "hoy" | "esteMes" | "ultimoMes" | "periodoActual") => {
    const now = new Date()
    const dayStart = new Date(now)
    dayStart.setHours(0, 0, 0, 0)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const start = metricsPeriod === "hoy" ? dayStart : metricsPeriod === "ultimoMes" ? prevMonthStart : metricsPeriod === "esteMes" ? thisMonthStart : (planResetAt ? new Date(planResetAt) : thisMonthStart)
    const end = metricsPeriod === "hoy" ? now : metricsPeriod === "ultimoMes" ? prevMonthEnd : now
    const fmt = (d: Date) => formatDate(d)
    return metricsPeriod === "hoy" ? fmt(start) : `${fmt(start)} - ${fmt(end)}`
  }
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null)
  const [attachmentPreviewKind, setAttachmentPreviewKind] = useState<"pdf" | "image" | "unknown">("unknown")
  const [attachmentPreviewName, setAttachmentPreviewName] = useState<string>("")
  
  // Variables de paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [totalPages, setTotalPages] = useState(1)

  

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

  const { inmobiliariaId, inmobiliariaNombre, loading: inmobiliariaLoading, role } = useInmobiliaria()

  const openNextcloudFiles = async (anuncio: AnuncioCard) => {
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    setNextcloudDialog({ open: true, inmobiliaria: inmo, referencia: anuncio.referencia, folder: undefined, files: [], recent: [], loading: true, error: null })
    try {
      const params = new URLSearchParams({ referencia: anuncio.referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (!res.ok) {
        let errMsg = `Error ${res.status}`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setNextcloudDialog((prev) => ({ ...prev, loading: false, error: errMsg }))
        return
      }
      const json = await res.json()
      setNextcloudDialog({ open: true, inmobiliaria: inmo, referencia: anuncio.referencia, folder: json.folder, files: json.files || [], recent: json.recent || [], loading: false, error: null })
    } catch (e) {
      setNextcloudDialog((prev) => ({ ...prev, loading: false, error: "Error de red" }))
    }
  }

  const refreshNextcloudDialog = async () => {
    if (!nextcloudDialog.referencia) return
    setNextcloudDialog((prev) => ({ ...prev, loading: true }))
    try {
      const params = new URLSearchParams({ referencia: nextcloudDialog.referencia, inmobiliaria: nextcloudDialog.inmobiliaria })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (!res.ok) {
        let errMsg = `Error ${res.status}`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        setNextcloudDialog((prev) => ({ ...prev, loading: false, error: errMsg }))
        return
      }
      const json = await res.json()
      setNextcloudDialog((prev) => ({ ...prev, folder: json.folder, files: json.files || [], recent: json.recent || [], loading: false, error: null }))
    } catch {
      setNextcloudDialog((prev) => ({ ...prev, loading: false }))
    }
  }

  const uploadFilesForAnuncio = async (files: FileList | null, referenciaTarget: string, mode?: "creation" | "edit") => {
    if (!files || files.length === 0 || !referenciaTarget) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    if (!inmo) {
      toast({ title: "Error", description: "Inmobiliaria no cargada", variant: "destructive" })
      return
    }
    try {
      if (mode === "creation") setCreationUploadUploading(true)
      if (mode === "edit") setEditUploadUploading(true)
      const fd = new FormData()
      fd.append("referencia", referenciaTarget)
      fd.append("inmobiliaria", inmo)
      for (let i = 0; i < files.length; i++) {
        const f = files.item(i)
        if (f) fd.append("files", f)
      }
      const res = await fetch(`/api/nextcloud/upload`, { method: "POST", body: fd })
      if (!res.ok) {
        let errMsg = `No se pudieron subir archivos`
        try {
          const j = await res.json()
          if (j && typeof j.error === "string") errMsg = j.error
        } catch {}
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        toast({ title: "Éxito", description: "Archivos subidos correctamente. La IA ha sido entrenada" })
        if (mode === "creation") {
          await loadCreationFiles()
        }
      }
    } catch {
      toast({ title: "Error", description: "Error al subir archivos", variant: "destructive" })
    } finally {
      if (mode === "creation") setCreationUploadUploading(false)
      if (mode === "edit") setEditUploadUploading(false)
    }
  }

  const loadEditFiles = useCallback(async () => {
    if (!editFormData.referencia) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    setEditFilesLoading(true)
    try {
      const params = new URLSearchParams({ referencia: editFormData.referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (res.ok) {
        const j = await res.json()
        setEditFilesList(j.files || [])
      }
    } finally {
      setEditFilesLoading(false)
    }
  }, [editFormData.referencia, inmobiliariaNombre, inmobiliariaId])

  useEffect(() => {
    if (editingAnuncio && editFormData.referencia) {
      loadEditFiles()
      return
    }
    setEditFilesList([])
  }, [editingAnuncio, editFormData.referencia, loadEditFiles])

  const loadCreationFiles = async () => {
    if (!creationStep.data.referencia) return
    const inmo = inmobiliariaNombre || (inmobiliariaId != null ? String(inmobiliariaId) : "")
    setCreationFilesLoading(true)
    try {
      const params = new URLSearchParams({ referencia: creationStep.data.referencia, inmobiliaria: inmo })
      const res = await fetch(`/api/nextcloud/list?${params.toString()}`)
      if (res.ok) {
        const j = await res.json()
        setCreationFilesList(j.files || [])
      }
    } finally {
      setCreationFilesLoading(false)
    }
  }

  const deleteEditFile = async (path: string) => {
    if (!path) return
    try {
      const params = new URLSearchParams({ path })
      await fetch(`/api/nextcloud/file?${params.toString()}`, { method: "DELETE" })
      await loadEditFiles()
      toast({ title: "Archivo eliminado", description: "Archivo eliminado correctamente" })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    }
  }

  const deleteNextcloudFile = async (path: string) => {
    if (!path) return
    setNextcloudDeletingPath(path)
    try {
      const params = new URLSearchParams({ path })
      await fetch(`/api/nextcloud/file?${params.toString()}`, { method: "DELETE" })
      await refreshNextcloudDialog()
      toast({ title: "Archivo eliminado", description: "Archivo eliminado correctamente" })
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar", variant: "destructive" })
    } finally {
      setNextcloudDeletingPath(null)
    }
  }

  const uploadDirectToNextcloud = async (files: FileList | null) => {
    if (!files || files.length === 0 || !nextcloudDialog.referencia) return
    const arr = Array.from(files)
    const onlyPdf = arr.filter((f) => (/application\/pdf/i.test(String(f.type)) || /\.pdf$/i.test(String(f.name))))
    if (onlyPdf.length !== arr.length) {
      toast({ title: "Formato no permitido", description: "Solo se admiten documentos en PDF", variant: "destructive" })
      return
    }
    setNextcloudUploading(true)
    try {
      const fd = new FormData()
      fd.append("referencia", nextcloudDialog.referencia)
      fd.append("inmobiliaria", nextcloudDialog.inmobiliaria)
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
        toast({ title: "Error", description: errMsg, variant: "destructive" })
      } else {
        await refreshNextcloudDialog()
        toast({ title: "Éxito", description: "Archivos subidos correctamente. La IA ha sido entrenada" })
      }
    } catch {
      toast({ title: "Error", description: "Error al subir archivos", variant: "destructive" })
    } finally {
      setNextcloudUploading(false)
    }
  }

  const [agentes, setAgentes] = useState<any[]>([]);

  const fetchAgentes = async (inmobiliariaId: number, signal?: AbortSignal) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Filtramos agentes por la inmobiliaria (idi se almacena como string)
      let query = supabase
        .from("Agentes")
        .select("idag, Nombre, idi")
        .eq("idi", inmobiliariaId.toString()); // Convertir a string para coincidir con la BD
      
      if (signal) query = query.abortSignal(signal)

      const { data, error } = await query
      
      if (error) {
        if (signal?.aborted || error.message.includes("Abort")) return
        console.error("[v0] Error fetching agentes:", error.message);
        throw error;
      }
      
      if (!signal?.aborted) {
        // Map to ensure compatibility with components expecting lowercase 'nombre'
        const mappedData = (data || []).map((agent: any) => ({
          ...agent,
          nombre: agent.Nombre
        }))
        setAgentes(mappedData);
      }
      
    } catch (error: any) {
      if (signal?.aborted || error?.name === 'AbortError' || error?.message?.includes('Abort')) {
        console.log("[v0] Agentes request aborted")
        return
      }
      console.error("[v0] Failed to fetch agentes:", error);
      setAgentes([]);
    }
  };

  useEffect(() => {
    setVisitDateDialog((prev) => ({ ...prev, open: false }))
    setShowCreationModal(false)
    setShowArchiveDialog(false)
    setShowDeleteDialog(false)
    setShowInfoFaqsModal(false)
    setShowStatsModal(false)
    setShowScheduleDialog(false)
  }, [pathname])



  useEffect(() => {
    try {
      if (planResetAt == null && typeof window !== "undefined" && inmobiliariaId != null) {
        const key = `rf_planResetAt_${String(inmobiliariaId)}`
        const saved = window.localStorage.getItem(key)
        if (saved) {
          const d = new Date(saved)
          if (!isNaN(d.getTime())) {
            setPlanResetAt(d)
          }
        }
      }
    } catch {}
  }, [inmobiliariaId, planResetAt])

  const fetchQualityMetrics = async (anuncioReferencia: string, period: string, activationDateStr?: string | null) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    let endDate: Date = new Date()

    if (period === "hoy") {
      startDate = new Date(now)
      startDate.setHours(0, 0, 0, 0)
      endDate = new Date(now)
      endDate.setHours(23, 59, 59, 999)
    } else if (period === "esteMes") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = new Date(now)
    } else if (period === "ultimoMes") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    } else if (period === "esteAno") {
      startDate = new Date(now.getFullYear(), 0, 1)
      endDate = new Date(now)
    } else {
      // Default to last 30 days or similar if unknown
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }
    
    // Apply activation date filtering if it's more recent than the timeframe start
    // Note: We're keeping this commented out or relaxed as per previous fix request
    /*
    if (activationDateStr) {
      const activationDate = new Date(activationDateStr)
      if (!isNaN(activationDate.getTime()) && activationDate > startDate) {
        startDate = activationDate
      }
    }
    */

    console.log("[v0] Fetching quality metrics for referencia:", anuncioReferencia, "period:", period)

    // Get all leads for this anuncio in the timeframe
    const { data: leads, error: leadsError } = await supabase
      .from("Clientes")
      .select('IDC, Estado, "Pedir Aval", created_at, Correo, Fecha_Datos_Completos')
      .ilike("Inmueble", anuncioReferencia)
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString())

    console.log("[v0] Leads found for quality metrics:", leads?.length || 0, "Error:", leadsError)

    if (leadsError) {
      console.error("[v0] Error fetching leads for quality metrics:", leadsError)
      return { leadsRebotados: 0, datosIncompletos: 0, necesidadAval: 0 }
    }

    // Count "Datos Incompletos" status
    // Se consideran "Datos Incompletos" los leads que tienen explícitamente ese estado,
    // o que están en estado "Pendiente" (el estado inicial por defecto).
    const datosIncompletos =
      leads?.filter((lead) => {
        const estado = lead.Estado?.toLowerCase() || ""
        return ["datos incompletos", "pendiente", "incompleto"].includes(estado)
      }).length || 0
    
    // DEBUG: Log all unique statuses found to help identify any missing mappings
    const uniqueStatuses = Array.from(new Set(leads?.map(l => l.Estado))).filter(Boolean)
    console.log("[v0] Unique lead statuses found:", uniqueStatuses)
    console.log("[v0] Datos Incompletos count (including Pendiente):", datosIncompletos)

    const necesidadAval = leads?.filter((l) => l.Estado === "Pedir Aval" || l.Estado === "Aval Pedido").length || 0
    console.log("[v0] Necesidad Aval count:", necesidadAval)
    // </CHANGE>

    // Calculate "Leads Rebotados" - leads with no communications (emails or whatsapp)
    // Leads que no tengan mensajes recibidos, excepto el primero, pero despues ningun mensaje recibido.
    // Ignota para esta cuenta los enviados.
    // EXCEPCIÓN: Si el lead tiene Fecha_Datos_Completos, NO es rebotado.
    let leadsRebotados = 0
    if (leads && leads.length > 0) {
      for (const lead of leads) {
        // If lead has reached "Datos Completos", it is NOT a bounce, regardless of messages
        if (lead.Fecha_Datos_Completos) {
            continue
        }

        // Count received emails
        // We fetch emails for this lead and check if From matches lead's email
        // Or we just count all emails since we assume they are communication threads
        // But user said "ignore sent".
        // Strategy: Fetch all emails for lead. If From == lead.Correo -> Received.
        const { data: emails } = await supabase
          .from("Correos")
          .select("id, \"From\"") // Escape From if it's a keyword, though usually it's fine in string
          .eq("IDC", lead.IDC)
        
        const receivedEmailsCount = emails?.filter(e => e.From === lead.Correo).length || 0

        // Count received whatsapps
        const { data: whatsapp } = await supabase
          .from("Whatsapp")
          .select("id")
          .eq("IDC", lead.IDC)
          .eq("Tipo", "Recibido")
        
        const receivedWhatsappCount = whatsapp?.length || 0
        
        const totalReceived = receivedEmailsCount + receivedWhatsappCount

        // If total received messages <= 1 (only the initial inquiry or none), count as rebotado
        if (totalReceived <= 1) {
          leadsRebotados++
        }
      }
    }
    console.log("[v0] Leads Rebotados count:", leadsRebotados)

    return { leadsRebotados, datosIncompletos, necesidadAval }
  }

  const fetchLeadsByPhase = async (
    anuncioRef: string,
    phase: string,
  ) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    let status = ""
    if (phase === "aceptado") status = "Aceptado"
    else if (phase === "visita_propuesta") status = "Visita Propuesta"
    else if (phase === "visita_completada") status = "Visita Completada"
    else if (phase === "datos_completos") status = "Datos Completos"
    else if (phase === "descartado") status = "Descartado"

    let query = supabase
      .from("Clientes")
      .select("*, Agentes(Nombre), status_history")
      .ilike("Inmueble", anuncioRef)
      .order("created_at", { ascending: false })

    if (status) {
      query = query.eq("Estado", status)
    } else {
      return []
    }

    const { data, error } = await query

    if (error) {
      console.error(`[v0] Error fetching ${phase} leads:`, error)
      return []
    }
    console.log(`[v0] Fetched ${data?.length || 0} leads for phase ${phase}`)
    return data || []
  }

  const fetchLeadsByStatus = async (anuncioId: string, status: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ) // Use createBrowserClient here
    const { data, error } = await supabase
      .from("Clientes")
      .select("*, Agentes(Nombre), status_history")
      .eq("idi", anuncioId) // Assuming 'idi' is the foreign key to Anuncios
      .eq("Estado", "Datos Completos")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching leads by status:", error)
      return []
    }
    return data || []
  }

  

  const calculateMetricsForPeriod = (leads: any[], period: "hoy" | "esteMes" | "ultimoMes" | "periodoActual", planResetAt: Date | string | null, anuncioFechaActivacion?: string) => {
    const now = new Date()
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0)
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    
    // Determine start/end dates
    let start: Date
    let end: Date = now // Default end is now

    if (period === "hoy") {
      start = dayStart
    } else if (period === "ultimoMes") {
      start = prevMonthStart
      end = prevMonthEnd
    } else if (period === "esteMes") {
      start = thisMonthStart
    } else { // periodoActual
      start = planResetAt ? new Date(planResetAt) : thisMonthStart
    }
    
    // Ensure end of day for range comparisons if needed, but simple comparison works
    // Filter leads
    let filteredLeads = leads.filter(l => {
      const d = new Date(l.created_at)
      return d >= start && d <= end
    })

    // Also filter by activation date if provided (metrics logic often does this)
    // DISABLED: Showing full history
    // if (anuncioFechaActivacion) {
    //     const activationDate = new Date(anuncioFechaActivacion)
    //     filteredLeads = filteredLeads.filter(l => new Date(l.created_at) >= activationDate)
    // }

    // Calculate aggregations
    const total = filteredLeads.length
    const completos = filteredLeads.filter(l => String(l.Estado || "").toLowerCase() === "datos completos").length
    const aceptados = filteredLeads.filter(l => String(l.Estado || "").toLowerCase() === "aceptado").length
    const visitaPropuesta = filteredLeads.filter(l => String(l.Estado || "").toLowerCase() === "visita propuesta").length
    const visitaCompletada = filteredLeads.filter(l => String(l.Estado || "").toLowerCase() === "visita completada").length
    const descartados = filteredLeads.filter(l => String(l.Estado || "").toLowerCase() === "descartado").length
    
    return {
        leadsTotales: total,
        datosCompletos: completos,
        candidatosAceptados: aceptados,
        visitaPropuesta: visitaPropuesta,
        visitaCompletada: visitaCompletada,
        descartados: descartados,
    }
  }

  const handlePhaseMetricClick = async (phase: string) => {
    if (!selectedAnuncioForStats) return

    const leads = await fetchLeadsByPhase(selectedAnuncioForStats.referencia, phase)

    const statusLabels: Record<string, string> = {
      aceptado: "Candidatos Aprobados",
      visita_propuesta: "Visita Propuesta",
      visita_completada: "Visita Completada",
      datos_completos: "Datos Completos",
      descartado: "Descartados",
    }

    setPhaseLeadsDialog({
      open: true,
      status: statusLabels[phase] || phase,
      leads,
    })
  }

  const calculateTrendData = useCallback(async (anuncio: any, period: string, leadsOverride?: any[]) => {
    console.log(`[v0] calculateTrendData for ${anuncio.referencia}, period: ${period}, leadsOverride: ${leadsOverride?.length}`)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const now = new Date()

    // Helper to count metrics with activation date filtering
    const countMetrics = (leads: any[]) => {
      let total = 0
      let completos = 0
      let aceptados = 0
      let visitaPropuesta = 0
      let visitaCompletada = 0
      let descartados = 0
      
      // const activationDate = anuncio.fecha_activacion ? new Date(anuncio.fecha_activacion) : null

      for (const lead of leads || []) {
        // Filter by activation date
        // if (activationDate) {
        //   const createdAt = new Date(lead.created_at)
        //   if (createdAt < activationDate) continue
        // }

        total++
        const est = String(lead.Estado || "").toLowerCase()
        if (["datos completos", "aceptado", "visita propuesta", "pedir aval"].includes(est)) completos++
        if (est === "aceptado") aceptados++
        if (est === "visita propuesta") visitaPropuesta++
        if (est === "visita completada") visitaCompletada++
        if (est === "descartado") descartados++
      }
      return { total, completos, aceptados, visitaPropuesta, visitaCompletada, descartados }
    }

    // Helper to fetch leads for a time range
    const fetchLeadsForRange = async (start: Date, end: Date) => {
      if (leadsOverride) {
        return leadsOverride.filter(l => {
          const d = new Date(l.created_at)
          return d >= start && d < end
        })
      }

      const { data, error } = await supabase
        .from("Clientes")
        .select("IDC, Estado, created_at")
        .ilike("Inmueble", anuncio.referencia)
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString())
      
      return data || []
    }

    if (period === "hoy") {
      const hourlyData: { name: string; total: number; completos: number; aceptados: number; visitaPropuesta: number; visitaCompletada: number; descartados: number; isCurrent: boolean }[] = []

      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

        const data = await fetchLeadsForRange(hourStart, hourEnd)

        const hourLabel = hourStart.getHours().toString().padStart(2, "0") + ":00"
        const isCurrent = i === 0 // Last hour is current

        const metrics = countMetrics(data || [])
        hourlyData.push({ name: hourLabel, ...metrics, isCurrent })
      }

      // Filtrar horas con datos o al menos mostrar las últimas 6 horas para evitar muchas celdas vacías
      const filteredData = hourlyData.filter((item, index) => item.total > 0 || index >= hourlyData.length - 6)

      return filteredData
    } else if (period === "esteMes" || period === "ultimoMes") {
      const startDate = new Date(now)
      if (period === "ultimoMes") {
        startDate.setMonth(startDate.getMonth() - 1)
      }
      startDate.setDate(1) // Primer día del mes
      startDate.setHours(0, 0, 0, 0)
      
      const endDate = new Date(now)
      if (period === "ultimoMes") {
        endDate.setMonth(endDate.getMonth(), 0) // Último día del mes anterior
      }
      endDate.setHours(23, 59, 59, 999)

      const daysInMonth = period === "ultimoMes" 
        ? new Date(now.getFullYear(), now.getMonth(), 0).getDate()
        : new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()

      const dailyData: { name: string; total: number; completos: number; aceptados: number; visitaPropuesta: number; visitaCompletada: number; descartados: number }[] = []

      for (let i = 0; i < daysInMonth; i++) {
        const dayStart = new Date(startDate)
        dayStart.setDate(startDate.getDate() + i)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        // Si estamos en el mes actual, no procesar días futuros
        if (dayStart > now && period === "esteMes") {
          break
        }

        const data = await fetchLeadsForRange(dayStart, new Date(dayEnd.getTime() + 1)) // Add 1ms to include end time in < comparison

        const dayLabel = dayStart.toLocaleDateString("es-ES", { day: "numeric", month: "short" })

        const metrics = countMetrics(data || [])
        dailyData.push({ name: dayLabel, ...metrics })
      }

      return dailyData
    } else if (period === "esteAno") {
      const monthlyData: { name: string; total: number; completos: number; aceptados: number; visitaPropuesta: number; visitaCompletada: number; descartados: number }[] = []

      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), i, 1)
        const monthEnd = new Date(now.getFullYear(), i + 1, 0)
        monthEnd.setHours(23, 59, 59, 999)

        // No procesar meses futuros
        if (monthStart > now) {
          break
        }

        const data = await fetchLeadsForRange(monthStart, new Date(monthEnd.getTime() + 1))

        const monthLabel = monthStart.toLocaleDateString("es-ES", { month: "short" })

        const metrics = countMetrics(data || [])
        monthlyData.push({ name: monthLabel, ...metrics })
      }

      return monthlyData
    } else if (period === "periodoActual") {
      const periodStart = planResetAt ? new Date(planResetAt) : new Date(now.getFullYear(), now.getMonth(), 1)
      const weeksData: { name: string; total: number; completos: number; aceptados: number; visitaPropuesta: number; visitaCompletada: number; descartados: number }[] = []

      let currentWeekStart = new Date(periodStart)
      currentWeekStart.setHours(0, 0, 0, 0)

      while (currentWeekStart <= now) {
        const weekEnd = new Date(currentWeekStart)
        weekEnd.setDate(currentWeekStart.getDate() + 6)
        weekEnd.setHours(23, 59, 59, 999)

        const data = await fetchLeadsForRange(currentWeekStart, new Date(weekEnd.getTime() + 1))

        const weekLabel = `Sem ${Math.ceil((currentWeekStart.getDate() + currentWeekStart.getDay()) / 7)}`

        const metrics = countMetrics(data || [])
        weeksData.push({ name: weekLabel, ...metrics })

        currentWeekStart.setDate(currentWeekStart.getDate() + 7)
      }

      return weeksData
    } else {
      const dailyData: { name: string; total: number; completos: number; aceptados: number; visitaPropuesta: number; visitaCompletada: number; descartados: number }[] = []

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now)
        dayStart.setDate(dayStart.getDate() - i)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        const data = await fetchLeadsForRange(dayStart, new Date(dayEnd.getTime() + 1))

        const dayLabel = dayStart.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })

        const metrics = countMetrics(data || [])
        dailyData.push({ name: dayLabel, ...metrics })
      }

      return dailyData
    }
  }, [planResetAt])

  const handleOpenArchiveDialog = (anuncio: AnuncioCard) => {
    setArchivingAnuncio(anuncio)
    setShowArchiveDialog(true)
  }

  const handleArchiveAnuncio = async () => {
    if (!archivingAnuncio) return

    try {
      const { error } = await supabase
        .from("Anuncios")
        .update({ 
          Activacion: "Archivado",
          fecha_activacion: null
        })
        .eq("ida", archivingAnuncio.id)

      if (error) {
        console.log("[v0] Error archiving anuncio:", error)
        toast({
          title: "Error",
          description: "No se pudo archivar el anuncio",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Anuncio archivado correctamente",
        })
        setShowArchiveDialog(false)
        setArchivingAnuncio(null)
        await fetchAnuncios(undefined, currentPage) // Refresh the list
      }
    } catch (err) {
      console.log("[v0] Error in handleArchiveAnuncio:", err)
      toast({
        title: "Error",
        description: "Error al archivar el anuncio",
        variant: "destructive",
      })
    }
  }

  const handleUnarchiveAnuncio = async (anuncio: AnuncioCard) => {
    setProcessingId(anuncio.id)
    try {
      const { error } = await supabase
        .from("Anuncios")
        .update({ Activacion: "Pausado" }) // Desarchivar poniéndolo en pausado
        .eq("ida", anuncio.id)

      if (error) {
        throw error
      } else {
        toast({
          title: "Éxito",
          description: "Anuncio desarchivado correctamente",
        })
        await fetchAnuncios(undefined, currentPage) // Refresh the list
      }
    } catch (err) {
      console.log("[v0] Error in handleUnarchiveAnuncio:", err)
      toast({
        title: "Error",
        description: "Error al desarchivar el anuncio",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleOpenDeleteDialog = (anuncio: AnuncioCard) => {
    setDeletingAnuncio(anuncio)
    setShowDeleteDialog(true)
  }

  const handleDeleteAnuncio = async () => {
    if (!deletingAnuncio) return

    try {
      const { error } = await supabase.from("Anuncios").delete().eq("ida", deletingAnuncio.id)

      if (error) {
        console.log("[v0] Error deleting anuncio:", error)
        toast({
          title: "Error",
          description: "No se pudo eliminar el anuncio",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Anuncio eliminado permanentemente",
        })
        setShowDeleteDialog(false)
        setDeletingAnuncio(null)
        await fetchAnuncios(undefined, currentPage) // Refresh the list
      }
    } catch (err) {
      console.log("[v0] Error in handleDeleteAnuncio:", err)
      toast({
        title: "Error",
        description: "Error al eliminar el anuncio",
        variant: "destructive",
      })
    }
  }

  const fetchAvailablePlans = useCallback(async (signal?: AbortSignal) => {
    try {
      console.log("[v0] Fetching all available plans from Planes table...")

      let query = supabase
        .from("Planes")
        .select("*")
        .order("idp", { ascending: true })

      if (signal) query = query.abortSignal(signal)

      const { data: planesData, error: planesError } = await query

      if (planesError) {
        if (signal?.aborted || planesError.message.includes("Abort")) return
        console.log("[v0] Error fetching plans:", planesError)
        return
      }
      
      if (signal?.aborted) return

      if (planesData && planesData.length > 0) {
        const normalize = (p: any) => ({
          ...p,
          ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
          Anuncios: p?.Anuncios ?? p?.anuncios_activos ?? p?.AnunciosActivos ?? 0,
          Precio: p?.Precio ?? p?.precio ?? 0,
        })
        const normalized = planesData.map(normalize)
        console.log("[v0] Available plans loaded:", normalized)
        setAvailablePlans(normalized)
      }
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.message?.includes('Abort')) return
      console.log("[v0] Error in fetchAvailablePlans:", err)
    }
  }, [supabase])

  const fetchPlanLimit = useCallback(async (signal?: AbortSignal) => {
    try {
      console.log("[v0] Fetching plan limit from Planes table...")

      if (!inmobiliariaId) {
        console.log("[v0] No inmobiliaria ID available, using default limit: 1000000")
        setPlanLimit(1000000)
        return
      }

      let q1 = supabase
        .from("Inmobiliarias")
        .select("Plan, PlanResetAt, PlanNext, PlanNextEffectiveAt")
        .eq("idi", inmobiliariaId)
      
      if (signal) q1 = q1.abortSignal(signal)

      const { data: inmobiliariaData, error: inmobiliariaError } = await q1.single()
      
      if (signal?.aborted) return

      console.log("[v0] Inmobiliaria data:", inmobiliariaData)
      console.log("[v0] Inmobiliaria error:", inmobiliariaError)

      if (inmobiliariaError || !inmobiliariaData?.Plan) {
        if (inmobiliariaError?.message?.includes('Abort')) return
        console.log("[v0] Error fetching inmobiliaria plan:", inmobiliariaError)
        console.log("[v0] Using default limit: 1000000")
        setPlanLimit(1000000)
        setAnunciosLimit(1000000)
        return
      }

      const planId = inmobiliariaData.Plan
      const dbResetAt = inmobiliariaData.PlanResetAt ? new Date(inmobiliariaData.PlanResetAt) : null
      setCurrentPlanId(planId)
      const scheduledId = inmobiliariaData.PlanNext ? Number(inmobiliariaData.PlanNext) : 0
      const scheduledAt = inmobiliariaData.PlanNextEffectiveAt ? new Date(inmobiliariaData.PlanNextEffectiveAt) : null
      setScheduledPlanId(scheduledId)
      setScheduledEffectiveAt(scheduledAt)
      console.log(`[v0] Inmobiliaria plan ID: ${planId} (type: ${typeof planId})`)

      try {
        const lastKey = `rf_lastPlanId_${String(inmobiliariaId)}`
        const resetKey = `rf_planResetAt_${String(inmobiliariaId)}`
        const prev = typeof window !== "undefined" ? window.localStorage.getItem(lastKey) : null
        const curr = String(planId)
        if (typeof window !== "undefined") {
          if (dbResetAt && !isNaN(dbResetAt.getTime())) {
            window.localStorage.setItem(resetKey, dbResetAt.toISOString())
          }
          if (!prev || prev !== curr) {
            window.localStorage.setItem(lastKey, curr)
            if (!dbResetAt) {
              window.localStorage.setItem(resetKey, new Date().toISOString())
            }
          }
        }
        if (dbResetAt && !isNaN(dbResetAt.getTime())) {
          if (!planResetAt || planResetAt.getTime() !== dbResetAt.getTime()) {
            setPlanResetAt(dbResetAt)
          }
        }
      } catch {}

      let q2 = supabase.from("Planes").select("*")
      if (signal) q2 = q2.abortSignal(signal)
      const { data: planesData, error: planesError } = await q2
      
      if (signal?.aborted) return

      if (planesError || !planesData || planesData.length === 0) {
        if (planesError?.message?.includes('Abort')) return
        console.log("[v0] Could not load plans from database, using fallback data for plan ID:", planId)
        const fallbackPlan = getPlanData(planId)

        if (fallbackPlan) {
          console.log(
            `[v0] Plan limit loaded from fallback: ${fallbackPlan.ejecuciones} ejecuciones (${fallbackPlan.Nombre} plan)`,
          )
          setPlanLimit(fallbackPlan.ejecuciones)
          setAnunciosLimit(fallbackPlan.Anuncios)
        } else {
          console.log("[v0] No fallback plan found for ID:", planId, "using default: 1000000")
          setPlanLimit(1000000)
          setAnunciosLimit(1000000)
        }
        return
      }

      const normalize = (p: any) => ({
        ...p,
        ejecuciones: p?.ejecuciones ?? p?.leads ?? p?.Leads ?? 0,
        Anuncios: p?.Anuncios ?? p?.anuncios_activos ?? p?.AnunciosActivos ?? 0,
        Precio: p?.Precio ?? p?.precio ?? 0,
      })
      const normalizedPlans = (planesData || []).map(normalize)
      const matchingPlan = normalizedPlans.find((p: any) => p.idp === planId || (p as any).id === planId)

      if (matchingPlan) {
        console.log(
          `[v0] ✅ Plan limit loaded from database: ${matchingPlan.ejecuciones} ejecuciones (${matchingPlan.Nombre} plan)`,
        )
        setPlanLimit(matchingPlan.ejecuciones)
        setAnunciosLimit(matchingPlan.Anuncios)
      } else {
        console.log("[v0] No matching plan found in database, using fallback")
        const fallbackPlan = getPlanData(planId)

        if (fallbackPlan) {
          setPlanLimit(fallbackPlan.ejecuciones)
          setAnunciosLimit(fallbackPlan.Anuncios)
        } else {
          setPlanLimit(1000000)
          setAnunciosLimit(1000000)
        }
      }
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.message?.includes('Abort')) return
      console.log("[v0] Error fetching plan limit:", err)
      setPlanLimit(1000000)
      setAnunciosLimit(1000000)
    }
  }, [supabase, inmobiliariaId, planResetAt])

  const checkUser = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      return user
    }
    return null
  }, [supabase])

  const fetchAnuncios = useCallback(async (signal?: AbortSignal, page: number = 1) => {
    try {
      console.log(`[v0] Fetching anuncios from database with proper schema mapping... Page: ${page}`)
      setLoading(true)
      setCardsLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (signal?.aborted) return

      let isAdmin = false
      if (user?.email) {
        let qProfile = supabase.from("Perfiles").select("is_admin").eq("usuario", user.email)
        if (signal) qProfile = qProfile.abortSignal(signal)
        const { data: perfil } = await qProfile.single()

        isAdmin = perfil?.is_admin === true
        console.log("[v0] User is admin:", isAdmin)
      }

      if (signal?.aborted) return

      if (!inmobiliariaId && !isAdmin) {
        console.log("[v0] No inmobiliariaId available, cannot fetch anuncios")
        setAnunciosCards([])
        setTotalAnuncios(0)
        setLoading(false)
        setCardsLoading(false)
        return
      }

      console.log("[v0] Filtering anuncios by agency IDI (inmobiliariaId):", inmobiliariaId)

      // Calcular offset para paginación
      const offset = (page - 1) * itemsPerPage

      let query = supabase
        .from("Anuncios")
        .select("ida, Referencia, Direccion, Precio, Portal, Descripcion, Activacion, Foto_Url, created_at, Fecha_Activacion_Programada, CodPortal, Adjuntos, fecha_activacion, duracion_visita, tiempo_entre_visitas, whatsapp_activo")
        .order("created_at", { ascending: false })
        .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})
        .range(offset, offset + itemsPerPage - 1) // Límite de 20 anuncios por página
      
      if (signal) query = query.abortSignal(signal)

      // All users can now see their own archived anuncios
      // The client-side filtering (filterEstado) handles showing/hiding them

      let { data: anuncios, error: anunciosErr } = await query
      
      if (signal?.aborted) return

      if (anunciosErr) {
        if (anunciosErr.message.includes('Abort')) return
        let fallbackQuery = supabase
          .from("Anuncios")
          .select(
            "ida, Referencia, Direccion, Precio, Portal, Descripcion, Activacion, Foto_Url, created_at, Fecha_Activacion_Programada, CodPortal, Adjuntos, fecha_activacion, duracion_visita, tiempo_entre_visitas",
          )
          .order("created_at", { ascending: false })
          .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})
        
        if (signal) fallbackQuery = fallbackQuery.abortSignal(signal)

        const { data: anunciosFallback, error: fallbackErr } = await fallbackQuery
        
        if (signal?.aborted) return

        if (fallbackErr) {
          if (fallbackErr.message.includes('Abort')) return
          console.log("[v0] Error fetching anuncios (fallback):", fallbackErr)
          setAnunciosError("Error al cargar anuncios")
          return
        }
        anuncios = anunciosFallback || []
      }

      console.log("[v0] Anuncios fetched for agency IDI", inmobiliariaId, ":", anuncios?.length || 0)

      // Obtener el total de anuncios para la paginación
      const { count: totalCount } = await supabase
        .from("Anuncios")
        .select("*", { count: "exact", head: true })
        .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})

      const totalAnunciosCount = totalCount || 0
      setTotalAnuncios(totalAnunciosCount)
      setTotalPages(Math.ceil(totalAnunciosCount / itemsPerPage))

      if (!anuncios || anuncios.length === 0) {
        setAnunciosCards([])
        setTotalLeads(0)
        setTotalCompletos(0)
        setTotalEjecuciones(0)
        setLoading(false)
        setCardsLoading(false)
        return
      }

      setTotalAnuncios(anuncios.length)

      const cards: AnuncioCard[] = []
      let totalLeadsSum = 0
      let totalCompletosSum = 0
      let totalEjecucionesSum = 0
      let totalLeadsMesSum = 0

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Límite de 30 días para optimizar
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      let cutoffDate = planResetAt ? planResetAt : monthStart
      if (inmobiliariaId) {
        try {
          let qInmo = supabase
            .from("Inmobiliarias")
            .select("PlanResetAt")
            .eq("idi", inmobiliariaId)
          
          if (signal) qInmo = qInmo.abortSignal(signal)

          const { data: inmRow } = await qInmo.maybeSingle()

          if (signal?.aborted) return

          if (inmRow?.PlanResetAt) {
            const dbReset = new Date(inmRow.PlanResetAt)
            if (!isNaN(dbReset.getTime())) {
              cutoffDate = dbReset
              if (!planResetAt || planResetAt.getTime() !== dbReset.getTime()) {
                setPlanResetAt(dbReset)
              }
            }
          }
      } catch {}
      }
      // Pre-fetch all leads, emails, and whatsapps to avoid N+1 queries
      console.log("[v0] Pre-fetching leads and communications...")
      
      const references = anuncios.map((a) => a.Referencia).filter(Boolean)
      const addresses = anuncios.map((a) => a.Direccion).filter(Boolean)
      // Combine and deduplicate
      const propertyIdentifiers = [...new Set([...references, ...addresses])]

      let allLeadsRaw: any[] = []

      // Fetch leads in parallel (by IDI and by Property Name) to ensure we catch everything
      // Con límite de 30 días para optimizar el rendimiento
      let qIdi = inmobiliariaId 
        ? supabase
            .from("Clientes")
            .select(
              "IDC, Estado, created_at, Correo, Nombre, Telefono, Ingresos, aceptado, visita_propuesta, visita_completada, fecha_de_visita, Fecha_Datos_Completos, Inmueble",
            )
            .eq("usuario", inmobiliariaId)
            .gte("created_at", thirtyDaysAgo.toISOString()) // Solo últimos 30 días
        : null
      
      if (qIdi && signal) qIdi = qIdi.abortSignal(signal)

      // Also fetch by property name (exact match) as a backup for leads missing the agency ID
      // or for cases where we rely on string matching
      let qProp = propertyIdentifiers.length > 0
        ? supabase
            .from("Clientes")
            .select(
              "IDC, Estado, created_at, Correo, Nombre, Telefono, Ingresos, aceptado, visita_propuesta, visita_completada, fecha_de_visita, Fecha_Datos_Completos, Inmueble",
            )
            .in("Inmueble", propertyIdentifiers)
            .gte("created_at", thirtyDaysAgo.toISOString()) // Solo últimos 30 días
        : null
      
      if (qProp && signal) qProp = qProp.abortSignal(signal)

      const pIdi = qIdi ? qIdi : Promise.resolve({ data: [], error: null })
      const pProp = qProp ? qProp : Promise.resolve({ data: [], error: null })

      const [resIdi, resProp] = await Promise.all([pIdi, pProp])
      
      if (signal?.aborted) return

      const leadsIdi = resIdi.data || []
      const leadsProp = resProp.data || []
      
      // Merge and deduplicate by IDC
      const leadsMap = new Map()
      leadsIdi.forEach((l) => leadsMap.set(l.IDC, l))
      leadsProp.forEach((l) => leadsMap.set(l.IDC, l))
      
      allLeadsRaw = Array.from(leadsMap.values())
      console.log(`[v0] Leads fetched: ${leadsIdi.length} by IDI, ${leadsProp.length} by Property. Total unique: ${allLeadsRaw.length}`)

      // Collect IDs and Emails for bulk fetching
      const allEmails = [...new Set(allLeadsRaw.map((l) => l.Correo).filter(Boolean))]
      const allIDCs = [...new Set(allLeadsRaw.map((l) => l.IDC).filter((id: any) => Number.isFinite(id)))]

      let allCorreosRaw: any[] = []
      if (allEmails.length > 0) {
        // Fetch in chunks to avoid URL limits
        const chunks = []
        // Reduced chunk size from 50 to 20 to prevent "URI too long" errors with long email addresses
        for (let i = 0; i < allEmails.length; i += 20) {
          chunks.push(allEmails.slice(i, i + 20))
        }
        for (const chunk of chunks) {
          if (signal?.aborted) break
          let q = supabase.from("Correos").select("id, created_at, to, Tipo").in("to", chunk).gte("created_at", thirtyDaysAgo.toISOString()) // Solo últimos 30 días
          if (signal) q = q.abortSignal(signal)
          const { data, error } = await q
          if (error) {
             console.log("[v0] Error fetching emails chunk:", error)
             if (error.message.includes('URI too long')) {
               console.log("[v0] URI too long error - consider reducing chunk size further")
             }
             // Continue with other chunks but log the error
          }
          if (data) allCorreosRaw.push(...data)
        }
      }
      
      if (signal?.aborted) return

      let allWhatsappRaw: any[] = []
      if (allIDCs.length > 0) {
        const chunks = []
        // Reduced chunk size from 50 to 20 to prevent "URI too long" errors
        for (let i = 0; i < allIDCs.length; i += 20) {
          chunks.push(allIDCs.slice(i, i + 20))
        }
        for (const chunk of chunks) {
          if (signal?.aborted) break
          let q = supabase.from("Whatsapp").select("id, created_at, IDC, Tipo").in("IDC", chunk).gte("created_at", thirtyDaysAgo.toISOString()) // Solo últimos 30 días
          if (signal) q = q.abortSignal(signal)
          const { data, error } = await q
          if (error) {
             console.log("[v0] Error fetching whatsapp chunk:", error)
             if (error.message.includes('URI too long')) {
               console.log("[v0] URI too long error - consider reducing chunk size further")
             }
             // Continue with other chunks but log the error
          }
          if (data) allWhatsappRaw.push(...data)
        }
      }

      if (signal?.aborted) return

      console.log(
        `[v0] Pre-fetch complete: ${allLeadsRaw.length} leads, ${allCorreosRaw.length} emails, ${allWhatsappRaw.length} whatsapps`,
      )

      // Save raw data for local period recalculation
      rawDataRef.current = {
        leads: allLeadsRaw,
        emails: allCorreosRaw,
        whatsapp: allWhatsappRaw,
      }

      const normalize = (s: string | null | undefined) => (s ? s.trim().toLowerCase() : "")

      for (const anuncio of anuncios) {
        const referencia = anuncio.Referencia || `REF-${anuncio.ida}`
        const refNorm = normalize(referencia)
        const dirNorm = normalize(anuncio.Direccion)
        
        console.log(`[v0] Processing anuncio: ${referencia}`)

        // Filter leads from memory
        const rawLeads = allLeadsRaw.filter((l) => {
          if (!l.Inmueble) return false
          const inmueble = normalize(l.Inmueble)
          return inmueble && (inmueble === refNorm || (dirNorm && inmueble === dirNorm))
        })

        let allLeads = rawLeads || []
        
        // Filter leads by activation date if available (User request: count from last activation)
        // if (anuncio.fecha_activacion) {
        //    const activationDate = new Date(anuncio.fecha_activacion)
        //    // Check if date is valid
        //    if (!isNaN(activationDate.getTime())) {
        //      allLeads = allLeads.filter((lead) => {
        //        const createdAt = new Date(lead.created_at)
        //        return createdAt >= activationDate
        //      })
        //    }
        // }

        let leadsTotales = allLeads.length

        const leadsDesdeCorte = allLeads?.filter((lead) => {
          const createdAt = new Date(lead.created_at)
          return createdAt >= cutoffDate
        }) || []
        const leadsMes = leadsDesdeCorte.length
        console.log(`[v0] Total leads for ${referencia}: ${leadsTotales}`)

        const dayStart = new Date(now)
        dayStart.setHours(0, 0, 0, 0)
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1) // exclusive end
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const periodStart = metricsPeriod === "hoy" ? dayStart : metricsPeriod === "ultimoMes" ? prevMonthStart : metricsPeriod === "esteMes" ? thisMonthStart : cutoffDate
        const periodEnd = metricsPeriod === "hoy" ? dayEnd : metricsPeriod === "ultimoMes" ? prevMonthEnd : now

        const nuevosHoy =
          allLeads?.filter((lead: any) => {
            const createdAt = lead.created_at ? new Date(lead.created_at) : null
            return createdAt && createdAt >= periodStart && createdAt < periodEnd
          }).length || 0

        const datosCompletosCount =
          allLeads?.filter((lead) => {
            const estado = (lead as any).Estado?.toLowerCase() || ""
            const fdc = (lead as any).Fecha_Datos_Completos ? new Date((lead as any).Fecha_Datos_Completos) : null
            return estado === "datos completos" && fdc && fdc >= periodStart && fdc < periodEnd
          }).length || 0

        console.log("[v0] Datos Completos for anuncio", anuncio.ida, ":", datosCompletosCount)

        const aLaEspera = leadsTotales - datosCompletosCount

        // We'll match by email addresses from the leads
        const leadEmails = allLeads?.map((lead) => lead.Correo).filter(Boolean) || []
        const leadIDCs = (allLeads || [])
          .map((lead: any) => lead.IDC)
          .filter((idc: any) => Number.isFinite(idc))
        let emailsEnviadosMes = 0
        let emailsTotal = 0
        let whatsappsPeriodo = 0
        let whatsappsTotal = 0

        // Conteo optimizado usando datos en memoria
        if (leadEmails.length > 0) {
          const correosMatch = allCorreosRaw.filter((c) => 
            leadEmails.includes(c.to) && c.Tipo?.toLowerCase() === "enviado"
          )
          emailsTotal = correosMatch.length

          const correosPeriodo = correosMatch.filter((c) => {
            const d = new Date(c.created_at)
            return d >= periodStart && d < periodEnd
          })
          emailsEnviadosMes = correosPeriodo.length
        }

        if (leadIDCs.length > 0) {
          const whatsMatch = allWhatsappRaw.filter((w) => leadIDCs.includes(w.IDC) && w.Tipo === "Enviado")
          whatsappsTotal = whatsMatch.length

          const whatsPeriodo = whatsMatch.filter((w) => {
            const d = new Date(w.created_at)
            return d >= periodStart && d < periodEnd
          })
          whatsappsPeriodo = whatsPeriodo.length
        }

        const sparklineData: number[] = []
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

          const leadsInDay =
            allLeads?.filter((lead) => {
              const createdAt = new Date(lead.created_at)
              return createdAt >= dayStart && createdAt < dayEnd
            }).length || 0

          sparklineData.push(leadsInDay)
        }

        const activityData: number[] = []
        for (let i = 83; i >= 0; i--) {
          const ds = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
          ds.setHours(0, 0, 0, 0)
          const de = new Date(ds.getTime() + 24 * 60 * 60 * 1000)
          const cnt =
            allLeads?.filter((lead) => {
              const createdAt = new Date(lead.created_at)
              return createdAt >= ds && createdAt < de
            }).length || 0
          activityData.push(cnt)
        }

        let ultimaActividadFecha: Date | null = null
        if (allLeads && allLeads.length > 0) {
          const sortedLeads = [...allLeads].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
          )
          ultimaActividadFecha = new Date(sortedLeads[0].created_at)
        }

        let ultimaActividad = "Sin actividad"
        if (ultimaActividadFecha) {
          const diffHours = (now.getTime() - ultimaActividadFecha.getTime()) / (1000 * 60 * 60)
          if (diffHours < 1) {
            ultimaActividad = "Hace menos de 1 hora"
          } else if (diffHours < 24) {
            ultimaActividad = `Hace ${Math.floor(diffHours)} horas`
          } else if (diffHours < 48) {
            ultimaActividad = "Ayer"
          } else {
            const diffDays = Math.floor(diffHours / 24)
            ultimaActividad = `Hace ${diffDays} días`
          }
        }

        const porcentajeCompletos = leadsTotales > 0 ? (datosCompletosCount / leadsTotales) * 100 : 0
        const tiempoAhorrado = ((emailsEnviadosMes + whatsappsPeriodo) * 1.27) / 60
        const tiempoAhorradoTotal = ((emailsTotal + whatsappsTotal) * 1.27) / 60

        const estado: "activo" | "pausado" | "error" | "archivado" =
          anuncio.Activacion === "Activo"
            ? "activo"
            : anuncio.Activacion === "Pausado"
              ? "pausado"
              : anuncio.Activacion === "Archivado"
                ? "archivado"
                : "error"

        let healthScore = 100
        if (porcentajeCompletos < 20) healthScore -= 25 // Low completion rate
        if (aLaEspera > leadsTotales * 0.7) healthScore -= 20 // Too many waiting
        if (nuevosHoy === 0 && leadsTotales > 0) healthScore -= 15
        if (leadsTotales === 0) healthScore -= 40 // No leads at all

        const ejecuciones = leadsMes + emailsEnviadosMes

        // Add fechaCreacion for stats modal
        const fechaCreacion = anuncio.created_at ? new Date(anuncio.created_at).toLocaleDateString("es-ES") : "N/A"

        // Added descartados calculation
        const descartados =
          allLeads?.filter((lead) => {
            const estado = lead.Estado?.toLowerCase() || ""
            return estado === "descartado"
          }).length || 0

        cards.push({
          id: anuncio.ida, // Use "ida" instead of "id"
          ida: anuncio.ida, // For agenda-utils compatibility
          codPortal: anuncio.CodPortal || "",
          referencia,
          direccion: anuncio.Direccion || "",
          precio: anuncio.Precio || 0,
          portal: anuncio.Portal || "Sin especificar",
          descripcion: anuncio.Descripcion || "",
          activacion: anuncio.Activacion || "Inactivo",
          fotoUrl: anuncio.Foto_Url || "",
          adjuntos: anuncio.Adjuntos || [],
          duracion_visita: anuncio.duracion_visita,
          tiempo_entre_visitas: anuncio.tiempo_entre_visitas,
          nuevosHoy,
          emailsEnviados: emailsEnviadosMes,
          whatsappsTotal: whatsappsPeriodo,
          emailsPeriodo: emailsEnviadosMes,
          whatsappsPeriodo,
          datosCompletos: datosCompletosCount,
          leadsTotales,
          aLaEspera,
          tiempoAhorrado,
          tiempoAhorradoTotal,
          ultimaActividad,
          fechaUltimaActividad: ultimaActividadFecha,
          estado,
          healthScore: Math.max(0, healthScore),
          porcentajeCompletos,
          sparklineData,
          activityData,
          ejecuciones,
          consumoMes: ejecuciones,
          fechaCreacion: fechaCreacion, // Add fechaCreacion
          created_at: anuncio.created_at,
          fecha_activacion: anuncio.fecha_activacion || null,
          whatsapp_activo: anuncio.whatsapp_activo ?? true,
          descartados, // Added descartados
          Fecha_Activacion_Programada: anuncio.Fecha_Activacion_Programada || null, // Pass scheduled date
          phaseMetrics: {
            aceptados: allLeads?.filter((lead) => lead.Estado === "Aceptado").length || 0,
            visitaPropuesta: allLeads?.filter((lead) => lead.Estado === "Visita Propuesta").length || 0,
            visitaCompletada: allLeads?.filter((lead) => lead.Estado === "Visita Completada").length || 0,
            datosCompletos: allLeads?.filter((lead) => lead.Estado?.toLowerCase() === "datos completos").length || 0,
          },
        })

        totalLeadsSum += leadsTotales
        totalCompletosSum += datosCompletosCount
        totalEjecucionesSum += ejecuciones
        totalLeadsMesSum += leadsMes
      }

      // Sort by last activity, keeping archived ads at the bottom
      cards.sort((a, b) => {
        if (a.estado === "archivado" && b.estado !== "archivado") return 1
        if (a.estado !== "archivado" && b.estado === "archivado") return -1
        
        const dateA = a.fechaUltimaActividad 
          ? a.fechaUltimaActividad.getTime() 
          : (a.created_at ? new Date(a.created_at).getTime() : 0)
        
        const dateB = b.fechaUltimaActividad 
          ? b.fechaUltimaActividad.getTime() 
          : (b.created_at ? new Date(b.created_at).getTime() : 0)
          
        return dateB - dateA
      })

      try {
        const todayStr = new Date().toISOString().split('T')[0]
        const anuncioIds = cards.map(c => c.id)
        
        if (anuncioIds.length > 0) {
          const { data: agendaData } = await supabase
            .from("Agendas")
            .select("anuncio_id")
            .in("anuncio_id", anuncioIds)
            .gte("fecha", todayStr)
          
          const adsWithAvailability = new Set(agendaData?.map(a => String(a.anuncio_id)) || [])
          
          cards.forEach(card => {
            card.hasAvailability = adsWithAvailability.has(String(card.id))
          })
        }
      } catch (e) {
        console.log("[v0] Error checking availability:", e)
      }

      setAnunciosCards(cards)
      setTotalLeads(totalLeadsSum)
      setTotalCompletos(totalCompletosSum)

      let consumo = 0
      try {
        const prIso = cutoffDate.toISOString()
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
        
      } catch {}
      setTotalEjecuciones(consumo)
      console.log("[v0] Anuncios processing complete. Total cards:", cards.length)
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError' || err?.message?.includes('Abort')) {
        console.log("[v0] Anuncios request aborted")
        return
      }
      setAnunciosError("Error al conectar con la base de datos")
      console.log("[v0] Anuncios fetch error:", err)
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
        setCardsLoading(false)
      }
    }
  }, [supabase, inmobiliariaId, planResetAt, metricsPeriod])

  useEffect(() => {
    console.log("[DEBUG] useEffect triggered - inmobiliariaLoading:", inmobiliariaLoading, "inmobiliariaId:", inmobiliariaId);
    if (!inmobiliariaLoading && inmobiliariaId !== null) {
      console.log("[DEBUG] Calling ordered fetch with inmobiliariaId:", inmobiliariaId);
      const controller = new AbortController()
      const run = async () => {
        const u = await checkUser()
        if (!u) return
        if (controller.signal.aborted) return
        await fetchPlanLimit(controller.signal)
        if (controller.signal.aborted) return
        await fetchAvailablePlans(controller.signal)
        if (controller.signal.aborted) return
        await fetchAnuncios(controller.signal)
        if (controller.signal.aborted) return
        await fetchAgentes(inmobiliariaId, controller.signal)
      }
      run()
      return () => {
        // Delay abort to allow requests to complete
        setTimeout(() => controller.abort(), 5000)
      }
    } else {
      console.log("[DEBUG] Skipping fetch calls - inmobiliariaLoading:", inmobiliariaLoading, "inmobiliariaId:", inmobiliariaId);
    }
  }, [inmobiliariaId, inmobiliariaLoading, checkUser, fetchPlanLimit, fetchAvailablePlans, fetchAnuncios])

  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal) {
      setLoadingTrendData(true)
      calculateTrendData(selectedAnuncioForStats, statsPeriod, statsLeads).then((data) => {
        console.log(`[v0] Trend data result:`, data)
        setTrendData(data)
        setLoadingTrendData(false)
      })
    }
  }, [selectedAnuncioForStats, statsPeriod, showStatsModal, statsLeads, calculateTrendData])

  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal) {
      fetchQualityMetrics(selectedAnuncioForStats.referencia, statsPeriod, selectedAnuncioForStats.fecha_activacion).then((metrics) => {
        console.log("[v0] Quality metrics fetched:", metrics)
        setQualityMetrics(metrics)
      })
    }
  }, [selectedAnuncioForStats, statsPeriod, showStatsModal])

  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal && statsLeads) {
      const now = new Date()
      let startDate: Date
      let endDate: Date = new Date()

      // Calculate dates based on statsPeriod
      if (statsPeriod === "hoy") {
        startDate = new Date(now)
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)
      } else if (statsPeriod === "esteMes") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      } else if (statsPeriod === "ultimoMes") {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
      } else if (statsPeriod === "esteAno") {
        startDate = new Date(now.getFullYear(), 0, 1)
      } else { // periodoActual
        startDate = planResetAt ? new Date(planResetAt) : new Date(now.getFullYear(), now.getMonth(), 1)
        if (planResetAt) {
           const resetDate = new Date(planResetAt)
           if (!isNaN(resetDate.getTime()) && (now.getTime() - resetDate.getTime() > 60000)) {
               startDate = resetDate
           } else {
               startDate = new Date(now.getFullYear(), now.getMonth(), 1)
           }
        }
      }

      const periodLeads = statsLeads.filter((l) => {
        const d = new Date(l.created_at)
        return d >= startDate && d <= endDate
      })

      // Calculate sent messages (emails + whatsapp) in the period
      let sentMessagesCount = 0
      let whatsappsEnviados = 0
      let emailsEnviadosCount = 0
      
      // Filter emails/whatsapp for leads of this anuncio
      const leadEmails = statsLeads.map((l) => l.Correo).filter(Boolean)
      const leadIDCs = statsLeads.map((l) => l.IDC).filter((id: any) => Number.isFinite(id))
      
      let emailsEnviados = 0
      if (leadEmails.length > 0 && statsEmails.length > 0) {
         const matchingEmails = statsEmails.filter((e) => leadEmails.includes(e.to))
         
         emailsEnviados = matchingEmails.filter((e) => 
           e.Tipo?.toLowerCase() === "enviado" &&
           new Date(e.created_at) >= startDate && 
           new Date(e.created_at) <= endDate
         ).length

         console.log("[v0] Debug Consumption: Email counts", {
           statsPeriod,
           totalMatchingLeads: matchingEmails.length,
           finalEnviados: emailsEnviados,
           startDate,
           endDate
         })
      }
      emailsEnviadosCount = emailsEnviados
      
      if (leadIDCs.length > 0 && statsWhatsapps.length > 0) {
         const matchingWhatsapps = statsWhatsapps.filter((w) => 
           leadIDCs.includes(w.IDC) && 
           w.Tipo === "Enviado" &&
           new Date(w.created_at) >= startDate && 
           new Date(w.created_at) <= endDate
         )
         whatsappsEnviados = matchingWhatsapps.length
         
         console.log("[v0] Debug Consumption: WhatsApp counts", {
           statsPeriod,
           totalMatchingWhatsapps: matchingWhatsapps.length,
           leadIDCsCount: leadIDCs.length,
           statsWhatsappsCount: statsWhatsapps.length,
           startDate,
           endDate
         })
      }
      
      sentMessagesCount = emailsEnviados + whatsappsEnviados

      const count = periodLeads.length
      const tiempo = (sentMessagesCount * 1.27) / 60 // hours
      const planUsed = planLimit > 0 ? (count / planLimit) * 100 : 0

      setConsumptionMetrics({
        leads: count,
        tiempoAhorrado: tiempo,
        planUtilizado: planUsed,
        whatsappsEnviados,
        emailsEnviados: emailsEnviadosCount,
      })
    }
  }, [selectedAnuncioForStats, statsPeriod, showStatsModal, statsLeads, planLimit, planResetAt, statsEmails, statsWhatsapps])

  useEffect(() => {
    fetchAnuncios(undefined, currentPage)
  }, [metricsPeriod, fetchAnuncios, currentPage])

  const handleToggleEstado = async (anuncioId: string, currentActivacion: string) => {
    setProcessingId(anuncioId)
    try {
      // If the ad is archived, first unarchive it to "Pausado"
      let newActivacion = currentActivacion
      let newEstado = "pausado"
      
      if (currentActivacion === "Archivado") {
        newActivacion = "Pausado"
        newEstado = "pausado"
      } else {
        newActivacion = currentActivacion === "Activo" ? "Pausado" : "Activo"
        newEstado = newActivacion === "Activo" ? "activo" : "pausado"
      }

      const willActivate = newActivacion === "Activo"
      const unlimitedAds = anunciosLimit >= 1000000
      if (willActivate && !unlimitedAds) {
        const currentActive = anunciosCards.filter((a) => a.estado === "activo").length
        const projectedActive = currentActive + 1
        if (anunciosLimit > 0 && projectedActive > anunciosLimit) {
          toast({
            title: "Límite alcanzado",
            description: "Has alcanzado el límite de anuncios activos de tu plan. Archiva alguno o cambia de plan.",
            variant: "destructive",
          })
          return
        }
      }

      // Fetch current data to check fecha_activacion
      const { data: currentAd } = await supabase.from("Anuncios").select("fecha_activacion").eq("ida", anuncioId).single()

      const updates: any = { Activacion: newActivacion }
      // Only set activation date if it's null (first activation or after unarchiving)
      if (newActivacion === "Activo" && !currentAd?.fecha_activacion) {
        updates.fecha_activacion = new Date().toISOString()
      }

      const { error } = await supabase.from("Anuncios").update(updates).eq("ida", anuncioId)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del anuncio",
          variant: "destructive",
        })
      } else {
        const estadoLiteral: AnuncioCard["estado"] = newEstado === "activo" ? "activo" : "pausado"
        setAnunciosCards((prev) =>
          prev.map((anuncio) =>
            anuncio.id === anuncioId
              ? { ...anuncio, activacion: newActivacion, estado: estadoLiteral }
              : anuncio,
          ),
        )

        toast({
          title: "Éxito",
          description: `Anuncio ${newActivacion.toLowerCase()}`,
        })
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al procesar el anuncio",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleVerLeads = (referencia: string) => {
    const url = `/dashboard/leads?filter=${encodeURIComponent(referencia)}`
    router.push(url)
  }

  const handleProgramarVisitaUpdate = async (leadId: string) => {
    try {
      // History tracking setup
      const { data: { user } } = await supabase.auth.getUser()
      const { data: leadData } = await supabase.from("Clientes").select("status_history").eq("IDC", leadId).single()
      
      const currentHistory = (leadData?.status_history as any[]) || []
      const historyEntry = {
        status: "Programar visita",
        timestamp: new Date().toISOString(),
        agent_id: user?.id,
        agent_name: user?.email || "Sistema"
      }
      
      const updatedHistory = [...currentHistory, historyEntry]

      const { error } = await supabase.from("Clientes").update({ 
        Estado: "Programar visita",
        status_history: updatedHistory
      }).eq("IDC", leadId)

      if (error) {
        console.log("[v0] Error updating lead status:", error)
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del lead",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Lead movido a 'Programar visita'",
        })
        // Refresh theacijos completos leads list
        if (expandedLeadsAnuncio) {
          const anuncio = anunciosCards.find((a) => a.id === expandedLeadsAnuncio)
          if (anuncio) {
            await handleToggleCompletosExpanded(anuncio)
          }
        }
        // Refresh anuncios to update counts
        await fetchAnuncios(undefined, currentPage)
      }
    } catch (err) {
      console.log("[v0] Error in handleProgramarVisita:", err)
      toast({
        title: "Error",
        description: "Error al actualizar el lead",
        variant: "destructive",
      })
    }
  }

  const handleVerCompletos = (referencia: string) => {
    const url = `/dashboard/leads?filter=${encodeURIComponent(referencia)}&status=completos`
    router.push(url)
  }

  const handleToggleCompletosExpanded = async (anuncio: AnuncioCard) => {
    if (expandedLeadsAnuncio === anuncio.id) {
      // Collapse if already expanded
      setExpandedLeadsAnuncio(null)
      setCompletosLeads([])
    } else {
      // Expand and fetch leads with "Datos completos" status
      setExpandedLeadsAnuncio(anuncio.id)
      setLoadingCompletos(true)

      try {
        const { data, error } = await supabase
          .from("Clientes")
          .select("*")
          .eq("Inmueble", anuncio.referencia)
          .eq("Estado", "Datos Completos")
          .order("created_at", { ascending: false })

        if (error) {
          console.log("[v0] Error fetching completos leads:", error)
          toast({
            title: "Error",
            description: "No se pudieron cargar los leads completos",
            variant: "destructive",
          })
          setCompletosLeads([])
        } else {
          console.log("[v0] Completos leads loaded:", data?.length || 0)
          setCompletosLeads(data || [])
        }
      } catch (err) {
        console.log("[v0] Error in handleToggleCompletosExpanded:", err)
        setCompletosLeads([])
      } finally {
        setLoadingCompletos(false)
      }
    }
  }

  // Renamed from handleProcesarAnuncio to avoid redeclaration
  const handleAnuncioStatusUpdate = async (anuncioId: string, currentActivacion: string) => {
    setProcessingId(anuncioId)
    try {
      const newActivacion = currentActivacion === "Activo" ? "Pausado" : "Activo"

      // Fetch current data to check fecha_activacion
      const { data: currentAd } = await supabase.from("Anuncios").select("fecha_activacion").eq("ida", anuncioId).single()

      const updates: any = { Activacion: newActivacion }
      // Only set activation date if it's null (first activation or after unarchiving)
      if (newActivacion === "Activo" && !currentAd?.fecha_activacion) {
        updates.fecha_activacion = new Date().toISOString()
      }

      const { error } = await supabase.from("Anuncios").update(updates).eq("ida", anuncioId)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del anuncio",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: `Anuncio ${newActivacion.toLowerCase()}`,
        })
        // Refrescar datos
        await fetchAnuncios(undefined, currentPage)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al procesar el anuncio",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleDetenerWhatsApps = async (anuncioId: string, currentStatus?: boolean) => {
    setProcessingId(anuncioId)
    try {
      console.log("[DEBUG] handleDetenerWhatsApps - anuncioId:", anuncioId, "currentStatus:", currentStatus)
      // Si no se proporciona el estado actual, lo obtenemos del anuncio
      let isCurrentlyActive = currentStatus;
      if (isCurrentlyActive === undefined) {
        const anuncio = anuncios.find(a => a.id === anuncioId);
        isCurrentlyActive = anuncio?.whatsapp_activo ?? true;
        console.log("[DEBUG] handleDetenerWhatsApps - anuncio encontrado:", anuncio, "isCurrentlyActive:", isCurrentlyActive)
      }
      
      const newStatus = !isCurrentlyActive;
      console.log("[DEBUG] handleDetenerWhatsApps - newStatus:", newStatus)
      const actionText = newStatus ? "activar" : "detener";
      
      const { error } = await supabase
        .from("Anuncios")
        .update({ whatsapp_activo: newStatus })
        .eq("ida", anuncioId)

      console.log("[DEBUG] handleDetenerWhatsApps - Resultado de la actualización:", { error })

      if (error) {
        toast({
          title: "Error",
          description: `No se pudo ${actionText} el envío de WhatsApps`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: `Envío de WhatsApps ${actionText}do`,
        })
        // Refrescar datos
        await fetchAnuncios(undefined, currentPage)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al actualizar el envío de WhatsApps",
        variant: "destructive",
      })
    } finally {
      setProcessingId(null)
    }
  }

  const handleEditar = async (anuncio: AnuncioCard) => {
    console.log(`[v0] Loading edit data for anuncio ${anuncio.id} - ${anuncio.referencia}`)

    try {
      const { data: anuncioData, error: anuncioError } = await supabase
        .from("Anuncios")
        .select("*")
        .eq("ida", anuncio.id)
        .single()

      if (anuncioError) {
        console.log("[v0] Error fetching anuncio data:", anuncioError)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos del anuncio",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Anuncio data loaded:", anuncioData)

      // Precargar el formulario con los datos reales de la base de datos
      setEditingAnuncio(anuncio)
      setEditFormData({
        codPortal: anuncioData.CodPortal || "",
        referencia: anuncioData.Referencia || "",
        direccion: anuncioData.Direccion || "",
        descripcion: anuncioData.Descripcion || "",
        precio: (anuncioData.Precio || 0).toString(),
        portal: anuncioData.Portal || "",
        activacion: anuncioData.Activacion || "Inactivo",
        duracion_visita: (anuncioData.duracion_visita || 20).toString(),
        tiempo_entre_visitas: (anuncioData.tiempo_entre_visitas || 5).toString(),
      })

      console.log("[v0] Edit form preloaded with database data")
    } catch (err) {
      console.log("[v0] Error in handleEditar:", err)
      toast({
        title: "Error",
        description: "Error al cargar los datos para edición",
        variant: "destructive",
      })
    }
  }

  const handleGuardarEdicion = async () => {
    if (!editingAnuncio) return

    console.log(`[v0] Saving changes for anuncio ${editingAnuncio.id}`)
    console.log("[v0] Form data to save:", editFormData)

    try {
      const updateData = {
        CodPortal: editFormData.codPortal,
        Referencia: editFormData.referencia,
        Direccion: editFormData.direccion,
        Descripcion: editFormData.descripcion,
        Precio: Number.parseFloat(editFormData.precio) || 0,
        Portal: editFormData.portal,
        Activacion: editFormData.activacion,
        duracion_visita: Number.parseInt(editFormData.duracion_visita || "20") || 20,
        tiempo_entre_visitas: Number.parseInt(editFormData.tiempo_entre_visitas || "5") || 5,
      }

      const { error } = await supabase.from("Anuncios").update(updateData).eq("ida", editingAnuncio.id)

      if (error) {
        console.log("[v0] Error saving changes:", error)
        const fallbackUpdate = {
          Referencia: updateData.Referencia,
          Direccion: updateData.Direccion,
          Descripcion: updateData.Descripcion,
          Precio: updateData.Precio,
          Portal: updateData.Portal,
          Activacion: updateData.Activacion,
        }
        const { error: fallbackError } = await supabase
          .from("Anuncios")
          .update(fallbackUpdate)
          .eq("ida", editingAnuncio.id)

        if (fallbackError) {
          toast({ title: "Error", description: "No se pudieron guardar los cambios", variant: "destructive" })
          return
        }

        

        console.log("[v0] Changes saved with fallback")
        toast({ title: "Éxito", description: "Anuncio actualizado correctamente" })
        setEditingAnuncio(null)
        await fetchAnuncios(undefined, currentPage)
      } else {
        console.log("[v0] Changes saved successfully")
        toast({ title: "Éxito", description: "Anuncio actualizado correctamente" })
        setEditingAnuncio(null)
        await fetchAnuncios(undefined, currentPage)
      }
    } catch (err) {
      console.log("[v0] Error in handleGuardarEdicion:", err)
      toast({
        title: "Error",
        description: "Error al guardar los cambios",
        variant: "destructive",
      })
    }
  }

  const handleDuplicar = async (anuncio: AnuncioCard) => {
    try {
      const { data: anuncioData, error } = await supabase
        .from("Anuncios")
        .select("*")
        .eq("ida", anuncio.id)
        .single()
      if (error) {
        toast({ title: "Error", description: "No se pudieron cargar los datos del anuncio", variant: "destructive" })
        return
      }
      const base = anuncioData || {}
      setCreationStep({
        step: 1,
        data: {
          codPortal: "",
          referencia: "",
          direccion: base.Direccion || anuncio.direccion || "",
          portal: base.Portal || anuncio.portal || "",
          descripcion: base.Descripcion || anuncio.descripcion || "",
          precio: String(base.Precio ?? anuncio.precio ?? ""),
          activacion: "Pausado",
        },
      })
      setShowCreationModal(true)
      toast({ title: "Duplicación", description: `Usando '${anuncio.referencia}' como base del nuevo anuncio` })
    } catch {
      toast({ title: "Error", description: "Error al preparar la duplicación", variant: "destructive" })
    }
  }

  // New handler for Info & FAQs modal
  const handleInfoFaqs = async (anuncio: AnuncioCard) => {
    console.log(`[v0] Opening Info & FAQs for anuncio ${anuncio.id}`)

    // Cargar información existente si la hay
    try {
      const { data: anuncioData, error } = await supabase.from("Anuncios").select("*").eq("ida", anuncio.id).single()

      if (!error && anuncioData) {
        const rawFaqs = anuncioData.faqs
        const parsedFaqs = Array.isArray(rawFaqs) ? rawFaqs : (rawFaqs ? JSON.parse(rawFaqs) : [])
        const initialFaqs = parsedFaqs.length > 0
          ? parsedFaqs
          : DEFAULT_FAQ_QUESTIONS.map((q) => ({ pregunta: q, respuesta: "" }))
        setInfoFaqsData({
          informacionDetallada: anuncioData.informacion_detallada || anuncioData.Descripcion || "",
          faqs: initialFaqs,
        })
      }
    } catch (err) {
      console.log("[v0] Error loading info & faqs:", err)
    }

    setEditingAnuncio(anuncio)
    setShowInfoFaqsModal(true)
  }

  // New handler to save Info & FAQs
  const handleSaveInfoFaqs = async () => {
    if (!editingAnuncio) return

    try {
      const updateData = {
        informacion_detallada: infoFaqsData.informacionDetallada,
        faqs: infoFaqsData.faqs.filter((faq) => faq.pregunta.trim() !== ""),
      }

      const { error } = await supabase.from("Anuncios").update(updateData).eq("ida", editingAnuncio.id)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo guardar la información",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: "Información y FAQs actualizados correctamente",
        })
        setShowInfoFaqsModal(false)
        setEditingAnuncio(null)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al guardar la información",
        variant: "destructive",
      })
    }
  }

  // New handler for Statistics modal
  const handleShowStats = async (anuncio: AnuncioCard) => {
    // console.log(`[v0] Loading statistics for anuncio ${anuncio.id}`, anuncio)

    try {
      let leads: any[] = []
      
      // Use in-memory raw data if available for consistency
      if (rawDataRef.current) {
        // console.log("[v0] Using in-memory raw data")
        const normalize = (s: string | null | undefined) => (s ? s.trim().toLowerCase() : "")
        const refNorm = normalize(anuncio.referencia)
        const dirNorm = normalize(anuncio.direccion)
        
        leads = rawDataRef.current.leads.filter((l) => {
          if (!l.Inmueble) return false
          const inmueble = normalize(l.Inmueble)
          return inmueble && (inmueble === refNorm || (dirNorm && inmueble === dirNorm))
        })
      } else {
        console.log("[v0] Fetching leads from DB")
        // Fallback to DB fetch if raw data not available
        const fetchByRef = supabase
          .from("Clientes")
          .select("Estado,aceptado,visita_propuesta,visita_completada,IDC,Nombre,Correo,Telefono,created_at,Inmueble")
          .ilike("Inmueble", anuncio.referencia.trim())
  
        let fetchByAddr = null
        if (anuncio.direccion) {
          fetchByAddr = supabase
            .from("Clientes")
            .select("Estado,aceptado,visita_propuesta,visita_completada,IDC,Nombre,Correo,Telefono,created_at,Inmueble")
            .ilike("Inmueble", anuncio.direccion.trim())
        }
  
        const [resRef, resAddr] = await Promise.all([fetchByRef, fetchByAddr ? fetchByAddr : Promise.resolve({ data: [], error: null })])
        
        const leadsRef = resRef.data || []
        const leadsAddr = resAddr?.data || []
        
        // Merge and deduplicate by IDC
        const allLeadsMap = new Map()
        leadsRef.forEach(l => allLeadsMap.set(l.IDC, l))
        leadsAddr.forEach(l => allLeadsMap.set(l.IDC, l))
        
        leads = Array.from(allLeadsMap.values())
      }
      console.log(`[v0] Found ${leads.length} leads for stats`)

      // Filter by activation date to ensure consistency with other metrics
      // if (anuncio.fecha_activacion) {
      //   const activationDate = new Date(anuncio.fecha_activacion)
      //   if (!isNaN(activationDate.getTime())) {
      //     leads = leads.filter((lead) => {
      //       const createdAt = new Date(lead.created_at)
      //       return createdAt >= activationDate
      //     })
      //   }
      // }

      setStatsLeads(leads) // Store leads for reuse in calculateTrendData

      // Prepare emails and whatsapps
      let currentEmails: any[] = []
      let currentWhatsapps: any[] = []

      if (rawDataRef.current) {
        // Use raw data
        const leadEmails = leads.map((l) => l.Correo).filter(Boolean)
        const leadIDCs = leads.map((l) => l.IDC).filter((id: any) => Number.isFinite(id))
        
        // Filter emails and whatsapps to only include those from current anuncio leads
        currentEmails = rawDataRef.current.emails?.filter((e) => leadEmails.includes(e.to)) || []
        currentWhatsapps = rawDataRef.current.whatsapp?.filter((w) => leadIDCs.includes(w.IDC)) || []
      } else {
        // Fetch from DB
        const leadEmails = leads.map((l) => l.Correo).filter(Boolean)
        const leadIDCs = leads.map((l) => l.IDC).filter((id: any) => Number.isFinite(id))

        if (leadEmails.length > 0) {
           const chunkSize = 50
           const emailChunks = []
           for (let i = 0; i < leadEmails.length; i += chunkSize) {
             emailChunks.push(leadEmails.slice(i, i + chunkSize))
           }
           
           const emailPromises = emailChunks.map((chunk) => 
             supabase.from('Correos').select('to, Tipo, created_at').in('to', chunk)
           )
           
           const emailResults = await Promise.all(emailPromises)
           currentEmails = emailResults.flatMap((r) => r.data || [])
        }

        if (leadIDCs.length > 0) {
           const chunkSize = 50
           const idcChunks = []
           for (let i = 0; i < leadIDCs.length; i += chunkSize) {
             idcChunks.push(leadIDCs.slice(i, i + chunkSize))
           }
           
           const waPromises = idcChunks.map((chunk) => 
             supabase.from('Whatsapp').select('IDC, Tipo, created_at').in('IDC', chunk)
           )
           
           const waResults = await Promise.all(waPromises)
           currentWhatsapps = waResults.flatMap((r) => r.data || [])
        }
      }

      setStatsEmails(currentEmails)
      setStatsWhatsapps(currentWhatsapps)

      const datosCompletosCount =
        leads.filter((lead) => {
          const estado = lead.Estado?.toLowerCase() || ""
          return ["datos completos", "aceptado", "visita propuesta", "pedir aval"].includes(estado)
        }).length || 0

      const aceptados = leads.filter((lead) => lead.Estado === "Aceptado" || lead.aceptado === true).length || 0
      const visitaPropuesta = leads.filter((lead) => lead.Estado === "Visita Propuesta" || lead.visita_propuesta === true).length || 0
      const visitaCompletada = leads.filter((lead) => lead.Estado === "Visita Completada" || lead.visita_completada === true).length || 0 // Keeping this for now, will replace in UI if needed, but logic stays available
      const datosCompletosStrict = leads.filter((lead) => lead.Estado === "Datos Completos").length || 0
      const descartados = leads.filter((lead) => lead.Estado === "Descartado").length || 0

      // console.log(
      //   "[v0] Stats fetched - Datos Completos:",
      //   datosCompletosCount,
      //   "Aceptados:",
      //   aceptados,
      //   "Visita Propuesta:",
      //   visitaPropuesta,
      //   "Visita Completada:",
      //   visitaCompletada,
      //   "Descartados:",
      //   descartados,
      // )

      const dayMs = 24 * 60 * 60 * 1000
      const now = new Date()
      
      // Usar la fecha de publicación del anuncio como fecha de inicio
      // Si hay fecha de activación, usar esa preferentemente para no mostrar historial vacío irrelevante
      let anuncioCreationDate = anuncio.created_at ? new Date(anuncio.created_at) : new Date(now.getTime() - 30 * dayMs)
      
      // DISABLED: This causes empty graphs if activation date is recent. We want to see full history.
      // if (anuncio.fecha_activacion) {
      //    const actDate = new Date(anuncio.fecha_activacion)
      //    if (!isNaN(actDate.getTime())) {
      //        anuncioCreationDate = actDate
      //    }
      // }
      anuncioCreationDate.setHours(0, 0, 0, 0)
      
      // Calcular días desde la creación del anuncio hasta hoy
      const daysSinceCreation = Math.ceil((now.getTime() - anuncioCreationDate.getTime()) / dayMs)
      const totalDays = Math.min(Math.max(daysSinceCreation, 7), 365) // Mínimo 7 días, máximo 1 año
      
      const activityData: number[] = []
      const activityDates: Date[] = []
      
      // Generar datos contiguos desde la fecha de creación del anuncio hasta hoy
      for (let i = 0; i < totalDays; i++) {
        const currentDate = new Date(anuncioCreationDate.getTime() + i * dayMs)
        currentDate.setHours(0, 0, 0, 0)
        const nextDate = new Date(currentDate.getTime() + dayMs)
        
        const cnt =
          leads.filter((lead) => {
            const createdAt = lead?.created_at ? new Date(lead.created_at) : null
            return createdAt && createdAt >= currentDate && createdAt < nextDate
          }).length || 0
        
        activityData.push(cnt)
        activityDates.push(currentDate)
      }

      // Populate stats with real data
      const statsWithRealData = {
        ...anuncio,
        datosCompletos: datosCompletosCount,
        descartados,
        activityData: activityData,
        activityStartDate: anuncioCreationDate,
        phaseMetrics: {
          aceptados,
          visitaPropuesta,
          visitaCompletada,
          datosCompletos: datosCompletosStrict,
        },
        statsPeriod: "esteMes", // Initialize with default period for this anuncio
        // These are placeholders, actual calculation might be needed or removed
        rebotesAltos: Math.random() > 0.5,
        incompletosAlto: Math.random() > 0.7,
        necesidadAval: Math.random() > 0.3,
      }
      console.log("[v0] statsWithRealData:", statsWithRealData)

      setSelectedAnuncioForStats(statsWithRealData)
      setShowStatsModal(true)
      setIsStatsModalOpen(true) // Set the modal state to true
    } catch (err) {
      console.error("[v0] Error in handleShowStats:", err)
      toast({
        title: "Error",
        description: "No se pudieron cargar las estadísticas",
        variant: "destructive",
      })
    }
  }

  // New functions for managing FAQs
  const addFaq = () => {
    setInfoFaqsData((prev) => ({
      ...prev,
      faqs: [...prev.faqs, { pregunta: "", respuesta: "" }],
    }))
  }

  const removeFaq = (index: number) => {
    setInfoFaqsData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== index),
    }))
  }

  const updateFaq = (index: number, field: "pregunta" | "respuesta", value: string) => {
    setInfoFaqsData((prev) => ({
      ...prev,
      faqs: prev.faqs.map((faq, i) => (i === index ? { ...faq, [field]: value } : faq)),
    }))
  }

  const handleCrearAnuncio = async () => {
    if (!inmobiliariaId) {
      toast({
        title: "Error",
        description: "No se pudo identificar tu inmobiliaria",
        variant: "destructive",
      })
      return
    }

    // Validate required fields
    if (!creationStep.data.referencia || !creationStep.data.direccion || !creationStep.data.portal) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      })
      return
    }

    setCreatingAnuncio(true)
    console.log("[v0] Creating new anuncio with data:", creationStep.data)
    console.log("[v0] Assigning agency IDI to anuncio:", inmobiliariaId)

    try {
      const newAnuncio = {
        Referencia: creationStep.data.referencia,
        Direccion: creationStep.data.direccion,
        Portal: creationStep.data.portal,
        CodPortal: creationStep.data.codPortal,
        Descripcion: creationStep.data.descripcion,
        Precio: Number.parseFloat(creationStep.data.precio) || 0,
        Activacion: creationStep.data.activacion,
        
        usuario: inmobiliariaId, // Assigns the logged-in agency's IDI to this anuncio
        Foto_Url: "", // Empty for now
        // Fecha_Activacion_Programada: null, // Ensure it's null for new announcements
      }

      console.log("[v0] New anuncio object with agency IDI:", newAnuncio)

      const result = await createAnuncioAction(newAnuncio)
      console.log("[v0] createAnuncioAction result:", result)

      if (!result) {
        throw new Error("No se recibió respuesta del servidor")
      }

      const { data, error } = result

      if (error) {
        // Handle error string returned by server action
        let errorMessage = 'Error desconocido';
        if (typeof error === 'string') {
            errorMessage = error;
        } else if (typeof error === 'object' && error !== null) {
            errorMessage = (error as any).message || JSON.stringify(error);
        }

        console.log("[v0] Error creating anuncio:", errorMessage)
        
        // If it's a permission error, show it and return
        if (errorMessage.includes("No tienes permisos") || errorMessage.includes("No tienes autorización")) {
             toast({
                title: "Error de Permisos",
                description: errorMessage,
                variant: "destructive",
            })
            return
        }

        toast({
            title: "Error al crear anuncio",
            description: errorMessage,
            variant: "destructive",
        })
        return
      }

      console.log("[v0] Anuncio created successfully with agency IDI:", data)

      toast({
        title: "Éxito",
        description: `${creationStep.data.referencia} se ha creado correctamente`,
      })

      // Reset form and close modal
      setShowCreationModal(false)
      setCreationStep({
        step: 1,
        data: {
          codPortal: "",
          referencia: "",
          direccion: "",
          portal: "",
          descripcion: "",
          precio: "",
          activacion: "Pausado",
          
        },
      })

      // Refresh anuncios list
      await fetchAnuncios(undefined, currentPage)
    } catch (err) {
      console.log("[v0] Error in handleCrearAnuncio:", err)
      toast({
        title: "Error",
        description: "Error al crear el anuncio",
        variant: "destructive",
      })
    } finally {
      setCreatingAnuncio(false)
    }
  }

  const selectedMetrics = {
    totalAnuncios: selectedAnuncios.size || totalAnuncios,
    totalLeads:
      selectedAnuncios.size > 0
        ? anunciosCards.filter((a) => selectedAnuncios.has(a.id)).reduce((sum, a) => sum + a.leadsTotales, 0)
        : totalLeads,
    totalCompletos:
      selectedAnuncios.size > 0
        ? anunciosCards.filter((a) => selectedAnuncios.has(a.id)).reduce((sum, a) => sum + a.datosCompletos, 0)
        : totalCompletos,
  }

  const handleSelectAnuncio = (anuncioId: string, checked: boolean) => {
    const newSelected = new Set(selectedAnuncios)
    if (checked) {
      newSelected.add(anuncioId)
    } else {
      newSelected.delete(anuncioId)
    }
    setSelectedAnuncios(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAnuncios(new Set(anunciosCards.map((a) => a.id)))
    } else {
      setSelectedAnuncios(new Set())
    }
  }

  const handleProcesarAnuncio = (anuncio: AnuncioCard) => {
    setProcessingAnuncio(anuncio)
    setShowProcessingDrawer(true)
  }



  const getProgressColor = (percentage: number) => {
    if (percentage >= 95) return "bg-red-500"
    if (percentage >= 80) return "bg-orange-500"
    return "bg-blue-500"
  }

  const filteredAnuncios = useMemo(() => {
    return anunciosCards.filter((anuncio) => {
      const matchesSearch =
        anuncio.referencia.toLowerCase().includes(searchQuery.toLowerCase()) ||
        anuncio.direccion.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesPortal = filterPortal === "all" || anuncio.portal === filterPortal

      // Filter by activation status
      if (filterEstado === "archivado") {
        // When "Archivados" button is clicked, show only archived
        return matchesSearch && matchesPortal && anuncio.estado === "archivado"
      } else {
        // By default, exclude archived ads
        return matchesSearch && matchesPortal && anuncio.estado !== "archivado"
      }
    })
  }, [anunciosCards, searchQuery, filterPortal, filterEstado])

  const uniquePortals = useMemo(() => {
    return [...new Set(anunciosCards.map((a) => a.portal))]
  }, [anunciosCards])

  // Función auxiliar para formatear tiempo
  const formatTime = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}h`
  }

  // Precalcular valores para las tarjetas de anuncios
  const anunciosCalculados = useMemo(() => {
    return filteredAnuncios.map(anuncio => {
      const localPeriod = anuncio.localMetricsPeriod || metricsPeriod
      const periodText = periodBadgeText(localPeriod)
      const cardClassName =
        anuncio.estado === "pausado"
          ? "transition-all duration-200 hover:shadow-md border-l-4 border-l-yellow-400 bg-muted/30 opacity-75"
          : anuncio.estado === "activo"
            ? "transition-all duration-200 hover:shadow-md border-l-4 border-l-primary/20"
            : "transition-all duration-200 hover:shadow-md border-l-4 border-l-gray-400 bg-muted/50"
      
      const planPercentage = planLimit > 0 ? (anuncio.ejecuciones / planLimit) * 100 : 0
      const tiempoFormateado = formatTime(anuncio.tiempoAhorrado)
      
      return {
        ...anuncio,
        periodText,
        localPeriod,
        cardClassName,
        planPercentage,
        tiempoFormateado
      }
    })
  }, [filteredAnuncios, metricsPeriod, planLimit])

  useEffect(() => {
    try {
      setCardsLoading(true)
      const t = setTimeout(() => setCardsLoading(false), 300)
      return () => clearTimeout(t)
    } catch {}
  }, [searchQuery, filterPortal, filterEstado, anunciosCards, metricsPeriod])

  // Actualizar la referencia cuando cambie el valor de whatsapp_activo
  useEffect(() => {
    whatsappActivoRef.current = selectedAnuncioForStats?.whatsapp_activo
  }, [selectedAnuncioForStats?.whatsapp_activo])

  // Sincronizar selectedAnuncioForStats con anunciosCards cuando cambie la lista
  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal) {
      // Buscar el anuncio actualizado en la lista
      const anuncioActualizado = anunciosCards.find(a => a.id === selectedAnuncioForStats.id)
      console.log("[DEBUG] Sincronización - Anuncio actualizado encontrado:", anuncioActualizado)
      console.log("[DEBUG] Sincronización - Valor actual en ref:", whatsappActivoRef.current)
      console.log("[DEBUG] Sincronización - Valor en selectedAnuncioForStats:", selectedAnuncioForStats.whatsapp_activo)
      if (anuncioActualizado && anuncioActualizado.whatsapp_activo !== whatsappActivoRef.current) {
        // Actualizar selectedAnuncioForStats con los nuevos datos solo si cambió
        console.log("[DEBUG] Sincronización - Actualizando selectedAnuncioForStats")
        setSelectedAnuncioForStats(prev => prev ? { ...prev, whatsapp_activo: anuncioActualizado.whatsapp_activo } : null)
      }
    }
  }, [anunciosCards, selectedAnuncioForStats?.id, showStatsModal])

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    if (score >= 40) return "text-orange-600"
    return "text-red-600"
  }

  const Sparkline = ({ data }: { data: number[] }) => {
    const max = Math.max(...data, 1)
    const min = Math.min(...data)
    const range = max - min || 1

    return (
      <svg width="60" height="20" className="inline-block">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          points={data
            .map((value, index) => {
              const x = (index / (data.length - 1)) * 60
              const y = 20 - ((value - min) / range) * 20
              return `${x},${y}`
            })
            .join(" ")}
        />
      </svg>
    )
  }

  const ActivityHeatmap = ({
    data,
    startDate,
    periodStart,
    periodEnd,
  }: {
    data: number[]
    startDate: Date
    periodStart?: Date
    periodEnd?: Date
  }) => {
    const [hover, setHover] = useState<{ label: string; x: number; y: number } | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const max = Math.max(...data, 1)
    const dayMs = 24 * 60 * 60 * 1000
    const cls = (ratio: number, active: boolean) =>
      !active
        ? "bg-muted/20"
        : ratio <= 0
          ? "bg-muted/30"
          : ratio < 0.25
            ? "bg-emerald-200/80"
            : ratio < 0.5
              ? "bg-emerald-400/80"
              : ratio < 0.75
                ? "bg-emerald-600"
                : "bg-emerald-800"
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
    const monthLabels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    
    const monthStarts: {month: string, col: number}[] = []
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
    const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

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
            {monthStarts.map(({month, col}, idx) => (
              <div 
                key={idx}
                className="text-center"
                style={{ 
                  marginLeft: idx === 0 ? '0' : `${(col - monthStarts[idx-1].col) * cellSize}rem`
                }}
              >
                {month}
              </div>
            ))}
          </div>
        )}
        
        <div className="flex items-start gap-1">
          {showDayLabels && (
            <div className="flex flex-col justify-between text-[10px] text-muted-foreground">
              {dayLabels.map((day, idx) => (
                <div 
                  key={idx}
                  className="text-right flex items-center justify-end"
                  style={{ 
                    height: `${cellSize}rem`,
                    lineHeight: `${cellSize}rem`
                  }}
                >
                  {day}
                </div>
              ))}
            </div>
          )}
          
          <div 
            className="grid grid-flow-col gap-[2px]"
            style={{
              gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              gridAutoColumns: `${cellSize}rem`
            }}
          >
            {cells.map((c, idx) => (
              <div
                key={idx}
                className={`rounded-[2px] border border-muted-foreground/20 ${cls(c.ratio, c.active)}`}
                style={{
                  width: `${cellSize}rem`,
                  height: `${cellSize}rem`,
                  minWidth: `${cellSize}rem`,
                  minHeight: `${cellSize}rem`
                }}
                onMouseEnter={(e) => {
                  if ((c as any).pad) return
                  const rect = containerRef.current?.getBoundingClientRect()
                  const x = rect ? e.clientX - rect.left : 0
                  const y = rect ? e.clientY - rect.top : 0
                  setHover({ label: c.label, x, y })
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
          <div
            className="absolute z-20 px-2 py-1 text-[10px] rounded bg-background border shadow"
            style={{ left: hover.x + 12, top: hover.y + 12 }}
          >
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

  const handleScheduleActivation = async (anuncioId: string) => {
    if (!scheduledDate) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha",
        variant: "destructive",
      })
      return
    }

    const selectedDateTime = new Date(scheduledDate)
    const now = new Date()

    if (selectedDateTime <= now) {
      toast({
        title: "Error",
        description: "La fecha debe ser futura",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("Anuncios")
        .update({
          Fecha_Activacion_Programada: new Date(scheduledDate).toISOString(),
          Activacion: "Pausado", // Ensure it's paused until scheduled time
        })
        .eq("ida", anuncioId)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo programar la activación",
          variant: "destructive",
        })
      } else {
        // Update local state to reflect scheduled status
        setAnunciosCards((prev) =>
          prev.map((anuncio) =>
            anuncio.id === anuncioId
              ? {
                  ...anuncio,
                  activacion: "Pausado",
                  estado: "pausado",
                  Fecha_Activacion_Programada: new Date(scheduledDate).toISOString(),
                }
              : anuncio,
          ),
        )

        toast({
          title: "Éxito",
          description: `Activación programada para ${new Date(scheduledDate).toLocaleString("es-ES")}`,
        })

        setShowScheduleDialog(false)
        setScheduledDate("")
        setSchedulingAnuncioId(null)
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Error al programar la activación",
        variant: "destructive",
      })
    }
  }

  const handleOpenScheduleDialog = (anuncioId: string) => {
    setSchedulingAnuncioId(anuncioId)
    setScheduledDate("") // Reset date on open
    setShowScheduleDialog(true)
  }

  const [deactivationUpdated, setDeactivationUpdated] = useState(false)
  useEffect(() => {
    const run = async () => {
      if (deactivationUpdated) return
      if (!inmobiliariaId) return
      const percentage = planLimit < 1000000 ? (totalEjecuciones / planLimit) * 100 : 0
      const active = anunciosCards.filter((a) => a.estado === "activo").length
      const adsPercent = anunciosLimit > 0 && anunciosLimit < 1000000 ? Math.min(100, (active / anunciosLimit) * 100) : 0
      const combinedUsed = Math.max(percentage, adsPercent)
      if (!(planLimit < 1000000 && combinedUsed > 100)) return
      try {
        const { error } = await supabase
          .from("Inmobiliarias")
          .update({ inmobiliaria_act: "Inactiva" })
          .eq("idi", inmobiliariaId)
        if (!error) {
          setDeactivationUpdated(true)
          toast({ title: "Plan rebasado", description: "Se ha marcado la inmobiliaria como Inactiva" })
        } else {
          const msg = String(error.message || "")
          if (msg.toLowerCase().includes("column") && msg.toLowerCase().includes("does not exist")) {
            toast({ title: "Columna faltante", description: "No existe 'inmobiliaria_act' en Inmobiliarias", variant: "destructive" })
          } else {
            toast({ title: "Error", description: "No se pudo actualizar el estado de la inmobiliaria", variant: "destructive" })
          }
        }
      } catch {
        toast({ title: "Error", description: "Fallo al actualizar la inmobiliaria", variant: "destructive" })
      }
    }
    run()
  }, [deactivationUpdated, inmobiliariaId, planLimit, totalEjecuciones, anunciosCards, anunciosLimit, supabase])

  const [reactivationUpdated, setReactivationUpdated] = useState(false)
  useEffect(() => {
    const run = async () => {
      if (reactivationUpdated) return
      if (!inmobiliariaId) return
      const percentage = planLimit < 1000000 ? (totalEjecuciones / planLimit) * 100 : 0
      const active = anunciosCards.filter((a) => a.estado === "activo").length
      const adsPercent = anunciosLimit > 0 && anunciosLimit < 1000000 ? Math.min(100, (active / anunciosLimit) * 100) : 0
      const combinedUsed = Math.max(percentage, adsPercent)
      if (!(planLimit < 1000000 && combinedUsed <= 100)) return
      try {
        const { error } = await supabase
          .from("Inmobiliarias")
          .update({ inmobiliaria_act: "Activa" })
          .eq("idi", inmobiliariaId)
        if (!error) {
          setReactivationUpdated(true)
          // Solo mostrar toast si realmente se ha restablecido el límite (ej: nuevo mes)
          // El mensaje "Límites restablecidos" se mostrará en otro lugar cuando ocurra un restablecimiento real
        }
      } catch {}
    }
    run()
  }, [reactivationUpdated, inmobiliariaId, planLimit, totalEjecuciones, anunciosCards, anunciosLimit, planResetAt, supabase])

  if (loading || inmobiliariaLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando anuncios...</span>
        </div>
      </div>
    )
  }

  const percentageUsed = planLimit < 1000000 ? (totalEjecuciones / planLimit) * 100 : 0
  const percentageRemaining = 100 - percentageUsed
  const remainingExecutions = planLimit - totalEjecuciones

  const today = new Date()
  const defaultMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const resetBase = planResetAt ? planResetAt : defaultMonthStart
  const msPerDay = 1000 * 60 * 60 * 24
  const daysElapsed = Math.max(1, Math.ceil((today.getTime() - resetBase.getTime()) / msPerDay))
  const dailyRate = daysElapsed > 0 ? totalEjecuciones / daysElapsed : 0
  const daysUntilLimit = dailyRate > 0 ? Math.floor(remainingExecutions / dailyRate) : 999
  const nextRenewalDate = (() => {
    const y = resetBase.getFullYear()
    const mNext = resetBase.getMonth() + 1
    const d = resetBase.getDate()
    const last = new Date(y, mNext + 1, 0).getDate()
    return new Date(y, mNext, Math.min(d, last))
  })()
  const activeAnuncios = anunciosCards.filter((a) => a.estado === "activo").length
  const activeAnunciosList = anunciosCards.filter((a) => a.estado === "activo")
  const anunciosRemaining = anunciosLimit >= 1000000 ? "∞" : Math.max(0, anunciosLimit - activeAnuncios)
  const anunciosPercentUsed = anunciosLimit >= 1000000 || anunciosLimit === 0 ? 0 : Math.min(100, (activeAnuncios / anunciosLimit) * 100)

  // Determine alert level and messaging
  const getAlertConfig = () => {
    const adsPercent = anunciosLimit > 0 && anunciosLimit < 1000000 ? anunciosPercentUsed : 0
    const combinedUsed = Math.max(percentageUsed, adsPercent)
    const combinedRemaining = 100 - combinedUsed
    if (combinedUsed >= 100) {
      return {
        level: "critical",
        color: "bg-red-600",
        textColor: "text-red-600",
        borderColor: "border-red-600",
        icon: "🚨",
        title: `Límite Alcanzado`,
        message: `Has consumido el 100% de tu plan. Leads ${totalEjecuciones}/${formatPlanValue(planLimit)} · Anuncios ${activeAnuncios}/${formatPlanValue(anunciosLimit)}.`,
        showUpgrade: true,
        cardHighlight: true,
      }
    }
    if (combinedUsed >= 90) {
      return {
        level: "danger",
        color: "bg-red-500",
        textColor: "text-red-600",
        borderColor: "border-red-500",
        icon: "⚠️",
        title: `Queda ${combinedRemaining.toFixed(0)}% del plan`,
        message: `Leads ${remainingExecutions} restantes · Anuncios ${typeof anunciosRemaining === "string" ? "ilimitados" : anunciosRemaining}. Ritmo leads: ${Math.round(dailyRate)}/día.`,
        showUpgrade: true,
        cardHighlight: true,
      }
    }
    if (combinedUsed >= 75) {
      return {
        level: "warning",
        color: "bg-orange-500",
        textColor: "text-orange-600",
        borderColor: "border-orange-500",
        icon: "⚠️",
        title: `Queda ${combinedRemaining.toFixed(0)}% del plan`,
        message: `Leads: ${Math.round(dailyRate)} al día · Estimado ${daysUntilLimit} días. Anuncios: ${activeAnuncios}/${formatPlanValue(anunciosLimit)}.`,
        showUpgrade: true,
        cardHighlight: false,
      }
    }
    if (combinedUsed >= 50) {
      return {
        level: "caution",
        color: "bg-yellow-500",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-500",
        icon: "📊",
        title: `Queda ${combinedRemaining.toFixed(0)}% del plan`,
        message: `Has usado la mitad del plan. Leads: ${Math.round(dailyRate)} al día · Anuncios: ${activeAnuncios}/${formatPlanValue(anunciosLimit)}.`,
        showUpgrade: false,
        cardHighlight: false,
      }
    }
    return {
      level: "normal",
      color: "bg-green-500",
      textColor: "text-green-600",
      borderColor: "border-green-500",
      icon: "✅",
      title: `Queda ${combinedRemaining.toFixed(0)}% del plan`,
      message: `Consumo saludable. Leads: ${Math.round(dailyRate)} al día · Anuncios: ${activeAnuncios}/${formatPlanValue(anunciosLimit)}.`,
      showUpgrade: false,
      cardHighlight: false,
    }
  }

  const currentPlanName = (() => {
    try {
      const m = (availablePlans || []).find((p: any) => p?.idp === currentPlanId || (p as any)?.id === currentPlanId)
      return m?.Nombre || (typeof currentPlanId === "number" ? getPlanData(currentPlanId)?.Nombre : "") || ""
    } catch {
      return (typeof currentPlanId === "number" ? getPlanData(currentPlanId)?.Nombre : "") || ""
    }
  })()

  const alertConfig = planLimit < 1000000 ? getAlertConfig() : null

  const handleChangePlan = async (newPlanId: number) => {
    if (!inmobiliariaId) {
      toast({
        title: "Error",
        description: "No se pudo identificar tu inmobiliaria",
        variant: "destructive",
      })
      return
    }

    try {
      console.log(`[v0] Changing plan to ID: ${newPlanId}`)

      const tables = ["Inmobiliarias", "inmobiliarias", "Inmobiliaria", "inmobiliaria"]
      const idiVals = [Number(inmobiliariaId), String(inmobiliariaId)]
      let updatedRows = 0
      let lastError: any = null
      for (const t of tables) {
        for (const v of idiVals) {
          const { data, error } = await supabase
            .from(t)
            .update({ Plan: newPlanId })
            .eq("idi", v)
            .select("idi, Plan")
          if (error) {
            lastError = error
          }
          if (data && data.length > 0) {
            updatedRows = data.length
            break
          }
        }
        if (updatedRows > 0) {
          break
        }
      }
      if (updatedRows === 0) {
        console.log("[v0] Plan update failed", { error: lastError })
        toast({
          title: "Error",
          description: "No se pudo cambiar el plan",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Éxito",
        description: "Plan actualizado correctamente",
      })

      // Refresh plan limit
      await fetchPlanLimit()
    } catch (err) {
      console.log("[v0] Error in handleChangePlan:", err)
      toast({
        title: "Error",
        description: "Error al cambiar el plan",
        variant: "destructive",
      })
    }
  }

  const handleOpenPlanSelector = () => {
    setShowPlanSelector(true)
  }

  const handleProgramarVisita = (leadId: string, leadName: string) => {
    const existingLead = completosLeads.find((l: any) => String(l.id) === String(leadId))
    setVisitDateDialog({
      open: true,
      leadId: leadId,
      leadName: leadName,
      selectedDate: "",
      selectedTime: "",
      selectedAgenteId: existingLead?.idag ? String(existingLead.idag) : "",
    })
  }

  const handleSaveVisitDate = async () => {
    if (!visitDateDialog.selectedDate || !visitDateDialog.selectedTime || !visitDateDialog.leadId) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha y una hora (24h)",
        variant: "destructive",
      })
      return
    }

    if (!visitDateDialog.selectedAgenteId) {
      toast({
        title: "Agente requerido",
        description: "Selecciona un agente antes de guardar la visita.",
        variant: "destructive",
      })
      return
    }

    try {
      // Fetch user and agent details for history
      const { data: { user } } = await supabase.auth.getUser()
      let agentName = user?.email || "Sistema"
      
      // Try to find the name of the CURRENT USER in Agentes table
      if (user?.email) {
          const { data: currentUserAgent } = await supabase
            .from("Agentes")
            .select("Nombre, nombre")
            .eq("Email", user.email)
            .single()
          if (currentUserAgent) {
             agentName = currentUserAgent.Nombre || currentUserAgent.nombre || user.email
          }
      }

      // Fetch current history
      const { data: currentLead } = await supabase.from("Clientes").select("status_history").eq("id", visitDateDialog.leadId).single()
      const currentHistory = (currentLead?.status_history as any[]) || []
      
      const historyEntry = {
          status: "Visita Propuesta",
          timestamp: new Date().toISOString(),
          agent_id: user?.id,
          agent_name: agentName
      }
      
      const updatedHistory = [...currentHistory, historyEntry]

      const localDateTime = `${visitDateDialog.selectedDate}T${visitDateDialog.selectedTime}`
      const d = new Date(localDateTime)
      const off = d.getTimezoneOffset()
      const sign = off <= 0 ? "+" : "-"
      const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
      const mm = String(Math.abs(off) % 60).padStart(2, "0")
      const offset = `${sign}${hh}:${mm}`
      const valueWithOffset = `${visitDateDialog.selectedDate}T${visitDateDialog.selectedTime}:00${offset}`
      const { error } = await supabase
        .from("Clientes")
        .update({
              fecha_de_visita: valueWithOffset,
              idag: visitDateDialog.selectedAgenteId ? Number(visitDateDialog.selectedAgenteId) : null,
              Estado: "Visita Propuesta",
              status_history: updatedHistory
            })
        .eq("id", visitDateDialog.leadId)

      if (error) {
        console.error("[v0] Error saving visit date:", error)
        toast({
          title: "Error",
          description: "No se pudo guardar la fecha de visita",
          variant: "destructive",
        })
      } else {
        // Trigger webhook
        try {
          const existingLead = completosLeads.find((l: any) => String(l.id) === String(visitDateDialog.leadId))
          const currentAd = anunciosCards.find((a) => 
             (existingLead?.Inmueble && a.referencia === existingLead.Inmueble) || 
             (existingLead?.Inmueble && a.direccion === existingLead.Inmueble)
          )

          // Fetch agent details
          const { data: agentData } = await supabase
             .from("Agentes")
             .select("*")
             .eq("idag", visitDateDialog.selectedAgenteId)
             .single()

          const bookingLink = `https://app.rentaflow.es/agendar-visita?leadId=${visitDateDialog.leadId}`

          // Fetch Inmobiliaria data
          let inmobiliariaData = null
          if (inmobiliariaId) {
             const { data: inmoData } = await supabase
                .from("Inmobiliarias")
                .select("*")
                .eq("idi", inmobiliariaId)
                .single()
             inmobiliariaData = inmoData
          }

          // Prepare base lead data excluding status_history
          const leadData = { ...existingLead }
          delete leadData.status_history

          const { date: formattedDate, time: formattedTime } = formatWebhookDate(valueWithOffset)

          const payload = {
            "Nombre de lead": `${existingLead?.Nombre || ''} ${existingLead?.Apellidos || ''}`.trim(),
            "Agente Asignado": agentData || { idag: visitDateDialog.selectedAgenteId },
            "Agente Email": agentData?.Email || "",
            "Inmueble/Anuncio": currentAd || { Referencia: existingLead?.Inmueble },
            "Nombre Inmobiliaria": inmobiliariaNombre || "Sin nombre",
            "Inmobiliaria": inmobiliariaData || null,
            "Firma": (inmobiliariaData as any)?.firma_html || "",
            "Link de Agendamiento": bookingLink,
            "Fecha Visita": formattedDate,
            "Hora Visita": formattedTime,
            "Fecha Completa": valueWithOffset,
            ...leadData,
            fecha_de_visita: valueWithOffset,
            idag: visitDateDialog.selectedAgenteId ? Number(visitDateDialog.selectedAgenteId) : null,
            Estado: "Visita Propuesta"
          }

          fetch("/api/confirmar-visita", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }).catch(e => console.error("Error calling webhook proxy", e))

        } catch (webhookErr) {
          console.error("Error preparing webhook payload:", webhookErr)
        }

        toast({
          title: "Éxito",
          description: `Visita programada para ${new Date(visitDateDialog.selectedDate).toLocaleString("es-ES")}`,
        })

        // Close dialog and refresh leads list
        setVisitDateDialog({ open: false, leadId: "", leadName: "", selectedDate: "", selectedTime: "", selectedAgenteId: "" })

        // Refresh completos leads if expanded
        if (expandedLeadsAnuncio) {
          const anuncio = anunciosCards.find((a) => a.id === expandedLeadsAnuncio)
          if (anuncio) {
            await handleToggleCompletosExpanded(anuncio)
          }
        }
      }
    } catch (err) {
      console.error("[v0] Error in handleSaveVisitDate:", err)
      toast({
        title: "Error",
        description: "No se pudo guardar la fecha de visita",
        variant: "destructive",
      })
    }
  }

  return (
    <TooltipProvider>
      <div className="p-4 md:p-8 space-y-6">
        <div className="bg-background pb-4 border-b">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">Centro de Anuncios</h1>
                <p className="text-xs text-muted-foreground">Control operativo y económico por anuncio</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="rounded-full bg-blue-500/10 text-foreground border-blue-300 dark:bg-blue-400/10 dark:text-foreground dark:border-blue-700 text-xs px-2 py-0"
                >
                  <span className="text-xs text-muted-foreground mr-1.5">Anuncios activos</span>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 mr-0.5">{activeAnuncios}</span>
                  <span className="text-xs text-muted-foreground">/ {formatPlanValue(anunciosLimit)}</span>
                </Badge>
                <Badge
                  variant="outline"
                  className="rounded-full bg-emerald-500/10 text-foreground border-emerald-300 dark:bg-emerald-400/10 dark:text-foreground dark:border-emerald-700 text-xs px-2 py-0"
                >
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mr-1">{totalCompletos}</span>
                  <span className="text-xs text-muted-foreground">Leads completos (hoy)</span>
                </Badge>
              </div>
            </div>

            <Card
              className={`border rounded-lg p-2 transition-all duration-300 ${
                alertConfig?.cardHighlight
                  ? `border-red-500/50 shadow-lg shadow-red-500/20 bg-gradient-to-br from-[#F8FBF8] via-red-50/30 to-red-100/40 ring-2 ring-red-500/20`
                  : "bg-card border"
              }`}
            >
              <div className="space-y-2">
                {/* Header with remaining percentage */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">Consumo del Plan</h3>
                    {alertConfig && (
                      <Badge
                        variant="outline"
                        className={`${alertConfig.textColor} border-current font-semibold text-xs px-1.5 py-0`}
                      >
                        {alertConfig.icon} {alertConfig.title}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground mr-2">
                      <span>Renovación: {nextRenewalDate.toLocaleDateString("es-ES")}</span>
                      <span>• Plan: {currentPlanName || ""}</span>
                      {scheduledPlanId > 0 && scheduledEffectiveAt && (
                        <span>• Downgrade programado: {scheduledEffectiveAt.toLocaleDateString("es-ES")}</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      className={`h-7 text-xs ${
                        percentageUsed >= 100
                          ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
                          : "border border-muted-foreground/30 bg-transparent hover:bg-muted/50 text-foreground"
                      }`}
                      onClick={handleOpenPlanSelector}
                    >
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Cambiar Plan
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Add-ons
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <ShoppingCart className="h-3 w-3 mr-2" />
                          +50 leads - €29
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShoppingCart className="h-3 w-3 mr-2" />
                          +100 leads - €49
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleOpenPlanSelector}>
                          <Settings className="h-3 w-3 mr-2" />
                          Upgrade plan
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Usage stats */}
                <div className="text-[10px] text-muted-foreground">Leads</div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{totalEjecuciones.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Usadas</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className={`text-lg font-bold ${alertConfig?.textColor || "text-foreground"}`}>
                      {planLimit < 1000000 ? remainingExecutions.toLocaleString() : "∞"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Restantes</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{planLimit < 1000000 ? daysUntilLimit : "∞"}</div>
                    <div className="text-[10px] text-muted-foreground">Días estimados</div>
                  </div>
                </div>
                
                <div className="text-[10px] text-muted-foreground mt-1.5">Anuncios</div>
                <div className="grid grid-cols-3 gap-2 text-sm mt-0.5">
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{activeAnuncios}</div>
                    <div className="text-[10px] text-muted-foreground">Activos</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{formatPlanValue(anunciosLimit)}</div>
                    <div className="text-[10px] text-muted-foreground">Límite (plan)</div>
                  </div>
                  <div className="text-center p-1.5 bg-muted/50 rounded-lg">
                    <div className="text-lg font-bold">{typeof anunciosRemaining === "string" ? anunciosRemaining : anunciosRemaining}</div>
                    <div className="text-[10px] text-muted-foreground">Restantes</div>
                  </div>
                </div>
                {anunciosLimit < 1000000 && anunciosLimit > 0 && (
                  <div className="mt-1.5">
                    <Progress value={anunciosPercentUsed} className="h-1.5 bg-green-500" />
                  </div>
                )}
                {anunciosLimit > 0 && activeAnuncios >= anunciosLimit && (
                  <div className="mt-1.5 flex items-start gap-2 p-2 rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/50 dark:border-red-800">
                    <span className="text-sm">🚨</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-red-600">Has alcanzado el límite de anuncios activos de tu plan.</p>
                      <div className="mt-1 flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-7 text-xs bg-transparent">Archivar uno…</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {activeAnunciosList.map((an) => (
                              <DropdownMenuItem key={an.id} onClick={() => handleOpenArchiveDialog(an)}>
                                <Archive className="h-3 w-3 mr-2" />
                                {an.referencia}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button size="sm" variant="default" className="h-7 text-xs" onClick={handleOpenPlanSelector}>Upgrade plan</Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress bar and details */}
                {planLimit < 1000000 ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        {totalEjecuciones.toLocaleString()} / {formatPlanValue(planLimit)} leads
                      </span>
                      <span className="font-semibold">{percentageUsed.toFixed(1)}% usado</span>
                    </div>
                    <Progress value={percentageUsed} className={`h-2 ${alertConfig?.color || "bg-blue-500"}`} />

                    {/* Alert message */}
                    {alertConfig && (
                      <div
                        className={`flex items-start gap-2 p-2 rounded-lg border ${alertConfig.borderColor} ${alertConfig.level === "critical" || alertConfig.level === "danger" ? "bg-red-50 dark:bg-red-950/50" : alertConfig.level === "warning" ? "bg-orange-50 dark:bg-orange-950/50" : alertConfig.level === "caution" ? "bg-yellow-50 dark:bg-yellow-950/50" : "bg-green-50 dark:bg-green-950/50"}`}
                      >
                        <span className="text-sm">{alertConfig.icon}</span>
                        <div className="flex-1">
                          <p className={`text-xs font-medium ${alertConfig.textColor}`}>{alertConfig.message}</p>
                          {alertConfig.showUpgrade && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              💡 Considera ampliar tu plan para evitar interrupciones en el servicio.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-1">
                    <p className="text-xs font-medium text-green-600">✅ Plan Ilimitado - Sin restricciones</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Leads utilizados este mes: {totalEjecuciones.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {anunciosError ? (
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Error al cargar anuncios</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{anunciosError}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-3">
              {role !== "agente" && (
                <>
                  <button
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-primary/15 hover:from-primary/10 hover:to-primary/15 hover:border-primary/50 transition-all cursor-pointer group"
                    onClick={() => setShowCreationModal(true)}
                  >
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors shrink-0">
                      <Plus className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-medium text-sm">Crear Anuncio</span>
                      <span className="text-[10px] text-muted-foreground">· 3 pasos</span>
                    </div>
                  </button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-r from-primary/5 to-primary/15 hover:from-primary/10 hover:to-primary/15 hover:border-primary/50 transition-all cursor-pointer group">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors shrink-0">
                          <Copy className="h-3 w-3 text-primary" />
                        </div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-medium text-sm">Duplicar Anuncio</span>
                          <span className="text-[10px] text-muted-foreground">· elegir base</span>
                        </div>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="max-h-[300px] overflow-auto">
                      {anunciosCards.length === 0 ? (
                        <DropdownMenuItem disabled>No hay anuncios</DropdownMenuItem>
                      ) : (
                        anunciosCards.slice(0, 30).map((an) => (
                          <DropdownMenuItem key={an.id} onClick={() => handleDuplicar(an)}>
                            <FileText className="h-3.5 w-3.5 mr-2" />
                            {an.referencia}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}

              <button
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 border-dashed transition-all cursor-pointer group ${
                  filterEstado === "archivado"
                    ? "border-orange-400 bg-orange-50 hover:bg-orange-100 hover:border-orange-500 dark:border-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/30 dark:hover:border-orange-600"
                    : "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
                }`}
                onClick={() => {
                  setFilterEstado(filterEstado === "archivado" ? "all" : "archivado")
                }}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                  filterEstado === "archivado"
                    ? "bg-orange-200 group-hover:bg-orange-300 dark:bg-orange-800/30 dark:group-hover:bg-orange-800/40"
                    : "bg-gray-200 group-hover:bg-gray-300 dark:bg-input/50 dark:group-hover:bg-input/60"
                }`}>
                  <Target className={`h-3 w-3 ${
                    filterEstado === "archivado" ? "text-orange-700 dark:text-orange-300" : "text-gray-600 dark:text-foreground/85"
                  }`} />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-sm text-foreground dark:text-foreground">{filterEstado === "archivado" ? "Ver Activos" : "Archivados"}</span>
                  <span className="text-xs text-muted-foreground dark:text-foreground/85">
                    {filterEstado === "archivado" ? "· viendo archivados" : "· ver anuncios archivados"}
                  </span>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              {filterEstado === "archivado" && (
                <div className="flex items-center gap-2 p-2 rounded-md bg-orange-50 border border-orange-200">
                  <Archive className="h-3 w-3 text-orange-700" />
                  <span className="text-xs text-orange-700">Estás viendo anuncios archivados</span>
                </div>
              )}
              {cardsLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Cargando anuncios…</span>
                </div>
              )}
              {anunciosCalculados.map((anuncio) => {
                const isExpanded = expandedCard === anuncio.id

                return (
                  <div key={anuncio.id} className="space-y-2">
                    <Card className={anuncio.cardClassName}>
                      <CardHeader className="pb-0 pt-2">
                        <div className="space-y-1">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base truncate">{anuncio.referencia}</h3>
                                <UITooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-2">
                                      <Switch
                                        checked={anuncio.estado === "activo"}
                                        onCheckedChange={() => handleToggleEstado(anuncio.id, anuncio.activacion)}
                                        disabled={
                                          processingId === anuncio.id ||
                                          (anuncio.estado !== "activo" && anunciosLimit > 0 && anunciosLimit < 1000000 && activeAnuncios >= anunciosLimit)
                                        }
                                        className="scale-90 origin-left"
                                      />
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          anuncio.estado === "pausado"
                                            ? "bg-red-600 text-white border-red-600 dark:bg-red-900 dark:text-white dark:border-red-900"
                                            : anuncio.estado === "archivado"
                                              ? "bg-black text-white border-black dark:bg-[#F8FBF8] dark:text-black dark:border-white"
                                              : "bg-[#F8FBF8] text-black border-black dark:bg-black dark:text-white dark:border-white"
                                        }`}
                                      >
                                        {processingId === anuncio.id ? "..." : anuncio.activacion}
                                      </span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Activar o pausar anuncio</p>
                                  </TooltipContent>
                                </UITooltip>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{anuncio.direccion}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              
                              {/* Availability Indicator */}
                              {anuncio.hasAvailability ? (
                                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-100 shadow-sm">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400"></span>
                                  </span>
                                  Huecos libres
                                </div>
                              ) : (
                                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 shadow-sm">
                                  <div className="h-2 w-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                                  Sin huecos
                                </div>
                              )}

                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs px-2 bg-transparent"
                                onClick={() => handleOpenScheduleDialog(anuncio.id)}
                                disabled={anuncio.estado === "archivado"}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Programar
                              </Button>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditar(anuncio)}>
                                    <Edit className="h-3.5 w-3.5 mr-2" />
                                    Editar anuncio
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDuplicar(anuncio)}>
                                    <Copy className="h-3.5 w-3.5 mr-2" />
                                    Duplicar como nuevo
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link
                                      href={`/dashboard/leads?filter=${encodeURIComponent(anuncio.referencia)}&status=completos`}
                                      prefetch={false}
                                      onClick={() => console.log("[nav] anuncios_to_leads_completos_click", anuncio.referencia)}
                                    >
                                      <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                      Ver &quot;Datos completos&quot;
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleInfoFaqs(anuncio)}>
                                    <Settings className="h-3.5 w-3.5 mr-2" />
                                    Editar info & FAQs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleShowStats(anuncio)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" />
                                    Ver Estadísticas
                                  </DropdownMenuItem>
                                  {anuncio.estado === "archivado" ? (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => handleUnarchiveAnuncio(anuncio)}
                                        className="text-green-600"
                                      >
                                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                                        Desarchivar
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleOpenDeleteDialog(anuncio)}
                                        className="text-red-600"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleOpenArchiveDialog(anuncio)}
                                      className="text-orange-600"
                                    >
                                      <Archive className="h-3.5 w-3.5 mr-2" />
                                      Archivar
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>




                        </div>
                      </CardHeader>

                      <CardContent className="space-y-1 pt-1 pb-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">Rendimiento y actividad</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground/80 tabular-nums">
                                {anuncio.periodText}
                              </span>
                              <div className="flex items-center bg-muted/50 rounded-md p-0.5">
                                <Button
                                  variant={anuncio.localPeriod === "hoy" ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-6 text-[10px] px-2 font-medium ${anuncio.localPeriod === "hoy" ? "bg-background text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
                                  onClick={() => handleLocalMetricsPeriodChange(anuncio.id, "hoy")}
                                >
                                  Hoy
                                </Button>
                                <Button
                                  variant={anuncio.localPeriod === "esteMes" ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-6 text-[10px] px-2 font-medium ${anuncio.localPeriod === "esteMes" ? "bg-background text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
                                  onClick={() => handleLocalMetricsPeriodChange(anuncio.id, "esteMes")}
                                >
                                  Mes
                                </Button>
                                <Button
                                  variant={anuncio.localPeriod === "ultimoMes" ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-6 text-[10px] px-2 font-medium ${anuncio.localPeriod === "ultimoMes" ? "bg-background text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
                                  onClick={() => handleLocalMetricsPeriodChange(anuncio.id, "ultimoMes")}
                                >
                                  Mes ant.
                                </Button>
                                <Button
                                  variant={anuncio.localPeriod === "periodoActual" ? "secondary" : "ghost"}
                                  size="sm"
                                  className={`h-6 text-[10px] px-2 font-medium ${anuncio.localPeriod === "periodoActual" ? "bg-background text-foreground shadow-sm" : "text-foreground/70 hover:text-foreground"}`}
                                  onClick={() => handleLocalMetricsPeriodChange(anuncio.id, "periodoActual")}
                                >
                                  Ciclo
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{anuncio.nuevosHoy}</div>
                              <div className="text-[10px] text-muted-foreground">Nuevos</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">{anuncio.datosCompletos}</div>
                              <div className="text-[10px] text-muted-foreground">Nº Completos</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-indigo-600">
                                {anuncio.tiempoFormateado}
                              </div>
                              <div className="text-[10px] text-muted-foreground">Tiempo ahorrado</div>
                            </div>
                          </div>
                        </div>

                        {/* Consumo del anuncio (health score) */}
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-xs font-semibold text-muted-foreground">Consumo del anuncio</h4>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-muted-foreground">Tendencia 7d</span>
                              <div className="text-green-600">
                                <Sparkline data={anuncio.sparklineData} />
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs">Leads: {anuncio.ejecuciones}</span>
                            <span className="text-xs">
                              {planLimit > 0 && anuncio.planPercentage.toFixed(1)}% del plan
                            </span>
                          </div>

                          {anuncio.whatsappsPeriodo > 0 && (
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs">WhatsApps: {anuncio.whatsappsPeriodo}</span>
                              <span className="text-xs text-green-600">
                                €{(anuncio.whatsappsPeriodo * 0.0327).toFixed(2)}
                              </span>
                            </div>
                          )}

                          <Progress
                            value={anuncio.planPercentage}
                            className="h-1"
                          />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 pt-0.5 border-t">
                          <Button asChild size="sm" className="flex-1 bg-primary hover:bg-primary/90 h-7 text-xs px-1">
                            <Link
                              href={`/dashboard/leads?filter=${encodeURIComponent(anuncio.referencia)}`}
                              prefetch={false}
                              onClick={() => console.log("[nav] anuncios_to_leads_filter_click", anuncio.referencia)}
                            >
                              <Eye className="h-3 w-3 mr-1.5" />
                              Ver leads ({anuncio.leadsTotales})
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent text-xs h-7"
                            onClick={() => handleEditar(anuncio)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent text-xs h-7"
                            onClick={() => handleInfoFaqs(anuncio)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Info & FAQs
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 bg-transparent text-xs h-7"
                            onClick={() => openNextcloudFiles(anuncio)}
                          >
                            Archivos
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 bg-transparent"
                            onClick={() => handleShowStats(anuncio)}
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-[10px] text-muted-foreground pt-0.5 border-t">
                          Última actividad: {anuncio.ultimaActividad}
                        </div>
                      </CardContent>
                    </Card>

                    {expandedLeadsAnuncio === anuncio.id && (
                      <Card className="bg-muted/30 border-l-4 border-l-green-500/40">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">Leads con Datos Completos - {anuncio.referencia}</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setExpandedLeadsAnuncio(null)
                                setCompletosLeads([])
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {loadingCompletos ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            </div>
                          ) : completosLeads.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No hay leads con datos completos para este anuncio
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {completosLeads.map((lead) => (
                                <div
                                  key={lead.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    lead.fecha_de_visita
                                      ? 'bg-blue-50 border-blue-200 hover:border-blue-300 dark:bg-blue-950/50 dark:border-blue-800 dark:hover:border-blue-700'
                                      : 'bg-background hover:border-primary/50'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate text-foreground">{lead.Nombre}</p>
                                      {lead.Agentes?.Nombre && (
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          Agente: {lead.Agentes.Nombre}
                                        </div>
                                      )}
                                      {lead.fecha_de_visita && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                          <Calendar className="h-3 w-3 mr-1" />
                                          Visita programada
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <p className="text-xs text-muted-foreground">{lead.Correo}</p>
                                      {lead.Telefono && (
                                        <p className="text-xs text-muted-foreground">{lead.Telefono}</p>
                                      )}
                                    </div>
                                    {lead.Ingresos && (
                                      <p className="text-xs text-muted-foreground mt-1">Ingresos: {lead.Ingresos}€</p>
                                    )}
                                    <div className="flex items-center gap-1.5 mt-1 text-xs">
                                      {lead.status_history && lead.status_history.length > 0 ? (
                                        <>
                                          <HistoryIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                                          <span className="text-muted-foreground">
                                            {new Date(lead.status_history[lead.status_history.length - 1].timestamp).toLocaleString("es-ES", {
                                              day: "2-digit",
                                              month: "2-digit",
                                              year: "2-digit",
                                              hour: "2-digit",
                                              minute: "2-digit"
                                            })} • {lead.status_history[lead.status_history.length - 1].agent_name?.split('@')[0] || "Sistema"}
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <HistoryIcon className="h-3 w-3 text-gray-400 shrink-0" />
                                          <span className="text-gray-400">Sin historial</span>
                                        </>
                                      )}
                                    </div>
                                    {lead.fecha_de_visita && (
                                      <p className="text-xs font-medium text-blue-700 mt-1">
                                        📅 {new Date(lead.fecha_de_visita).toLocaleString("es-ES", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={lead.fecha_de_visita ? "outline" : "default"}
                                    onClick={() => handleProgramarVisita(lead.id, lead.Nombre)}
                                    className="ml-2"
                                  >
                                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                                    {lead.fecha_de_visita ? "Re-programar visita" : "Programar visita"}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Controles de paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <span className="sr-only">Anterior</span>
                  ←
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="min-w-[32px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <span className="sr-only">Siguiente</span>
                  →
                </Button>
                
                <span className="text-sm text-muted-foreground ml-4">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            )}

            {anunciosCards.length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay anuncios disponibles</h3>
                  <p className="text-muted-foreground mb-4">
                    Los anuncios aparecerán aquí una vez que estén configurados.
                  </p>
                  {role !== "agente" && (
                    <Button onClick={() => setShowCreationModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer anuncio
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={showCreationModal} onOpenChange={setShowCreationModal}>
          <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-none h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Anuncio - Paso {creationStep.step} de 3</DialogTitle>
              <DialogDescription>
                Complete los datos del anuncio en 3 pasos para publicarlo en el portal seleccionado.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Progress indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 h-2 rounded-full ${step <= creationStep.step ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>

              {creationStep.step === 1 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Datos básicos</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="titulo">Título</Label>
                      <Input
                        id="titulo"
                        value={creationStep.data.referencia}
                        onChange={(e) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, referencia: e.target.value },
                          }))
                        }
                        placeholder="Referencia del anuncio"
                      />
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800 mt-2">
                        <div className="flex gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Campo crítico:</p>
                            <p className="mt-0.5">
                              Este campo debe coincidir exactamente con la &quot;Referencia Interna&quot; de Idealista o Fotocasa para
                              que los leads se listen correctamente y evitar conflictos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="codPortal">Código del anuncio</Label>
                      <Input
                        id="codPortal"
                        value={creationStep.data.codPortal}
                        onChange={(e) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, codPortal: e.target.value },
                          }))
                        }
                        placeholder="Código del anuncio en el portal"
                      />
                      <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800 mt-2">
                        <div className="flex gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Campo crítico:</p>
                            <p className="mt-0.5">
                              Este campo debe coincidir exactamente con la &quot;Referencia Interna&quot; de Idealista o Fotocasa para
                              que los leads se listen correctamente y evitar conflictos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="direccion">Dirección</Label>
                      <Input
                        id="direccion"
                        value={creationStep.data.direccion}
                        onChange={(e) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, direccion: e.target.value },
                          }))
                        }
                        placeholder="Dirección completa"
                      />
                    </div>
                    <div>
                      <Label htmlFor="portal">Portal</Label>
                      <Select
                        value={creationStep.data.portal}
                        onValueChange={(value) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, portal: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar portal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Idealista">Idealista</SelectItem>
                          <SelectItem value="Fotocasa">Fotocasa</SelectItem>
                          <SelectItem value="Habitaclia">Habitaclia</SelectItem>
                          <SelectItem value="Pisos.com">Pisos.com</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {creationStep.step === 2 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Detalles completos</h3>
                  <div className="grid gap-4">
                    <div>
                      <Label htmlFor="descripcion">Descripción</Label>
                      <Textarea
                        id="descripcion"
                        value={creationStep.data.descripcion}
                        onChange={(e) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, descripcion: e.target.value },
                          }))
                        }
                        placeholder="Descripción del inmueble"
                      />
                    </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="precio">Precio</Label>
                          <Input
                            id="precio"
                            type="number"
                            value={creationStep.data.precio}
                            onChange={(e) =>
                              setCreationStep((prev) => ({
                                ...prev,
                                data: { ...prev.data, precio: e.target.value },
                              }))
                            }
                            placeholder="0"
                          />
                        </div>
                        
                      </div>
                  </div>
                </div>
              )}

              {creationStep.step === 3 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Activación</h3>
                  <div className="space-y-4">
                    <div>
                      <Label>Estado inicial</Label>
                      <Select
                        value={creationStep.data.activacion}
                        onValueChange={(value) =>
                          setCreationStep((prev) => ({
                            ...prev,
                            data: { ...prev.data, activacion: value },
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Activo">Crear como Activo</SelectItem>
                          <SelectItem value="Pausado">Guardar en Pausado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                      <div className="space-y-2 mt-2">
                        <Label>Archivos del anuncio</Label>
                        <div
                          className={`relative border-2 border-dashed rounded-md p-4 h-28 flex items-center justify-center text-sm ${
                            creationDragActive ? "border-ring bg-muted/40" : "border-input bg-transparent"
                          }`}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setCreationDragActive(true) }}
                          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setCreationDragActive(false) }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); uploadFilesForAnuncio(e.dataTransfer.files, creationStep.data.referencia, "creation"); setCreationDragActive(false) }}
                        >
                          <Input type="file" multiple disabled={creationUploadUploading || (!inmobiliariaNombre && inmobiliariaId == null)} onChange={(e) => uploadFilesForAnuncio(e.target.files, creationStep.data.referencia, "creation")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                          <div className="pointer-events-none text-muted-foreground">Arrastra y suelta archivos o haz clic</div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">Se subirán bajo la referencia indicada.</div>
                        {creationUploadUploading && (
                          <div className="text-[12px] text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Subiendo archivos...</div>
                        )}
                        <div className="mt-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={loadCreationFiles}>Refrescar</Button>
                          </div>
                          <h4 className="text-sm font-semibold mt-2">Archivos existentes</h4>
                          {creationFilesLoading ? (
                            <div className="text-xs text-muted-foreground">Cargando…</div>
                          ) : creationFilesList.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Sin archivos</div>
                          ) : (
                            <div className="space-y-2">
                              {creationFilesList.map((f: any, idx: number) => {
                                const label = f.name || (f.path ? decodeURIComponent(String(f.path).split("/").pop() || "") : "") || "Archivo"
                                const href = f.path ? `/api/nextcloud/file?path=${encodeURIComponent(f.path)}` : "#"
                                const lower = (f.name || f.path || "").toLowerCase()
                                const ct = String(f.contentType || "")
                                const isPdf = /\.pdf$/.test(lower) || /application\/pdf/.test(ct)
                                const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower) || /image\//.test(ct)
                                const sizeLabel = typeof f.size === "number" ? (f.size >= 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`) : "-"
                                return (
                                  <div key={`creation-file-${idx}-${f.path || f.name}`} className="flex items-center justify-between gap-2 text-xs">
                                    <div className="truncate">
                                      <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
                                        {label}
                                      </a>
                                    </div>
                                    <div className="text-muted-foreground">
                                      {isPdf ? "PDF" : isImage ? "Imagen" : "Archivo"} · {sizeLabel}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-medium mb-2">Resumen</h4>
                        <div className="text-sm space-y-1">
                          <p>
                            <span className="font-medium">Referencia:</span> {creationStep.data.referencia}
                          </p>
                          <p>
                            <span className="font-medium">Código del anuncio:</span> {creationStep.data.codPortal}
                          </p>
                          <p>
                            <span className="font-medium">Dirección:</span> {creationStep.data.direccion}
                          </p>
                          <p>
                            <span className="font-medium">Portal:</span> {creationStep.data.portal}
                          </p>
                          <p>
                            <span className="font-medium">Estado:</span> {creationStep.data.activacion}
                          </p>
                        </div>
                      </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (creationStep.step > 1) {
                      setCreationStep((prev) => ({ ...prev, step: prev.step - 1 }))
                    } else {
                      setShowCreationModal(false)
                    }
                  }}
                >
                  {creationStep.step === 1 ? "Cancelar" : "Anterior"}
                </Button>

                <Button
                  onClick={() => {
                    if (creationStep.step < 3) {
                      setCreationStep((prev) => ({ ...prev, step: prev.step + 1 }))
                    } else {
                      handleCrearAnuncio()
                    }
                  }}
                  disabled={creatingAnuncio}
                >
                  {creatingAnuncio && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {creationStep.step === 3 ? "Crear Anuncio" : "Siguiente"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Processing Drawer */}
        <Sheet open={showProcessingDrawer} onOpenChange={setShowProcessingDrawer}>
          <SheetContent side="right" className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Procesamiento - {processingAnuncio?.referencia}</SheetTitle>
              <SheetDescription>Cola de verificación y agenda para este anuncio</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Progreso de la cola</span>
                  <span className="text-sm text-muted-foreground">3/15 procesados</span>
                </div>
                <Progress value={20} className="w-full" />

                <div className="text-sm text-muted-foreground">
                  <p>Atajos: N (siguiente), A (agendar), C (completo)</p>
                  <p>Leads consumidos: 3/100</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* ... existing edit dialog ... */}
        <Dialog open={!!editingAnuncio} onOpenChange={() => setEditingAnuncio(null)}>
          <DialogContent
            className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto z-[100]"
            onInteractOutside={(e) => {
              e.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle>Editar Anuncio - {editingAnuncio?.referencia}</DialogTitle>
              <DialogDescription>
                Modifique los datos del anuncio. Los cambios se guardarán en la base de datos.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="referencia" className="text-right pt-2">
                  Referencia
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="referencia"
                      value={editFormData.referencia}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, referencia: e.target.value }))}
                      className="flex-1"
                      placeholder="Referencia del inmueble"
                      disabled={!isReferenciaEditable}
                    />
                    <Button
                      type="button"
                      variant={isReferenciaEditable ? "default" : "outline"}
                      size="icon"
                      onClick={() => setIsReferenciaEditable(!isReferenciaEditable)}
                      title={isReferenciaEditable ? "Bloquear campo" : "Desbloquear para editar"}
                    >
                      {isReferenciaEditable ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                    <div className="flex gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Campo crítico:</p>
                        <p className="mt-0.5">
                          Este campo debe coincidir exactamente con la &quot;Referencia Interna&quot; de Idealista o Fotocasa para
                          que los leads se listen correctamente y evitar conflictos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="codPortal" className="text-right pt-2">
                  Código del anuncio
                </Label>
                <div className="col-span-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="codPortal"
                      value={editFormData.codPortal}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, codPortal: e.target.value }))}
                      className="flex-1"
                      placeholder="Código del anuncio en el portal"
                      disabled={!isCodPortalEditable}
                    />
                    <Button
                      type="button"
                      variant={isCodPortalEditable ? "default" : "outline"}
                      size="icon"
                      onClick={() => setIsCodPortalEditable(!isCodPortalEditable)}
                      title={isCodPortalEditable ? "Bloquear campo" : "Desbloquear para editar"}
                    >
                      {isCodPortalEditable ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                    <div className="flex gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Campo crítico:</p>
                        <p className="mt-0.5">
                          Este campo debe coincidir exactamente con la &quot;Referencia Interna&quot; de Idealista o Fotocasa para
                          que los leads se listen correctamente y evitar conflictos.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Label htmlFor="direccion" className="text-right pt-2">
                  Dirección
                </Label>
                <div className="col-span-3 space-y-3">
                  <Input
                    id="direccion"
                    value={editFormData.direccion}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                    placeholder="Dirección completa del inmueble"
                  />
                  {editFormData.direccion && (
                    <div className="border rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodeURIComponent(editFormData.direccion)}`}
                      />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Edite la dirección para actualizar la vista previa del mapa
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="descripcion" className="text-right">
                  Descripción
                </Label>
                <Textarea
                  id="descripcion"
                  value={editFormData.descripcion}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, descripcion: e.target.value }))}
                  className="col-span-3"
                  placeholder="Descripción del anuncio"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="precio" className="text-right">
                  Precio
                </Label>
                <Input
                  id="precio"
                  type="number"
                  value={editFormData.precio}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, precio: e.target.value }))}
                  className="col-span-3"
                  placeholder="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="portal" className="text-right">
                  Portal
                </Label>
                <Input
                  id="portal"
                  value={editFormData.portal}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, portal: e.target.value }))}
                  className="col-span-3"
                  placeholder="Portal de publicación"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <Label className="text-right pt-2">Configuración Visitas</Label>
                <div className="col-span-3 flex gap-4">
                   <div className="flex-1 space-y-2">
                     <Label htmlFor="duracion_visita" className="text-xs text-muted-foreground">Duración (min)</Label>
                     <Input
                        id="duracion_visita"
                        type="number"
                        min="5"
                        step="5"
                        value={editFormData.duracion_visita}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, duracion_visita: e.target.value }))}
                        placeholder="20"
                      />
                   </div>
                   <div className="flex-1 space-y-2">
                     <Label htmlFor="tiempo_entre_visitas" className="text-xs text-muted-foreground">Gap (min)</Label>
                     <Input
                        id="tiempo_entre_visitas"
                        type="number"
                        min="0"
                        step="5"
                        value={editFormData.tiempo_entre_visitas}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, tiempo_entre_visitas: e.target.value }))}
                        placeholder="5"
                      />
                   </div>
                </div>
              </div>
              
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Archivos del anuncio</Label>
                        <div
                          className={`relative border-2 border-dashed rounded-md p-2 h-20 flex items-center justify-center text-sm col-span-3 ${
                            editDragActive ? "border-ring bg-muted/40" : "border-input bg-transparent"
                          }`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setEditDragActive(true) }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setEditDragActive(false) }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); uploadFilesForAnuncio(e.dataTransfer.files, editFormData.referencia, "edit"); setEditDragActive(false) }}
                >
                  <Input type="file" multiple disabled={editUploadUploading} onChange={(e) => uploadFilesForAnuncio(e.target.files, editFormData.referencia, "edit")} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="pointer-events-none text-muted-foreground">Arrastra y suelta archivos o haz clic</div>
                </div>
                {editUploadUploading && (
                  <div className="col-span-4 text-[12px] text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Subiendo archivos...</div>
                )}
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <div className="col-span-4 flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={loadEditFiles}>Refrescar</Button>
                </div>
                <div className="col-span-4 space-y-2">
                  <h4 className="text-sm font-semibold">Archivos existentes</h4>
                  {editFilesLoading ? (
                    <div className="text-xs text-muted-foreground">Cargando…</div>
                  ) : editFilesList.length === 0 ? (
                    <div className="text-xs text-muted-foreground">Sin archivos</div>
                  ) : (
                    <div className="space-y-2">
                      {editFilesList.map((f: any, idx: number) => (
                        <div key={`edit-file-${idx}-${f.path || f.name}`} className="flex items-center justify-between gap-2 text-xs">
                          {(() => {
                            const label = f.name || (f.path ? decodeURIComponent(String(f.path).split("/").pop() || "") : "") || "Archivo"
                            const href = f.path ? `/api/nextcloud/file?path=${encodeURIComponent(f.path)}` : "#"
                            return (
                              <a href={href} className="underline truncate" onClick={(e) => { e.preventDefault(); if (f.path) openAttachmentPreview(href, f.name || label) }}>
                                {label}
                              </a>
                            )
                          })()}
                          <div className="flex items-center gap-2">
                            <div className="text-muted-foreground shrink-0">{f.lastModified}</div>
                            <Button size="sm" variant="destructive" onClick={() => f.path && deleteEditFile(f.path)}>Eliminar</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="activacion" className="text-right">
                  Estado
                </Label>
                <Select
                  value={editFormData.activacion}
                  onValueChange={(value) => setEditFormData((prev) => ({ ...prev, activacion: value }))}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Seleccionar estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Pausado">Pausado</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingAnuncio(null)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={() => editingAnuncio && handleInfoFaqs(editingAnuncio)}>
                <Settings className="h-4 w-4 mr-1" />
                Info & FAQs
              </Button>
              <Button onClick={handleGuardarEdicion}>Guardar cambios</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInfoFaqsModal} onOpenChange={setShowInfoFaqsModal}>
          <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-none h-[92vh] overflow-y-auto z-[100]"
            onInteractOutside={(e) => {
              e.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle>Información Detallada & FAQs - {editingAnuncio?.referencia}</DialogTitle>
              <DialogDescription>
                Añada información detallada del inmueble y preguntas frecuentes para ayudar a los candidatos.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Información Detallada */}
              <div className="space-y-2">
                <Label htmlFor="info-detallada">Información Detallada del Inmueble</Label>
                <Textarea
                  id="info-detallada"
                  value={infoFaqsData.informacionDetallada}
                  onChange={(e) => setInfoFaqsData((prev) => ({ ...prev, informacionDetallada: e.target.value }))}
                  placeholder="Describe características especiales, servicios incluidos, normas de la comunidad, etc."
                  className="min-h-[100px]"
                />
              </div>

              {/* FAQs Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Preguntas Frecuentes (FAQs)</Label>
                  <Button size="sm" variant="outline" className="relative z-[1100]" onClick={addFaq}>
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir FAQ
                  </Button>
                </div>

                {infoFaqsData.faqs.map((faq, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">FAQ #{index + 1}</Label>
                      {infoFaqsData.faqs.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFaq(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Input
                        placeholder="Pregunta frecuente..."
                        value={faq.pregunta}
                        onChange={(e) => updateFaq(index, "pregunta", e.target.value)}
                      />
                      <Textarea
                        placeholder="Respuesta detallada..."
                        value={faq.respuesta}
                        onChange={(e) => updateFaq(index, "respuesta", e.target.value)}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowInfoFaqsModal(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveInfoFaqs}>Guardar Información</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={showStatsModal}
          onOpenChange={(open) => {
            setShowStatsModal(open)
            setIsStatsModalOpen(open)
          }}
        >
          <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-none h-[92vh] overflow-y-auto z-[100]">
            <DialogHeader>
              <DialogTitle>Estadísticas - {selectedAnuncioForStats?.referencia}</DialogTitle>
              <DialogDescription>
                Análisis detallado del rendimiento, consumo y calidad de leads del anuncio.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {selectedAnuncioForStats && (
                <>
                  {/* Métricas Principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TooltipProvider>
                      <UITooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            onClick={() => handlePhaseMetricClick("descartado")}
                            tabIndex={-1}
                          >
                            <span className="text-3xl font-bold text-foreground">{selectedAnuncioForStats.leadsTotales}</span>
                            <span className="text-xs text-muted-foreground font-normal">Leads Totales</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[9999]">
                          <p>Leads totales del periodo seleccionado o desde la última activación del anuncio</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <UITooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            tabIndex={-1}
                          >
                            <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{selectedAnuncioForStats.datosCompletos}</span>
                            <span className="text-xs text-muted-foreground font-normal">Datos Completos</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-[9999]">
                          <p>Leads con datos completos (incluye Aprobados, Visita Programada y Pedir Aval)</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <UITooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="outline"
                            className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            tabIndex={-1}
                          >
                            <span className="text-3xl font-bold text-violet-600 dark:text-violet-400">
                              {selectedAnuncioForStats.leadsTotales > 0
                                ? (
                                    (selectedAnuncioForStats.datosCompletos / selectedAnuncioForStats.leadsTotales) *
                                    100
                                ).toFixed(1)
                                : "0.0"}
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
                          <Button 
                            variant="outline"
                            className="w-full h-auto text-center p-4 bg-muted rounded-lg border hover:bg-muted/80 hover:border-primary/50 transition-colors flex flex-col items-center gap-1 focus-visible:ring-0 focus-visible:ring-offset-0"
                            tabIndex={-1}
                          >
                            <span className="text-3xl font-bold text-red-600 dark:text-red-400">{selectedAnuncioForStats.descartados || 0}</span>
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
                    <div className="grid grid-cols-3 gap-3">
                      <TooltipProvider>
                        <UITooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between hover:bg-emerald-50 dark:hover:bg-emerald-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                              onClick={() => handlePhaseMetricClick("datos_completos")}
                              tabIndex={-1}
                            >
                              <span className="text-xs text-muted-foreground">Datos Completados</span>
                              <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                                {selectedAnuncioForStats.phaseMetrics?.datosCompletos || 0}
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
                            <Button
                              variant="outline"
                              className="w-full justify-between hover:bg-green-50 dark:hover:bg-green-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                              onClick={() => handlePhaseMetricClick("aceptado")}
                              tabIndex={-1}
                            >
                              <span className="text-xs text-muted-foreground">Candidatos Aprobados</span>
                              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                                {selectedAnuncioForStats.phaseMetrics?.aceptados || 0}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="z-[9999]">
                            <p>Leads con estado Aprobado</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <UITooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full justify-between hover:bg-blue-50 dark:hover:bg-blue-950/30 h-auto p-4 flex flex-col items-center gap-2 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                              onClick={() => handlePhaseMetricClick("visita_propuesta")}
                              tabIndex={-1}
                            >
                              <span className="text-xs text-muted-foreground">Visita Propuesta</span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {selectedAnuncioForStats.phaseMetrics?.visitaPropuesta || 0}
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="z-[9999]">
                            <p>Leads con estado Visita Propuesta</p>
                          </TooltipContent>
                        </UITooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Visualización de Leads</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="h-7 text-[10px]">
                          {(() => {
                            const period = statsPeriod || "esteMes"
                              const now = new Date()
                              const dayStart = new Date(now); dayStart.setHours(0,0,0,0)
                              const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000)
                              const prevMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1)
                              const prevMonthEndDisplay = new Date(now.getFullYear(), now.getMonth(), 0)
                              const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                              const yearStart = new Date(now.getFullYear(), 0, 1)
                              const start =
                                period === "hoy"
                                  ? dayStart
                                  : period === "ultimoMes"
                                  ? prevMonthStart
                                  : period === "esteMes"
                                  ? thisMonthStart
                                  : period === "esteAno"
                                  ? yearStart
                                  : (planResetAt ? new Date(planResetAt) : thisMonthStart)
                              const end = period === "hoy" ? dayEnd : period === "ultimoMes" ? prevMonthEndDisplay : now
                              const fmt = (d: Date) => d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" })
                              const label =
                                period === "hoy"
                                  ? "Hoy"
                                  : period === "ultimoMes"
                                  ? "Último mes"
                                  : period === "esteMes"
                                  ? "Este mes"
                                  : period === "esteAno"
                                  ? "Este año"
                                  : "Periodo actual"
                              return period === "hoy" ? `${label}: ${fmt(start)}` : `${label}: ${fmt(start)} – ${fmt(end)}`
                          })()}
                        </Badge>
                        <Select value={statsPeriod} onValueChange={(v) => {
                          setStatsPeriod(v as any)
                          setSelectedAnuncioForStats(prev => prev ? { ...prev, statsPeriod: v } : prev)
                          if (v === "hoy") setTrendTimeframe("24h")
                          else if (v === "esteMes" || v === "ultimoMes") setTrendTimeframe("1m")
                          else setTrendTimeframe("7d")
                        }}>
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue placeholder="Periodo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hoy">Hoy</SelectItem>
                            <SelectItem value="esteMes">Este mes</SelectItem>
                            <SelectItem value="ultimoMes">Último mes</SelectItem>
                            <SelectItem value="esteAno">Este año</SelectItem>
                            <SelectItem value="periodoActual">Periodo actual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    {/* Layout de gráficos uno al lado del otro */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Actividad de Leads */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Actividad de Leads</h4>
                        <div className="bg-muted p-4 rounded-lg">
                          {!selectedAnuncioForStats?.activityData || selectedAnuncioForStats.activityData.length === 0 ? (
                            <div className="flex items-center justify-center h-32">
                              <div className="text-sm text-muted-foreground">Sin datos</div>
                            </div>
                          ) : (
                            (() => {
                              const now = new Date()
                              const dayStart = new Date(now); dayStart.setHours(0,0,0,0)
                              const dayEnd = new Date(dayStart.getTime() + 24*60*60*1000)
                              const prevMonthStart = new Date(now.getFullYear(), now.getMonth()-1, 1)
                              const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1)
                              const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
                              const yearStart = new Date(now.getFullYear(), 0, 1)
                              const periodStart =
                                statsPeriod === "hoy"
                                  ? dayStart
                                  : statsPeriod === "ultimoMes"
                                  ? prevMonthStart
                                  : statsPeriod === "esteMes"
                                  ? thisMonthStart
                                  : statsPeriod === "esteAno"
                                  ? yearStart
                                  : (planResetAt ? new Date(planResetAt) : thisMonthStart)
                              const periodEnd = statsPeriod === "hoy" ? dayEnd : statsPeriod === "ultimoMes" ? prevMonthEnd : now
                              return (
                                <ActivityHeatmap
                                  data={selectedAnuncioForStats.activityData}
                                  startDate={selectedAnuncioForStats.activityStartDate || thisMonthStart}
                                  periodStart={periodStart}
                                  periodEnd={periodEnd}
                                />
                              )
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

                      {/* Gráfico de Totales (línea) */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Leads por día</h4>
                        <div className="bg-muted p-4 rounded-lg" style={{ 
                          height: trendData && trendData.length > 10 ? '300px' : 
                                 trendData && trendData.length > 5 ? '250px' : '200px' 
                        }}>
                          {!trendData || trendData.length === 0 ? (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-sm text-muted-foreground">Sin datos</div>
                            </div>
                          ) : (
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={trendData}
                                margin={{ 
                                  top: 10, 
                                  right: trendData.length > 10 ? 12 : 36, 
                                  left: 28, 
                                  bottom: trendData.length > 10 ? 48 : 28 
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis 
                                  dataKey="name" 
                                  tick={{ fontSize: trendData.length > 10 ? 10 : 12 }}
                                  angle={trendData.length > 10 ? -45 : 0}
                                  textAnchor="end"
                                  height={trendData.length > 10 ? 80 : 60}
                                  interval={trendData.length > 15 ? "preserveStartEnd" : 0}
                                  tickMargin={6}
                                  padding={{ left: 6, right: 6 }}
                                />
                                <YAxis tick={{ fontSize: 12 }} tickMargin={6} domain={["dataMin - 2", "dataMax + 4"]} allowDecimals={false} />
                                <Tooltip 
                                  formatter={(value, name) => [String(value), String(name)]}
                                  labelFormatter={(label) => `Período: ${label}`}
                                />
                                <Legend 
                                  verticalAlign="bottom" 
                                  align="center" 
                                  iconSize={8}
                                  wrapperStyle={{ paddingTop: 6, fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.75 }}
                                  formatter={(value) => (
                                    <span style={{ fontSize: 11, color: 'var(--muted-foreground)', opacity: 0.75 }}>{String(value)}</span>
                                  )}
                                />
                                <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Leads Totales" />
                                <Line type="monotone" dataKey="completos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Datos Completos" />
                                <Line type="monotone" dataKey="descartados" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Descartados" />
                              </LineChart>
                            </ResponsiveContainer>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Análisis de Calidad */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Análisis de Calidad</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-4 bg-muted rounded-lg border">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <span className="text-xs text-muted-foreground">Leads Rebotados</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center justify-center rounded-full w-4 h-4 bg-muted hover:bg-muted/80 transition-colors">
                                <Info className="h-3 w-3 text-foreground/60" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="top">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">¿Qué son los Leads Rebotados?</h4>
                                <p className="text-sm text-muted-foreground">
                                  Leads que han entrado en tu flujo pero no han respondido ni interactuado contigo ni una sola vez. No tienen ningún correo ni mensaje de WhatsApp registrado.
                                </p>
                                <div className="pt-2 border-t">
                                  <p className="text-sm font-medium mb-1">Cómo usarlo:</p>
                                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                                    <li>Revisa si el anuncio está atrayendo el público correcto</li>
                                    <li>Considera ajustar el mensaje inicial de contacto</li>
                                    <li>Verifica que los canales de comunicación funcionan correctamente</li>
                                  </ul>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">{qualityMetrics.leadsRebotados}</div>
                      </div>

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
                      Métricas calculadas para el período: {
                        statsPeriod === "hoy" ? "Hoy" :
                        statsPeriod === "esteMes" ? "Este mes" :
                        statsPeriod === "ultimoMes" ? "Último mes" :
                        statsPeriod === "esteAno" ? "Este año" :
                        "Periodo actual"
                      }
                    </p>
                  </div>

                  {/* Consumo y Rendimiento */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Consumo y Rendimiento</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDetenerWhatsApps(selectedAnuncioForStats.id, selectedAnuncioForStats.whatsapp_activo)}
                        disabled={processingId === selectedAnuncioForStats.id}
                        className="h-7 text-xs"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        {processingId === selectedAnuncioForStats.id ? "Procesando..." : selectedAnuncioForStats.whatsapp_activo ? "Detener WhatsApps" : "Activar WhatsApps"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground -mt-2 mb-2">
                       Ciclo actual: {planResetAt ? formatDate(planResetAt) : formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))} - {formatDate(new Date())}
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-4">
                        {/* Leads */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-xs text-muted-foreground">
                              Leads
                            </span>
                            <span className="text-sm font-semibold text-foreground">{consumptionMetrics.leads}</span>
                          </div>
                          <Progress value={consumptionMetrics.planUtilizado} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {consumptionMetrics.planUtilizado.toFixed(1)}% del plan utilizado
                          </div>
                        </div>

                        {/* WhatsApps */}
                        <div className="flex justify-between text-sm items-center pt-2 border-t">
                             <span className="text-xs text-muted-foreground">Whatsapps enviados</span>
                             <span className="text-sm font-semibold text-foreground">{consumptionMetrics.whatsappsEnviados}</span>
                        </div>
                        
                        {/* Coste WhatsApps */}
                        {consumptionMetrics.whatsappsEnviados > 0 && (
                          <div className="flex justify-between text-sm items-center pt-1">
                            <span className="text-xs text-muted-foreground">Coste aprox. WhatsApps</span>
                            <span className="text-sm font-semibold text-green-600">
                              €{(consumptionMetrics.whatsappsEnviados * 0.0327).toFixed(2)}
                            </span>
                          </div>
                        )}

                        {/* Emails */}
                        <div className="flex justify-between text-sm items-center pt-2 border-t">
                             <span className="text-xs text-muted-foreground">Emails enviados</span>
                             <span className="text-sm font-semibold text-foreground">{consumptionMetrics.emailsEnviados}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-xs text-muted-foreground">Tiempo ahorrado</span>
                          <span className="text-sm font-semibold text-foreground">
                            {formatTime(consumptionMetrics.tiempoAhorrado)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">Basado en 1.27 min/mensaje procesado</div>
                      </div>
                    </div>
                  </div>

                  {/* Distribución por Portal */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Información del Portal</h4>
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{selectedAnuncioForStats.portal}</span>
                        <Badge variant="outline">{selectedAnuncioForStats.estado}</Badge>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Última actividad: {selectedAnuncioForStats.ultimaActividad}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => {
                setShowStatsModal(false)
                setIsStatsModalOpen(false)
              }}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={phaseLeadsDialog.open}
          onOpenChange={(open) => setPhaseLeadsDialog({ ...phaseLeadsDialog, open })}
        >
          <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-none h-[92vh] overflow-y-auto z-[200]">
            <DialogHeader>
              <DialogTitle>Leads con estado: {phaseLeadsDialog.status}</DialogTitle>
              <DialogDescription>
                Lista de leads del anuncio {selectedAnuncioForStats?.referencia} con este estado
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-4">
              {phaseLeadsDialog.leads.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No hay leads con este estado</p>
              ) : (
                phaseLeadsDialog.leads.map((lead) => (
                  <Card key={lead.id || lead.IDC}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate text-foreground">{lead.Nombre || "Sin nombre"}</p>
                            <div className="flex items-center gap-2 mt-0.5 mb-1">
                                <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-muted-foreground font-normal">
                                    ID: {lead.id}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{lead.Correo}</p>
                            {lead.Telefono && <p className="text-xs text-muted-foreground">{lead.Telefono}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                              <Badge variant="secondary">
                                {phaseLeadsDialog.status}
                              </Badge>
                              <Button 
                                variant="default" 
                                size="sm" 
                                className="h-6 text-xs bg-black hover:bg-zinc-800 text-white"
                                onClick={() => {
                                    const url = `/dashboard/leads?leadId=${encodeURIComponent(lead.id)}`
                                    router.push(url)
                                }}
                              >
                                Detalle
                              </Button>
                          </div>
                        </div>
                        {lead.Ingresos && (
                          <p className="text-xs text-muted-foreground">Ingresos: {lead.Ingresos}€</p>
                        )}
                        {lead.status_history && lead.status_history.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <HistoryIcon className="h-3 w-3" />
                            <span>
                              {new Date(lead.status_history[lead.status_history.length - 1].timestamp).toLocaleDateString()} • {lead.status_history[lead.status_history.length - 1].agent_name?.split('@')[0] || "Sistema"}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setPhaseLeadsDialog({ open: false, status: "", leads: [] })}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showPlanSelector} onOpenChange={setShowPlanSelector}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Seleccionar Plan</DialogTitle>
              <DialogDescription>Elige el plan que mejor se adapte a tus necesidades</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {availablePlans.map((plan) => (
                <Card
                  key={plan.idp}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    currentPlanId === plan.idp ? "border-primary border-2 bg-primary/5" : ""
                  }`}
                  onClick={() => {}}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold">{plan.Nombre}</h3>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">€{plan.Precio}</div>
                        <div className="text-xs text-muted-foreground">por mes</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{plan.Usuarios} usuarios</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{formatPlanValue(plan.ejecuciones)} leads</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>{formatPlanValue(plan.Anuncios)} anuncios</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Soporte: {plan.Soporte}</span>
                      </div>
                    </div>
                    {currentPlanId === plan.idp && (
                      <Badge variant="secondary" className="mt-3">
                        Plan Actual
                      </Badge>
                    )}
                    <div className="mt-4 flex justify-end gap-2">
                      <ChangePlanButton
                        idi={Number(inmobiliariaId || 0)}
                        planId={Number(plan.idp)}
                        current={currentPlanId === plan.idp}
                        redirectPath="/dashboard/anuncios"
                        onSuccess={(newId) => {
                          setCurrentPlanId(newId)
                          setShowPlanSelector(false)
                          try {
                            const lastKey = `rf_lastPlanId_${String(inmobiliariaId)}`
                            const resetKey = `rf_planResetAt_${String(inmobiliariaId)}`
                            if (typeof window !== "undefined") {
                              window.localStorage.setItem(lastKey, String(newId))
                              window.localStorage.setItem(resetKey, new Date().toISOString())
                            }
                          } catch {}
                          fetchPlanLimit()
                          setPlanResetAt(new Date())
                        }}
                      />
                      <Button onClick={() => startStripeCheckout(Number(plan.idp))}>
                        Pagar con Stripe
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Programar Activación</DialogTitle>
              <DialogDescription>
                Selecciona la fecha y hora en la que quieres que el anuncio se active automáticamente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="scheduled-date" className="text-sm font-medium">
                  Fecha y hora de activación
                </label>
                <input
                  id="scheduled-date"
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-xs text-blue-800">
                  <strong>Nota:</strong> El anuncio se pausará ahora y se activará automáticamente en la fecha
                  seleccionada. Para que esto funcione, necesitas configurar una tarea programada en el servidor.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={() => schedulingAnuncioId && handleScheduleActivation(schedulingAnuncioId)}>
                <Calendar className="h-4 w-4 mr-2" />
                Programar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Archive Dialog */}
        <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Archivar Anuncio</DialogTitle>
              <DialogDescription>
                {archivingAnuncio?.estado === "activo" ? (
                  <div className="space-y-2">
                    <div className="text-red-600 font-medium">⚠️ Este anuncio está activo</div>
                    <div>
                      Debes pausar el anuncio antes de archivarlo. Los anuncios activos no pueden ser archivados.
                    </div>
                  </div>
                ) : (
                  <div>
                    ¿Estás seguro de que deseas archivar el anuncio &quot;{archivingAnuncio?.referencia}&quot;? Podrás encontrarlo
                    en la sección de &quot;Archivados&quot;.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
                Cancelar
              </Button>
              {archivingAnuncio?.estado !== "activo" && (
                <Button onClick={handleArchiveAnuncio} variant="default">
                  <Archive className="h-4 w-4 mr-2" />
                  Archivar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Eliminar Anuncio Permanentemente
              </DialogTitle>
              <DialogDescription>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-md p-3">
                    <div className="text-red-800 font-semibold mb-1">⚠️ ADVERTENCIA: Esta acción es irreversible</div>
                    <div className="text-red-700 text-sm">
                      El anuncio &quot;{deletingAnuncio?.referencia}&quot; será eliminado permanentemente de la base de datos.
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Se perderán todos los datos asociados a este anuncio, incluyendo estadísticas, información detallada
                    y FAQs.
                  </div>
                  <div className="text-sm font-medium">¿Estás seguro de que deseas continuar?</div>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleDeleteAnuncio} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Permanentemente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={visitDateDialog.open} onOpenChange={(open) => setVisitDateDialog({ ...visitDateDialog, open })}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Programar Visita</DialogTitle>
              <DialogDescription>
                Selecciona la fecha y hora de visita para {visitDateDialog.leadName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label htmlFor="visit-date" className="text-sm font-medium">
                  Fecha y hora de visita
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Select
                    value={visitDateDialog.selectedDate}
                    onValueChange={(val) => setVisitDateDialog({ ...visitDateDialog, selectedDate: val })}
                    disabled={!visitDateDialog.selectedAgenteId}
                  >
                    <SelectTrigger className={cn(
                      "w-full justify-start text-left font-normal",
                      !visitDateDialog.selectedDate && "text-muted-foreground"
                    )}>
                      <Calendar className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Seleccionar fecha" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] z-[40000]">
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
                  <Select
                    value={visitDateDialog.selectedTime}
                    onValueChange={(value) => setVisitDateDialog({ ...visitDateDialog, selectedTime: value })}
                    disabled={loadingAvailability || !visitDateDialog.selectedDate || !visitDateDialog.selectedAgenteId}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder={loadingAvailability ? "Cargando..." : "Hora"} />
                    </SelectTrigger>
                    <SelectContent className="z-[40000]">
                      {loadingAvailability ? (
                         <SelectItem value="loading" disabled>Cargando...</SelectItem>
                      ) : availableSlots.length > 0 ? (
                        availableSlots.map((time) => (
                          <SelectItem key={time} value={time}>
                            {time}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="none" disabled>No hay disponibilidad</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="agente-select" className="text-sm font-medium">
                  Asignar agente
                </label>
                <select
                  id="agente-select"
                  value={visitDateDialog.selectedAgenteId}
                  onChange={(e) => setVisitDateDialog({ ...visitDateDialog, selectedAgenteId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Sin asignar</option>
                  {agentes.map((agente) => (
              <option key={agente.idag} value={String(agente.idag)}>
                {agente.Nombre || agente.nombre}
              </option>
            ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVisitDateDialog({ open: false, leadId: "", leadName: "", selectedDate: "", selectedTime: "", selectedAgenteId: "" })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVisitDate} disabled={!visitDateDialog.selectedDate || !visitDateDialog.selectedTime || !visitDateDialog.selectedAgenteId}>
                <Calendar className="h-4 w-4 mr-2" />
                Guardar Fecha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <Dialog open={!!attachmentPreviewUrl} onOpenChange={closeAttachmentPreview}>
          <DialogContent className="w-[95vw] sm:w-[92vw] sm:max-w-none h-[92vh] overflow-y-auto z-[70000]">
            <DialogHeader>
              <DialogTitle>Vista previa del archivo</DialogTitle>
              <DialogDescription>{attachmentPreviewName || ""}</DialogDescription>
            </DialogHeader>
            {attachmentPreviewUrl && (
              <div className="w-full h-[70vh] flex flex-col gap-3">
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.open(attachmentPreviewUrl, "_blank", "noopener,noreferrer")}>Abrir en pestaña</Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={attachmentPreviewUrl} download>Descargar</a>
                  </Button>
                </div>
                {attachmentPreviewKind === "pdf" ? (
                  <object data={attachmentPreviewUrl} type="application/pdf" className="w-full h-full rounded-md border">
                    <div className="text-sm">No se pudo mostrar el PDF. Usa los botones arriba.</div>
                  </object>
                ) : attachmentPreviewKind === "image" ? (
                  <Image
                    src={attachmentPreviewUrl}
                    alt={attachmentPreviewName || "Imagen"}
                    width={1600}
                    height={1200}
                    unoptimized
                    className="w-full h-full object-contain rounded-md border"
                  />
                ) : (
                  <iframe src={attachmentPreviewUrl} className="w-full h-full rounded-md border" />
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={nextcloudDialog.open} onOpenChange={(open) => setNextcloudDialog((prev) => ({ ...prev, open: !!open }))}>
          <DialogContent className="sm:max-w-[900px] max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>{`Archivos subidos a ${nextcloudDialog.referencia || ""}`}</DialogTitle>
              <DialogDescription>{`${nextcloudDialog.inmobiliaria} / ${nextcloudDialog.referencia}`}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <div
                  className={`relative border-2 border-dashed rounded-md p-4 h-28 flex items-center justify-center text-sm ${
                    nextcloudDragActive ? "border-ring bg-muted/40" : "border-input bg-transparent"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setNextcloudDragActive(true) }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setNextcloudDragActive(false) }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); uploadDirectToNextcloud(e.dataTransfer.files); setNextcloudDragActive(false) }}
                >
                  <Input type="file" multiple accept="application/pdf,.pdf" disabled={nextcloudUploading} onChange={(e) => uploadDirectToNextcloud(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <div className="pointer-events-none text-muted-foreground">Arrastra y suelta archivos o haz clic</div>
                </div>
                <div className="text-[12px] text-muted-foreground">Solo se admiten documentos en formato PDF</div>
                {nextcloudUploading && (
                  <div className="text-[12px] text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Subiendo archivos...</div>
                )}
                <div className="flex items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={refreshNextcloudDialog}>Refrescar</Button>
                </div>
              </div>
              {nextcloudDialog.loading ? (
                <div className="flex items-center justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
              ) : nextcloudDialog.error ? (
                <div className="text-sm text-red-600">{nextcloudDialog.error}</div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold">Recientes (24h)</h4>
                    {nextcloudDialog.recent.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Sin archivos recientes</div>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_110px_160px_100px_180px] items-center gap-3 px-3 py-2 bg-muted text-xs font-medium">
                          <div>Nombre</div>
                          <div>Tipo</div>
                          <div className="hidden sm:block">Modificado</div>
                          <div className="hidden sm:block text-right">Tamaño</div>
                          <div className="text-right">Acciones</div>
                        </div>
                        <div className="divide-y">
                          {nextcloudDialog.recent.map((f: any, idx: number) => {
                            const label = f.name || (f.path ? decodeURIComponent(String(f.path).split("/").pop() || "") : "") || "Archivo"
                            const href = f.path ? `/api/nextcloud/file?path=${encodeURIComponent(f.path)}` : "#"
                            const lower = (f.name || f.path || "").toLowerCase()
                            const ct = String(f.contentType || "")
                            const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower) || /image\//.test(ct)
                            const isPdf = /\.pdf$/.test(lower) || /application\/pdf/.test(ct)
                            const isText = /text\//.test(ct)
                            const typeLabel = isPdf ? "PDF" : isImage ? "Imagen" : isText ? "Texto" : "Archivo"
                            const IconEl = isImage ? ImageIcon : FileText
                            const sizeLabel = typeof f.size === "number" ? (f.size >= 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`) : "-"
                            return (
                              <div key={`recent-${idx}-${f.path || f.name}`} className="grid grid-cols-[minmax(0,1fr)_110px_160px_100px_180px] items-center gap-3 px-3 py-2">
                                <div className="truncate">
                                  <a href={href} onClick={(e) => { e.preventDefault(); if (f.path) openAttachmentPreview(href, f.name || label) }} className="underline">
                                    {label}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-[12px]">
                                  <IconEl className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{typeLabel}</span>
                                </div>
                                <div className="hidden sm:block text-[11px] text-muted-foreground truncate">{f.lastModified}</div>
                                <div className="hidden sm:block text-right text-[11px] text-muted-foreground">{sizeLabel}</div>
                                <div className="flex justify-end items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => f.path && openAttachmentPreview(href, f.name || label)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-8 rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground gap-1.5 px-2.5 text-sm">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <Button size="sm" variant="destructive" disabled={nextcloudDeletingPath === f.path} onClick={() => f.path && deleteNextcloudFile(f.path)}>
                                    {nextcloudDeletingPath === f.path ? "Eliminando…" : "Eliminar"}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Todos</h4>
                    {nextcloudDialog.files.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Sin archivos</div>
                    ) : (
                      <div className="rounded-md border overflow-hidden">
                        <div className="grid grid-cols-[minmax(0,1fr)_110px_160px_100px_180px] items-center gap-3 px-3 py-2 bg-muted text-xs font-medium">
                          <div>Nombre</div>
                          <div>Tipo</div>
                          <div className="hidden sm:block">Modificado</div>
                          <div className="hidden sm:block text-right">Tamaño</div>
                          <div className="text-right">Acciones</div>
                        </div>
                        <div className="divide-y">
                          {nextcloudDialog.files.map((f: any, idx: number) => {
                            const label = f.name || (f.path ? decodeURIComponent(String(f.path).split("/").pop() || "") : "") || "Archivo"
                            const href = f.path ? `/api/nextcloud/file?path=${encodeURIComponent(f.path)}` : "#"
                            const lower = (f.name || f.path || "").toLowerCase()
                            const ct = String(f.contentType || "")
                            const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(lower) || /image\//.test(ct)
                            const isPdf = /\.pdf$/.test(lower) || /application\/pdf/.test(ct)
                            const isText = /text\//.test(ct)
                            const typeLabel = isPdf ? "PDF" : isImage ? "Imagen" : isText ? "Texto" : "Archivo"
                            const IconEl = isImage ? ImageIcon : FileText
                            const sizeLabel = typeof f.size === "number" ? (f.size >= 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${f.size} B`) : "-"
                            return (
                              <div key={`all-${idx}-${f.path || f.name}`} className="grid grid-cols-[minmax(0,1fr)_110px_160px_100px_180px] items-center gap-3 px-3 py-2">
                                <div className="truncate">
                                  <a href={href} onClick={(e) => { e.preventDefault(); if (f.path) openAttachmentPreview(href, f.name || label) }} className="underline">
                                    {label}
                                  </a>
                                </div>
                                <div className="flex items-center gap-2 text-[12px]">
                                  <IconEl className="h-4 w-4 text-muted-foreground" />
                                  <span className="truncate">{typeLabel}</span>
                                </div>
                                <div className="hidden sm:block text-[11px] text-muted-foreground truncate">{f.lastModified}</div>
                                <div className="hidden sm:block text-right text-[11px] text-muted-foreground">{sizeLabel}</div>
                                <div className="flex justify-end items-center gap-2">
                                  <Button size="sm" variant="outline" onClick={() => f.path && openAttachmentPreview(href, f.name || label)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center h-8 rounded-md border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground gap-1.5 px-2.5 text-sm">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                  <Button size="sm" variant="destructive" disabled={nextcloudDeletingPath === f.path} onClick={() => f.path && deleteNextcloudFile(f.path)}>
                                    {nextcloudDeletingPath === f.path ? "Eliminando…" : "Eliminar"}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        

        
      </div>
    </TooltipProvider>
  )
}
