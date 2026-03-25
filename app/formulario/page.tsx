"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Person = {
  nombre: string
  correo: string
  telefono: string
  whatsapp: string
  codigoPostal: string
  ingresos: string
  tipoDocumento: string
  documento: string
  pais: string
  tipo: string
}

const createPerson = (): Person => ({
  nombre: "",
  correo: "",
  telefono: "",
  whatsapp: "",
  codigoPostal: "",
  ingresos: "",
  tipoDocumento: "",
  documento: "",
  pais: "España",
  tipo: "",
})

const toNumberOrNull = (value: string) => {
  if (value === "") return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const toFechaObj = (value: string) => {
  if (!value) return { year: "", month: "", day: "" }
  const [year, month, day] = value.split("-")
  return { year: year || "", month: month || "", day: day || "" }
}

const toDateInputValue = (value: any) => {
  if (!value) return ""
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    const d = new Date(value)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  if (typeof value === "object") {
    const year = String(value?.year ?? "")
    const month = String(value?.month ?? "")
    const day = String(value?.day ?? "")
    if (year && month && day) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
    }
  }
  return ""
}

const toStringValue = (value: any) => {
  if (value === null || value === undefined) return ""
  return String(value)
}

const pickValue = (obj: Record<string, any> | null | undefined, keys: string[]) => {
  if (!obj) return ""
  for (const key of keys) {
    const value = obj[key]
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return value
    }
  }
  return ""
}

const isValidEmail = (value: string) => {
  if (!value) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(value)
}

const normalizeDocumento = (value: string) => value.replace(/\s+/g, "").toUpperCase()

const isValidDni = (value: string) => {
  const doc = normalizeDocumento(value)
  if (!/^\d{8}[A-Z]$/.test(doc)) return false
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE"
  const number = Number(doc.slice(0, 8))
  return doc[8] === letters[number % 23]
}

const isValidNie = (value: string) => {
  const doc = normalizeDocumento(value)
  if (!/^[XYZ]\d{7}[A-Z]$/.test(doc)) return false
  const letters = "TRWAGMYFPDXBNJZSQVHLCKE"
  const prefix = doc[0] === "X" ? "0" : doc[0] === "Y" ? "1" : "2"
  const number = Number(prefix + doc.slice(1, 8))
  return doc[8] === letters[number % 23]
}

