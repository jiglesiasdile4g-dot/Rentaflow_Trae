
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { createVisitProposal, getAvailableSlotsForProposal, getAvailableDatesForProposal } from "@/app/actions/proposals"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect } from "react"

interface ProposeVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  selectedAdvertisement?: { Referencia: string; Direccion: string; id: string } | null
  inmobiliariaId: number
  currentAgentId?: number | null
}

export function ProposeVisitDialog({ 
  open, 
  onOpenChange, 
  selectedLeadIds,
  selectedAdvertisement,
  inmobiliariaId,
  currentAgentId
}: ProposeVisitDialogProps) {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [webhookErrorMessage, setWebhookErrorMessage] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loadingDates, setLoadingDates] = useState(false)
  const { toast } = useToast()

  // Load available dates when dialog opens
  useEffect(() => {
    if (open && currentAgentId) {
      setLoadingDates(true)
      // Reset selection
      setDate(undefined)
      setTime("")
      setAvailableSlots([])
      
      getAvailableDatesForProposal(currentAgentId, inmobiliariaId, selectedAdvertisement?.id)
        .then((dates) => {
          setAvailableDates(dates)
        })
        .catch((err) => {
          console.error("Failed to fetch dates", err)
          setAvailableDates([])
        })
        .finally(() => setLoadingDates(false))
    }
  }, [open, currentAgentId, inmobiliariaId, selectedAdvertisement])

  // Load slots when date is selected
  useEffect(() => {
    if (open && date && currentAgentId) {
      setCheckingAvailability(true)
      const dateStr = format(date, "yyyy-MM-dd")
      getAvailableSlotsForProposal(dateStr, currentAgentId, inmobiliariaId, selectedAdvertisement?.id)
        .then((slots) => {
          setAvailableSlots(slots)
          if (time && !slots.includes(time)) {
            setTime("")
          }
        })
        .catch((err) => {
          console.error("Failed to fetch slots", err)
          setAvailableSlots([])
        })
        .finally(() => setCheckingAvailability(false))
    } else if (!date) {
        setAvailableSlots([])
    }
  }, [date, currentAgentId, inmobiliariaId, selectedAdvertisement, open])

  const handleCreateProposal = async () => {
    if (!date || !time) {
      toast({
        title: "Faltan datos",
        description: "Por favor selecciona fecha y hora.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const result = await createVisitProposal({
        leadIds: selectedLeadIds,
        date,
        time,
        inmuebleRef: selectedAdvertisement?.Referencia,
        inmuebleDireccion: selectedAdvertisement?.Direccion,
        inmuebleId: selectedAdvertisement?.id,
        inmobiliariaId,
        origin: window.location.origin,
        agentId: currentAgentId
      })

      if (result.success) {
        if (result.webhookSuccess) {
          // Indicate success without showing link
          setGeneratedLink("sent") 
          toast({
            title: "Propuesta enviada",
            description: "Se ha enviado la propuesta a los sistemas correctamente."
          })
        } else {
          // Proposal created but webhook failed
          setGeneratedLink("sent_with_error")
          setWebhookErrorMessage(result.webhookError || "Error desconocido")
          toast({
            title: "Propuesta creada con advertencia",
            description: result.webhookError || "La propuesta se guardó, pero hubo un error al notificar al sistema externo.",
            duration: 6000
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la propuesta.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after close
    setTimeout(() => {
        setGeneratedLink(null)
        setWebhookErrorMessage(null)
        setDate(undefined)
        setTime("")
        setAvailableDates([])
        setAvailableSlots([])
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Proponer Visita Grupal</DialogTitle>
          <DialogDescription>
            Genera un enlace único para ofrecer esta fecha a los {selectedLeadIds.length} clientes seleccionados. 
            El primero que reserve se quedará con la visita.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="flex flex-col md:flex-row gap-6 py-4 h-[400px]">
            {/* Left Column: Dates List */}
            <div className="flex-shrink-0 w-full md:w-[220px] flex flex-col">
              <Label className="mb-2 block">Fechas disponibles</Label>
              <div className="border rounded-md flex-1 overflow-y-auto p-2 bg-slate-50 space-y-2">
                {loadingDates ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p className="text-xs">Buscando fechas...</p>
                  </div>
                ) : availableDates.length > 0 ? (
                  availableDates.map((dStr) => {
                    const d = new Date(dStr)
                    const isSelected = date && format(date, 'yyyy-MM-dd') === dStr
                    return (
                      <Button
                        key={dStr}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          isSelected && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => {
                          setDate(d)
                          setTime("")
                        }}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-70" />
                        {format(d, "EEE, d MMM", { locale: es })}
                      </Button>
                    )
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                    <CalendarIcon className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No hay fechas configuradas para los próximos 30 días.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Time Slots */}
            <div className="flex-1 flex flex-col min-w-[200px]">
              <Label className="mb-2 block">
                {date ? `Horarios para el ${format(date, "d 'de' MMMM", { locale: es })}` : "Horarios disponibles"}
              </Label>
              
              <div className="flex-1 border rounded-md p-4 overflow-y-auto bg-slate-50">
                {!date ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    <p>Selecciona una fecha de la lista para ver los horarios.</p>
                  </div>
                ) : checkingAvailability ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mb-2" />
                    <p>Buscando huecos...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={time === slot ? "default" : "outline"}
                        className={cn(
                          "w-full",
                          time === slot && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => setTime(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-4">
                    <Clock className="h-8 w-8 mb-2 opacity-20" />
                    <p>No hay huecos disponibles para esta fecha.</p>
                    <p className="text-xs mt-1">(Revisa la agenda del agente o la configuración del inmueble)</p>
                  </div>
                )}
              </div>
              
              {selectedAdvertisement && (
                <div className="text-sm text-muted-foreground mt-2 truncate" title={selectedAdvertisement.Direccion || selectedAdvertisement.Referencia}>
                   <span className="font-medium">Inmueble:</span> {selectedAdvertisement.Direccion || selectedAdvertisement.Referencia}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className={cn(
              "h-12 w-12 rounded-full flex items-center justify-center mb-2",
              generatedLink === "sent_with_error" ? "bg-yellow-100 text-yellow-600" : "bg-green-100 text-green-600"
            )}>
                {generatedLink === "sent_with_error" ? <Clock className="h-6 w-6" /> : <Check className="h-6 w-6" />}
            </div>
            <div className="text-center space-y-1">
                <h3 className="font-medium text-lg">
                  {generatedLink === "sent_with_error" ? "Guardada (Error de Notificación)" : "¡Propuesta Enviada!"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {generatedLink === "sent_with_error" 
                    ? "La propuesta se guardó en la base de datos, pero el webhook falló." 
                    : "La propuesta ha sido enviada al sistema y notificada vía webhook."}
                </p>
                {generatedLink === "sent_with_error" && webhookErrorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-left w-full overflow-auto max-h-[100px]">
                     <p className="text-xs font-bold text-red-800 mb-1">Detalle del error:</p>
                     <p className="text-xs text-red-700 font-mono break-all">{webhookErrorMessage}</p>
                  </div>
                )}
            </div>
          </div>
        )}

        <DialogFooter>
            {!generatedLink ? (
                <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleCreateProposal} disabled={loading || !date || !time}>
                        {loading ? "Enviando..." : "Enviar Propuesta"}
                    </Button>
                </div>
            ) : (
                <Button className="w-full" onClick={handleClose}>Cerrar</Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
