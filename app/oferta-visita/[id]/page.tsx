
import { notFound } from "next/navigation"
import { getVisitProposal } from "@/app/actions/proposals"
import { ProposalBookingForm } from "../../../components/proposal-booking-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, MapPin, Building, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function VisitProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const proposal = await getVisitProposal(id)

  if (!proposal) {
    notFound()
  }

  const isReservada = proposal.estado === "reservada"
  const date = new Date(proposal.fecha_visita)
  const fechaLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date)
  const horaLabel = new Intl.DateTimeFormat("es-ES", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date)
  // @ts-ignore - inmobiliaria might be added dynamically
  const inmobiliaria = proposal.inmobiliaria

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 gap-6">
      {/* Logo Header */}
      {inmobiliaria?.logo_url && (
        <div className="w-full max-w-md flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={inmobiliaria.logo_url} 
              alt={`Logo ${inmobiliaria.Nombre}`} 
              className="h-20 object-contain" 
            />
        </div>
      )}

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
                  {fechaLabel}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Hora</p>
                <p className="text-muted-foreground">
                  {horaLabel}
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

           {/* Exit Button */}
           {inmobiliaria?.pagina_web && (
             <div className="pt-4 border-t mt-4">
                <Button asChild variant="outline" className="w-full">
                    <Link href={inmobiliaria.pagina_web} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Salir a {inmobiliaria.Nombre || "web"}
                    </Link>
                </Button>
             </div>
           )}
        </CardContent>
      </Card>

      {/* Powered by Footer */}
      <div className="text-center text-xs text-muted-foreground">
        <p>Powered by <span className="font-semibold text-primary">RentaFlow</span></p>
      </div>
    </div>
  )
}
