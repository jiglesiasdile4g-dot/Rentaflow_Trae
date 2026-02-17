
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { bookVisitProposal } from "@/app/actions/proposals"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function ProposalBookingForm({ proposalId }: { proposalId: string }) {
  const [phone, setPhone] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [leadName, setLeadName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone) return

    setLoading(true)
    setError(null)

    try {
      const result = await bookVisitProposal(proposalId, phone)

      if (result.success) {
        setSuccess(true)
        const leadNameFromResult = (result as { leadName?: string }).leadName
        if (leadNameFromResult) setLeadName(leadNameFromResult)
        toast({
          title: "¡Visita confirmada!",
          description: "Hemos reservado tu cita correctamente."
        })
      } else {
        setError(result.message || "Ocurrió un error al reservar.")
        toast({
          title: "No se pudo reservar",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (err) {
      setError("Error de conexión. Inténtalo de nuevo.")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-green-700">¡Confirmado!</h3>
          <p className="text-muted-foreground mt-2">
            {leadName ? `Gracias ${leadName}.` : "Gracias."} <br/>
            Tu visita ha sido agendada correctamente.
          </p>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleBook} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Introduce tu teléfono para confirmar</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="Ej: 600123456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="text-lg py-6"
        />
        <p className="text-xs text-muted-foreground">
          Usamos tu teléfono para verificar tu identidad en nuestra base de datos.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full h-12 text-lg" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Verificando...
          </>
        ) : (
          "Reservar Visita"
        )}
      </Button>
    </form>
  )
}
