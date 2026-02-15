export function getPlanData(planId: string | number | null | undefined) {
  const plans: Record<string, { Nombre: string; leads_limit: number; ejecuciones: number }> = {
    "1": { Nombre: "Básico", leads_limit: 100, ejecuciones: 100 },
    "2": { Nombre: "Profesional", leads_limit: 500, ejecuciones: 500 },
    "3": { Nombre: "Enterprise", leads_limit: 1000, ejecuciones: 1000 },
  }
  
  if (!planId) return null
  return plans[String(planId)] || { Nombre: `Plan ${planId}`, leads_limit: 0, ejecuciones: 0 }
}

export function formatPlanValue(value: number | undefined | null) {
  if (value === undefined || value === null) return "0"
  if (value === -1) return "Ilimitado"
  return value.toLocaleString("es-ES")
}
