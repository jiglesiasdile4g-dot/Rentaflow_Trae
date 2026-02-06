
import { notFound } from "next/navigation"
import { getVisitProposal } from "@/app/actions/proposals"
import { ProposalBookingForm } from "@/components/proposal-booking-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Building } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function VisitProposalPage({ params }: { params: { id: string } }) {
  const proposal = await getVisitProposal(params.id)

  if (!proposal) {
    notFound()
  }

  const isReservada = proposal.estado === "reservada"
  const date = new Date(proposal.fecha_visita)

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold text-primary">Propuesta de Visita</CardTitle>
          <CardDescription>
            {isReservada 
              ? "Esta visita ya ha sido reservada." 
              : "Confirma tu asistencia para asegurar la visita."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Visit Details */}
          <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Fecha</p>
                <p className="text-muted-foreground capitalize">
                  {format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Hora</p>
                <p className="text-muted-foreground">
                  {format(date, "HH:mm", { locale: es })}
                </p>
              </div>
            </div>

            {(proposal.inmueble_direccion || proposal.inmueble_ref) && (
              <div className="flex items-center gap-3 text-sm">
                <Building className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold">Inmueble</p>
                  <p className="text-muted-foreground">
                    {proposal.inmueble_direccion || proposal.inmueble_ref}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Booking Form or Status Message */}
          {isReservada ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
              <p className="text-amber-800 font-medium mb-2">¡Lo sentimos!</p>
              <p className="text-sm text-amber-700">
                Esta fecha ya ha sido reservada por otro cliente. 
                Por favor, mantente atento a futuras propuestas.
              </p>
            </div>
          ) : (
            <ProposalBookingForm proposalId={proposal.id} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
