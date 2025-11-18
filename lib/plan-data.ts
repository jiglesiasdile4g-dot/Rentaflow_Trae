export interface PlanData {
  idp: number
  Nombre: string
  ejecuciones: number
  Anuncios: number
  Usuarios: number
  Soporte: string
  Precio: number
}

// Fallback plan data based on the Planes table
export const PLAN_DATA: Record<number, PlanData> = {
  1: {
    idp: 1,
    Nombre: "Mini",
    ejecuciones: 75,
    Anuncios: 0,
    Usuarios: 1,
    Soporte: "Basico",
    Precio: 49,
  },
  2: {
    idp: 2,
    Nombre: "Starter",
    ejecuciones: 150,
    Anuncios: 3,
    Usuarios: 2,
    Soporte: "Email",
    Precio: 99,
  },
  3: {
    idp: 3,
    Nombre: "Agency",
    ejecuciones: 500,
    Anuncios: 10,
    Usuarios: 3,
    Soporte: "Prioritario",
    Precio: 249,
  },
  4: {
    idp: 4,
    Nombre: "Profesional",
    ejecuciones: 1000000,
    Anuncios: 1000000,
    Usuarios: 10,
    Soporte: "24/7",
    Precio: 499,
  },
}

export function getPlanData(planId: number): PlanData | null {
  return PLAN_DATA[planId] || null
}

export function formatPlanValue(value: number): string {
  if (value >= 1000000) {
    return "Ilimitado"
  }
  return value.toLocaleString()
}