const countries = [
  "Afganistán",
  "Albania",
  "Alemania",
  "Andorra",
  "Angola",
  "Antigua y Barbuda",
  "Arabia Saudí",
  "Argelia",
  "Argentina",
  "Armenia",
  "Australia",
  "Austria",
  "Azerbaiyán",
  "Bahamas",
  "Bangladés",
  "Barbados",
  "Baréin",
  "Bélgica",
  "Belice",
  "Benín",
  "Bielorrusia",
  "Birmania",
  "Bolivia",
  "Bosnia y Herzegovina",
  "Botsuana",
  "Brasil",
  "Brunéi",
  "Bulgaria",
  "Burkina Faso",
  "Burundi",
  "Bután",
  "Cabo Verde",
  "Camboya",
  "Camerún",
  "Canadá",
  "Catar",
  "Chad",
  "Chile",
  "China",
  "Chipre",
  "Ciudad del Vaticano",
  "Colombia",
  "Comoras",
  "Corea del Norte",
  "Corea del Sur",
  "Costa de Marfil",
  "Costa Rica",
  "Croacia",
  "Cuba",
  "Dinamarca",
  "Dominica",
  "Ecuador",
  "Egipto",
  "El Salvador",
  "Emiratos Árabes Unidos",
  "Eritrea",
  "Eslovaquia",
  "Eslovenia",
  "España",
  "Estados Unidos",
  "Estonia",
  "Esuatini",
  "Etiopía",
  "Filipinas",
  "Finlandia",
  "Fiyi",
  "Francia",
  "Gabón",
  "Gambia",
  "Georgia",
  "Ghana",
  "Granada",
  "Grecia",
  "Guatemala",
  "Guyana",
  "Guinea",
  "Guinea ecuatorial",
  "Guinea-Bisáu",
  "Haití",
  "Honduras",
  "Hungría",
  "India",
  "Indonesia",
  "Irak",
  "Irán",
  "Irlanda",
  "Islandia",
  "Islas Marshall",
  "Islas Salomón",
  "Israel",
  "Italia",
  "Jamaica",
  "Japón",
  "Jordania",
  "Kazajistán",
  "Kenia",
  "Kirguistán",
  "Kiribati",
  "Kuwait",
  "Laos",
  "Lesoto",
  "Letonia",
  "Líbano",
  "Liberia",
  "Libia",
  "Liechtenstein",
  "Lituania",
  "Luxemburgo",
  "Macedonia del Norte",
  "Madagascar",
  "Malasia",
  "Malaui",
  "Maldivas",
  "Malí",
  "Malta",
  "Marruecos",
  "Mauricio",
  "Mauritania",
  "México",
  "Micronesia",
  "Moldavia",
  "Mónaco",
  "Mongolia",
  "Montenegro",
  "Mozambique",
  "Namibia",
  "Nauru",
  "Nepal",
  "Nicaragua",
  "Níger",
  "Nigeria",
  "Noruega",
  "Nueva Zelanda",
  "Omán",
  "Países Bajos",
  "Pakistán",
  "Palaos",
  "Panamá",
  "Papúa Nueva Guinea",
  "Paraguay",
  "Perú",
  "Polonia",
  "Portugal",
  "Reino Unido",
  "República Centroafricana",
  "República Checa",
  "República del Congo",
  "República Democrática del Congo",
  "República Dominicana",
  "Ruanda",
  "Rumanía",
  "Rusia",
  "Samoa",
  "San Cristóbal y Nieves",
  "San Marino",
  "San Vicente y las Granadinas",
  "Santa Lucía",
  "Santo Tomé y Príncipe",
  "Senegal",
  "Serbia",
  "Seychelles",
  "Sierra Leona",
  "Singapur",
  "Siria",
  "Somalia",
  "Sri Lanka",
  "Sudáfrica",
  "Sudán",
  "Sudán del Sur",
  "Suecia",
  "Suiza",
  "Surinam",
  "Tailandia",
  "Tanzania",
  "Tayikistán",
  "Timor Oriental",
  "Togo",
  "Tonga",
  "Trinidad y Tobago",
  "Túnez",
  "Turkmenistán",
  "Turquía",
  "Tuvalu",
  "Ucrania",
  "Uganda",
  "Uruguay",
  "Uzbekistán",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Yemen",
  "Yibuti",
  "Zambia",
  "Zimbabue",
]

