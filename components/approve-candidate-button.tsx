"use client"

import { useState } from "react"
import { getMissingPersonalFields, isDocumentInvalid } from "@/lib/lead-validation"
import { CheckCircle, AlertCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
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

export interface ApproveButtonProps {
  lead: any | null
  updateLeadStatus: (id: number, status: string) => Promise<void>
  onLeadUpdated: (updatedLead: any) => void
}

export function ApproveCandidateButton({ lead, updateLeadStatus, onLeadUpdated }: ApproveButtonProps) {
  const [showMissingFieldsAlert, setShowMissingFieldsAlert] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const { toast } = useToast()
  
  // Calcular si está aprobado basado en el estado actual del lead
  const isApproved = lead?.Estado === "Aceptado"
  const hasDatosIncompletosStatus = lead?.Estado === "Datos Incompletos" || lead?.Estado === "Incompleto"

  async function handleClick() {
    console.log("[v0] ApproveCandidateButton clicked")

    if (!lead) {
      console.log("[v0] No lead selected")
      return
    }

    if (isApproved) {
      console.log("[v0] Already approved, skipping")
      return
    }

    console.log("[v0] Checking missing fields for lead:", lead.id)
    const missing = getMissingPersonalFields(lead)
    console.log("[v0] Missing fields:", missing)

    const docInvalid = [
      isDocumentInvalid(lead?.Tipo_Documento, lead?.Documento),
      isDocumentInvalid(lead?.Tipo_Documento_2, lead?.Documento_2),
      isDocumentInvalid(lead?.Tipo_Documento_3, lead?.Documento_3),
      isDocumentInvalid(lead?.["Tipo_Documento 4"], lead?.Documento_4),
    ].some(Boolean)

    if (missing.length > 0 || hasDatosIncompletosStatus || docInvalid) {
      console.log("[v0] Showing confirm dialog for incomplete data")
      setMissingFields(missing)
      setShowMissingFieldsAlert(true)
      return
    }

    console.log("[v0] All fields complete, showing confirmation dialog")
    setShowConfirmDialog(true)
  }

  async function handleConfirmApproval() {
    console.log("[v0] User confirmed approval")
    setShowConfirmDialog(false)
    
    if (lead) {
      console.log("[v0] Updating lead status to Aceptado")
      await updateLeadStatus(lead.id, "Aceptado")
      onLeadUpdated({ ...lead, Estado: "Aceptado" })
      console.log("[v0] Lead approved successfully")
      
      toast({
        title: "Candidato aprobado",
        description: "El estado ha sido cambiado a Aprobado y se ha enviado un correo de notificación.",
      })
    }
  }

  async function handleConfirmApprovalIncomplete() {
    console.log("[v0] User confirmed approval with incomplete data")
    setShowMissingFieldsAlert(false)

    if (lead) {
      await updateLeadStatus(lead.id, "Aceptado")
      onLeadUpdated({ ...lead, Estado: "Aceptado" })

      toast({
        title: "Candidato aprobado",
        description: "Aviso: se aprobó aunque el lead tiene datos incompletos.",
      })
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: "500",
          color: isApproved ? "#16a34a" : "#10b981",
          backgroundColor: isApproved ? "#dcfce7" : "transparent",
          border: isApproved ? "1px solid #22c55e" : "1px solid #10b981",
          borderRadius: "0.375rem",
          cursor: isApproved ? "default" : "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (!isApproved) {
            e.currentTarget.style.backgroundColor = "#10b98110"
          }
        }}
        onMouseLeave={(e) => {
          if (!isApproved) {
            e.currentTarget.style.backgroundColor = "transparent"
          }
        }}
      >
        <CheckCircle size={16} />
        {isApproved ? "Candidato Aprobado" : "Aprobar Candidato"}
      </button>

      <AlertDialog open={showMissingFieldsAlert} onOpenChange={setShowMissingFieldsAlert}>
        <AlertDialogContent style={{ zIndex: 30000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Datos incompletos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Este lead tiene datos incompletos.
              <br />
              <br />
              Puedes aprobarlo igualmente, pero quedará marcado como aprobado con datos incompletos.
            </AlertDialogDescription>
            {missingFields.length > 0 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-foreground/80">Campos faltantes:</div>
                <ul className="list-disc list-inside space-y-1 text-red-600 font-medium mt-2">
                  {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowMissingFieldsAlert(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApprovalIncomplete}>Aprobar igualmente</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent style={{ zIndex: 30000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="h-5 w-5" />
              Confirmar cambio de estado
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              ¿Estás seguro de cambiar el estado?
              <br />
              <br />
              Cambiar el estado a &quot;Aprobado&quot; activará notificaciones automáticas y otros procesos asociados a este lead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApproval}>Aprobar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
