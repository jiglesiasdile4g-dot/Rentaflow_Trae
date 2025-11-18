"use client"

import * as React from "react"
import { ApproveCandidateButton } from "@/components/approve-candidate-button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface LeadApproveWrapperProps {
  lead: any
  updateLeadStatus: (id: number, status: string) => Promise<void>
  onLeadUpdated: (updatedLead: any) => void
}

export function LeadApproveWrapper({ lead, updateLeadStatus, onLeadUpdated }: LeadApproveWrapperProps) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()

  return (
    <>
      <ApproveCandidateButton lead={lead} onApproved={() => setOpen(true)} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle>Confirmar aprobación del candidato</DialogTitle>
          </DialogHeader>

          <div style={{ padding: "1rem 0" }}>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
              Al confirmar, se enviará un correo electrónico al candidato notificándole que ha sido aprobado y puede
              pasar a la siguiente fase del proceso.
            </p>
            <p style={{ fontWeight: "500" }}>¿Desea continuar?</p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <Button
              variant="outline"
              onClick={() => {
                console.log("[v0] Cancel button clicked")
                setOpen(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                console.log("[v0] Confirm button clicked")
                if (lead) {
                  console.log("[v0] Updating lead status to Aceptado")
                  await updateLeadStatus(lead.id, "Aceptado")
                  onLeadUpdated({ ...lead, Estado: "Aceptado" })
                  setOpen(false)
                  console.log("[v0] Lead approved successfully")
                  toast({
                    title: "Candidato aprobado",
                    description: "El estado ha sido cambiado a Aceptado y se ha enviado un correo de notificación.",
                  })
                }
              }}
            >
              Confirmar y enviar correo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
