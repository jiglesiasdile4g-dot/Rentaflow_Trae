"use client"

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { XCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface DenyButtonProps {
  lead: any | null
  updateLeadStatus: (id: number, status: string) => Promise<void>
  onLeadUpdated: (updatedLead: any) => void
}

export function DenyCandidateButton({ lead, updateLeadStatus, onLeadUpdated }: DenyButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const { toast } = useToast()

  // Calcular si está denegado basado en el estado actual del lead
  const isDenied = lead?.Estado === "Descartado"

  function handleDenyClick() {
    if (!lead) return
    console.log("[v0] Deny button clicked")
    setShowConfirmDialog(true)
  }

  async function handleConfirmDenial() {
    console.log("[v0] User confirmed denial")
    setShowConfirmDialog(false)
    
    if (lead) {
      console.log("[v0] Updating lead status to Descartado")
      await updateLeadStatus(lead.id, "Descartado")
      onLeadUpdated({ ...lead, Estado: "Descartado" })
      console.log("[v0] Lead denied successfully")
      
      toast({
        title: "Candidato denegado",
        description: "El estado ha sido cambiado a Descartado",
      })
    }
  }

  return (
    <>
      <button
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          backgroundColor: "transparent",
          color: isDenied ? "#ef4444" : "#6b7280",
          border: "1px solid",
          borderColor: isDenied ? "#ef4444" : "#d1d5db",
          borderRadius: "6px",
          fontSize: "0.875rem",
          fontWeight: "400",
          cursor: isDenied ? "not-allowed" : "pointer",
          opacity: isDenied ? 0.6 : 1,
        }}
        onClick={handleDenyClick}
        disabled={isDenied}
      >
        <XCircle size={16} />
        {isDenied ? "Candidato Denegado" : "Denegar Candidato"}
      </button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent style={{ zIndex: 80000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de cambiar el estado?</AlertDialogTitle>
            <AlertDialogDescription>
              Cambiar el estado a &quot;Descartado&quot; marcará este lead como no válido para el proceso de alquiler.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDenial}
              style={{ backgroundColor: "#ef4444" }}
            >
              Confirmar denegación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}