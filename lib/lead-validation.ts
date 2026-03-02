export function getMissingPersonalFields(lead: any): string[] {
  const missing: string[] = []
  const isEmpty = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "")

  if (isEmpty(lead?.Ingresos) || lead?.Ingresos === 0) missing.push("Ingresos")
  if (isEmpty(lead?.Documento)) missing.push("Documento")
  if (isEmpty(lead?.Tipo_Documento)) missing.push("Tipo de documento")
  if (isEmpty(lead?.Pais)) missing.push("País")
  if (!isEmpty(lead?.Documento) && !isEmpty(lead?.Tipo_Documento) && isDocumentInvalid(lead?.Tipo_Documento, lead?.Documento)) {
    missing.push("Documento inválido")
  }

  return missing
}

export function normalizeDocumentValue(value: any): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[\s-]/g, "")
}

export function isValidDni(value: string): boolean {
  const normalized = normalizeDocumentValue(value)
  if (!/^\d{8}[A-Z]$/.test(normalized)) return false
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE"
  const number = Number(normalized.slice(0, 8))
  const expected = letters[number % 23]
  return normalized[8] === expected
}

export function isValidNie(value: string): boolean {
  const normalized = normalizeDocumentValue(value)
  if (!/^[XYZ]\d{7}[A-Z]$/.test(normalized)) return false
  const mapping: Record<string, string> = { X: "0", Y: "1", Z: "2" }
  const number = Number(mapping[normalized[0]] + normalized.slice(1, 8))
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE"
  const expected = letters[number % 23]
  return normalized[8] === expected
}

export function isValidPassport(value: string): boolean {
  const normalized = normalizeDocumentValue(value)
  return /^[A-Z0-9]{3,20}$/.test(normalized)
}

export function isDocumentValid(docType: any, docValue: any): boolean {
  const type = String(docType ?? "").trim().toUpperCase()
  const value = normalizeDocumentValue(docValue)
  if (!type || !value) return false
  if (type.startsWith("DNI")) return isValidDni(value)
  if (type.startsWith("NIE")) return isValidNie(value)
  if (type.includes("PASAPORTE") || type.includes("PASSPORT")) return isValidPassport(value)
  return isValidPassport(value)
}

export function isDocumentInvalid(docType: any, docValue: any): boolean {
  const type = String(docType ?? "").trim()
  const value = String(docValue ?? "").trim()
  if (!type || !value) return false
  return !isDocumentValid(type, value)
}
