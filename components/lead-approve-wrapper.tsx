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
  return (
    <ApproveCandidateButton 
      lead={lead} 
      updateLeadStatus={updateLeadStatus}
      onLeadUpdated={onLeadUpdated}
    />
  )
}
