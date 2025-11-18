"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation'
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
import { TooltipProvider } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/hooks/use-toast"
import { Target, CheckCircle, Settings, Loader2, MoreVertical, Calendar, Plus, Eye, Edit, ShoppingCart, BarChart3, X, Archive, UserCheck, Lock, LockOpen, AlertCircle, Trash2, Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover" // Added Popover imports
import { getPlanData, formatPlanValue } from "@/lib/plan-data"
import { createBrowserClient } from "@/lib/supabase/client" // Added for createBrowserClient
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts" // Added recharts imports

interface AnuncioCard {
  id: string
  referencia: string // From Anuncios.Referencia
  direccion: string // From Anuncios.Direccion
  precio: number // From Anuncios.Precio
  portal: string // From Anuncios.Portal
  descripcion: string // From Anuncios.Descripcion
  activacion: string // From Anuncios.Activacion
  fotoUrl: string // From Anuncios.Foto_Url
  // Calculated metrics
  nuevosHoy: number // Count from Clientes where created_at is last 24h
  emailsEnviados: number // Count from Correos table
  datosCompletos: number // Count from Clientes where Estado = "Datos completos"
  leadsTotales: number // Total count from Clientes
  aLaEspera: number // Count from Clientes where Estado != "Datos completos"
  tiempoAhorrado: number // Calculated based on emails sent
  ultimaActividad: string
  fechaUltimaActividad: Date | null
  estado: "activo" | "pausado" | "error" | "archivado" // Added "archivado"
  // Health score components
  healthScore: number
  porcentajeCompletos: number
  // Sparkline data (7 days)
  sparklineData: number[]
  // Consumption metrics
  ejecuciones: number
  consumoMes: number
  // Stats modal specific fields - might not be in DB schema directly
  rebotesAltos?: boolean
  incompletosAlto?: boolean
  necesidadAval?: boolean
  Fecha_Activacion_Programada?: string | null // Added for scheduled activation
  fechaCreacion?: string // Added for activation date in stats
  // Phase metrics from database
  phaseMetrics?: {
    aceptados: number
    visitaPropuesta: number
    visitaCompletada: number
  }
  // Added descartados field
  descartados?: number
}

interface CreationStep {
  step: number
  data: {
    referencia: string
    direccion: string
    portal: string
    descripcion: string
    precio: string
    activacion: string
  }
}

interface EditFormData {
  referencia: string
  direccion: string
  descripcion: string
  precio: string
  portal: string
  activacion: string
}

export default function AnunciosPage() {
  const [user, setUser] = useState<any>(null)
  const [anunciosCards, setAnunciosCards] = useState<AnuncioCard[]>([])
  const [anunciosError, setAnunciosError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [editingAnuncio, setEditingAnuncio] = useState<AnuncioCard | null>(null)
  const [editFormData, setEditFormData] = useState<EditFormData>({
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
  const [availablePlans, setAvailablePlans] = useState<any[]>([])
  const [showPlanSelector, setShowPlanSelector] = useState(false)
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null)
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
  const [selectedAnuncioForStats, setSelectedAnuncioForStats] = useState<AnuncioCard | null>(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archivingAnuncio, setArchivingAnuncio] = useState<AnuncioCard | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deletingAnuncio, setDeletingAnuncio] = useState<AnuncioCard | null>(null)
  const [expandedLeadsAnuncio, setExpandedLeadsAnuncio] = useState<string | null>(null)
  const [completosLeads, setCompletosLeads] = useState<any[]>([])
  const [loadingCompletos, setLoadingCompletos] = useState(false)
  const [infoFaqsData, setInfoFaqsData] = useState({
    informacionDetallada: "",
    faqs: [{ pregunta: "", respuesta: "" }],
  })

  const [isReferenciaEditable, setIsReferenciaEditable] = useState(false)

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
  const [visitDateDialog, setVisitDateDialog] = useState<{
    open: boolean
    leadId: string
    leadName: string
    selectedDate: string
    selectedAgenteId: string
  }>({
    open: false,
    leadId: "",
    leadName: "",
    selectedDate: "",
    selectedAgenteId: "",
  })
  // </CHANGE>

  // Add isStatsModalOpen state to track the visibility of the stats modal
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false)

  const { inmobiliariaId, loading: inmobiliariaLoading } = useInmobiliaria()
  
  // Debug: log inmobiliaria context values
  console.log("[DEBUG] Inmobiliaria context - inmobiliariaId:", inmobiliariaId, "inmobiliariaLoading:", inmobiliariaLoading)

  const router = useRouter()
  const supabase = createClient()

  // Variables needed for linting fixes
  const [creatingAnuncio, setCreatingAnuncio] = useState(false)

  const [agentes, setAgentes] = useState<any[]>([]);

  const fetchAgentes = async (inmobiliariaId: number) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      // Filtramos agentes por la inmobiliaria (idi se almacena como string)
      const { data, error } = await supabase
        .from("Agentes")
        .select("idag, \"Nombre\", idi")
        .eq("idi", inmobiliariaId.toString()); // Convertir a string para coincidir con la BD
      
      if (error) {
        console.error("[v0] Error fetching agentes:", error.message);
        throw error;
      }
      
      setAgentes(data || []);
      
    } catch (error) {
      console.error("[v0] Failed to fetch agentes:", error);
      setAgentes([]);
    }
  };



  useEffect(() => {
    console.log("[DEBUG] useEffect triggered - inmobiliariaLoading:", inmobiliariaLoading, "inmobiliariaId:", inmobiliariaId);
    if (!inmobiliariaLoading && inmobiliariaId !== null) {
      console.log("[DEBUG] Calling all fetch functions with inmobiliariaId:", inmobiliariaId);
      checkUser()
      fetchAnuncios()
      fetchPlanLimit()
      fetchAvailablePlans()
      fetchAgentes(inmobiliariaId);
    } else {
      console.log("[DEBUG] Skipping fetch calls - inmobiliariaLoading:", inmobiliariaLoading, "inmobiliariaId:", inmobiliariaId);
    }
  }, [inmobiliariaId, inmobiliariaLoading])

  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal) {
      // Fetch trend data when modal is open
      setLoadingTrendData(true)
      calculateTrendData(selectedAnuncioForStats, trendTimeframe).then((data) => {
        setTrendData(data)
        setLoadingTrendData(false)
      })
    }
  }, [selectedAnuncioForStats, trendTimeframe, showStatsModal]) // Added showStatsModal to dependencies

  useEffect(() => {
    if (selectedAnuncioForStats && showStatsModal) {
      fetchQualityMetrics(selectedAnuncioForStats.referencia, trendTimeframe).then((metrics) => {
        console.log("[v0] Quality metrics fetched:", metrics)
        setQualityMetrics(metrics)
      })
    }
  }, [selectedAnuncioForStats, trendTimeframe, showStatsModal])

  const fetchQualityMetrics = async (anuncioReferencia: string, timeframe: "24h" | "7d" | "1m") => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Calculate date range based on timeframe
    const now = new Date()
    let startDate: Date

    if (timeframe === "24h") {
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    } else if (timeframe === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    console.log("[v0] Fetching quality metrics for referencia:", anuncioReferencia, "timeframe:", timeframe)

    // Get all leads for this anuncio in the timeframe
    const { data: leads, error: leadsError } = await supabase
      .from("Clientes")
      .select('IDC, Estado, "Pedir Aval", created_at')
      .ilike("Inmueble", anuncioReferencia)
      .gte("created_at", startDate.toISOString())

    console.log("[v0] Leads found for quality metrics:", leads?.length || 0, "Error:", leadsError)

    if (leadsError) {
      console.error("[v0] Error fetching leads for quality metrics:", leadsError)
      return { leadsRebotados: 0, datosIncompletos: 0, necesidadAval: 0 }
    }

    // Count "Datos Incompletos" status
    const datosIncompletos =
      leads?.filter((lead) => {
        const estado = lead.Estado?.toLowerCase() || ""
        return estado === "datos completos"
      }).length || 0
    console.log("[v0] Datos Incompletos count:", datosIncompletos)

    const necesidadAval = leads?.filter((l) => l.Estado === "Pedir Aval").length || 0
    console.log("[v0] Necesidad Aval count:", necesidadAval)
    // </CHANGE>

    // Calculate "Leads Rebotados" - leads with no communications (emails or whatsapp)
    let leadsRebotados = 0
    if (leads && leads.length > 0) {
      for (const lead of leads) {
        // Check if this lead has any emails
        const { data: emails } = await supabase.from("Correos").select("id").eq("IDC", lead.IDC).limit(1)

        // Check if this lead has any whatsapp messages
        const { data: whatsapp } = await supabase.from("Whatsapp").select("id").eq("IDC", lead.IDC).limit(1)

        // If no communications at all, count as rebotado
        if ((!emails || emails.length === 0) && (!whatsapp || whatsapp.length === 0)) {
          leadsRebotados++
        }
      }
    }
    console.log("[v0] Leads Rebotados count:", leadsRebotados)

    return { leadsRebotados, datosIncompletos, necesidadAval }
  }

  const fetchLeadsByPhase = async (
    anuncioRef: string,
    phase: "aceptado" | "visita_propuesta" | "visita_completada",
  ) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data, error } = await supabase
      .from("Clientes")
      .select("*, Agentes(Nombre)")
      .ilike("Inmueble", anuncioRef) // Use Inmueble field that contains anuncio.referencia
      .eq(phase, true) // Query the boolean field
      .order("created_at", { ascending: false })

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
      .select("*")
      .eq("idi", anuncioId) // Assuming 'idi' is the foreign key to Anuncios
      .eq("Estado", "Datos Completos")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching leads by status:", error)
      return []
    }
    return data || []
  }

  const handlePhaseMetricClick = async (phase: "aceptado" | "visita_propuesta" | "visita_completada") => {
    if (!selectedAnuncioForStats) return

    const leads = await fetchLeadsByPhase(selectedAnuncioForStats.referencia, phase)

    const statusLabels = {
      aceptado: "Candidatos Aprobados",
      visita_propuesta: "Visita Propuesta",
      visita_completada: "Visita Completada",
    }

    setPhaseLeadsDialog({
      open: true,
      status: statusLabels[phase],
      leads,
    })
  }

  const calculateTrendData = async (anuncio: any, timeframe: "24h" | "7d" | "1m") => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const now = new Date()

    if (timeframe === "24h") {
      // Last 24 hours - hourly buckets
      const hourlyData: { hour: string; count: number; isCurrent: boolean }[] = []

      for (let i = 23; i >= 0; i--) {
        const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

        const { data, error } = await supabase
          .from("Clientes")
          .select("IDC")
          .ilike("Inmueble", anuncio.referencia)
          .gte("created_at", hourStart.toISOString())
          .lt("created_at", hourEnd.toISOString())

        const hourLabel = hourStart.getHours().toString().padStart(2, "0") + ":00"
        const isCurrent = i === 0 // Last hour is current

        hourlyData.push({
          hour: hourLabel,
          count: data?.length || 0,
          isCurrent,
        })
      }

      return hourlyData
    } else if (timeframe === "7d") {
      // Last 7 days - daily buckets
      const dailyData: { day: string; count: number }[] = []

      for (let i = 6; i >= 0; i--) {
        const dayStart = new Date(now)
        dayStart.setDate(dayStart.getDate() - i)
        dayStart.setHours(0, 0, 0, 0)

        const dayEnd = new Date(dayStart)
        dayEnd.setHours(23, 59, 59, 999)

        const { data, error } = await supabase
          .from("Clientes")
          .select("IDC")
          .ilike("Inmueble", anuncio.referencia)
          .gte("created_at", dayStart.toISOString())
          .lte("created_at", dayEnd.toISOString())

        const dayLabel = dayStart.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })

        dailyData.push({
          day: dayLabel,
          count: data?.length || 0,
        })
      }

      return dailyData
    } else {
      // Last 4 weeks - weekly buckets with month identification
      const weeklyData: { week: string; count: number }[] = []

      for (let i = 3; i >= 0; i--) {
        const weekEnd = new Date(now)
        weekEnd.setDate(weekEnd.getDate() - i * 7)
        weekEnd.setHours(23, 59, 59, 999)

        const weekStart = new Date(weekEnd)
        weekStart.setDate(weekStart.getDate() - 6)
        weekStart.setHours(0, 0, 0, 0)

        const { data, error } = await supabase
          .from("Clientes")
          .select("IDC")
          .ilike("Inmueble", anuncio.referencia)
          .gte("created_at", weekStart.toISOString())
          .lte("created_at", weekEnd.toISOString())

        // Determine week number in the month
        const monthName = weekStart.toLocaleDateString("es-ES", { month: "short" })
        const weekInMonth = Math.ceil(weekStart.getDate() / 7)
        const weekLabel = `${weekInMonth}ª ${monthName}`

        weeklyData.push({
          week: weekLabel,
          count: data?.length || 0,
        })
      }

      return weeklyData
    }
  }

  const handleOpenArchiveDialog = (anuncio: AnuncioCard) => {
    setArchivingAnuncio(anuncio)
    setShowArchiveDialog(true)
  }

  const handleArchiveAnuncio = async () => {
    if (!archivingAnuncio) return

    try {
      const { error } = await supabase
        .from("Anuncios")
        .update({ Activacion: "Archivado" })
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
        await fetchAnuncios() // Refresh the list
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
        await fetchAnuncios() // Refresh the list
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

  const fetchAvailablePlans = async () => {
    try {
      console.log("[v0] Fetching all available plans from Planes table...")

      const { data: planesData, error: planesError } = await supabase
        .from("Planes")
        .select("*")
        .order("idp", { ascending: true })

      if (planesError) {
        console.log("[v0] Error fetching plans:", planesError)
        return
      }

      if (planesData && planesData.length > 0) {
        console.log("[v0] Available plans loaded:", planesData)
        setAvailablePlans(planesData)
      }
    } catch (err) {
      console.log("[v0] Error in fetchAvailablePlans:", err)
    }
  }

  const fetchPlanLimit = async () => {
    try {
      console.log("[v0] Fetching plan limit from Planes table...")

      if (!inmobiliariaId) {
        console.log("[v0] No inmobiliaria ID available, using default limit: 1000")
        setPlanLimit(1000)
        return
      }

      const { data: inmobiliariaData, error: inmobiliariaError } = await supabase
        .from("Inmobiliarias")
        .select("Plan")
        .eq("idi", inmobiliariaId)
        .single()

      console.log("[v0] Inmobiliaria data:", inmobiliariaData)
      console.log("[v0] Inmobiliaria error:", inmobiliariaError)

      if (inmobiliariaError || !inmobiliariaData?.Plan) {
        console.log("[v0] Error fetching inmobiliaria plan:", inmobiliariaError)
        console.log("[v0] Using default limit: 1000")
        setPlanLimit(1000)
        return
      }

      const planId = inmobiliariaData.Plan
      setCurrentPlanId(planId)
      console.log(`[v0] Inmobiliaria plan ID: ${planId} (type: ${typeof planId})`)

      const { data: planesData, error: planesError } = await supabase.from("Planes").select("*")

      if (planesError || !planesData || planesData.length === 0) {
        console.log("[v0] Could not load plans from database, using fallback data for plan ID:", planId)
        const fallbackPlan = getPlanData(planId)

        if (fallbackPlan) {
          console.log(
            `[v0] Plan limit loaded from fallback: ${fallbackPlan.ejecuciones} ejecuciones (${fallbackPlan.Nombre} plan)`,
          )
          setPlanLimit(fallbackPlan.ejecuciones)
        } else {
          console.log("[v0] No fallback plan found for ID:", planId, "using default: 1000")
          setPlanLimit(1000)
        }
        return
      }

      const matchingPlan = planesData.find((p: any) => p.idp === planId || p.id === planId)

      if (matchingPlan) {
        console.log(
          `[v0] ✅ Plan limit loaded from database: ${matchingPlan.ejecuciones} ejecuciones (${matchingPlan.Nombre} plan)`,
        )
        setPlanLimit(matchingPlan.ejecuciones)
      } else {
        console.log("[v0] No matching plan found in database, using fallback")
        const fallbackPlan = getPlanData(planId)

        if (fallbackPlan) {
          setPlanLimit(fallbackPlan.ejecuciones)
        } else {
          setPlanLimit(1000)
        }
      }
    } catch (err) {
      console.log("[v0] Error fetching plan limit:", err)
      setPlanLimit(1000)
    }
  }

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      router.push("/login")
      return
    }
    setUser(user)
  }

  const fetchAnuncios = async () => {
    try {
      console.log("[v0] Fetching anuncios from database with proper schema mapping...")
      setLoading(true)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      let isAdmin = false
      if (user?.email) {
        const { data: perfil } = await supabase.from("Perfiles").select("is_admin").eq("usuario", user.email).single()

        isAdmin = perfil?.is_admin === true
        console.log("[v0] User is admin:", isAdmin)
      }

      if (!inmobiliariaId) {
        console.log("[v0] No inmobiliariaId available, cannot fetch anuncios")
        setAnunciosCards([])
        setTotalAnuncios(0)
        setLoading(false)
        return
      }

      console.log("[v0] Filtering anuncios by agency IDI (inmobiliariaId):", inmobiliariaId)

      const query = supabase
        .from("Anuncios")
        .select("ida, Referencia, Direccion, Precio, Portal, Descripcion, Activacion, Foto_Url, created_at, Fecha_Activacion_Programada") // Added Fecha_Activacion_Programada
        .eq("usuario", inmobiliariaId) // Always filter by the logged-in agency's IDI
        .order("created_at", { ascending: false })

      // All users can now see their own archived anuncios
      // The client-side filtering (filterEstado) handles showing/hiding them

      const { data: anuncios, error: anunciosErr } = await query

      if (anunciosErr) {
        console.log("[v0] Error fetching anuncios:", anunciosErr)
        setAnunciosError("Error al cargar anuncios")
        return
      }

      console.log("[v0] Anuncios fetched for agency IDI", inmobiliariaId, ":", anuncios?.length || 0)

      if (!anuncios || anuncios.length === 0) {
        setAnunciosCards([])
        setTotalAnuncios(0)
        setTotalLeads(0)
        setTotalCompletos(0)
        setTotalEjecuciones(0)
        return
      }

      setTotalAnuncios(anuncios.length)

      const cards: AnuncioCard[] = []
      let totalLeadsSum = 0
      let totalCompletosSum = 0
      let totalEjecucionesSum = 0

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      for (const anuncio of anuncios) {
        const referencia = anuncio.Referencia || `REF-${anuncio.ida}`
        console.log(`[v0] Processing anuncio: ${referencia}`)

        const { data: allLeads, error: leadsError } = await supabase
          .from("Clientes")
          .select(
            "IDC, Estado, created_at, Correo, Nombre, Telefono, Ingresos, aceptado, visita_propuesta, visita_completada, fecha_de_visita",
          ) // Added fields for lead details and fecha_de_visita
          .ilike("Inmueble", referencia)

        if (leadsError) {
          console.log(`[v0] Error fetching leads for ${referencia}:`, leadsError)
        }

        const leadsTotales = allLeads?.length || 0
        console.log(`[v0] Total leads for ${referencia}: ${leadsTotales}`)

        const nuevosHoy =
          allLeads?.filter((lead) => {
            const createdAt = new Date(lead.created_at)
            return createdAt >= twentyFourHoursAgo
          }).length || 0

        const datosCompletosCount =
          allLeads?.filter((lead) => {
            const estado = lead.Estado?.toLowerCase() || ""
            return estado === "datos completos"
          }).length || 0

        console.log("[v0] Datos Completos for anuncio", anuncio.ida, ":", datosCompletosCount)

        const aLaEspera = leadsTotales - datosCompletosCount

        // We'll match by email addresses from the leads
        const leadEmails = allLeads?.map((lead) => lead.Correo).filter(Boolean) || []
        let emailsEnviados = 0

        if (leadEmails.length > 0) {
          const { data: correos, error: correosError } = await supabase
            .from("Correos")
            .select("id")
            .in("to", leadEmails)

          if (!correosError && correos) {
            emailsEnviados = correos.length
          }
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
        const tiempoAhorrado = (emailsEnviados * 2.27) / 60 // 2.27 minutes per email, converted to hours

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
        if (nuevosHoy === 0 && leadsTotales > 0) healthScore -= 15 // No new leads today
        if (leadsTotales === 0) healthScore -= 40 // No leads at all

        const ejecuciones = leadsTotales + emailsEnviados

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
          referencia,
          direccion: anuncio.Direccion || "",
          precio: anuncio.Precio || 0,
          portal: anuncio.Portal || "Sin especificar",
          descripcion: anuncio.Descripcion || "",
          activacion: anuncio.Activacion || "Inactivo",
          fotoUrl: anuncio.Foto_Url || "",
          nuevosHoy,
          emailsEnviados,
          datosCompletos: datosCompletosCount,
          leadsTotales,
          aLaEspera,
          tiempoAhorrado,
          ultimaActividad,
          fechaUltimaActividad: ultimaActividadFecha,
          estado,
          healthScore: Math.max(0, healthScore),
          porcentajeCompletos,
          sparklineData,
          ejecuciones,
          consumoMes: ejecuciones,
          fechaCreacion: fechaCreacion, // Add fechaCreacion
          descartados, // Added descartados
          Fecha_Activacion_Programada: anuncio.Fecha_Activacion_Programada || null, // Pass scheduled date
          phaseMetrics: {
            aceptados: allLeads?.filter((lead) => lead.aceptado === true).length || 0,
            visitaPropuesta: allLeads?.filter((lead) => lead.visita_propuesta === true).length || 0,
            visitaCompletada: allLeads?.filter((lead) => lead.visita_completada === true).length || 0,
          },
        })

        totalLeadsSum += leadsTotales
        totalCompletosSum += datosCompletosCount
        totalEjecucionesSum += ejecuciones
      }

      // Sort by last activity, keeping archived ads at the bottom
      cards.sort((a, b) => {
        if (a.estado === "archivado" && b.estado !== "archivado") return 1
        if (a.estado !== "archivado" && b.estado === "archivado") return -1
        if (!a.fechaUltimaActividad && !b.fechaUltimaActividad) return 0
        if (!a.fechaUltimaActividad) return 1
        if (!b.fechaUltimaActividad) return -1
        return b.fechaUltimaActividad.getTime() - a.fechaUltimaActividad.getTime()
      })

      setAnunciosCards(cards)
      setTotalLeads(totalLeadsSum)
      setTotalCompletos(totalCompletosSum)
      setTotalEjecuciones(totalEjecucionesSum)
      console.log("[v0] Anuncios processing complete. Total cards:", cards.length)
    } catch (err) {
      setAnunciosError("Error al conectar con la base de datos")
      console.log("[v0] Anuncios fetch error:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleEstado = async (anuncioId: string, currentActivacion: string) => {
    setProcessingId(anuncioId)
    try {
      const newActivacion = currentActivacion === "Activo" ? "Pausado" : "Activo"

      const { error } = await supabase.from("Anuncios").update({ Activacion: newActivacion }).eq("ida", anuncioId)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado del anuncio",
          variant: "destructive",
        })
      } else {
        setAnunciosCards((prev) =>
          prev.map((anuncio) =>
            anuncio.id === anuncioId
              ? { ...anuncio, activacion: newActivacion, estado: newActivacion === "Activo" ? "activo" : "pausado" }
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
      const { error } = await supabase.from("Clientes").update({ Estado: "Programar visita" }).eq("IDC", leadId)

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
        await fetchAnuncios()
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

      const { error } = await supabase.from("Anuncios").update({ Activacion: newActivacion }).eq("ida", anuncioId)

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
        await fetchAnuncios()
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
        referencia: anuncioData.Referencia || "",
        direccion: anuncioData.Direccion || "",
        descripcion: anuncioData.Descripcion || "",
        precio: (anuncioData.Precio || 0).toString(),
        portal: anuncioData.Portal || "",
        activacion: anuncioData.Activacion || "Inactivo",
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
      // Actualizar todos los campos en la base de datos
      const updateData = {
        Referencia: editFormData.referencia,
        Direccion: editFormData.direccion,
        Descripcion: editFormData.descripcion,
        Precio: Number.parseFloat(editFormData.precio) || 0,
        Portal: editFormData.portal,
        Activacion: editFormData.activacion,
      }

      const { error } = await supabase.from("Anuncios").update(updateData).eq("ida", editingAnuncio.id)

      if (error) {
        console.log("[v0] Error saving changes:", error)
        toast({
          title: "Error",
          description: "No se pudieron guardar los cambios",
          variant: "destructive",
        })
      } else {
        console.log("[v0] Changes saved successfully")
        toast({
          title: "Éxito",
          description: "Anuncio actualizado correctamente",
        })
        setEditingAnuncio(null)
        // Refrescar datos para mostrar los cambios inmediatamente
        await fetchAnuncios()
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

  // New handler for Info & FAQs modal
  const handleInfoFaqs = async (anuncio: AnuncioCard) => {
    console.log(`[v0] Opening Info & FAQs for anuncio ${anuncio.id}`)

    // Cargar información existente si la hay
    try {
      const { data: anuncioData, error } = await supabase.from("Anuncios").select("*").eq("ida", anuncio.id).single()

      if (!error && anuncioData) {
        setInfoFaqsData({
          informacionDetallada: anuncioData.informacion_detallada || anuncioData.Descripcion || "",
          faqs: anuncioData.faqs ? JSON.parse(anuncioData.faqs) : [{ pregunta: "", respuesta: "" }],
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
        faqs: JSON.stringify(infoFaqsData.faqs.filter((faq) => faq.pregunta.trim() !== "")),
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
    console.log(`[v0] Loading statistics for anuncio ${anuncio.id}`)

    try {
      // Fetch real metrics from database
      const { data: allLeads, error: leadsError } = await supabase
        .from("Clientes")
        .select("Estado,aceptado,visita_propuesta,visita_completada,IDC,Nombre,Correo,Telefono") // Select boolean fields and identifying fields
        .ilike("Inmueble", anuncio.referencia)

      if (leadsError) {
        console.error("[v0] Error fetching leads for stats:", leadsError)
      }

      // Calculate real metrics
      const datosCompletosCount =
        allLeads?.filter((lead) => {
          const estado = lead.Estado?.toLowerCase() || ""
          return estado === "datos completos"
        }).length || 0

      const aceptados = allLeads?.filter((lead) => lead.aceptado === true).length || 0
      const visitaPropuesta = allLeads?.filter((lead) => lead.visita_propuesta === true).length || 0
      const visitaCompletada = allLeads?.filter((lead) => lead.visita_completada === true).length || 0
      const descartados = allLeads?.filter((lead) => lead.Estado === "Descartado").length || 0

      console.log(
        "[v0] Stats fetched - Datos Completos:",
        datosCompletosCount,
        "Aceptados:",
        aceptados,
        "Visita Propuesta:",
        visitaPropuesta,
        "Visita Completada:",
        visitaCompletada,
        "Descartados:",
        descartados,
      )

      // Populate stats with real data
      const statsWithRealData = {
        ...anuncio,
        datosCompletos: datosCompletosCount,
        descartados,
        phaseMetrics: {
          aceptados,
          visitaPropuesta,
          visitaCompletada,
        },
        // These are placeholders, actual calculation might be needed or removed
        rebotesAltos: Math.random() > 0.5,
        incompletosAlto: Math.random() > 0.7,
        necesidadAval: Math.random() > 0.3,
      }

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
        Descripcion: creationStep.data.descripcion,
        Precio: Number.parseFloat(creationStep.data.precio) || 0,
        Activacion: creationStep.data.activacion,
        usuario: inmobiliariaId, // Assigns the logged-in agency's IDI to this anuncio
        Foto_Url: "", // Empty for now
        // Fecha_Activacion_Programada: null, // Ensure it's null for new announcements
      }

      console.log("[v0] New anuncio object with agency IDI:", newAnuncio)

      const { data, error } = await supabase.from("Anuncios").insert([newAnuncio]).select()

      if (error) {
        console.log("[v0] Error creating anuncio:", error)
        toast({
          title: "Error",
          description: `No se pudo crear el anuncio: ${error.message}`,
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
          referencia: "",
          direccion: "",
          portal: "",
          descripcion: "",
          precio: "",
          activacion: "Pausado",
        },
      })

      // Refresh anuncios list
      await fetchAnuncios()
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

  const filteredAnuncios = anunciosCards.filter((anuncio) => {
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

  const uniquePortals = [...new Set(anunciosCards.map((a) => a.portal))]

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

  const formatTime = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}h`
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

  // Calculate daily consumption rate (assuming we're partway through the month)
  const today = new Date()
  const dayOfMonth = today.getDate()
  const dailyRate = dayOfMonth > 0 ? totalEjecuciones / dayOfMonth : 0
  const daysUntilLimit = dailyRate > 0 ? Math.floor(remainingExecutions / dailyRate) : 999

  // Determine alert level and messaging
  const getAlertConfig = () => {
    if (percentageUsed >= 100) {
      return {
        level: "critical",
        color: "bg-red-600",
        textColor: "text-red-600",
        borderColor: "border-red-600",
        icon: "🚨",
        title: "Límite Alcanzado",
        message: "Has consumido el 100% de tu plan. Actualiza ahora para continuar.",
        showUpgrade: true,
        cardHighlight: true,
      }
    }
    if (percentageUsed >= 90) {
      return {
        level: "danger",
        color: "bg-red-500",
        textColor: "text-red-600",
        borderColor: "border-red-500",
        icon: "⚠️",
        title: `Solo queda ${percentageRemaining.toFixed(0)}% del plan`,
        message: `Quedan ${remainingExecutions} ejecuciones. A este ritmo, alcanzarás el límite en ${daysUntilLimit} días.`,
        showUpgrade: true,
        cardHighlight: true,
      }
    }
    if (percentageUsed >= 75) {
      return {
        level: "warning",
        color: "bg-orange-500",
        textColor: "text-orange-600",
        borderColor: "border-orange-500",
        icon: "⚠️",
        title: `Queda ${percentageRemaining.toFixed(0)}% del plan`,
        message: `Consumo diario promedio: ${Math.round(dailyRate)} ejecuciones/día. Estimado ${daysUntilLimit} días restantes.`,
        showUpgrade: true,
        cardHighlight: false,
      }
    }
    if (percentageUsed >= 50) {
      return {
        level: "caution",
        color: "bg-yellow-500",
        textColor: "text-yellow-700",
        borderColor: "border-yellow-500",
        icon: "📊",
        title: `Queda ${percentageRemaining.toFixed(0)}% del plan`,
        message: `Has usado la mitad de tu plan. Ritmo actual: ${Math.round(dailyRate)} ejecuciones/día.`,
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
      title: `Queda ${percentageRemaining.toFixed(0)}% del plan`,
      message: `Consumo saludable. Promedio: ${Math.round(dailyRate)} ejecuciones/día.`,
      showUpgrade: false,
      cardHighlight: false,
    }
  }

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

      const { error } = await supabase.from("Inmobiliarias").update({ Plan: newPlanId }).eq("idi", inmobiliariaId)

      if (error) {
        console.log("[v0] Error updating plan:", error)
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
    setVisitDateDialog({
      open: true,
      leadId: leadId,
      leadName: leadName,
      selectedDate: "",
      selectedAgenteId: "",
    })
  }

  const handleSaveVisitDate = async () => {
    if (!visitDateDialog.selectedDate || !visitDateDialog.leadId) {
      toast({
        title: "Error",
        description: "Por favor selecciona una fecha y hora",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({
              fecha_de_visita: new Date(visitDateDialog.selectedDate).toISOString(),
              idag: visitDateDialog.selectedAgenteId || null,
            })
        .eq("IDC", visitDateDialog.leadId)

      if (error) {
        console.error("[v0] Error saving visit date:", error)
        toast({
          title: "Error",
          description: "No se pudo guardar la fecha de visita",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Éxito",
          description: `Visita programada para ${new Date(visitDateDialog.selectedDate).toLocaleString("es-ES")}`,
        })

        // Close dialog and refresh leads list
        setVisitDateDialog({ open: false, leadId: "", leadName: "", selectedDate: "", selectedAgenteId: "" })

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
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pb-4 border-b">
          <div className="space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-foreground">Centro de Anuncios</h1>
                <p className="text-xs text-muted-foreground">Control operativo y económico por anuncio</p>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-2 py-0">
                  {anunciosCards.filter((a) => a.estado === "activo").length} Activos
                </Badge>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-2 py-0">
                  {totalCompletos} Completos
                </Badge>
              </div>
            </div>

            <Card
              className={`border rounded-lg p-2 transition-all duration-300 ${
                alertConfig?.cardHighlight
                  ? `border-red-500/50 shadow-lg shadow-red-500/20 bg-gradient-to-br from-white via-red-50/30 to-red-100/40 ring-2 ring-red-500/20`
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
                    {alertConfig?.showUpgrade && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className={`h-7 text-xs ${
                              percentageUsed >= 100
                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg"
                                : "border border-muted-foreground/30 bg-transparent hover:bg-muted/50 text-foreground"
                            }`}
                          >
                            <ShoppingCart className="h-3 w-3 mr-1" />
                            Cambiar Plan
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-80">
                          <div className="px-2 py-1.5 text-sm font-semibold">Planes Disponibles</div>
                          {availablePlans.map((plan) => (
                            <DropdownMenuItem
                              key={plan.idp}
                              onClick={() => handleChangePlan(plan.idp)}
                              className={`flex flex-col items-start gap-1 p-3 ${
                                currentPlanId === plan.idp ? "bg-primary/10" : ""
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-semibold">{plan.Nombre}</span>
                                <span className="text-sm font-bold">€{plan.Precio}/mes</span>
                              </div>
                              <div className="text-xs text-muted-foreground space-y-0.5">
                                <div>
                                  {plan.Usuarios} usuarios • {formatPlanValue(plan.ejecuciones)} ejecuciones
                                </div>
                                <div>
                                  {formatPlanValue(plan.Anuncios)} anuncios • Soporte: {plan.Soporte}
                                </div>
                              </div>
                              {currentPlanId === plan.idp && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  Plan Actual
                                </Badge>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
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
                          +50 ejecuciones - €29
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <ShoppingCart className="h-3 w-3 mr-2" />
                          +100 ejecuciones - €49
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

                {/* Progress bar and details */}
                {planLimit < 1000000 ? (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        {totalEjecuciones.toLocaleString()} / {formatPlanValue(planLimit)} ejecuciones
                      </span>
                      <span className="font-semibold">{percentageUsed.toFixed(1)}% usado</span>
                    </div>
                    <Progress value={percentageUsed} className={`h-2 ${alertConfig?.color || "bg-blue-500"}`} />

                    {/* Alert message */}
                    {alertConfig && (
                      <div
                        className={`flex items-start gap-2 p-2 rounded-lg border ${alertConfig.borderColor} ${alertConfig.level === "critical" || alertConfig.level === "danger" ? "bg-red-50" : alertConfig.level === "warning" ? "bg-orange-50" : alertConfig.level === "caution" ? "bg-yellow-50" : "bg-green-50"}`}
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
                      Ejecuciones utilizadas este mes: {totalEjecuciones.toLocaleString()}
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

              <button
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer group"
                onClick={() => {
                  // Toggle between showing only archived ads and showing all ads
                  setFilterEstado(filterEstado === "archivado" ? "all" : "archivado")
                }}
              >
                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center group-hover:bg-gray-300 transition-colors shrink-0">
                  <Target className="h-3 w-3 text-gray-600" />
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-medium text-sm">Archivados</span>
                  <span className="text-[10px] text-muted-foreground">
                    · {filterEstado === "archivado" ? "Ver todos" : "Ver anuncios"}
                  </span>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              {filteredAnuncios.map((anuncio) => {
                const isExpanded = expandedCard === anuncio.id

                const cardClassName =
                  anuncio.estado === "pausado"
                    ? "transition-all duration-200 hover:shadow-md border-l-4 border-l-yellow-400 bg-muted/30 opacity-75"
                    : anuncio.estado === "activo"
                      ? "transition-all duration-200 hover:shadow-md border-l-4 border-l-primary/20"
                      : "transition-all duration-200 hover:shadow-md border-l-4 border-l-gray-400 bg-muted/50"

                return (
                  <div key={anuncio.id} className="space-y-2">
                    <Card className={cardClassName}>
                      <CardHeader className="pb-0 pt-3">
                        <div className="space-y-1">
                          {/* Title row */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-base truncate">{anuncio.referencia}</h3>
                                <Badge
                                  variant={
                                    anuncio.estado === "activo"
                                      ? "default"
                                      : anuncio.estado === "pausado"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className={`text-[10px] px-1.5 py-0 ${
                                    anuncio.estado === "pausado"
                                      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
                                      : anuncio.estado === "archivado"
                                        ? "bg-gray-100 text-gray-600"
                                        : ""
                                  }`}
                                >
                                  {anuncio.activacion}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{anuncio.direccion}</p>
                            </div>

                            <div className="flex items-center gap-1">
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
                                  <DropdownMenuItem onClick={() => handleVerCompletos(anuncio.referencia)}>
                                    <CheckCircle className="h-3.5 w-3.5 mr-2" />
                                    Ver "Datos completos"
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
                                    <DropdownMenuItem
                                      onClick={() => handleOpenDeleteDialog(anuncio)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
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

                          <div className="flex justify-center mt-1">
                            <Button
                              size="sm"
                              className="bg-primary hover:bg-primary/90 h-7 text-xs"
                              onClick={() => handleVerLeads(anuncio.referencia)}
                            >
                              <Eye className="h-3 w-3 mr-1.5" />
                              Ver leads filtrados ({anuncio.leadsTotales})
                            </Button>
                          </div>

                          <div className="flex items-center justify-center gap-3 py-0.5">
                            <span className="text-sm font-medium">
                              {processingId === anuncio.id ? "Procesando..." : anuncio.activacion}
                            </span>
                            <Switch
                              checked={anuncio.estado === "activo"}
                              onCheckedChange={() => handleToggleEstado(anuncio.id, anuncio.activacion)}
                              disabled={processingId === anuncio.id || anuncio.estado === "archivado"}
                              className="scale-125"
                            />
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-1.5 pt-2 pb-3">
                        <div>
                          <h4 className="text-xs font-semibold mb-0.5 text-muted-foreground">
                            Rendimiento (últimas 24h)
                          </h4>
                          <div className="grid grid-cols-2 lg:grid-cols-5 gap-1">
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-600">{anuncio.nuevosHoy}</div>
                              <div className="text-[10px] text-muted-foreground">Nuevos hoy</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">{anuncio.emailsEnviados}</div>
                              <div className="text-[10px] text-muted-foreground">Emails enviados</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-purple-600">{anuncio.datosCompletos}</div>
                              <div className="text-[10px] text-muted-foreground">Nº Completos HOY</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-orange-600">{anuncio.aLaEspera}</div>
                              <div className="text-[10px] text-muted-foreground">A la espera</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-indigo-600">
                                {formatTime(anuncio.tiempoAhorrado)}
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
                            <span className="text-xs">Ejecuciones: {anuncio.ejecuciones}</span>
                            <span className="text-xs">
                              {planLimit > 0 && ((anuncio.ejecuciones / planLimit) * 100).toFixed(1)}% del plan
                            </span>
                          </div>

                          <Progress
                            value={planLimit > 0 ? (anuncio.ejecuciones / planLimit) * 100 : 0}
                            className="h-1"
                          />
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-1 pt-0.5 border-t">
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
                            variant={expandedLeadsAnuncio === anuncio.id ? "default" : "outline"}
                            className="flex-1 bg-transparent text-xs h-7"
                            onClick={() => handleToggleCompletosExpanded(anuncio)}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Completos ({anuncio.datosCompletos})
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
                                  key={lead.IDC}
                                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                    lead.fecha_de_visita
                                      ? 'bg-blue-50 border-blue-200 hover:border-blue-300'
                                      : 'bg-background hover:border-primary/50'
                                  }`}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-sm truncate">{lead.Nombre}</p>
                                      {lead.Agentes?.Nombre && (
                                        <div className="text-xs text-gray-500">
                                          Agente: {lead.Agentes.Nombre}
                                        </div>
                                      )}
                                      {lead.fecha_de_visita && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
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
                                    onClick={() => handleProgramarVisita(lead.IDC, lead.Nombre)}
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

            {anunciosCards.length === 0 && !loading && (
              <Card>
                <CardContent className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No hay anuncios disponibles</h3>
                  <p className="text-muted-foreground mb-4">
                    Los anuncios aparecerán aquí una vez que estén configurados.
                  </p>
                  <Button onClick={() => setShowCreationModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer anuncio
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <Dialog open={showCreationModal} onOpenChange={setShowCreationModal}>
          <DialogContent className="sm:max-w-[500px]">
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

                    <div className="bg-muted p-4 rounded-lg">
                      <h4 className="font-medium mb-2">Resumen</h4>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium">Referencia:</span> {creationStep.data.referencia}
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
                  <p>Ejecuciones consumidas: 3/100</p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* ... existing edit dialog ... */}
        <Dialog open={!!editingAnuncio} onOpenChange={() => setEditingAnuncio(null)}>
          <DialogContent className="sm:max-w-[800px] md:max-w-[900px] lg:max-w-[1000px] max-h-[90vh] overflow-y-auto z-[100]">
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
                          Este campo debe coincidir exactamente con la "Referencia Interna" de Idealista o Fotocasa para
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
              <Button onClick={handleGuardarEdicion}>Guardar cambios</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showInfoFaqsModal} onOpenChange={setShowInfoFaqsModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto z-[100]">
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
                  <Button size="sm" variant="outline" onClick={addFaq}>
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
            setIsStatsModalOpen(open) // Update state when modal opens/closes
          }}
        >
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
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
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{selectedAnuncioForStats.leadsTotales}</div>
                      <div className="text-sm text-blue-800">Leads Totales</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{selectedAnuncioForStats.datosCompletos}</div>
                      <div className="text-sm text-green-800">Datos Completos</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedAnuncioForStats.leadsTotales > 0
                          ? (
                              (selectedAnuncioForStats.datosCompletos / selectedAnuncioForStats.leadsTotales) *
                              100
                            ).toFixed(1)
                          : "0.0"}
                        %
                      </div>
                      <div className="text-sm text-purple-800">Tasa Conversión</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-2xl font-bold text-gray-600">{selectedAnuncioForStats.descartados || 0}</div>
                      <div className="text-sm text-gray-700">Descartados</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold">Preparados para la fase de visita</h4>
                    <div className="grid grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        className="w-full justify-between hover:bg-green-50 h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                        onClick={() => handlePhaseMetricClick("aceptado")}
                      >
                        <span className="text-sm">Candidatos Aprobados</span>
                        <span className="text-lg font-bold text-green-600">
                          {selectedAnuncioForStats.phaseMetrics?.aceptados || 0}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between hover:bg-blue-50 h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                        onClick={() => handlePhaseMetricClick("visita_propuesta")}
                      >
                        <span className="text-sm">Visita Propuesta</span>
                        <span className="text-lg font-bold text-blue-600">
                          {selectedAnuncioForStats.phaseMetrics?.visitaPropuesta || 0}
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full justify-between hover:bg-purple-50 h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                        onClick={() => handlePhaseMetricClick("visita_completada")}
                      >
                        <span className="text-sm">Visita Completada</span>
                        <span className="text-lg font-bold text-purple-600">
                          {selectedAnuncioForStats.phaseMetrics?.visitaCompletada || 0}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">Tendencia de Leads</h4>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={trendTimeframe === "24h" ? "default" : "outline"}
                          onClick={() => setTrendTimeframe("24h")}
                          className="h-7 text-xs"
                        >
                          24h
                        </Button>
                        <Button
                          size="sm"
                          variant={trendTimeframe === "7d" ? "default" : "outline"}
                          onClick={() => setTrendTimeframe("7d")}
                          className="h-7 text-xs"
                        >
                          7 días
                        </Button>
                        <Button
                          size="sm"
                          variant={trendTimeframe === "1m" ? "default" : "outline"}
                          onClick={() => setTrendTimeframe("1m")}
                          className="h-7 text-xs"
                        >
                          1 mes
                        </Button>
                      </div>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-muted-foreground">
                          {trendTimeframe === "24h" && "Últimas 24 horas"}
                          {trendTimeframe === "7d" && "Últimos 7 días"}
                          {trendTimeframe === "1m" && "Últimas 4 semanas"}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Activado: {selectedAnuncioForStats.fechaCreacion || "N/A"}</span>
                        </div>
                      </div>

                      {loadingTrendData ? (
                        <div className="flex items-center justify-center h-32">
                          <div className="text-sm text-muted-foreground">Cargando datos...</div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Chart */}
                          <div className="h-32">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={trendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                  dataKey={trendTimeframe === "24h" ? "hour" : trendTimeframe === "7d" ? "day" : "week"}
                                  tick={{ fontSize: 10 }}
                                  stroke="hsl(var(--muted-foreground))"
                                />
                                <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "6px",
                                  }}
                                />
                                <Line
                                  type="monotone"
                                  dataKey="count"
                                  stroke="hsl(var(--primary))"
                                  strokeWidth={2}
                                  dot={{ r: 3 }}
                                  activeDot={{ r: 5 }}
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>

                          {/* Data Grid */}
                          <div
                            className={`grid gap-2 text-xs ${
                              trendTimeframe === "24h"
                                ? "grid-cols-12"
                                : trendTimeframe === "7d"
                                  ? "grid-cols-7"
                                  : "grid-cols-4"
                            }`}
                          >
                            {trendData.map((item, index) => {
                              const isCurrent = trendTimeframe === "24h" && item.isCurrent
                              return (
                                <div
                                  key={index}
                                  className={`text-center p-2 rounded ${
                                    isCurrent ? "bg-primary text-primary-foreground font-bold" : "bg-background"
                                  }`}
                                >
                                  <div className="font-medium text-sm">{item.count}</div>
                                  <div
                                    className={`text-xs ${isCurrent ? "text-primary-foreground" : "text-muted-foreground"}`}
                                  >
                                    {trendTimeframe === "24h" && item.hour}
                                    {trendTimeframe === "7d" && item.day}
                                    {trendTimeframe === "1m" && item.week}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Análisis de Calidad */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Análisis de Calidad</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Leads Rebotados */}
                      <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-center gap-1 mb-2">
                          <span className="text-xs font-medium text-orange-800">Leads Rebotados</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="inline-flex items-center justify-center rounded-full w-4 h-4 bg-orange-200 hover:bg-orange-300 transition-colors">
                                <Info className="h-3 w-3 text-orange-700" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" side="top">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">¿Qué son los Leads Rebotados?</h4>
                                <p className="text-sm text-muted-foreground">
                                  Leads que han entrado en tu flujo pero no han respondido ni interactuado contigo ni
                                  una sola vez. No tienen ningún correo ni mensaje de WhatsApp registrado.
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
                        <div className="text-3xl font-bold text-orange-600">{qualityMetrics.leadsRebotados}</div>
                      </div>

                      {/* Datos Incompletos */}
                      <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="text-xs font-medium text-yellow-800 mb-2">Datos Incompletos</div>
                        <div className="text-3xl font-bold text-yellow-600">{qualityMetrics.datosIncompletos}</div>
                      </div>

                      {/* Necesidad de Aval */}
                      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="text-xs font-medium text-purple-800 mb-2">Necesidad de Aval</div>
                        <div className="text-3xl font-bold text-purple-600">{qualityMetrics.necesidadAval}</div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Métricas calculadas para el período: {trendTimeframe === "24h" && "últimas 24 horas"}
                      {trendTimeframe === "7d" && "últimos 7 días"}
                      {trendTimeframe === "1m" && "último mes"}
                    </p>
                  </div>

                  {/* Consumo y Rendimiento */}
                  <div className="space-y-3">
                    <h4 className="font-semibold">Consumo y Rendimiento</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Ejecuciones del mes</span>
                          <span className="font-medium">{selectedAnuncioForStats.ejecuciones}</span>
                        </div>
                        <Progress
                          value={planLimit > 0 ? (selectedAnuncioForStats.ejecuciones / planLimit) * 100 : 0}
                          className="h-2"
                        />
                        <div className="text-xs text-muted-foreground">
                          {planLimit > 0 ? ((selectedAnuncioForStats.ejecuciones / planLimit) * 100).toFixed(1) : "N/A"}
                          % del plan utilizado
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tiempo ahorrado</span>
                          <span className="font-medium">{formatTime(selectedAnuncioForStats.tiempoAhorrado)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Basado en 1.27 min/email procesado</div>
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
              <Button variant="outline" onClick={() => setShowStatsModal(false)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog
          open={phaseLeadsDialog.open}
          onOpenChange={(open) => setPhaseLeadsDialog({ ...phaseLeadsDialog, open })}
        >
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
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
                  <Card key={lead.IDC}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{lead.Nombre || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground truncate">{lead.Correo}</p>
                            {lead.Telefono && <p className="text-xs text-muted-foreground">{lead.Telefono}</p>}
                          </div>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {phaseLeadsDialog.status}
                          </Badge>
                        </div>
                        {lead.Ingresos && (
                          <p className="text-xs text-muted-foreground">Ingresos: {lead.Ingresos}€</p>
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
                  onClick={() => {
                    handleChangePlan(plan.idp)
                    setShowPlanSelector(false)
                  }}
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
                        <span>{formatPlanValue(plan.ejecuciones)} ejecuciones</span>
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
                    ¿Estás seguro de que deseas archivar el anuncio "{archivingAnuncio?.referencia}"? Podrás encontrarlo
                    en la sección de "Archivados".
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
                      El anuncio "{deletingAnuncio?.referencia}" será eliminado permanentemente de la base de datos.
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
                <input
                  id="visit-date"
                  type="datetime-local"
                  value={visitDateDialog.selectedDate}
                  onChange={(e) => setVisitDateDialog({ ...visitDateDialog, selectedDate: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
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
              <option key={agente.idag} value={agente.idag}>
                {agente.Nombre}
              </option>
            ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setVisitDateDialog({ open: false, leadId: "", leadName: "", selectedDate: "", selectedAgenteId: "" })}>
                Cancelar
              </Button>
              <Button onClick={handleSaveVisitDate}>
                <Calendar className="h-4 w-4 mr-2" />
                Guardar Fecha
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        

        
      </div>
    </TooltipProvider>
  )
}
