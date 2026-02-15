export const PLAN_DATA = {
  "1": { Nombre: "Básico", leads_limit: 100, ejecuciones: 100, Usuarios: 1, Anuncios: 10 },
  "2": { Nombre: "Profesional", leads_limit: 500, ejecuciones: 500, Usuarios: 3, Anuncios: 50 },
  "3": { Nombre: "Enterprise", leads_limit: 1000, ejecuciones: 1000, Usuarios: 10, Anuncios: 100 },
}

export function getPlanData(planId: string | number | null | undefined) {
  const plans: Record<string, { Nombre: string; leads_limit: number; ejecuciones: number; Usuarios: number; Anuncios: number }> = PLAN_DATA
  
  if (!planId) return null
  return plans[String(planId)] || { Nombre: `Plan ${planId}`, leads_limit: 0, ejecuciones: 0, Usuarios: 0, Anuncios: 0 }
}

export function formatPlanValue(value: number | undefined | null) {
  if (value === undefined || value === null) return "0"
  if (value === -1) return "Ilimitado"
  return value.toLocaleString("es-ES")
}
