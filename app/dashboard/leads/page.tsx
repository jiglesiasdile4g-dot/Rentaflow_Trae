"use client"

// FIX: Removed duplicate imports of DialogContent, DialogHeader, DialogTitle
// import { DialogTitle } from "@/components/ui/dialog"
// import { DialogHeader } from "@/components/ui/dialog"
// import { DialogContent } from "@/components/ui/dialog"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"

import { useState, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, Filter, Mail, Phone, MessageSquare, CheckCircle, Edit, Building, Euro, Clock, Star, FileText, User, X, Home, XCircle, MoreVertical, Copy, Check, RefreshCw, ShoppingCart, Loader2 } from 'lucide-react'
import { useToast } from "@/hooks/use-toast" // Added useToast hook
import React from "react" // Imported React
import { LeadApproveWrapper } from "@/components/lead-approve-wrapper"
import { LeadDenyWrapper } from "@/components/lead-deny-wrapper"
import { getPlanData, formatPlanValue } from "@/lib/plan-data"

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
  Pedir_Aval?: boolean
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
  Obsevaciones?: string
  Recordatorio?: string | boolean
  usuario?: number
  visita_propuesta?: boolean
  aceptado?: boolean
  Fecha_Datos_Completos?: string
  fecha_de_visita?: string
  visita_completada?: string | boolean
  idag?: number | string
  Observaciones?: string
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
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
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
    Pedir_Aval: false,
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

  const { inmobiliariaId, inmobiliariaNombre, loading: inmobiliariaLoading, isAdmin } = useInmobiliaria() // Added isAdmin

  const supabase = createClient()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([])
  const [isBulkSelectionMode, setIsBulkSelectionMode] = useState(false)
  const [bulkConfirmationOpen, setBulkConfirmationOpen] = useState(false)
  const [pendingBulkStatus, setPendingBulkStatus] = useState<Lead["Estado"] | null>(null)

  const [visitDateDialogOpen, setVisitDateDialogOpen] = useState(false)
  const [selectedLeadForVisit, setSelectedLeadForVisit] = useState<Lead | null>(null)
  const [newVisitDateDate, setNewVisitDateDate] = useState("")
  const [newVisitDateTime, setNewVisitDateTime] = useState("")
  const [selectedAgenteId, setSelectedAgenteId] = useState("")
  const [agentes, setAgentes] = useState<any[]>([])

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
  }, [selectedLead])

  const fetchAgentes = async (inmobiliariaId: number) => {
    try {
      const supabase = createClient()
      
      // Filtramos agentes por la inmobiliaria (idi se almacena como string)
      const { data, error } = await supabase
        .from("Agentes")
        .select("idag, \"Nombre\", idi")
        .eq("idi", inmobiliariaId.toString()); // Convertir a string para coincidir con la BD
      
      if (error) {
        console.error("[v0] Error fetching agentes:", error.message)
        throw error
      }
      
      setAgentes(data || [])
      
    } catch (error) {
      console.error("[v0] Failed to fetch agentes:", error)
      setAgentes([])
    }
  }

  useEffect(() => {
    setVisitDateDialogOpen(false)
    setIsCommDialogOpen(false)
    setIsAvalDialogOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!inmobiliariaLoading) {
      const run = async () => {
        if (inmobiliariaId !== null) {
          await fetchPlanStatus()
          await fetchAgentes(inmobiliariaId)
        } else {
          setPlanInactive(false)
        }
        await fetchLeads()
        await fetchAdvertisements()
      }
      run()
    }
  }, [inmobiliariaId, inmobiliariaLoading])

  useEffect(() => {
    const adId = searchParams.get("ad")
    const ref = searchParams.get("filter")
    if (adId) {
      setSelectedAdvertisement(adId)
    } else if (ref && advertisements.length > 0) {
      const ad = advertisements.find((a) => a.Referencia === ref)
      if (ad) setSelectedAdvertisement(ad.ida)
    }
  }, [searchParams, advertisements])

  useEffect(() => {
    filterLeads()
  }, [searchTerm, statusFilter, selectedAdvertisement, leads, advertisements])

  useEffect(() => {
    try {
      setAdsLoading(true)
      const t = setTimeout(() => setAdsLoading(false), 300)
      return () => clearTimeout(t)
    } catch {}
  }, [searchTerm, statusFilter, selectedAdvertisement, advertisements])

  useEffect(() => {
    calculateMetrics()
  }, [leads, selectedAdvertisement, advertisements])

  const calculateMetrics = () => {
    let leadsToAnalyze = leads

    // Filter by selected advertisement if one is selected
    if (selectedAdvertisement && selectedAdvertisement !== "all") {
      const selectedAd = advertisements.find((ad) => ad.ida === selectedAdvertisement)
      if (selectedAd && selectedAd.Referencia) {
        leadsToAnalyze = leads.filter((lead) => lead.Inmueble === selectedAd.Referencia)
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

  const fetchPlanStatus = async () => {
    try {
      if (!inmobiliariaId) return
      const { data: inmobiliaria, error: inmobiliariaError } = await supabase
        .from("Inmobiliarias")
        .select("Plan, PlanResetAt, PlanNext, PlanNextEffectiveAt")
        .eq("idi", inmobiliariaId)
        .maybeSingle()
      if (inmobiliariaError) throw inmobiliariaError
      const planId = Number(inmobiliaria?.Plan) || 0
      setCurrentPlanId(planId)
      const scheduledId = Number(inmobiliaria?.PlanNext || 0)
      const scheduledAt = inmobiliaria?.PlanNextEffectiveAt ? new Date(inmobiliaria.PlanNextEffectiveAt) : null
      setScheduledPlanId(scheduledId)
      setScheduledEffectiveAt(scheduledAt)
      let limit = 1000000
      try {
        const { data: planesData } = await supabase.from("Planes").select("*")
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
        const { count, error } = await supabase
          .from("Clientes")
          .select("*", { count: "exact", head: true })
          .gte(field, prIso)
          .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})
        if (!error) {
          consumo = count || 0
          break
        }
      }
      
      setTotalEjecuciones(consumo)
      const inactive = limit < 1000000 && consumo >= limit
      setPlanInactive(inactive)
      if (inactive && !adsPaused) {
        await enforceAdvertisementsPaused()
      }
    } catch (err) {
      setPlanInactive(false)
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

  const fetchAdvertisements = async () => {
    try {
      setAdsLoading(true)
      let query = supabase.from("Anuncios").select("*").order("created_at", { ascending: false })
      if (inmobiliariaId) query = query.eq("usuario", inmobiliariaId)

      const { data: adsData, error: adsError } = await query

      if (adsError) throw adsError
      console.log("[v0] Advertisements fetched for leads page:", adsData?.length || 0)
      setAdvertisements(adsData || [])
    } catch (err) {
      console.error("[v0] Error fetching advertisements:", err)
    }
    finally {
      setAdsLoading(false)
    }
  }

  const fetchLeads = async () => {
    try {
      setLoading(true)

      const { data: activeAds, error: adsError } = await supabase
        .from("Anuncios")
        .select("Referencia")
        .in("Activacion", ["Activo", "Pausado"])
        .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})

      if (adsError) throw adsError

      // Extract the referencias from active/paused ads
      const activeReferences = activeAds?.map((ad) => ad.Referencia).filter(Boolean) || []

      // If no active ads, return empty leads
      if (activeReferences.length === 0) {
        setLeads([])
        setAvailableStatuses([])
        setLoading(false)
        return
      }

      // Now fetch leads that have an Inmueble matching one of the active referencias
      const dataQuery = supabase
        .from("Clientes")
        .select("*")
        .in("Inmueble", activeReferences)
        .order("created_at", { ascending: false })
        .match(inmobiliariaId ? { usuario: inmobiliariaId } : {})

      // Get leads data
      const { data: leadsData, error: leadsError } = await dataQuery

      if (leadsError) throw leadsError

      let rows = leadsData || []
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
        rows = rows.filter((lead: any) => processed.has(String(lead?.Estado || "")))
      }
      setLeads(rows)

      if (leadsData) {
        const uniqueStatuses = Array.from(new Set((rows || []).map((lead) => lead.Estado).filter(Boolean)))
        setAvailableStatuses(uniqueStatuses)
      }
    } catch (err) {
      console.error("[v0] Error fetching leads:", err)
      setError("Error al cargar los leads")
    } finally {
      setLoading(false)
    }
  }

  const fetchCommunications = async (leadEmail: string | undefined, leadPhone?: string) => {
    try {
      if (!leadEmail && !leadPhone) {
        setCommunications([])
        return
      }

      console.log("[v0] Fetching communications for Email:", leadEmail, "Phone:", leadPhone)

      const emailsPromise = leadEmail
        ? supabase.from("Correos").select("*").eq("Email", leadEmail).in("Tipo", ["enviado", "recibido"])
        : Promise.resolve({ data: [], error: null })

      const whatsappPromise = leadPhone
        ? supabase.from("Whatsapp").select("*").eq("Telefono", leadPhone).in("Tipo", ["Enviado", "Recibido"])
        : Promise.resolve({ data: [], error: null })

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

  const reactivateAdvertisement = async () => {
    if (!advertisementToReactivate) return

    try {
      const { error } = await supabase
        .from("Anuncios")
        .update({ Activacion: "Activo" })
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
    console.log("[v0] Filtering leads with selectedAdvertisement:", selectedAdvertisement)
    let filtered = leads

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const toLowerStr = (v: unknown) => String(v ?? "").toLowerCase()
      filtered = filtered.filter(
        (lead) =>
          toLowerStr(lead.Nombre).includes(term) ||
          toLowerStr(lead.Correo).includes(term) ||
          toLowerStr(lead.Inmueble).includes(term) ||
          toLowerStr((lead as any).id).includes(term) ||
          toLowerStr((lead as any).idc).includes(term) ||
          toLowerStr((lead as any).IDC).includes(term),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((lead) => lead.Estado === statusFilter)
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
      console.log("[v0] Selected advertisement:", selectedAd)
      if (selectedAd && selectedAd.Referencia) {
        console.log("[v0] Filtering by Referencia:", selectedAd.Referencia)
        // Filter leads where Inmueble field exactly matches the advertisement's Referencia
        filtered = filtered.filter((lead) => {
          const matches = lead.Inmueble === selectedAd.Referencia
          if (matches) {
            console.log("[v0] Lead matches:", lead.Nombre, "- Inmueble:", lead.Inmueble)
          }
          return matches
        })
      }
    }

    console.log("[v0] Filtered leads count:", filtered.length)
    setFilteredLeads(filtered)
  }

  const openLeadDetail = async (lead: Lead) => {
    setSelectedLead(lead)
    setEditFormData(lead)
    setIsEditingPersonalInfo(false)
    // Reset selected persona to 1 when opening a new lead
    setSelectedPersona(1)
    if (lead.Correo || lead.Telefono) {
      // Changed from lead.idc to lead.Telefono
      await fetchCommunications(lead.Correo, lead.Telefono) // Changed from lead.idc to lead.Telefono
    }
  }

  const savePersonalInfo = async () => {
    if (!selectedLead || !editFormData) return

    try {
      const { error } = await supabase
        .from("Clientes")
        .update({
          Nombre: editFormData.Nombre,
          Correo: editFormData.Correo,
          Telefono: editFormData.Telefono,
          Ingresos: editFormData.Ingresos,
          Inmueble: editFormData.Inmueble,
          Pais: editFormData.Pais,
          Codigo_Postal: editFormData.Codigo_Postal,
          Tipo_Documento: editFormData.Tipo_Documento,
          Documento: editFormData.Documento,
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

      const updatedLead = { ...selectedLead, ...editFormData }
      setSelectedLead(updatedLead)
      setLeads(leads.map((lead) => (lead.id === selectedLead.id ? updatedLead : lead)))
      setIsEditingPersonalInfo(false)

      console.log("[v0] Personal information updated successfully")
    } catch (err) {
      console.error("[v0] Error updating personal information:", err)
    }
  }

  const cancelEdit = () => {
    setEditFormData(selectedLead || {})
    setIsEditingPersonalInfo(false)
  }

  const updateLeadStatus = async (leadId: number, newStatus: string) => {
    try {
      const { error } = await supabase.from("Clientes").update({ Estado: newStatus }).eq("id", leadId)

      if (error) throw error

      // Update local state
      setLeads(leads.map((lead) => (String(lead.id) === String(leadId) ? { ...lead, Estado: newStatus as Lead["Estado"] } : lead)))

      console.log("[v0] Lead status updated successfully")
    } catch (err) {
      console.error("[v0] Error updating lead status:", err)
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
          label: estado === "Datos Completos" ? "Datos Completos" : "Completado",
        }
      case "Datos Incompletos":
        return {
          bg: "#ffffff",
          border: "#f59e0b",
          text: "#92400e",
          label: estado,
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

    const formatDate = (dateString?: string) => {
      if (!dateString) return "No especificado"
      return new Date(dateString).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
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
      if (!newLeadFormData.Nombre || !newLeadFormData.Correo) {
        alert("Por favor, completa al menos el nombre y el correo electrónico")
        return
      }

      try {
        setIsSubmittingNewLead(true)

        const leadData = {
          ...newLeadFormData,
          usuario: inmobiliariaId,
          created_at: new Date().toISOString(),
        }

        const { data, error } = await supabase.from("Clientes").insert([leadData]).select()

        if (error) throw error

        console.log("[v0] New lead created successfully:", data)

        // Add the new lead to the list
        if (data && data.length > 0) {
          setLeads([data[0], ...leads])
        }

        // Reset form and close dialog
        setNewLeadFormData({
          Estado: "Pendiente",
          Pedir_Aval: false,
        })
        setIsNewLeadDialogOpen(false)

        // Refresh leads
        await fetchLeads()
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

      const { error } = await supabase.from("Clientes").update({ Estado: pendingBulkStatus }).in("id", selectedLeadIds)

      if (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar el estado de los leads",
          variant: "destructive",
        })
        return
      }

      setLeads((prevLeads) =>
        prevLeads.map((lead) => (selectedLeadIds.includes(lead.id) ? { ...lead, Estado: pendingBulkStatus as Lead["Estado"] } : lead)),
      )

      toast({
        title: "Estado actualizado",
        description: `Se actualizó el estado de ${selectedLeadIds.length} lead(s) a ${pendingBulkStatus}`,
      })

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

    const handleReprogramVisit = async () => {
      if (!selectedLeadForVisit || !newVisitDateDate || !newVisitDateTime) return
      if (!selectedAgenteId) {
        toast({
          title: "Agente requerido",
          description: "Selecciona un agente antes de guardar la visita.",
          variant: "destructive",
        })
        return
      }

      try {
        const supabase = createClient()
        const d = new Date(`${newVisitDateDate}T${newVisitDateTime}`)
        const off = d.getTimezoneOffset()
        const sign = off <= 0 ? "+" : "-"
        const hh = String(Math.floor(Math.abs(off) / 60)).padStart(2, "0")
        const mm = String(Math.abs(off) % 60).padStart(2, "0")
        const offset = `${sign}${hh}:${mm}`
        const valueWithOffset = `${newVisitDateDate}T${newVisitDateTime}:00${offset}`
        const updateData: any = {
          fecha_de_visita: valueWithOffset,
          visita_completada: "visita propuesta",
          idag: selectedAgenteId ? Number(selectedAgenteId) : null,
        }
        
        // Add agent idag if selected
        if (selectedAgenteId) {
          updateData.idag = selectedAgenteId
        }

        const { error } = await supabase
          .from("Clientes")
          .update(updateData)
          .eq("id", selectedLeadForVisit.id)

        if (error) throw error

      toast({
        title: "Fecha de visita actualizada",
        description: "La fecha de visita se ha reprogramado correctamente.",
      })

      // Refresh leads to show updated date
        fetchLeads()
        // Update selectedLead panel immediately
        setSelectedLead((prev) => {
          if (!prev) return prev
          if (prev.id !== selectedLeadForVisit!.id) return prev
          return {
            ...prev,
            fecha_de_visita: valueWithOffset,
          }
        })
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
            fecha_de_visita: null
          })
          .eq("id", selectedLeadForVisit.id)

        if (error) throw error

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
                <Button onClick={() => setIsNewLeadDialogOpen(true)} disabled>
                  <Users className="h-4 w-4 mr-2" />
                  Nuevo Lead
                </Button>
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
                  const showCritical = planLimit < 1000000 && percentageUsed >= 100
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
                          ? `border-red-500/50 shadow-lg shadow-red-500/20 bg-gradient-to-br from-white via-red-50/30 to-red-100/40 ring-2 ring-red-500/20`
                          : "bg-card border"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">Consumo del Plan</h3>
                            {showCritical && (
                              <Badge variant="outline" className="text-red-600 border-current font-semibold text-xs px-1.5 py-0">
                                🚨 Límite Alcanzado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                          <div className="hidden sm:flex items-center gap-2 text-[10px] text-muted-foreground mr-2">
                            <span>Renovación: {nextRenewalDate.toLocaleDateString("es-ES")}</span>
                            <span>• Plan: {currentPlanName || (() => { const pd = getPlanData(currentPlanId); return pd ? pd.Nombre : String(currentPlanId || "") })()}</span>
                            {scheduledPlanId > 0 && scheduledEffectiveAt && (
                              <span>• Downgrade programado: {scheduledEffectiveAt.toLocaleDateString("es-ES")}</span>
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
                              <div className="flex items-start gap-2 p-2 rounded-lg border border-red-600 bg-red-50">
                                <span className="text-sm">🚨</span>
                                <div className="flex-1">
                                  <p className="text-xs font-medium text-red-600">
                                    Has consumido el 100% de tu plan. Leads {totalEjecuciones}/{formatPlanValue(planLimit)}.
                                  </p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">💡 Considera ampliar tu plan para evitar interrupciones.</p>
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
                    placeholder="Buscar por nombre, email, inmueble o ID..."
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
                    <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                      <SelectTrigger className="w-full sm:w-48">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Filtrar por estado" />
                      </SelectTrigger>
                      <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    {availableStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === "Pedir Aval" ? "Aval Pedido" : status === "Visita Propuesta" ? "Visita Propuesta" : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchLeads}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="outline">
                                Cambiar estado
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Pendiente")}>
                                Pendiente
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Validado")}>
                                Validado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Completado")}>
                                Completado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Rechazado")}>
                                Rechazado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateBulkLeadStatus("Aceptado")}>
                                Aceptado
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
                          filteredLeads.map((lead) => {
                            const isComplete = isLeadComplete(lead)
                            const isDescartado = lead.Estado === "Descartado"
                            const isAceptado = lead.Estado === "Aceptado"
                            const { percentage: completionPercentage, totalFields } = calculateCompleteness(lead)
                            const isDataComplete = completionPercentage >= 80 // 80% or more is considered complete
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
                                              const statusColors = getStatusColors(lead.Estado)
                                              const showEstadoBadge =
                                                lead.Estado &&
                                                lead.Estado !== "Datos Incompletos" &&
                                                lead.Estado !== "Completo"

                                            if (showEstadoBadge) {
                                              return (
                                                <div
                                                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                                    ["Visita Propuesta", "Completo", "Completado"].includes(String(lead.Estado || "")) ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                                                  }`}
                                                  style={{
                                                    backgroundColor: statusColors.bg,
                                                    borderColor: statusColors.border,
                                                  }}
                                                  onClick={async () => {
                                                    console.log("[v0] Estado div clicked, Estado:", lead.Estado)
                                                    if (lead.Estado === "Visita Propuesta") {
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
                                                    } else if (lead.Estado === "Completo" || lead.Estado === "Completado") {
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
                                                      await updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                                    }
                                                  }}
                                                >
                                                    <span
                                                      className="text-xs font-semibold"
                                                      style={{ color: statusColors.text }}
                                                    >
                                                      {lead.Estado === "Aceptado" ? "✓ " : ""}
                                                      {lead.Estado === "Visita Propuesta" && lead.fecha_de_visita ? (
                                                        <>
                                                          Visita Propuesta -{" "}
                                                          {new Date(lead.fecha_de_visita).toLocaleString("es-ES", {
                                                            day: "2-digit",
                                                            month: "short",
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
                                                      setVisitDateDialogOpen(true)
                                                      await updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                                    }}
                                                  >
                                                    <span className="text-xs font-semibold text-green-800">
                                                      ✓ Completo
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
                                            <span>{formatDate(lead.created_at)}</span>
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
                        filteredLeads.map((lead) => {
                          const isComplete = isLeadComplete(lead)
                          const isDescartado = lead.Estado === "Descartado"
                          const isAceptado = lead.Estado === "Aceptado"
                          const { percentage: completionPercentage } = calculateCompleteness(lead)
                          const isDataComplete = completionPercentage >= 80 // 80% or more is considered complete
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
                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                          {personaCount}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-sm truncate">{lead.Nombre || "Sin nombre"}</h3>

                                        <div className="flex items-center gap-1.5">
                                          {(() => {
                                            const statusColors = getStatusColors(lead.Estado)
                                            const showEstadoBadge =
                                              lead.Estado &&
                                              lead.Estado !== "Datos Incompletos" &&
                                              lead.Estado !== "Completo"

                                            if (showEstadoBadge) {
                                              return (
                                                <div
                                                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${
                                                      ["Visita Propuesta", "Datos Completos", "Completo", "Completado"].includes(String(lead.Estado || "")) ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
                                                    }`}
                                                  style={{
                                                    backgroundColor: statusColors.bg,
                                                    borderColor: statusColors.border,
                                                  }}
                                                    onClick={async () => {
                                                      console.log("[v0] Estado div clicked, Estado:", lead.Estado)
                                                      if (lead.Estado === "Visita Propuesta") {
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
                                                      } else if (lead.Estado === "Datos Completos" || lead.Estado === "Completo" || lead.Estado === "Completado") {
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
                                                        await updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                                      } else {
                                                        console.log("[v0] Estado is not 'Visita Propuesta', dialog not opened")
                                                      }
                                                    }}
                                                >
                                                  <span
                                                    className="text-xs font-semibold"
                                                    style={{ color: statusColors.text }}
                                                  >
                                                    {lead.Estado === "Aceptado" ? "✓ " : ""}
                                                    {/* Show only the visit date without "Visita Propuesta" text */}
                                                    {lead.Estado === "Visita Propuesta" && lead.fecha_de_visita ? (
                                                      <>
                                                        Visita Propuesta -{" "}
                                                        {new Date(lead.fecha_de_visita).toLocaleString("es-ES", {
                                                          day: "2-digit",
                                                          month: "short",
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
                                                    setVisitDateDialogOpen(true)
                                                    await updateLeadStatus(Number(lead.id), "Visita Propuesta")
                                                  }}
                                                >
                                                  <span className="text-xs font-semibold text-green-800">
                                                    ✓ Completo
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
                                          <span>{formatDate(lead.created_at)}</span>
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {selectedLead && (
          <>
            <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setSelectedLead(null)} />

            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[51] bg-background rounded-lg max-w-[1200px] w-[95vw] max-h-[90vh] shadow-xl flex flex-col h-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col h-full max-w-full">
                <div className="border-b border-border p-5 px-6 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    <h1 className="text-2xl font-bold m-0">{selectedLead.Nombre || "Sin nombre"}</h1>
                    <span className="text-sm text-muted-foreground font-normal">| {selectedLead.Inmueble || "Sin inmueble"}</span>
                    <span className="text-xs text-muted-foreground ml-2">ID: {selectedLead.id}</span>
                  </div>
                  <button className="p-1 text-muted-foreground hover:text-foreground" onClick={() => setSelectedLead(null)}>
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
                        onLeadUpdated={(updatedLead) => setSelectedLead(updatedLead)}
                      />
                      <LeadDenyWrapper
                        lead={selectedLead}
                        updateLeadStatus={updateLeadStatus}
                        onLeadUpdated={(updatedLead) => setSelectedLead(updatedLead)}
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
                                      ? "bg-green-50 text-green-900 border-green-500 border-b-transparent z-10 -mb-px shadow-md"
                                      : "bg-background text-foreground border-b-transparent z-10 -mb-px shadow-sm"
                                    : selectedLead.tipo2 === "Avalista"
                                      ? "bg-green-100/50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400"
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
                                      ? "bg-green-50 text-green-900 border-green-500 border-b-transparent z-10 -mb-px shadow-md"
                                      : "bg-background text-foreground border-b-transparent z-10 -mb-px shadow-sm"
                                    : selectedLead.tipo3 === "Avalista"
                                      ? "bg-green-100/50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400"
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
                                    ? "bg-green-50 text-green-900 border-green-500 border-b-transparent z-10 -mb-px shadow-md dark:bg-green-950/50 dark:text-green-100 dark:border-green-500"
                                    : "bg-amber-50 text-amber-900 border-amber-500 border-b-transparent z-10 -mb-px shadow-md dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-500"
                                  : selectedLead.tipo4 === "Avalista"
                                    ? "bg-green-100/50 text-green-700 border-green-300 hover:bg-green-100 hover:border-green-400 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 dark:hover:bg-green-900/40"
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
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Documento || "No proporcionado"}
                                  </div>
                                )}
                              </div>
                              <div style={{ flex: "2" }}></div>
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
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_2 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Documento_2 || "No especificado"}
                                  </div>
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
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_4 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Documento_4 || "No especificado"}
                                  </div>
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
                                    className="h-9 text-sm"
                                  />
                                ) : (
                                  <div className={`text-sm ${selectedLead.Documento_3 ? "not-italic text-foreground" : "italic text-muted-foreground"}`}>
                                    {selectedLead.Documento_3 || "No especificado"}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Evaluación */}
                      <div className="border border-border rounded-lg p-5">
                        <h2 className="text-lg font-semibold mb-5">Evaluación</h2>

                        <div className="flex gap-4 flex-wrap">
                          <div
                            style={{
                              flex: "1",
                              minWidth: "120px",
                              textAlign: "center",
                              padding: "1rem",
                              backgroundColor: getStatusColors(selectedLead.Estado).bg,
                              borderRadius: "8px",
                              border: `2px solid ${getStatusColors(selectedLead.Estado).border}`,
                              position: "relative",
                              cursor: ["Visita Propuesta", "Datos Completos", "Completo", "Completado"].includes(String(selectedLead.Estado || "")) ? "pointer" : "default",
                              transition: "all 0.2s",
                            }}
                            onClick={async () => {
                              console.log("[v0] Estado div clicked, Estado:", selectedLead.Estado)
                              if (selectedLead.Estado === "Visita Propuesta") {
                                console.log("[v0] Opening visit date dialog for lead:", selectedLead.Nombre, selectedLead.Apellidos)
                                console.log("[v0] Current fecha_de_visita:", selectedLead.fecha_de_visita)
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
                                setVisitDateDialogOpen(true)
                                console.log("[v0] Dialog should now be open")
                              } else if (selectedLead.Estado === "Datos Completos" || selectedLead.Estado === "Completo" || selectedLead.Estado === "Completado") {
                                console.log("[v0] Datos Completos -> abrir Programar Visita y cambiar a 'Visita Propuesta'")
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
                                setVisitDateDialogOpen(true)
                                await updateLeadStatus(Number(selectedLead.id), "Visita Propuesta")
                                setSelectedLead({ ...selectedLead, Estado: "Visita Propuesta" })
                              } else {
                                console.log("[v0] Estado no interactivo, dialog no abierto")
                              }
                            }}
                            onMouseEnter={(e) => {
                              if (["Visita Propuesta", "Datos Completos", "Completo", "Completado"].includes(String(selectedLead.Estado || ""))) {
                                e.currentTarget.style.transform = "scale(1.02)"
                                e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (["Visita Propuesta", "Datos Completos", "Completo", "Completado"].includes(String(selectedLead.Estado || ""))) {
                                e.currentTarget.style.transform = "scale(1)"
                                e.currentTarget.style.boxShadow = "none"
                              }
                            }}
                          >
                            {selectedLead.Estado === "Completado" && (
                              <div
                                style={{
                                  position: "absolute",
                                  top: "0.5rem",
                                  right: "0.5rem",
                                  backgroundColor: "#22c55e",
                                  borderRadius: "50%",
                                  width: "20px",
                                  height: "20px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "white",
                                  fontSize: "0.75rem",
                                }}
                              >
                                ✓
                              </div>
                            )}
                            <div
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: "bold",
                                color: getStatusColors(selectedLead.Estado).text,
                              }}
                            >
                              {getStatusColors(selectedLead.Estado).label}
                            </div>
                            {selectedLead.Estado === "Visita Propuesta" && selectedLead.fecha_de_visita && (
                              <div style={{ fontSize: "0.875rem", color: getStatusColors(selectedLead.Estado).text, marginTop: "0.5rem", fontWeight: "500" }}>
                                {new Date(selectedLead.fecha_de_visita).toLocaleString("es-ES", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </div>
                            )}
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
                              ESTADO
                              {selectedLead.Estado === "Visita Propuesta" ? " (Click para cambiar)" :
                               (selectedLead.Estado === "Datos Completos" || selectedLead.Estado === "Completo" || selectedLead.Estado === "Completado") ? " (Click para programar)" : ""}
                            </div>
                          </div>

                          <div className="flex-1 min-w-[120px] text-center p-4 rounded-lg bg-muted/50 dark:bg-input/30">
                            <div className="text-xl font-bold">
                              {calculateIAScore(selectedLead)}%
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">SCORE IA</div>
                          </div>

                          {/* Pedir Aval Card */}
                          <div
                            className={`flex-1 min-w-[120px] text-center p-4 rounded-lg bg-muted/50 dark:bg-input/30 transition-all ${planInactive ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/70 dark:hover:bg-input/50 hover:scale-[1.02]"}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              e.preventDefault()
                              if (planInactive) return
                              openAvalDialog()
                            }}
                          >
                            <div className="text-lg font-bold text-blue-600 dark:text-blue-300">
                              {selectedLead.Pedir_Aval ? "Sí" : "No"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">PEDIR AVAL</div>
                            <div className="text-[0.65rem] text-blue-600 dark:text-blue-300 mt-1">Click para revisar</div>
                          </div>

                          <div className="flex-1 min-w-[120px] text-center p-4 rounded-lg bg-muted/50 dark:bg-input/30">
                            <div className="text-base font-bold">{getDaysAgo(selectedLead.created_at)}</div>
                            <div className="text-xs text-muted-foreground mt-2">FECHA ENTRADA</div>
                            <div className="text-[0.65rem] text-muted-foreground mt-2 italic">
                              {new Date(selectedLead.created_at || Date.now()).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}{" "}
                              a las{" "}
                              {new Date(selectedLead.created_at || Date.now()).toLocaleTimeString("es-ES", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                            </div>
                            {(() => {
                              const lastComm = getLastCommunication()
                              if (lastComm) {
                                return (
                                  <div className={`text-[0.65rem] mt-2 font-medium ${lastComm.isSent ? "text-blue-600 dark:text-blue-300" : "text-green-600 dark:text-green-300"}`}>
                                    {lastComm.daysAgo} - {lastComm.isSent ? "📤" : "📥"} {lastComm.type}
                                  </div>
                                )
                              }
                              return <div className="text-[0.65rem] text-muted-foreground mt-2">Sin comunicaciones</div>
                            })()}
                          </div>
                        </div>
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
                      <div className="border border-border rounded-lg p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-sm font-semibold m-0">Documentos</h2>
                          <button className="px-3 py-1 text-xs bg-muted rounded hover:bg-muted/80" onClick={() => setIsDocsDialogOpen(true)}>
                            Gestionar
                          </button>
                        </div>

                        <div className="flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">DNI/NIE</span>
                            <span className={`px-2 py-0.5 text-xs rounded border font-semibold tracking-wide ${documentStatus.dni === "verified" ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800" : "bg-amber-100 text-black! border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"}`}>
                              {documentStatus.dni === "verified" ? "Completado" : "Pendiente"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className="text-sm">Just. Ingresos</span>
                            <span className={`px-2 py-0.5 text-xs rounded border font-semibold tracking-wide ${documentStatus.income === "verified" ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800" : "bg-amber-100 text-black! border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800"}`}>
                              {documentStatus.income === "verified" ? "Completado" : "Pendiente"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Comunicaciones */}
                      <div className="border border-border rounded-lg p-5 flex-1 min-h-[300px]">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-sm font-semibold m-0">Comunicaciones</h2>
                          <button disabled className="px-3 py-1 text-xs bg-muted text-muted-foreground rounded cursor-not-allowed opacity-50 pointer-events-none relative z-[1100]">
                            Agregar
                          </button>
                        </div>

                        {communications.length > 0 ? (
                          <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto">
                            {communications.map((comm) => {
                              const isSent = isCommunicationSent(comm)
                              const isWhatsApp = comm.source === "whatsapp"
                              return (
                                <div
                                  key={comm.id}
                                  onClick={() => { if (planInactive) return; openCommunicationDetail(comm) }}
                                  className={`p-3 rounded-md border transition-all ${planInactive ? "pointer-events-none opacity-50 cursor-not-allowed" : "cursor-pointer"} ${isWhatsApp ? "bg-green-50/10 border-emerald-200 hover:bg-green-50/30 hover:border-emerald-300 dark:bg-emerald-900/10 dark:border-emerald-900/20 dark:hover:bg-emerald-900/20" : isSent ? "bg-blue-50/10 border-blue-200 hover:bg-blue-50/30 hover:border-blue-300 dark:bg-primary/10 dark:border-primary/20 dark:hover:bg-primary/15" : "bg-orange-50/10 border-amber-200 hover:bg-orange-50/30 hover:border-amber-300 dark:bg-amber-900/10 dark:border-amber-900/20 dark:hover:bg-amber-900/20"}`}
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-sm">
                                      {isWhatsApp ? (
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                          <path d="M13.333 2.66667C12.6663 2 11.9997 1.99999 11.333 1.99999H4.66634C3.33301 1.99999 2.66634 2.66666 2.66634 3.99999V11.3333C2.66634 12.6667 3.33301 13.3333 4.66634 13.3333H11.333C12.6663 13.3333 13.333 12.6667 13.333 11.3333V3.99999C13.333 3.33333 13.333 3.33333 13.333 2.66667Z" fill="#25D366"/>
                                          <path d="M10.8867 9.67333C10.62 9.94 9.95333 10.2067 9.62 10.2067C9.28667 10.2067 8.68667 10.0733 7.75333 9.28667C6.88667 8.56667 6.35333 7.78 6.22 7.44667C6.15333 7.31333 6.02 7.11333 6.02 6.91333C6.02 6.78 6.08667 6.64667 6.15333 6.51333C6.35333 6.18 6.68667 5.91333 7.08667 5.78C7.28667 5.71333 7.42 5.78 7.48667 5.91333C7.62 6.18 7.82 6.58 7.88667 6.71333C7.95333 6.84667 8.02 6.91333 8.15333 6.91333C8.28667 6.91333 8.35333 6.91333 8.48667 6.78C8.75333 6.51333 9.08667 6.11333 9.35333 5.78C9.55333 5.51333 9.75333 5.58 9.88667 5.64667C10.02 5.71333 10.62 6.04667 10.62 6.04667C10.7533 6.11333 10.82 6.18 10.8867 6.31333C10.9533 6.38 10.9533 6.91333 10.62 7.58C10.3533 8.18 10.1533 8.31333 10.02 8.44667C9.88667 8.58 9.75333 8.64667 9.62 8.78C9.48667 8.91333 9.55333 9.01333 9.62 9.14667C9.68667 9.28 9.95333 9.67333 10.0867 9.80667C10.22 9.94 10.3533 10.0733 10.4867 10.14C10.62 10.2067 10.7533 10.2067 10.82 10.14C10.8867 10.0733 10.9533 9.94 11.02 9.80667C11.1533 9.54 11.3533 8.94 11.42 8.78C11.4867 8.62 11.62 8.58 11.7533 8.51333C11.8867 8.44667 12.3533 8.24667 12.5533 8.11333C12.82 7.91333 12.9533 7.84667 13.02 7.78C13.0867 7.71333 13.1533 7.58 13.02 7.38C12.8867 7.18 12.22 6.04667 12.02 5.71333C11.8867 5.51333 11.7533 5.51333 11.62 5.51333C11.4867 5.51333 11.3533 5.51333 11.22 5.51333C11.0867 5.51333 10.8867 5.58 10.7533 5.78C10.62 5.98 10.1533 6.58 10.02 6.78C9.88667 6.98 9.75333 7.04667 9.55333 6.91333C9.35333 6.78 8.75333 6.51333 8.08667 5.91333C7.55333 5.44667 7.15333 4.91333 7.02 4.71333C6.88667 4.51333 6.75333 4.58 6.62 4.58C6.48667 4.58 6.28667 4.58 6.08667 4.58C5.88667 4.58 5.62 4.64667 5.42 4.91333C5.22 5.18 4.55333 5.91333 4.55333 7.04667C4.55333 8.18 5.35333 9.24667 5.48667 9.44667C5.62 9.64667 6.88667 11.6733 9.02 12.54C9.55333 12.74 9.95333 12.74 10.2867 12.74C10.62 12.74 11.0867 12.6067 11.42 12.34C11.82 12.0067 12.02 11.54 12.0867 11.14C12.1533 10.8067 12.02 10.54 11.8867 10.34C11.7533 10.14 11.5533 9.94 11.42 9.80667C11.2867 9.67333 11.1533 9.80667 11.02 9.94C10.8867 10.0733 10.6867 10.34 10.5533 10.4733C10.42 10.6067 10.2867 10.6733 10.1533 10.54C10.02 10.4067 9.55333 9.94 9.42 9.80667C9.28667 9.67333 9.42 9.54 9.55333 9.40667C9.68667 9.27333 9.82 9.14 9.95333 9.00667C10.0867 8.87333 10.22 8.74 10.3533 8.87333C10.4867 9.00667 10.82 9.34 10.9533 9.47333C11.0867 9.60667 11.22 9.67333 11.3533 9.80667C11.4867 9.94 11.4867 10.0733 11.42 10.14C11.3533 10.2067 11.1533 10.4067 10.8867 10.54Z" fill="white"/>
                                        </svg>
                                      ) : isSent ? "📤" : "📥"}
                                    </span>
                                    <span className={`text-[0.65rem] font-semibold uppercase tracking-wide ${isWhatsApp ? "text-emerald-950! dark:text-emerald-300" : isSent ? "text-blue-950! dark:text-primary" : "text-amber-950! dark:text-amber-300"}`}>
                                      {isWhatsApp ? "WhatsApp" : isSent ? "Enviado" : "Recibido"}
                                    </span>
                                  </div>
                                  <div className="text-sm font-semibold mb-1">
                                    {isWhatsApp ? "Mensaje de WhatsApp" : comm.From || "Sin remitente"}
                                  </div>
                                  <div className="text-xs text-foreground mb-2">
                                    {isWhatsApp
                                      ? (comm.Mensaje?.replace(/<[^>]*>/g, "") || "Sin mensaje").substring(0, 50) +
                                        (comm.Mensaje && comm.Mensaje.replace(/<[^>]*>/g, "").length > 50 ? "..." : "")
                                      : comm.Subject || "Sin asunto"}
                                  </div>
                                  <div className="text-[0.7rem] text-muted-foreground">
                                    {new Date(comm.created_at).toLocaleDateString("es-ES")}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[calc(100%_-_3rem)] text-center">
                            <div className="text-5xl">💬</div>
                            <p className="text-sm text-muted-foreground m-0">Sin comunicaciones</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <Dialog open={isNewLeadDialogOpen} onOpenChange={setIsNewLeadDialogOpen}>
          <DialogContent className="w-[95vw] sm:w-[90vw] md:w-[85vw] lg:w-[70vw] max-w-3xl max-h-[90vh] overflow-y-auto">
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
                        value={newLeadFormData.Tipo_Documento || ""}
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
                        className="h-9 text-sm"
                      />
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
                      <label className="text-xs font-medium text-muted-foreground">Referencia del Inmueble</label>
                      <Select
                        value={newLeadFormData.Inmueble || ""}
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

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Fecha de Entrada Deseada</label>
                      <Input
                        type="date"
                        value={newLeadFormData.Fecha_Entrada || ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Fecha_Entrada: e.target.value })}
                        className="h-9 text-sm"
                      />
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
                        value={newLeadFormData.Estado || "Pendiente"}
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
                          <SelectItem value="Aceptado">Aceptado</SelectItem>
                          <SelectItem value="Descartado">Descartado</SelectItem>
                          {/* Added 'Datos Completos' and 'Datos Incompletos' to the select options */}
                          <SelectItem value="Datos Completos">Datos Completos</SelectItem>
                          <SelectItem value="Datos Incompletos">Datos Incompletos</SelectItem>
                          <SelectItem value="Visita Propuesta">Visita Propuesta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">¿Pedir Aval?</label>
                      <Select
                        value={newLeadFormData.Pedir_Aval ? "true" : "false"}
                        onValueChange={(value) =>
                          setNewLeadFormData({ ...newLeadFormData, Pedir_Aval: value === "true" })
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

                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Recordatorio</label>
                      <Input
                        value={typeof newLeadFormData.Recordatorio === "string" ? newLeadFormData.Recordatorio : ""}
                        onChange={(e) => setNewLeadFormData({ ...newLeadFormData, Recordatorio: e.target.value })}
                        placeholder="Recordatorio para seguimiento..."
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
          <DialogContent className="sm:max-w-lg z-[200]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Solicitud de Aval
              </DialogTitle>
            </DialogHeader>

            {selectedLead && avalCalculation && (
              <div className="space-y-4 py-4">
                {/* Lead Information */}
                <div className="p-4 bg-gray-50 rounded-lg border space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Nombre:</span>
                    <span className="text-sm font-semibold">{selectedLead.Nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Email:</span>
                    <span className="text-sm">{selectedLead.Correo}</span>
                  </div>

                  <div className="pt-2 border-t space-y-1.5">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Ingresos por Persona:</div>
                    {avalCalculation.persona1Income > 0 && (
                      <div className="flex justify-between pl-2">
                        <span className="text-xs text-muted-foreground">{selectedLead.Nombre || "Persona 1"}:</span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(avalCalculation.persona1Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona2Income > 0 && (
                      <div className="flex justify-between pl-2">
                        <span className="text-xs text-muted-foreground">{selectedLead.Persona_2 || "Persona 2"}:</span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(avalCalculation.persona2Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona3Income > 0 && (
                      <div className="flex justify-between pl-2">
                        <span className="text-xs text-muted-foreground">{selectedLead.Persona_3 || "Persona 3"}:</span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(avalCalculation.persona3Income)}
                        </span>
                      </div>
                    )}
                    {avalCalculation.persona4Income > 0 && (
                      <div className="flex justify-between pl-2">
                        <span className="text-xs text-muted-foreground">{selectedLead.Persona_4 || "Avalista"}:</span>
                        <span className="text-xs font-medium text-green-600">
                          {formatCurrency(avalCalculation.persona4Income)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1.5 border-t">
                      <span className="text-sm font-medium text-muted-foreground">Total Ingresos:</span>
                      <span className="text-sm font-bold text-green-600">{formatCurrency(avalCalculation.income)}</span>
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
                  className={`p-4 rounded-lg border space-y-3 ${
                    avalCalculation.needsAval ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"
                  }`}
                >
                  <h3
                    className={`text-sm font-semibold ${avalCalculation.needsAval ? "text-red-900" : "text-green-900"}`}
                  >
                    Análisis de Requisito de Aval
                  </h3>

                  {(!avalCalculation.income || avalCalculation.income === 0) && (
                    <div className="p-2 rounded-md bg-orange-100 border border-orange-300">
                      <p className="text-xs font-semibold text-orange-800">⚠️ Datos de Ingresos No Disponibles</p>
                      <p className="text-xs text-orange-700 mt-0.5">
                        No se han proporcionado los ingresos del solicitante. El análisis de aval no puede ser preciso sin
                        esta información.
                      </p>
                    </div>
                  )}

                  {avalCalculation.actualRent ? (
                    <>
                      {avalCalculation.income > 0 && (
                        <div
                          className={`p-3 rounded-md border ${
                            avalCalculation.needsAval ? "bg-red-100 border-red-300" : "bg-green-100 border-green-300"
                          }`}
                        >
                          <p
                            className={`text-sm font-bold mb-2 ${
                              avalCalculation.needsAval ? "text-red-800" : "text-green-800"
                            }`}
                          >
                            {avalCalculation.needsAval ? "⚠️ REQUIERE AVAL" : "✓ NO REQUIERE AVAL"}
                          </p>
                          <p className={`text-xs ${avalCalculation.needsAval ? "text-red-700" : "text-green-700"}`}>
                            {avalCalculation.needsAval
                              ? "Los ingresos son insuficientes para cubrir el alquiler sin aval."
                              : "Los ingresos son suficientes para cubrir el alquiler sin necesidad de aval."}
                          </p>
                        </div>
                      )}

                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Ingresos mínimos requeridos:</span>
                          <span className="font-semibold">{formatCurrency(avalCalculation.minRequiredIncome!)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Ingresos ideales:</span>
                          <span className="font-semibold">{formatCurrency(avalCalculation.idealIncome!)}</span>
                        </div>
                        {avalCalculation.incomeRatio && avalCalculation.income > 0 && (
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-muted-foreground">Tasa de esfuerzo:</span>
                            <span
                              className={`font-bold ${avalCalculation.incomeRatio <= 40 ? "text-green-600" : "text-red-600"}`}
                            >
                              {avalCalculation.incomeRatio.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground italic">
                          💡 Los ingresos deben ser al menos 2.5x el precio del alquiler (máximo 40% de tasa de esfuerzo).
                          Idealmente 3.3x (30% de tasa de esfuerzo).
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="p-3 rounded-md bg-yellow-100 border border-yellow-300">
                      <p className="text-xs font-medium text-yellow-800">
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
                    onClick={async () => {
                      if (selectedLead.Correo) {
                        await updateLeadStatus(Number(selectedLead.id), "Pedir Aval")

                        // Update selectedLead state to reflect the change immediately
                        setSelectedLead({ ...selectedLead, Estado: "Pedir Aval" })

                        const subject = encodeURIComponent("Solicitud de Datos de Aval")
                        const body = encodeURIComponent(
                          `Estimado/a ${selectedLead.Nombre},\n\n` +
                            `Necesitamos solicitar información adicional sobre su aval para continuar con el proceso de alquiler.\n\n` +
                            `Por favor, proporcione los siguientes documentos:\n` +
                            `- DNI/NIE del avalista\n` +
                            `- Justificante de ingresos del avalista\n` +
                            `- Declaración de la renta del avalista\n\n` +
                            `Saludos cordiales`,
                        )
                        window.open(`mailto:${selectedLead.Correo}?subject=${subject}&body=${body}`, "_blank")
                        setIsAvalDialogOpen(false)
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
          <DialogContent className="z-[400]">
            <DialogHeader>
              <DialogTitle>Reprogramar Visita</DialogTitle>
              <DialogDescription>
                Selecciona una nueva fecha y hora para la visita del lead.
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
              <div className="space-y-2">
                <label htmlFor="visit-agent" className="text-sm font-medium">
                  Seleccionar Agente
                </label>
                <select
                  id="visit-agent"
                  value={selectedAgenteId}
                  onChange={(e) => setSelectedAgenteId(e.target.value)}
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
              <div className="space-y-2">
                <label htmlFor="visit-date" className="text-sm font-medium">
                  Nueva fecha y hora de visita
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Input
                    id="visit-date"
                    type="date"
                    value={newVisitDateDate}
                    onChange={(e) => setNewVisitDateDate(e.target.value)}
                    className="w-full"
                  />
                  <Select
                    value={newVisitDateTime}
                    onValueChange={(value) => setNewVisitDateTime(value)}
                  >
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Hora (24h)" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, h) => h).map((hour) => (
                        ["00","15","30","45"].map((m) => {
                          const hh = String(hour).padStart(2, "0")
                          const mm = m
                          const val = `${hh}:${mm}`
                          return (
                            <SelectItem key={val} value={val}>
                              {val}
                            </SelectItem>
                          )
                        })
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-between">
              <Button 
                variant="destructive" 
                onClick={() => setIsCancelConfirmOpen(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                Cancelar Visita
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => {
                  setVisitDateDialogOpen(false)
                  setSelectedAgenteId("")
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
        <AlertDialogContent className="z-[500]">
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
        <DialogContent className="z-[350]">
          <DialogHeader>
            <DialogTitle>Gestionar documentos</DialogTitle>
            <DialogDescription>
              Sube imágenes o PDF para este lead. Se guardarán en la carpeta del lead (ID {selectedLead?.id ?? "sin id"}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div style={{ display: "flex", gap: "1rem" }}>
              <div
                onDragOver={(e) => { e.preventDefault(); setDropActiveDni(true) }}
                onDragLeave={() => setDropActiveDni(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDropActiveDni(false);
                  const files = Array.from(e.dataTransfer.files || [])
                  files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "dni" : `dni-${idx+1}`))
                }}
                onClick={() => { if (!docsUploadLoading) { dniInputRef.current?.click() } }}
                className={`flex-[2] border-2 border-dashed rounded-lg p-4 transition cursor-pointer ${dropActiveDni ? "border-primary bg-primary/10 dark:bg-primary/20" : "border-input bg-muted/50 dark:bg-input/30"}`}
              >
                <input
                  ref={dniInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "dni" : `dni-${idx+1}`))
                    e.currentTarget.value = ""
                  }}
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">DNI/NIE</span>
                  <span className="text-xs px-1.5 py-0.5 rounded border font-semibold tracking-wide bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800">Haz clic o arrastra aquí</span>
                </div>
                <div className="text-sm text-muted-foreground">Admite imágenes y PDF</div>
              </div>

              <div
                onDragOver={(e) => { e.preventDefault(); setDropActiveIncome(true) }}
                onDragLeave={() => setDropActiveIncome(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDropActiveIncome(false);
                  const files = Array.from(e.dataTransfer.files || [])
                  files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "ingresos" : `ingresos-${idx+1}`))
                }}
                onClick={() => { if (!docsUploadLoading) { incomeInputRef.current?.click() } }}
                className={`flex-[2] border-2 border-dashed rounded-lg p-4 transition cursor-pointer ${dropActiveIncome ? "border-emerald-500 bg-emerald-500/10 dark:bg-emerald-900/40 dark:border-emerald-900/40" : "border-input bg-muted/50 dark:bg-input/30"}`}
              >
                <input
                  ref={incomeInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    files.forEach((file, idx) => uploadLeadDocWithOverride(file, idx === 0 ? "ingresos" : `ingresos-${idx+1}`))
                    e.currentTarget.value = ""
                  }}
                />
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">Justificante de Ingresos</span>
                  <span className="text-xs px-1.5 py-0.5 rounded border font-semibold tracking-wide bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:border-emerald-800">Haz clic o arrastra aquí</span>
                </div>
                <div className="text-sm text-muted-foreground">Admite imágenes y PDF</div>
              </div>
            </div>

            

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <span style={{ fontWeight: 600 }}>Archivos del lead</span>
                {docsLoading && <span className="inline-flex items-center text-xs text-muted-foreground"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Cargando...</span>}
              </div>
              {docsList.length === 0 && !docsLoading ? (
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Sin archivos</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 240, overflowY: "auto" }}>
                  {docsList.map((f) => {
                    const isPdf = /pdf/i.test(String(f.contentType)) || /\.pdf$/i.test(String(f.name))
                    const fileUrl = `/api/nextcloud/file?path=${encodeURIComponent(f.path)}`
                    return (
                      <div key={f.path} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid #e5e7eb", borderRadius: 6, padding: "0.5rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FileText className="h-4 w-4" />
                          <div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>{f.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{new Date(f.lastModified).toLocaleString("es-ES")}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <Button variant="outline" className="h-8" onClick={() => openAttachmentPreview(fileUrl, f.name)}>
                            Visualizar
                          </Button>
                          <a href={fileUrl} target="_blank" rel="noreferrer" download>
                            <Button variant="outline" className="h-8">Descargar</Button>
                          </a>
                          <Button variant="destructive" className="h-8" onClick={() => deleteLeadDoc(f.path)} disabled={docsDeletingPath === f.path}>
                            {docsDeletingPath === f.path ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDocsDialogOpen(false)} disabled={docsUploadLoading}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!attachmentPreviewUrl} onOpenChange={closeAttachmentPreview}>
        <DialogContent className="z-[360]">
          <DialogHeader>
            <DialogTitle>Vista previa de archivo</DialogTitle>
            <DialogDescription>{attachmentPreviewName}</DialogDescription>
          </DialogHeader>
          <div>
            {attachmentPreviewUrl && (
              attachmentPreviewKind === "image" ? (
                <img src={attachmentPreviewUrl} alt={attachmentPreviewName} style={{ maxHeight: "70vh", maxWidth: "100%", borderRadius: 8 }} />
              ) : (
                <iframe src={attachmentPreviewUrl} style={{ width: "100%", height: "70vh", borderRadius: 8 }} />
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCommDialogOpen} onOpenChange={setIsCommDialogOpen}>
          <DialogContent
            className="sm:max-w-3xl max-h-[90vh] overflow-y-auto z-[300]"
            onInteractOutside={(e) => {
              e.preventDefault()
            }}
          >
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold">
                {selectedCommunication && selectedCommunication.source === "whatsapp" ? (
                  <>
                    <span className={isCommunicationSent(selectedCommunication) ? "text-blue-600" : "text-green-600"}>
                      💬 WhatsApp {isCommunicationSent(selectedCommunication) ? "Enviado" : "Recibido"}
                    </span>
                  </>
                ) : selectedCommunication && isCommunicationSent(selectedCommunication) ? (
                  <>
                    <span className="text-blue-600">📤 Correo Enviado</span>
                  </>
                ) : (
                  <>
                    <span className="text-green-600">📥 Correo Recibido</span>
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
                      ? "bg-blue-50 border-blue-200"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <div className="space-y-2 text-sm">
                    {selectedCommunication.source === "whatsapp" ? (
                      <>
                        <div className="flex gap-2">
                          <span className="font-semibold min-w-[80px]">Tipo:</span>
                          <span>Mensaje de WhatsApp</span>
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
                <div className="border rounded-lg p-4 bg-white">
                  <h3 className="text-sm font-semibold mb-3">Mensaje:</h3>
                  {selectedCommunication.source === "whatsapp" ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedCommunication.Mensaje || "Sin contenido" }}
                    />
                  ) : selectedCommunication.Html ? (
                    <div
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: selectedCommunication.Html }}
                    />
                  ) : selectedCommunication.Text ? (
                    <div className="whitespace-pre-wrap text-sm">{selectedCommunication.Text}</div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Sin contenido</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </>
    )
  }
