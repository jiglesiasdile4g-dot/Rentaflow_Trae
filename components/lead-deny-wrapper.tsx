"use client"

import { DenyCandidateButton } from "./deny-candidate-button"

interface LeadDenyWrapperProps {
  lead: any
  updateLeadStatus: (id: number, status: string) => Promise<void>
  onLeadUpdated: (updatedLead: any) => void
}

export function LeadDenyWrapper({ lead, updateLeadStatus, onLeadUpdated }: LeadDenyWrapperProps) {
  return (
    <DenyCandidateButton 
      lead={lead} 
      updateLeadStatus={updateLeadStatus}
      onLeadUpdated={onLeadUpdated}
    />
  )
}
