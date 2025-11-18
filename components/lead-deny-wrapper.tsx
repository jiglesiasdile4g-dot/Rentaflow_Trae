"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { XCircle } from "lucide-react"

interface LeadDenyWrapperProps {
  lead: any
  updateLeadStatus: (id: number, status: string) => Promise<void>
  onLeadUpdated: (updatedLead: any) => void
}

export function LeadDenyWrapper({ lead, updateLeadStatus, onLeadUpdated }: LeadDenyWrapperProps) {
  const [open, setOpen] = React.useState(false)
  const { toast } = useToast()

  return (
    <>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: "transparent",
          color: "#6b7280",
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "400",
          cursor: "pointer",
        }}
        onClick={() => setOpen(true)}
      >
        <XCircle size={16} />
        Denegar Candidato
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" style={{ zIndex: 9999 }}>
          <DialogHeader>
            <DialogTitle>Confirmar denegación del candidato</DialogTitle>
          </DialogHeader>

          <div style={{ padding: "1rem 0" }}>
            <p style={{ marginBottom: "1rem", color: "#6b7280" }}>
              Al confirmar, el candidato será marcado como "Descartado" y no podrá continuar con el proceso de alquiler.
              Esta acción es reversible desde la lista de leads.
            </p>
            <p style={{ fontWeight: "500" }}>¿Desea continuar?</p>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (lead) {
                  await updateLeadStatus(lead.id, "Descartado")
                  onLeadUpdated({ ...lead, Estado: "Descartado" })
                  setOpen(false)
                  toast({
                    title: "Candidato denegado",
                    description: "El estado ha sido cambiado a Descartado",
                  })
                }
              }}
            >
              Confirmar denegación
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
