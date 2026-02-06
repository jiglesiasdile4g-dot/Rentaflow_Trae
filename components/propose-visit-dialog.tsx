
"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar as CalendarIcon, Clock, Link as LinkIcon, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { createVisitProposal } from "@/app/actions/proposals"
import { useToast } from "@/hooks/use-toast"

interface ProposeVisitDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedLeadIds: string[]
  selectedAdvertisement?: { Referencia: string; Direccion: string; id: string } | null
  inmobiliariaId: number
}

export function ProposeVisitDialog({ 
  open, 
  onOpenChange, 
  selectedLeadIds,
  selectedAdvertisement,
  inmobiliariaId
}: ProposeVisitDialogProps) {
  const [date, setDate] = useState<Date>()
  const [time, setTime] = useState("")
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

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
        inmobiliariaId
      })

      if (result.success) {
        // Generate the link
        const origin = window.location.origin
        const link = `${origin}/oferta-visita/${result.proposalId}`
        setGeneratedLink(link)
        toast({
          title: "Propuesta creada",
          description: "Copia el enlace para enviarlo a los clientes."
        })
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

  const handleCopy = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({
        title: "Enlace copiado",
        description: "El enlace ha sido copiado al portapapeles."
      })
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after close
    setTimeout(() => {
        setGeneratedLink(null)
        setDate(undefined)
        setTime("")
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Proponer Visita Grupal</DialogTitle>
          <DialogDescription>
            Genera un enlace único para ofrecer esta fecha a los {selectedLeadIds.length} clientes seleccionados. 
            El primero que reserve se quedará con la visita.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Fecha de Visita</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>Hora</Label>
              <div className="relative">
                <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="time" 
                  value={time} 
                  onChange={(e) => setTime(e.target.value)}
                  className="pl-8" 
                />
              </div>
            </div>
            {selectedAdvertisement && (
                <div className="text-sm text-muted-foreground mt-2">
                    Inmueble: <span className="font-medium text-foreground">{selectedAdvertisement.Direccion || selectedAdvertisement.Referencia}</span>
                </div>
            )}
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-2">
                <Check className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1">
                <h3 className="font-medium text-lg">¡Enlace Generado!</h3>
                <p className="text-sm text-muted-foreground">Envía este enlace a los clientes seleccionados.</p>
            </div>
            
            <div className="flex items-center w-full gap-2 mt-2">
                <div className="bg-muted p-2 rounded text-xs font-mono break-all flex-1 border">
                    {generatedLink}
                </div>
                <Button size="icon" variant="outline" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        )}

        <DialogFooter>
            {!generatedLink ? (
                <div className="flex w-full justify-end gap-2">
                    <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleCreateProposal} disabled={loading || !date || !time}>
                        {loading ? "Generando..." : "Generar Enlace"}
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
