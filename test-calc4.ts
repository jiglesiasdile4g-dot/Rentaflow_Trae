import { generateSlotCandidates, isOverlapping } from "./lib/agenda-utils"

const agendaData = [
  {
    id: 183,
    agente_id: 22,
    dia_semana: null,
    hora_inicio: "18:30:00",
    hora_fin: "20:10:00",
    fecha: "2026-03-27",
    anuncio_id: null,
    duracion: 15,
    gap: null
  }
]

const existingVisits = [
  {
    fecha_de_visita: "2026-03-27T18:30:00+00:00",
    Inmueble: "Ascao 3 - Hab 1",
    idag: 22,
    Estado: "Visita Confirmada"
  },
  {
    fecha_de_visita: "2026-03-27T17:30:00+00:00",
    Inmueble: "Ascao 3 - Hab 1",
    idag: 22,
    Estado: "Visita Confirmada"
  }
]

const allAds = [
  {
    ida: 32,
    Referencia: "Ascao 3 - Hab 1",
    Direccion: "Calle de Ascao 53, 2º Puerta 1",
    duracion_visita: 20,
    tiempo_entre_visitas: 5,
    whatsapp_activo: true
  }
]

const currentAd = allAds[0]
const uniqueDates = ["2026-03-27"]
const mappedAds = allAds

for (const date of uniqueDates) {
    const dayAgenda = agendaData.filter(a => a.fecha === date)
    const dayVisits = existingVisits?.filter((v: any) => v.fecha_de_visita?.startsWith(date)) || []

    const busyRanges: { start: number, end: number }[] = []

    dayVisits.forEach((v: any) => {
        if (v.fecha_de_visita) {
            if (v.Estado === "Cancelado" || v.Estado === "Descartado") return

            if (currentAd && v.Inmueble) {
                const isSameProperty = 
                    v.Inmueble === currentAd.Referencia || 
                    (currentAd.Direccion && v.Inmueble.includes(currentAd.Direccion)) ||
                    (currentAd.Direccion && currentAd.Direccion.includes(v.Inmueble));
                
                // if (isSameProperty) return; // UNCOMMENT TO SIMULATE BUG?
            }

            const visitDate = new Date(v.fecha_de_visita)
            const startMinutes = visitDate.getHours() * 60 + visitDate.getMinutes()

            let durMinutes = 30
            let gapMinutes = 0

            if (allAds) {
              const visitAd = allAds.find(
                (a: any) =>
                  a.Referencia === v.Inmueble ||
                  a.Direccion === v.Inmueble ||
                  (v.Inmueble && a.Direccion && v.Inmueble.includes(a.Direccion)),
              )
              if (visitAd) {
                durMinutes = visitAd.duracion_visita || 30
                gapMinutes = visitAd.tiempo_entre_visitas || 0
              }
            }

            busyRanges.push({
              start: startMinutes,
              end: startMinutes + durMinutes + gapMinutes,
            })
        }
    })

    console.log("busyRanges:", busyRanges)

    const relevantSlots = dayAgenda.filter((range: any) => {
            if (!range.hora_inicio || !range.hora_fin) return false
            if (range.anuncio_id && currentAd && String(range.anuncio_id) !== String(currentAd.ida)) return false
            return true
    })

    const defaultDur = currentAd ? (currentAd.duracion_visita || 20) : 20
    const defaultGap = currentAd ? (currentAd.tiempo_entre_visitas || 5) : 5

    const candidates = generateSlotCandidates(relevantSlots, mappedAds, defaultDur, defaultGap)

    const validSlots: string[] = []
    const now = new Date() // REAL TIME

    candidates.forEach(candidate => {
        const [h, m] = candidate.time.split(":").map(Number)
        const slotStart = h * 60 + m
        const slotEnd = slotStart + candidate.duration + candidate.gap

        const candidateDateTime = new Date(`${date}T${candidate.time}`).getTime()
        const isBusy = busyRanges.some(r => isOverlapping(slotStart, slotEnd, r.start, r.end))
        const isPast = candidateDateTime < now.getTime()

        console.log(`Candidate ${candidate.time}: isBusy=${isBusy}, isPast=${isPast}`)

        if (!isBusy && !isPast) {
            validSlots.push(candidate.time)
        }
    })

    console.log("validSlots:", validSlots)
}
