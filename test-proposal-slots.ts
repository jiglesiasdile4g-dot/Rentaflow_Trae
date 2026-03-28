import { getAvailableSlotsForProposal } from "./app/actions/proposals"

async function run() {
    const slots = await getAvailableSlotsForProposal("2026-03-27", 22, 1, "32")
    console.log("Slots:", slots)
}
run()