function FormularioInner() {
  const searchParams = useSearchParams()
  const [inmueble, setInmueble] = useState("")
  const [idc, setIdc] = useState("")
  const [inmobiliariaData, setInmobiliariaData] = useState<any | null>(null)
  const [entrada, setEntrada] = useState("Inmediatamente")
  const [fechaEntrada, setFechaEntrada] = useState("")
  const [countryQuery, setCountryQuery] = useState("")
  const [personCount, setPersonCount] = useState(1)
  const [personas, setPersonas] = useState<Person[]>([
    createPerson(),
    createPerson(),
    createPerson(),
    createPerson(),
  ])
  const [anuncios, setAnuncios] = useState<any[]>([])
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const totalSteps = 1 + personCount
  const requiredLabel = (text: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{text}</span>
      <span className="text-red-600">*</span>
    </span>
  )

  useEffect(() => {
    const inmoParam = searchParams.get("inmueble") || searchParams.get("Inmueble") || ""
    const idcParam = searchParams.get("idc") || searchParams.get("IDC") || ""
    const idParam = searchParams.get("id") || ""
    const idiParam = searchParams.get("idi") || searchParams.get("inmobiliaria") || ""
    if (inmoParam) setInmueble(inmoParam)
    if (idcParam) setIdc(idcParam)
    if (!idcParam && !idParam && !idiParam) return
    const controller = new AbortController()
    const fetchPrefill = async () => {
      try {
        const params = new URLSearchParams()
        if (idcParam) params.set("idc", idcParam)
        if (idParam) params.set("id", idParam)
        if (idiParam) params.set("idi", idiParam)
        const res = await fetch(`/api/formulario/prefill?${params.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) return
        const json = await res.json().catch(() => null)
        const lead = json?.lead
        if (!json?.ok) return
        setInmobiliariaData(json?.inmobiliaria || null)
        setAnuncios(Array.isArray(json?.anuncios) ? json.anuncios : [])
        if (!lead) return

        setInmueble((prev) => prev || toStringValue(pickValue(lead, ["Inmueble", "inmueble"])))
        setIdc((prev) => prev || toStringValue(pickValue(lead, ["IDC", "idc", "Idc", "ID"])) || toStringValue(idcParam))
        setEntrada((prev) => prev || toStringValue(pickValue(lead, ["Entrada", "entrada"])))
        setFechaEntrada((prev) => prev || toDateInputValue(pickValue(lead, ["Fecha_de_Entrada", "fecha_de_entrada", "Fecha Entrada", "fechaEntrada"])))

        const p1 = createPerson()
        p1.nombre = toStringValue(pickValue(lead, ["Nombre", "nombre"]))
        p1.correo = toStringValue(pickValue(lead, ["Correo", "correo", "Email", "email", "correo_proxy"]))
        p1.telefono = toStringValue(pickValue(lead, ["Telefono", "telefono", "Teléfono"]))
        p1.whatsapp = toStringValue(pickValue(lead, ["WhatsApp", "whatsapp", "Whatsapp"]))
        p1.codigoPostal = toStringValue(pickValue(lead, ["Codigo_Postal", "codigo_postal", "Codigo Postal", "codigoPostal"]))
        p1.ingresos = toStringValue(pickValue(lead, ["Ingresos", "ingresos"]))
        p1.tipoDocumento = toStringValue(pickValue(lead, ["Tipo_Documento", "tipo_documento", "Tipo Documento"]))
        p1.documento = toStringValue(pickValue(lead, ["Documento", "documento"]))
        p1.pais = toStringValue(pickValue(lead, ["Pais", "pais"])) || p1.pais

        const p2 = createPerson()
        p2.nombre = toStringValue(pickValue(lead, ["Persona_2", "Persona 2", "persona_2"]))
        p2.correo = toStringValue(pickValue(lead, ["Correo 2", "correo 2"]))
        p2.telefono = toStringValue(pickValue(lead, ["Telefono 2", "Teléfono 2", "telefono 2"]))
        p2.codigoPostal = toStringValue(pickValue(lead, ["Codigo_Postal 2", "Codigo Postal 2", "codigo_postal 2"]))
        p2.ingresos = toStringValue(pickValue(lead, ["Ingresos_2", "Ingresos 2", "ingresos_2"]))
        p2.tipoDocumento = toStringValue(pickValue(lead, ["Tipo_Documento_2", "Tipo Documento 2", "tipo_documento_2"]))
        p2.documento = toStringValue(pickValue(lead, ["Documento_2", "Documento 2", "documento_2"]))
        p2.pais = toStringValue(pickValue(lead, ["Pais_2", "Pais 2", "pais_2"])) || p2.pais
        p2.tipo = toStringValue(pickValue(lead, ["tipo", "Tipo"]))

        const p3 = createPerson()
        p3.nombre = toStringValue(pickValue(lead, ["Persona_3", "Persona 3", "persona_3"]))
        p3.correo = toStringValue(pickValue(lead, ["Correo 3", "correo 3"]))
        p3.telefono = toStringValue(pickValue(lead, ["Telefono 3", "Teléfono 3", "telefono 3"]))
        p3.codigoPostal = toStringValue(pickValue(lead, ["Codigo_Postal 3", "Codigo Postal 3", "codigo_postal 3"]))
        p3.ingresos = toStringValue(pickValue(lead, ["Ingresos_3", "Ingresos 3", "ingresos_3"]))
        p3.tipoDocumento = toStringValue(pickValue(lead, ["Tipo_Documento_3", "Tipo Documento 3", "tipo_documento_3"]))
        p3.documento = toStringValue(pickValue(lead, ["Documento_3", "Documento 3", "documento_3"]))
        p3.pais = toStringValue(pickValue(lead, ["Pais 3", "Pais_3", "pais_3"])) || p3.pais
        p3.tipo = toStringValue(pickValue(lead, ["tipo2", "Tipo2", "tipo_2"]))

        const p4 = createPerson()
        p4.nombre = toStringValue(pickValue(lead, ["Persona_4", "Persona 4", "persona_4"]))
        p4.correo = toStringValue(pickValue(lead, ["Correo 4", "Coreo 4", "correo 4"]))
        p4.telefono = toStringValue(pickValue(lead, ["Telefono 4", "Teléfono 4", "telefono 4"]))
        p4.codigoPostal = toStringValue(pickValue(lead, ["Codigo_Postal 4", "Codigo Postal 4", "codigo_postal 4"]))
        p4.ingresos = toStringValue(pickValue(lead, ["Ingresos_4", "Ingresos 4", "ingresos_4"]))
        p4.tipoDocumento = toStringValue(pickValue(lead, ["Tipo_Documento 4", "Tipo Documento 4", "tipo_documento_4"]))
        p4.documento = toStringValue(pickValue(lead, ["Documento_4", "Documento 4", "documento_4"]))
        p4.pais = toStringValue(pickValue(lead, ["Pais 4", "Pais_4", "pais_4"])) || p4.pais
        p4.tipo = toStringValue(pickValue(lead, ["tipo3", "Tipo3", "tipo_3"]))

        const hasExtraData = (person: Person) => {
          if (
            person.nombre.trim() ||
            person.correo.trim() ||
            person.telefono.trim() ||
            person.whatsapp.trim() ||
            person.codigoPostal.trim() ||
            person.ingresos.trim() ||
            person.tipoDocumento.trim() ||
            person.documento.trim() ||
            person.tipo.trim()
          ) {
            return true
          }
          return person.pais.trim() !== "" && person.pais !== "España"
        }

        setPersonas([p1, p2, p3, p4])
        setPersonCount(1 + [p2, p3, p4].filter(hasExtraData).length)
      } catch (err: any) {
        if (err?.name === "AbortError") return
      }
    }
    fetchPrefill()
    return () => controller.abort()
  }, [searchParams])

  useEffect(() => {
    if (currentStep > personCount) {
      setCurrentStep(personCount)
    }
  }, [currentStep, personCount])

  const filteredCountries = countries.filter((country) => {
    const query = countryQuery.trim().toLowerCase()
    if (!query) return true
    return country.toLowerCase().includes(query)
  })

  const updatePerson = (index: number, field: keyof Person, value: string) => {
    setPersonas((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setResult(null)

    const inmoParam = searchParams.get("idi") || searchParams.get("inmobiliaria") || ""
    const inmoId = inmobiliariaData?.idi ?? toNumberOrNull(inmoParam)
    if (!inmoId) {
      setResult({ ok: false, message: "No se pudo determinar la inmobiliaria" })
      setSubmitting(false)
      return
    }
    if (!inmueble.trim()) {
      setResult({ ok: false, message: "Selecciona un inmueble" })
      setSubmitting(false)
      return
    }

    const [p1, p2, p3, p4] = personas
    const visiblePersons = personas.slice(0, personCount)
    const requiredErrorIndex = visiblePersons.findIndex((p, idx) => {
      if (
        !p.nombre.trim() ||
        !p.correo.trim() ||
        !p.telefono.trim() ||
        !p.ingresos.trim() ||
        !p.tipoDocumento.trim() ||
        !p.documento.trim() ||
        !p.pais.trim()
      ) {
        return true
      }
      if (idx > 0 && !p.tipo.trim()) return true
      return false
    })
    if (requiredErrorIndex !== -1) {
      setResult({
        ok: false,
        message: `Completa todos los datos obligatorios de ${
          requiredErrorIndex === 0 ? "la persona principal" : `Persona ${requiredErrorIndex + 1}`
        }`,
      })
      setSubmitting(false)
      return
    }
    const emailErrorIndex = visiblePersons.findIndex((p) => !isValidEmail(p.correo.trim()))
    if (emailErrorIndex !== -1) {
      setResult({
        ok: false,
        message: `Correo inválido en ${emailErrorIndex === 0 ? "Persona principal" : `Persona ${emailErrorIndex + 1}`}`,
      })
      setSubmitting(false)
      return
    }

    const docErrorIndex = visiblePersons.findIndex((p, idx) => {
      const doc = p.documento.trim()
      if (p.tipoDocumento === "DNI") {
        return doc === "" || !isValidDni(doc)
      }
      if (p.tipoDocumento === "NIE") {
        return doc === "" || !isValidNie(doc)
      }
      if (idx === 0 && p.tipoDocumento !== "" && doc === "") {
        return true
      }
      return false
    })
    if (docErrorIndex !== -1) {
      setResult({
        ok: false,
        message: `Documento inválido en ${docErrorIndex === 0 ? "Persona principal" : `Persona ${docErrorIndex + 1}`}`,
      })
      setSubmitting(false)
      return
    }
    if (!rgpdAccepted) {
      setResult({ ok: false, message: "Debes aceptar la RGPD para continuar" })
      setSubmitting(false)
      return
    }

    const payload: Record<string, any> = {
      Inmobiliaria_Id: inmoId ?? null,
      usuario: inmoId ?? null,
      Inmobiliaria: inmobiliariaData?.Nombre ?? null,
      RGPD_Aceptado: rgpdAccepted,
      Inmueble: inmueble,
      IDC: toNumberOrNull(idc),
      Nombre: p1.nombre,
      Correo: p1.correo,
      Telefono: p1.telefono,
      WhatsApp: p1.whatsapp,
      Codigo_Postal: p1.codigoPostal,
      Ingresos: toNumberOrNull(p1.ingresos),
      Tipo_Documento: p1.tipoDocumento,
      Documento: p1.documento,
      Pais: p1.pais,
      Entrada: entrada,
      Fecha_de_Entrada: toFechaObj(fechaEntrada),

      Persona_2: p2.nombre,
      "Correo 2": p2.correo,
      "Telefono 2": p2.telefono,
      "Codigo_Postal 2": p2.codigoPostal,
      Ingresos_2: toNumberOrNull(p2.ingresos),
      Tipo_Documento_2: p2.tipoDocumento,
      Documento_2: p2.documento,
      Pais_2: p2.pais,
      tipo: p2.tipo,

      Persona_3: p3.nombre,
      "Correo 3": p3.correo,
      "Telefono 3": p3.telefono,
      "Codigo_Postal 3": p3.codigoPostal,
      Ingresos_3: toNumberOrNull(p3.ingresos),
      Tipo_Documento_3: p3.tipoDocumento,
      Documento_3: p3.documento,
      "Pais 3": p3.pais,
      tipo2: p3.tipo,

      Persona_4: p4.nombre,
      "Coreo 4": p4.correo,
      "Telefono 4": p4.telefono,
      "Codigo_Postal 4": p4.codigoPostal,
      Ingresos_4: toNumberOrNull(p4.ingresos),
      "Tipo_Documento 4": p4.tipoDocumento,
      Documento_4: p4.documento,
      "Pais 4": p4.pais,
      tipo3: p4.tipo,
    }

    try {
      const res = await fetch("/api/formulario/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => null)
        setResult({ ok: false, message: json?.error || "Error enviando formulario" })
      } else {
        const json = await res.json().catch(() => null)
        setResult({ ok: true, message: json?.message || "Formulario enviado correctamente" })
      }
    } catch (err: any) {
      setResult({ ok: false, message: err?.message || "Error enviando formulario" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            {(inmobiliariaData?.logo_url || inmobiliariaData?.Nombre) && (
              <div className="flex items-center gap-3">
                {inmobiliariaData?.logo_url && (
                  <Image
                    src={inmobiliariaData.logo_url}
                    alt={inmobiliariaData.Nombre || "Inmobiliaria"}
                    width={120}
                    height={32}
                    className="h-8 w-auto"
                    unoptimized
                    loader={({ src }) => src}
                  />
                )}
                {inmobiliariaData?.Nombre && <div className="text-sm font-medium text-muted-foreground">{inmobiliariaData.Nombre}</div>}
              </div>
            )}
            <CardTitle>Datos personales</CardTitle>
            <CardDescription>
              Cmpleta los datos para continuar con el proceso de selección
              <span className="block text-xs text-muted-foreground">Los campos con * son obligatorios</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {!inmobiliariaData?.idi && !(searchParams.get("idi") || searchParams.get("inmobiliaria")) && (
                <div className="text-sm text-red-600">Falta la inmobiliaria en el enlace. No se puede completar el formulario.</div>
              )}
              {currentStep === 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Datos principales</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label>{requiredLabel("Inmueble")}</Label>
                      {inmueble ? (
                        <div className="h-9 rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground flex items-center">
                          {inmueble || "-"}
                        </div>
                      ) : anuncios.length > 0 ? (
                        <Select value={inmueble} onValueChange={(value) => setInmueble(value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un inmueble" />
                          </SelectTrigger>
                          <SelectContent>
                            {anuncios.map((ad) => {
                              const label = String(ad?.Referencia || ad?.Direccion || ad?.ida || "")
                              const value = String(ad?.Referencia || ad?.Direccion || ad?.ida || "")
                              if (!value) return null
                              return (
                                <SelectItem key={`${ad?.ida || value}`} value={value}>
                                  {label}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="text-sm text-muted-foreground">No hay inmuebles activos para esta inmobiliaria</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label>Número de personas (inquilinos/avalistas)</Label>
                      <Select
                        value={String(personCount)}
                        onValueChange={(value) => {
                          const count = Number(value)
                          setPersonCount(count)
                          setPersonas((prev) => prev.map((p, i) => (i < count ? p : createPerson())))
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="4">4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Entrada</Label>
                      <Select
                        value={entrada}
                        onValueChange={(value) => {
                          setEntrada(value)
                          if (value !== "Fecha aproximada") {
                            setFechaEntrada("")
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona una opción" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Inmediatamente">Inmediatamente</SelectItem>
                          <SelectItem value="Fecha aproximada">Fecha aproximada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {entrada === "Fecha aproximada" && (
                      <div className="space-y-1">
                        <Label>Fecha de entrada</Label>
                        <Input type="date" value={fechaEntrada} onChange={(e) => setFechaEntrada(e.target.value)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {currentStep >= 1 && (
                <>
                  {(() => {
                    const personIndex = currentStep - 1
                    const p = personas[personIndex] || createPerson()
                    const title = personIndex === 0 ? "Persona principal" : `Persona ${personIndex + 1}`
                    return (
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">{title}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>{requiredLabel("Nombre")}</Label>
                            <Input value={p.nombre} onChange={(e) => updatePerson(personIndex, "nombre", e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("Correo")}</Label>
                            <Input type="email" value={p.correo} onChange={(e) => updatePerson(personIndex, "correo", e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("Teléfono")}</Label>
                            <Input
                              value={p.telefono}
                              onChange={(e) => {
                                const value = e.target.value
                                const prevPhone = personas[0]?.telefono || ""
                                updatePerson(personIndex, "telefono", value)
                                if (personIndex === 0) {
                                  const current = personas[0].whatsapp.trim()
                                  if (!current || current === prevPhone.trim()) {
                                    updatePerson(0, "whatsapp", value)
                                  }
                                }
                              }}
                              required
                            />
                          </div>
                          {personIndex === 0 && (
                            <div className="space-y-1">
                              <Label>Número de WhatsApp</Label>
                              <Input value={p.whatsapp} onChange={(e) => updatePerson(personIndex, "whatsapp", e.target.value)} />
                            </div>
                          )}
                          <div className="space-y-1">
                            <Label>Código Postal</Label>
                            <Input value={p.codigoPostal} onChange={(e) => updatePerson(personIndex, "codigoPostal", e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("Ingresos")}</Label>
                            <Input type="number" value={p.ingresos} onChange={(e) => updatePerson(personIndex, "ingresos", e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("Tipo de Documento")}</Label>
                            <Select value={p.tipoDocumento} onValueChange={(v) => updatePerson(personIndex, "tipoDocumento", v)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una opción" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DNI">DNI</SelectItem>
                                <SelectItem value="NIE">NIE</SelectItem>
                                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("Documento")}</Label>
                            <Input value={p.documento} onChange={(e) => updatePerson(personIndex, "documento", e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <Label>{requiredLabel("País")}</Label>
                            <Select
                              value={p.pais}
                              onValueChange={(value) => updatePerson(personIndex, "pais", value)}
                              onOpenChange={(open) => {
                                if (open) setCountryQuery("")
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una opción" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-1">
                                  <Input
                                    value={countryQuery}
                                    onChange={(e) => setCountryQuery(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    placeholder="Buscar país"
                                  />
                                </div>
                                {filteredCountries.length === 0 && (
                                  <div className="px-2 py-2 text-sm text-muted-foreground">Sin resultados</div>
                                )}
                                {filteredCountries.map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {personIndex > 0 && (
                            <div className="space-y-1">
                              <Label>{requiredLabel("Tipo")}</Label>
                              <Select value={p.tipo} onValueChange={(value) => updatePerson(personIndex, "tipo", value)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecciona una opción" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Inquilino">Inquilino</SelectItem>
                                  <SelectItem value="Avalista">Avalista</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })()}

                  {currentStep === totalSteps - 1 && result && (
                    <div className={`text-sm ${result.ok ? "text-green-600" : "text-red-600"}`}>
                      {result.message}
                    </div>
                  )}
                </>
              )}

              {currentStep === totalSteps - 1 && (
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={rgpdAccepted}
                    onCheckedChange={(checked) => setRgpdAccepted(checked === true)}
                    className="mt-1"
                  />
                  <div className="space-y-1">
                    <Label className="cursor-pointer select-none">{requiredLabel("Acepto el tratamiento de datos según RGPD")}</Label>
                    <div className="text-xs text-muted-foreground">Necesario para continuar con el proceso</div>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={currentStep === 0}
                  onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
                >
                  Atrás
                </Button>
                {currentStep < totalSteps - 1 ? (
                  <Button type="button" onClick={() => setCurrentStep((step) => Math.min(totalSteps - 1, step + 1))}>
                    Siguiente
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Enviando..." : "Enviar formulario"}
                  </Button>
                )}
              </div>
              <div className="pt-2 text-center text-xs text-muted-foreground">Powered by RentAflow!</div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function FormularioPage() {
  return (
    <Suspense>
      <FormularioInner />
    </Suspense>
  )
}
