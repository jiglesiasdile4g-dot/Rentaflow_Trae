
import { addMinutes, format, parse } from "date-fns"

export interface AgendaSlot {
  hora_inicio: string
  hora_fin: string
  anuncio_id?: string | number | null
  duracion?: number | null
  gap?: number | null
}

export interface AdData {
  ida: string | number
  Referencia?: string
  Direccion?: string
  duracion_visita?: number
  tiempo_entre_visitas?: number
}

export interface SlotCandidate {
  time: string
  duration: number
  gap: number
  source: string
}

/**
 * Generates valid start times based on agenda slots and their configuration (duration/gap).
 * Respects the hierarchy: Slot Config > Ad Config > Default (20/5).
 */
export function generateSlotCandidates(
  slots: AgendaSlot[],
  ads: AdData[],
  defaultDuration = 20,
  defaultGap = 5
): SlotCandidate[] {
  const candidates: SlotCandidate[] = []

  slots.forEach(slot => {
    const start = slot.hora_inicio.slice(0, 5)
    const end = slot.hora_fin.slice(0, 5)
    
    let duration = defaultDuration
    let gap = defaultGap
    let source = "Defecto"
    
    // Priority 1: Slot specific configuration
    if (slot.duracion) {
        duration = Number(slot.duracion)
        gap = (slot.gap !== undefined && slot.gap !== null) ? Number(slot.gap) : defaultGap
        source = "Agente"
    } else if (slot.anuncio_id) {
        // Priority 2: Slot property configuration
        const ad = ads.find(a => String(a.ida) === String(slot.anuncio_id))
        if (ad) {
            duration = Number(ad.duracion_visita) || defaultDuration
            const gapVal = ad.tiempo_entre_visitas
            gap = (gapVal !== undefined && gapVal !== null) ? Number(gapVal) : defaultGap
            source = "Inmueble"
        }
    }

    // Parse times
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    
    let currentMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    const step = duration + gap
    
    if (step <= 0) return

    while (currentMins + duration <= endMins) {
        const h = Math.floor(currentMins / 60)
        const m = currentMins % 60
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
        
        candidates.push({
            time: timeStr,
            duration,
            gap,
            source
        })
        currentMins += step
    }
  })

  // Deduplicate by time (keeping first found? or maybe check if we need to merge?)
  // If multiple slots cover the same time, we should probably just take one.
  // The original logic just used a Map to dedup.
  const uniqueCandidatesMap = new Map<string, SlotCandidate>()
  candidates.forEach(c => {
      if (!uniqueCandidatesMap.has(c.time)) {
          uniqueCandidatesMap.set(c.time, c)
      }
  })

  return Array.from(uniqueCandidatesMap.values()).sort((a, b) => {
      const [ah, am] = a.time.split(':').map(Number)
      const [bh, bm] = b.time.split(':').map(Number)
      return (ah * 60 + am) - (bh * 60 + bm)
  })
}

/**
 * Checks if two time ranges overlap.
 * [start1, end1) and [start2, end2)
 */
export function isOverlapping(start1: number, end1: number, start2: number, end2: number): boolean {
    return Math.max(start1, start2) < Math.min(end1, end2)
}

/**
 * Calculates the end time in minutes given start time string, duration, and gap.
 */
export function calculateEndTime(startTime: string, duration: number, gap: number): number {
    const [h, m] = startTime.split(':').map(Number)
    return h * 60 + m + duration + gap
}
