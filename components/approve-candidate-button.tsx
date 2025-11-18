"use client"

import { useState } from "react"
import { getMissingPersonalFields } from "@/lib/lead-validation"
import { CheckCircle, AlertCircle } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export interface ApproveButtonProps {
  lead: any | null
  onApproved?: () => void
}

export function ApproveCandidateButton({ lead, onApproved }: ApproveButtonProps) {
  const [showMissingFieldsAlert, setShowMissingFieldsAlert] = useState(false)
  const [missingFields, setMissingFields] = useState<string[]>([])

  async function handleClick() {
    console.log("[v0] ApproveCandidateButton clicked")

    if (!lead) {
      console.log("[v0] No lead selected")
      return
    }

    console.log("[v0] Checking missing fields for lead:", lead.id)
    const missing = getMissingPersonalFields(lead)
    console.log("[v0] Missing fields:", missing)

    if (missing.length > 0) {
      console.log("[v0] Showing alert dialog for missing fields")
      setMissingFields(missing)
      setShowMissingFieldsAlert(true)
      return
    }

    console.log("[v0] All fields complete, calling onApproved")
    onApproved?.()
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
          color: "#10b981",
          backgroundColor: "transparent",
          border: "1px solid #10b981",
          borderRadius: "0.375rem",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#10b98110"
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <CheckCircle size={16} />
        Aprobar Candidato
      </button>

      <AlertDialog open={showMissingFieldsAlert} onOpenChange={setShowMissingFieldsAlert}>
        <AlertDialogContent style={{ zIndex: 9999 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Datos incompletos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              No puedes aprobar este candidato sin completar la siguiente información en{" "}
              <strong>Información Personal</strong>:
            </AlertDialogDescription>
            <div className="mt-3">
              <ul className="list-disc list-inside space-y-1 text-red-600 font-medium">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
              <p className="mt-4 text-sm text-muted-foreground">
                Por favor, completa estos campos antes de aprobar al candidato.
              </p>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowMissingFieldsAlert(false)}>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
