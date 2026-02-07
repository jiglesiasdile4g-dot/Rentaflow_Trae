
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://acesalquiler-supabase.igc7oi.easypanel.host/"
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q"

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspect() {
  const proposalId = 'fd8cfcab-8a4c-4f60-abf2-e7a52fb3a2fc'
  console.log(`Inspecting proposal: ${proposalId}`)

  // 1. Fetch Proposal
  const { data: proposal, error: propError } = await supabase
    .from('PropuestasVisita')
    .select('*')
    .eq('id', proposalId)
    .single()

  if (propError) {
    console.error('Error fetching proposal:', propError)
    return
  }

  console.log('Proposal found:', {
    id: proposal.id,
    leads_invitados: proposal.leads_invitados,
    estado: proposal.estado
  })

  if (!proposal.leads_invitados || proposal.leads_invitados.length === 0) {
    console.log('WARNING: No leads_invitados found in proposal!')
    return
  }

  // 2. Fetch Leads
  const { data: leads, error: leadsError } = await supabase
    .from('Clientes')
    .select('id, Nombre, Telefono')
    .in('id', proposal.leads_invitados)

  if (leadsError) {
    console.error('Error fetching leads:', leadsError)
    return
  }

  console.log('Invited Leads found:', leads)
  
  // 3. Test matching
  const inputPhone = "34672501369"
  const normalizePhone = (p: string | null) => p ? p.replace(/\D/g, "") : ""
  const normalizedInput = normalizePhone(inputPhone)
  
  console.log(`Testing match for input phone: ${inputPhone} (normalized: ${normalizedInput})`)
  
  leads.forEach((lead: any) => {
      const dbPhone = normalizePhone(lead.Telefono)
      const match = dbPhone && normalizedInput && (dbPhone === normalizedInput || dbPhone.endsWith(normalizedInput) || normalizedInput.endsWith(dbPhone))
      console.log(`Lead ${lead.Nombre}: Phone ${lead.Telefono} (normalized: ${dbPhone}) -> Match? ${match}`)
  })
}

inspect()
