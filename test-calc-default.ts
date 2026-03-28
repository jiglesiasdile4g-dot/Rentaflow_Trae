import { generateSlotCandidates } from "./lib/agenda-utils"

const relevantSlots = []
const mappedAds = []
const defaultDur = 20
const defaultGap = 5

const candidates = generateSlotCandidates(relevantSlots as any, mappedAds as any, defaultDur, defaultGap)
console.log(candidates)

