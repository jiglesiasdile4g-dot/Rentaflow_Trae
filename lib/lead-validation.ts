export function getMissingPersonalFields(lead: any): string[] {
  const missing: string[] = []
  const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")

  if (isEmpty(lead?.Ingresos) || lead?.Ingresos === 0) missing.push("Ingresos")
  if (isEmpty(lead?.Documento)) missing.push("Documento")
  if (isEmpty(lead?.Tipo_Documento)) missing.push("Tipo de documento")
  if (isEmpty(lead?.Pais)) missing.push("País")

  return missing
}
