"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { User, Users, UsersRound, UsersIcon, ShieldCheck, Home, Calendar, Briefcase, ChevronLeft, ChevronRight, Check } from "lucide-react"

// ... types and helpers ...
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
  "Afganistán", "Albania", "Alemania", "Andorra", "Angola", "Antigua y Barbuda", "Arabia Saudí", "Argelia", "Argentina", "Armenia", "Australia", "Austria", "Azerbaiyán", "Bahamas", "Bangladés", "Barbados", "Baréin", "Bélgica", "Belice", "Benín", "Bielorrusia", "Birmania", "Bolivia", "Bosnia y Herzegovina", "Botsuana", "Brasil", "Brunéi", "Bulgaria", "Burkina Faso", "Burundi", "Bután", "Cabo Verde", "Camboya", "Camerún", "Canadá", "Catar", "Chad", "Chile", "China", "Chipre", "Ciudad del Vaticano", "Colombia", "Comoras", "Corea del Norte", "Corea del Sur", "Costa de Marfil", "Costa Rica", "Croacia", "Cuba", "Dinamarca", "Dominica", "Ecuador", "Egipto", "El Salvador", "Emiratos Árabes Unidos", "Eritrea", "Eslovaquia", "Eslovenia", "España", "Estados Unidos", "Estonia", "Esuatini", "Etiopía", "Filipinas", "Finlandia", "Fiyi", "Francia", "Gabón", "Gambia", "Georgia", "Ghana", "Granada", "Grecia", "Guatemala", "Guyana", "Guinea", "Guinea ecuatorial", "Guinea-Bisáu", "Haití", "Honduras", "Hungría", "India", "Indonesia", "Irak", "Irán", "Irlanda", "Islandia", "Islas Marshall", "Islas Salomón", "Israel", "Italia", "Jamaica", "Japón", "Jordania", "Kazajistán", "Kenia", "Kirguistán", "Kiribati", "Kuwait", "Laos", "Lesoto", "Letonia", "Líbano", "Liberia", "Libia", "Liechtenstein", "Lituania", "Luxemburgo", "Macedonia del Norte", "Madagascar", "Malasia", "Malaui", "Maldivas", "Malí", "Malta", "Marruecos", "Mauricio", "Mauritania", "México", "Micronesia", "Moldavia", "Mónaco", "Mongolia", "Montenegro", "Mozambique", "Namibia", "Nauru", "Nepal", "Nicaragua", "Níger", "Nigeria", "Noruega", "Nueva Zelanda", "Omán", "Países Bajos", "Pakistán", "Palaos", "Panamá", "Papúa Nueva Guinea", "Paraguay", "Perú", "Polonia", "Portugal", "Reino Unido", "República Centroafricana", "República Checa", "República del Congo", "República Democrática del Congo", "República Dominicana", "Ruanda", "Rumanía", "Rusia", "Samoa", "San Cristóbal y Nieves", "San Marino", "San Vicente y las Granadinas", "Santa Lucía", "Santo Tomé y Príncipe", "Senegal", "Serbia", "Seychelles", "Sierra Leona", "Singapur", "Siria", "Somalia", "Sri Lanka", "Sudáfrica", "Sudán", "Sudán del Sur", "Suecia", "Suiza", "Surinam", "Tailandia", "Tanzania", "Tayikistán", "Timor Oriental", "Togo", "Tonga", "Trinidad y Tobago", "Túnez", "Turkmenistán", "Turquía", "Tuvalu", "Ucrania", "Uganda", "Uruguay", "Uzbekistán", "Vanuatu", "Venezuela", "Vietnam", "Yemen", "Yibuti", "Zambia", "Zimbabue"
]

function FormularioInner() {
  const searchParams = useSearchParams()
  const [inmueble, setInmueble] = useState("")
  const [idc, setIdc] = useState("")
  const [inmobiliariaData, setInmobiliariaData] = useState<any | null>(null)
  const [entrada, setEntrada] = useState("Inmediatamente")
  const [countryQuery, setCountryQuery] = useState("")
  
  // New Design State
  const [intent, setIntent] = useState<string | null>(null)
  const [labor, setLabor] = useState<string | null>(null)
  const [titularesCount, setTitularesCount] = useState(1)
  const [avalistasCount, setAvalistasCount] = useState(0)
  const [ingresosUF, setIngresosUF] = useState("")
  const [currentStep, setCurrentStep] = useState(1) // 1: Perfil, 2: Datos, 3: Confirmación, 4: Success
  const [currentPersonTab, setCurrentPersonTab] = useState(0)
  const [refCode, setRefCode] = useState("")
  
  // Personas
  const [personas, setPersonas] = useState<Person[]>([
    createPerson(), createPerson(), createPerson(), createPerson(),
  ])
  
  const [anuncios, setAnuncios] = useState<any[]>([])
  const [rgpdAccepted, setRgpdAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)
  
  const totalPersonCount = titularesCount + avalistasCount
  
  // Propiedad seleccionada details
  const selectedAd = anuncios.find(ad => String(ad?.Referencia || ad?.Direccion || ad?.ida || "") === inmueble) || {}
  const propPrice = selectedAd?.Precio || selectedAd?.precio || 0
  const propPriceLabel = propPrice ? `${propPrice} €/mes` : "Consultar"
  const propRooms = selectedAd?.Habitaciones || selectedAd?.habitaciones ? `${selectedAd?.Habitaciones || selectedAd?.habitaciones} hab` : ""
  const propBaths = selectedAd?.Banos || selectedAd?.banos ? `${selectedAd?.Banos || selectedAd?.banos} baños` : ""
  const propSize = selectedAd?.Metros || selectedAd?.metros ? `${selectedAd?.Metros || selectedAd?.metros} m²` : ""
  const propRoomsBaths = [propRooms, propBaths].filter(Boolean).join(" · ")

  // Tasa de esfuerzo calc
  const ingresosNum = parseFloat(ingresosUF) || 0
  const effortRate = ingresosNum > 0 && propPrice > 0 ? (propPrice / ingresosNum) * 100 : null
  const effortOk = effortRate !== null && effortRate <= 40
  const effortClass = effortRate === null ? "" : effortOk ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-400 text-yellow-800"
  const effortBarClass = effortRate === null ? "" : effortOk ? "bg-green-500" : "bg-yellow-500"
  const pct = effortRate !== null ? Math.min(effortRate, 100) : 0

  // Calculation for Step 3 (Resumen)
  const actualIngresosUF = personas.slice(0, titularesCount).reduce((sum, p) => sum + (parseFloat(p.ingresos) || 0), 0)
  const finalEffortRate = actualIngresosUF > 0 && propPrice > 0 ? (propPrice / actualIngresosUF) * 100 : null

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
        // setFechaEntrada((prev) => prev || toDateInputValue(pickValue(lead, ["Fecha_de_Entrada", "fecha_de_entrada", "Fecha Entrada", "fechaEntrada"])))

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
        
        // Try to infer titutlares/avalistas count based on prefilled data
        let newTits = 1;
        let newAvals = 0;
        [p2, p3, p4].forEach(p => {
            if(hasExtraData(p)){
                if(p.tipo?.toLowerCase() === 'avalista') newAvals++;
                else newTits++;
            }
        });
        setTitularesCount(Math.min(4, newTits));
        setAvalistasCount(Math.min(4 - newTits, newAvals));
        
        // Sum ingresos if available
        let sumIngresos = toNumberOrNull(p1.ingresos) || 0;
        if(p2.ingresos) sumIngresos += toNumberOrNull(p2.ingresos) || 0;
        if(p3.ingresos) sumIngresos += toNumberOrNull(p3.ingresos) || 0;
        if(p4.ingresos) sumIngresos += toNumberOrNull(p4.ingresos) || 0;
        if(sumIngresos > 0) setIngresosUF(sumIngresos.toString());

      } catch (err: any) {
        if (err?.name === "AbortError") return
      }
    }
    fetchPrefill()
    return () => controller.abort()
  }, [searchParams])

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
  
  const validateStep1 = () => {
    setResult(null);
    if (!inmueble) {
      setResult({ ok: false, message: "Debes seleccionar un inmueble" });
      return false;
    }
    if (!intent) {
      setResult({ ok: false, message: "Selecciona para qué necesitas el piso" });
      return false;
    }
    if (!labor) {
      setResult({ ok: false, message: "Selecciona tu situación laboral" });
      return false;
    }
    if (!ingresosUF || parseFloat(ingresosUF) <= 0) {
      setResult({ ok: false, message: "Introduce los ingresos netos de la unidad familiar" });
      return false;
    }
    
    // Asignamos tipos a las personas según titulares/avalistas
    const newPersonas = [...personas];
    newPersonas[0].tipo = "Inquilino"; // Siempre inquilino titular
    for (let i = 1; i < totalPersonCount; i++) {
        if (i < titularesCount) newPersonas[i].tipo = "Inquilino";
        else newPersonas[i].tipo = "Avalista";
    }
    setPersonas(newPersonas);
    return true;
  }
  
  const validateStep2 = () => {
      setResult(null);
      const visiblePersons = personas.slice(0, totalPersonCount);
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
        return false
      })
      
      if (requiredErrorIndex !== -1) {
        setCurrentPersonTab(requiredErrorIndex);
        setResult({
          ok: false,
          message: `Faltan datos obligatorios de ${
            requiredErrorIndex === 0 ? "la persona principal" : `la Persona ${requiredErrorIndex + 1} (${visiblePersons[requiredErrorIndex].tipo})`
          }`,
        })
        return false
      }
      
      const emailErrorIndex = visiblePersons.findIndex((p) => !isValidEmail(p.correo.trim()))
      if (emailErrorIndex !== -1) {
        setCurrentPersonTab(emailErrorIndex);
        setResult({
          ok: false,
          message: `Correo inválido en ${emailErrorIndex === 0 ? "Persona principal" : `Persona ${emailErrorIndex + 1}`}`,
        })
        return false
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
        setCurrentPersonTab(docErrorIndex);
        setResult({
          ok: false,
          message: `Documento inválido en ${docErrorIndex === 0 ? "Persona principal" : `Persona ${docErrorIndex + 1}`}`,
        })
        return false
      }
      
      return true;
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    if (!rgpdAccepted) {
      setResult({ ok: false, message: "Debes aceptar la RGPD para continuar" })
      return
    }
    
    setSubmitting(true)
    setResult(null)

    const inmoParam = searchParams.get("idi") || searchParams.get("inmobiliaria") || ""
    const inmoId = inmobiliariaData?.idi ?? toNumberOrNull(inmoParam)
    if (!inmoId) {
      setResult({ ok: false, message: "No se pudo determinar la inmobiliaria" })
      setSubmitting(false)
      return
    }

    const [p1, p2, p3, p4] = personas

    const payload: Record<string, any> = {
      Inmobiliaria_Id: inmoId ?? null,
      usuario: inmoId ?? null,
      Inmobiliaria: inmobiliariaData?.Nombre ?? null,
      RGPD_Aceptado: rgpdAccepted,
      Inmueble: inmueble,
      IDC: toNumberOrNull(idc),
      
      // Datos extra del Step 1
      Intencion: intent,
      Situacion_Laboral: labor,
      Entrada: entrada,
      Ingresos_Unidad_Familiar: toNumberOrNull(ingresosUF),
      
      Nombre: p1.nombre,
      Correo: p1.correo,
      Telefono: p1.telefono,
      WhatsApp: p1.whatsapp,
      Codigo_Postal: p1.codigoPostal,
      Ingresos: toNumberOrNull(p1.ingresos),
      Tipo_Documento: p1.tipoDocumento,
      Documento: p1.documento,
      Pais: p1.pais,

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
        setRefCode(json?.reference || "REF-" + Math.floor(Math.random()*10000))
        setCurrentStep(4) // Success Step
      }
    } catch (err: any) {
      setResult({ ok: false, message: err?.message || "Error enviando formulario" })
    } finally {
      setSubmitting(false)
    }
  }

  // Estilos del nuevo diseño integrados en Tailwind
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] flex items-start justify-center p-6 md:py-12 font-sans selection:bg-black selection:text-white">
      <div className="w-full max-w-[620px]">
        
        {/* Header */}
        <div className="text-center mb-6 pt-2">
          <div className="inline-flex items-center gap-2 bg-white border border-[#e8e8e3] rounded-full py-1.5 px-3.5 pl-1.5 mb-4 shadow-sm">
            <div className="w-5 h-5 bg-[#1a1a1a] rounded-full flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22" fill="none" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
            <span className="text-xs font-semibold tracking-tight text-[#1a1a1a]">
              {inmobiliariaData?.Nombre || "RentAFlow"}
            </span>
          </div>
          <h1 className="text-[clamp(18px,3.5vw,22px)] font-semibold leading-snug mb-1.5 tracking-tight text-[#1a1a1a]">
            Solicitud de alquiler
          </h1>
          <p className="text-[13px] text-[#71716b] leading-relaxed">
            Completa este formulario para que podamos evaluar tu candidatura
          </p>
        </div>

        {/* Property Card */}
        {currentStep < 4 && (
          <div className="bg-white border border-[#e8e8e3] rounded-[8px] p-3.5 mb-5 flex gap-3.5 items-start shadow-sm">
            <div className="w-[52px] h-[52px] rounded-lg bg-[#f9f9f6] border border-[#e8e8e3] flex items-center justify-center text-[22px] shrink-0">
              🏠
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 bg-[#f9f9f6] border border-[#e8e8e3] rounded-full py-0.5 px-2 text-[10px] font-semibold text-[#71716b] uppercase tracking-[0.04em] mb-1.5">
                Inmueble completo
              </div>
              <div className="text-[14px] font-semibold text-[#1a1a1a] leading-snug mb-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {selectedAd?.Direccion || selectedAd?.Referencia || "Selecciona un inmueble"}
              </div>
              <div className="text-[12px] text-[#71716b] flex gap-2.5 flex-wrap">
                {propRoomsBaths && <span>{propRoomsBaths}</span>}
                {propSize && <span>{propSize}</span>}
              </div>
            </div>
            <div className="text-[15px] font-bold text-[#1a1a1a] whitespace-nowrap shrink-0 text-right">
              <span className="block text-[10px] font-medium text-[#a3a39e] uppercase tracking-[0.04em] font-normal">Precio</span>
              {propPriceLabel}
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        {currentStep < 4 && (
          <div className="flex items-center mb-5 bg-white border border-[#e8e8e3] rounded-full p-1 shadow-sm">
            {[1, 2, 3].map((step) => {
              const isActive = currentStep === step;
              const isDone = currentStep > step;
              return (
                <div key={step} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-full text-[12px] font-medium transition-all cursor-default whitespace-nowrap ${isActive ? "bg-[#1a1a1a] text-white" : isDone ? "text-[#71716b]" : "text-[#a3a39e]"}`}>
                  <div className={`w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 transition-all ${isActive ? "bg-white/20 text-white" : isDone ? "bg-[#1a1a1a] text-white" : "bg-[#e8e8e3] text-[#71716b]"}`}>
                    {isDone ? "✓" : step}
                  </div>
                  <span className={`hidden sm:block ${isDone ? "hidden" : ""}`}>
                    {step === 1 ? "Perfil" : step === 2 ? "Datos" : "Confirmación"}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Form Error/Alert at Top Level */}
        {result && currentStep < 4 && (
          <div className={`mb-4 p-3 rounded-lg text-sm font-medium border ${result.ok ? "bg-[#f0fdf4] border-[#86efac] text-[#166534]" : "bg-[#fffbeb] border-[#f59e0b] text-[#92400e]"}`}>
            {result.ok ? "✅ " : "⚠️ "}{result.message}
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white border border-[#e8e8e3] rounded-[14px] shadow-sm overflow-hidden">
          
          {/* STEP 1: Perfil */}
          {currentStep === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="p-5 md:p-6 border-b border-[#e8e8e3]">
                <h2 className="text-[15px] font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">Cuéntanos sobre ti</h2>
                <p className="text-[13px] text-[#71716b]">Unas preguntas rápidas para personalizar el proceso</p>
              </div>
              
              <div className="p-5 md:p-6 space-y-6">
                {/* Inmueble Selection (If not prefilled) */}
                {(!searchParams.get("inmueble") && !searchParams.get("Inmueble")) && anuncios.length > 0 && (
                   <div>
                     <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{requiredLabel("Selecciona el inmueble")}</div>
                     <Select value={inmueble} onValueChange={(value) => setInmueble(value)}>
                       <SelectTrigger className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] focus:ring-0 rounded-[8px]">
                         <SelectValue placeholder="Selecciona un inmueble" />
                       </SelectTrigger>
                       <SelectContent>
                         {anuncios.map((ad) => {
                           const val = String(ad?.Referencia || ad?.Direccion || ad?.ida || "")
                           if (!val) return null
                           return <SelectItem key={val} value={val}>{val}</SelectItem>
                         })}
                       </SelectContent>
                     </Select>
                   </div>
                )}

                {/* Intención */}
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{requiredLabel("¿Para qué necesitas el piso?")}</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "solo", icon: "🧑", title: "Solo/a", desc: "Solo yo viviré" },
                      { id: "pareja", icon: "👫", title: "En pareja", desc: "Viviremos dos" },
                      { id: "familia", icon: "👨‍👩‍👧", title: "Familia", desc: "Con hijos" },
                      { id: "compañeros", icon: "🤝", title: "Compañeros", desc: "Compartiremos" },
                    ].map(opt => (
                      <div 
                        key={opt.id}
                        onClick={() => {
                          setIntent(opt.id)
                          if (opt.id === "solo") {
                            setTitularesCount(1)
                          } else if (["pareja", "familia", "compañeros"].includes(opt.id)) {
                            setTitularesCount(2)
                            if (avalistasCount > 2) {
                              setAvalistasCount(2)
                            }
                          }
                        }}
                        className={`p-3 rounded-[10px] border cursor-pointer transition-all ${intent === opt.id ? "bg-[#1a1a1a] border-[#1a1a1a] text-white" : "bg-white border-[#e8e8e3] hover:border-[#1a1a1a] text-[#1a1a1a]"}`}
                      >
                        <div className="text-xl mb-1.5">{opt.icon}</div>
                        <h3 className="text-[14px] font-semibold mb-0.5">{opt.title}</h3>
                        <p className={`text-[11px] leading-tight ${intent === opt.id ? "text-white/80" : "text-[#71716b]"}`}>{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Laboral */}
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{requiredLabel("Situación laboral")}</div>
                  <div className="flex flex-wrap gap-2">
                    {["Empleado/a", "Autónomo/a", "Funcionario/a", "Estudiante", "Pensionista", "En búsqueda"].map(opt => (
                      <div 
                        key={opt}
                        onClick={() => setLabor(opt)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all border ${labor === opt ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-[#1a1a1a] border-[#e8e8e3] hover:border-[#1a1a1a]"}`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Entrada */}
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{requiredLabel("¿Cuándo quieres entrar?")}</div>
                  <div className="flex flex-wrap gap-2">
                    {["Inmediatamente", "En 1 mes", "En 2–3 meses", "Flexible"].map(opt => (
                      <div 
                        key={opt}
                        onClick={() => setEntrada(opt)}
                        className={`px-3 py-1.5 rounded-full text-[13px] font-medium cursor-pointer transition-all border ${entrada === opt ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-[#1a1a1a] border-[#e8e8e3] hover:border-[#1a1a1a]"}`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cantidad de personas */}
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">¿Cuántas personas incluye la solicitud?</div>
                  <div className="space-y-2 border border-[#e8e8e3] rounded-[10px] p-1 bg-[#f9f9f6]">
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#e8e8e3] shadow-sm">
                      <div>
                        <div className="text-[13px] font-semibold text-[#1a1a1a]">Titulares</div>
                        <div className="text-[11px] text-[#71716b]">Personas en el contrato</div>
                      </div>
                      <div className="flex items-center gap-3 bg-[#f0f0eb] rounded-full p-1">
                        <button type="button" onClick={() => setTitularesCount(Math.max(1, titularesCount - 1))} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#1a1a1a] font-bold shadow-sm disabled:opacity-50" disabled={titularesCount <= 1}>−</button>
                        <span className="text-[13px] font-semibold w-2 text-center">{titularesCount}</span>
                        <button type="button" onClick={() => { if(totalPersonCount < 4) setTitularesCount(titularesCount + 1)}} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#1a1a1a] font-bold shadow-sm disabled:opacity-50" disabled={totalPersonCount >= 4}>+</button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-[#e8e8e3] shadow-sm">
                      <div>
                        <div className="text-[13px] font-semibold text-[#1a1a1a]">Avalistas</div>
                        <div className="text-[11px] text-[#71716b]">Garantía adicional</div>
                      </div>
                      <div className="flex items-center gap-3 bg-[#f0f0eb] rounded-full p-1">
                        <button type="button" onClick={() => setAvalistasCount(Math.max(0, avalistasCount - 1))} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#1a1a1a] font-bold shadow-sm disabled:opacity-50" disabled={avalistasCount <= 0}>−</button>
                        <span className="text-[13px] font-semibold w-2 text-center">{avalistasCount}</span>
                        <button type="button" onClick={() => { if(totalPersonCount < 4) setAvalistasCount(avalistasCount + 1)}} className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-[#1a1a1a] font-bold shadow-sm disabled:opacity-50" disabled={totalPersonCount >= 4}>+</button>
                      </div>
                    </div>
                    {totalPersonCount >= 4 && <div className="text-[11px] text-yellow-600 text-center pb-1">Máximo 4 personas por solicitud</div>}
                  </div>
                </div>

                {/* Ingresos & Tasa de Esfuerzo */}
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a] mb-2">{requiredLabel("Ingresos mensuales netos totales")}</div>
                  <div className="relative mb-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71716b] font-medium">€</span>
                    <Input 
                      type="number" 
                      placeholder="p.ej. 2400" 
                      value={ingresosUF}
                      onChange={(e) => setIngresosUF(e.target.value)}
                      className="pl-8 bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] focus:ring-0 rounded-[8px] h-[42px] font-medium"
                    />
                  </div>
                  <div className="text-[11px] text-[#71716b] mb-4">Suma de todos los ingresos netos mensuales de quienes vivirán en el piso</div>
                  
                  {/* Effort Widget */}
                  {effortRate !== null && (
                    <div className={`p-4 rounded-[10px] border transition-all ${effortClass}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <div className="text-[13px] font-semibold">Tasa de esfuerzo</div>
                          <div className="text-[11px] opacity-80">Alquiler sobre ingresos totales</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded-full text-[13px] font-bold ${effortOk ? "bg-green-100" : "bg-yellow-100"}`}>
                          {effortRate.toFixed(0)}%
                        </div>
                      </div>
                      
                      <div className="h-1.5 bg-black/10 rounded-full relative mb-3 overflow-hidden">
                        {/* 30-40% optimal zone indicator */}
                        <div className="absolute top-0 bottom-0 left-[30%] w-[10%] bg-black/5 z-0"></div>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 relative z-10 ${effortBarClass}`}
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                      
                      <div className="text-[12px] leading-snug">
                        {effortRate < 30 ? (
                          <>✅ <strong>Perfil sólido.</strong> Destinas el {effortRate.toFixed(0)}% al alquiler (óptimo &lt;30%). Candidatura muy favorable.</>
                        ) : effortRate <= 40 ? (
                          <>✅ <strong>Dentro del rango aceptable.</strong> El {effortRate.toFixed(0)}% está en la franja habitual (30–40%).</>
                        ) : effortRate <= 50 ? (
                          <>⚠️ <strong>Tasa elevada ({effortRate.toFixed(0)}%).</strong> Supera el 40% recomendado. Añadir un <strong>avalista</strong> ayudará mucho.</>
                        ) : (
                          <>⚠️ <strong>Tasa muy alta ({effortRate.toFixed(0)}%).</strong> Es muy probable que el propietario exija avalistas adicionales o garantías de pago.</>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
              </div>
              
              <div className="p-4 md:px-6 md:py-4 bg-[#f9f9f6] border-t border-[#e8e8e3] flex items-center justify-between">
                <span className="text-[13px] font-semibold text-[#a3a39e]">Paso 1 de 3</span>
                <Button 
                  type="button" 
                  onClick={() => { if(validateStep1()) setCurrentStep(2) }}
                  className="bg-[#1a1a1a] text-white hover:bg-[#333] rounded-[8px] h-[40px] px-5 font-medium"
                >
                  Continuar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Datos Personales */}
          {currentStep === 2 && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="p-5 md:p-6 border-b border-[#e8e8e3]">
                <h2 className="text-[15px] font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">Datos de los solicitantes</h2>
                <p className="text-[13px] text-[#71716b]">Rellena la información de cada persona incluida</p>
              </div>
              
              <div className="p-5 md:p-6">
                <div className="bg-[#f0fdf4] border border-[#86efac] text-[#166534] p-3 rounded-[8px] text-[12px] flex gap-2 items-start mb-6">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>Tus datos se tratan de forma confidencial y solo se usan para evaluar tu candidatura. <strong>RGPD aplicado.</strong></span>
                </div>
                
                {/* Person Form */}
                <div className="space-y-8">
                  {personas.slice(0, totalPersonCount).map((p, idx) => {
                    return (
                      <div key={idx} className="animate-in fade-in duration-200 bg-white border border-[#e8e8e3] p-5 rounded-[12px] shadow-sm">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#e8e8e3]">
                          <span className="text-[15px] font-semibold text-[#1a1a1a]">
                            {idx === 0 ? "Titular Principal" : p.tipo} {idx + 1}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-[13px] font-medium">{requiredLabel("Nombre completo")}</Label>
                            <Input
                              value={p.nombre}
                              onChange={(e) => updatePerson(idx, "nombre", e.target.value)}
                              placeholder="Ej. María García López"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">{requiredLabel("Correo electrónico")}</Label>
                            <Input
                              type="email"
                              value={p.correo}
                              onChange={(e) => updatePerson(idx, "correo", e.target.value)}
                              placeholder="correo@ejemplo.com"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">{requiredLabel("Teléfono")}</Label>
                            <Input
                              type="tel"
                              value={p.telefono}
                              onChange={(e) => updatePerson(idx, "telefono", e.target.value)}
                              placeholder="+34 600 000 000"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">{requiredLabel("Tipo de Documento")}</Label>
                            <Select value={p.tipoDocumento} onValueChange={(val) => updatePerson(idx, "tipoDocumento", val)}>
                              <SelectTrigger className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]">
                                <SelectValue placeholder="Selecciona..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="DNI">DNI</SelectItem>
                                <SelectItem value="NIE">NIE</SelectItem>
                                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">{requiredLabel("Número de Documento")}</Label>
                            <Input
                              value={p.documento}
                              onChange={(e) => updatePerson(idx, "documento", e.target.value.toUpperCase())}
                              placeholder="12345678A"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px] uppercase"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">{requiredLabel("Ingresos mensuales netos")}</Label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71716b]">€</span>
                              <Input
                                type="number"
                                value={p.ingresos}
                                onChange={(e) => updatePerson(idx, "ingresos", e.target.value)}
                                placeholder="p.ej. 1500"
                                className="pl-8 bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">WhatsApp <span className="text-[#a3a39e] font-normal">(Opcional)</span></Label>
                            <Input
                              type="tel"
                              value={p.whatsapp}
                              onChange={(e) => updatePerson(idx, "whatsapp", e.target.value)}
                              placeholder="Si es distinto al teléfono"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">País de origen</Label>
                            <Select value={p.pais} onValueChange={(val) => updatePerson(idx, "pais", val)}>
                              <SelectTrigger className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]">
                                <SelectValue placeholder="Selecciona país" />
                              </SelectTrigger>
                              <SelectContent>
                                <div className="p-1">
                                  <Input
                                    value={countryQuery}
                                    onChange={(e) => setCountryQuery(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                    placeholder="Buscar país"
                                    className="h-8"
                                  />
                                </div>
                                {filteredCountries.map((country) => (
                                  <SelectItem key={country} value={country}>{country}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[13px] font-medium">Código Postal <span className="text-[#a3a39e] font-normal">(Opcional)</span></Label>
                            <Input
                              value={p.codigoPostal}
                              onChange={(e) => updatePerson(idx, "codigoPostal", e.target.value)}
                              placeholder="28001"
                              className="bg-[#f0f0eb] border-transparent focus:bg-white focus:border-[#1a1a1a] h-[42px] rounded-[8px]"
                            />
                          </div>

                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              
              <div className="p-4 md:px-6 md:py-4 bg-[#f9f9f6] border-t border-[#e8e8e3] flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setCurrentStep(1)}
                  className="text-[#71716b] hover:text-[#1a1a1a] hover:bg-[#e8e8e3] rounded-[8px] h-[40px] px-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
                </Button>
                
                {currentPersonTab < totalPersonCount - 1 ? (
                  <Button 
                    type="button" 
                    onClick={() => setCurrentPersonTab(t => t + 1)}
                    className="bg-white border border-[#e8e8e3] text-[#1a1a1a] hover:bg-[#f0f0eb] rounded-[8px] h-[40px] px-5 font-medium shadow-sm"
                  >
                    Siguiente persona <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                ) : (
                  <Button 
                    type="button" 
                    onClick={() => { if(validateStep2()) setCurrentStep(3) }}
                    className="bg-[#1a1a1a] text-white hover:bg-[#333] rounded-[8px] h-[40px] px-5 font-medium shadow-sm"
                  >
                    Ver resumen <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Resumen */}
          {currentStep === 3 && (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="p-5 md:p-6 border-b border-[#e8e8e3]">
                <h2 className="text-[15px] font-semibold text-[#1a1a1a] mb-0.5 tracking-tight">Revisa tu solicitud</h2>
                <p className="text-[13px] text-[#71716b]">Confirma que todo es correcto antes de enviar</p>
              </div>
              
              <div className="p-5 md:p-6 space-y-5">
                
                <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[10px] p-4">
                  <h3 className="text-[12px] font-bold text-[#1a1a1a] uppercase tracking-wider mb-3">Perfil de candidatura</h3>
                  <div className="grid grid-cols-2 gap-y-3 text-[13px]">
                    <div><span className="text-[#71716b] block text-[11px]">Intención</span><span className="font-medium capitalize">{intent}</span></div>
                    <div><span className="text-[#71716b] block text-[11px]">Laboral</span><span className="font-medium">{labor}</span></div>
                    <div><span className="text-[#71716b] block text-[11px]">Entrada</span><span className="font-medium">{entrada}</span></div>
                    <div><span className="text-[#71716b] block text-[11px]">Ingresos Conjuntos (Titulares)</span><span className="font-medium">{actualIngresosUF} €</span></div>
                    {finalEffortRate !== null && (
                      <div>
                        <span className="text-[#71716b] block text-[11px]">Tasa de Esfuerzo</span>
                        <span className={`font-medium ${finalEffortRate > 40 ? "text-red-600" : finalEffortRate > 30 ? "text-yellow-600" : "text-green-600"}`}>
                          {finalEffortRate.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[12px] font-bold text-[#1a1a1a] uppercase tracking-wider mb-2">Solicitantes ({totalPersonCount})</h3>
                  {personas.slice(0, totalPersonCount).map((p, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 border border-[#e8e8e3] rounded-[8px]">
                      <div className="w-8 h-8 rounded-full bg-[#f0f0eb] flex items-center justify-center text-[#71716b] shrink-0 mt-0.5">
                        {p.tipo === "Avalista" ? <ShieldCheck className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[14px] font-semibold text-[#1a1a1a] truncate">{p.nombre}</span>
                          <span className="text-[10px] font-medium bg-[#f0f0eb] text-[#71716b] px-1.5 py-0.5 rounded-sm">{p.tipo}</span>
                        </div>
                        <div className="text-[12px] text-[#71716b] truncate">{p.correo} • {p.telefono}</div>
                        <div className="text-[12px] text-[#71716b]">{p.tipoDocumento}: {p.documento} • {p.ingresos}€/mes</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-[#f0fdf4] border border-[#86efac] rounded-[8px] p-3 flex items-start gap-2.5 mt-2">
                  <Checkbox
                    id="rgpd"
                    checked={rgpdAccepted}
                    onCheckedChange={(checked) => setRgpdAccepted(checked === true)}
                    className="mt-0.5 border-[#166534] data-[state=checked]:bg-[#166534]"
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="rgpd" className="text-[13px] font-medium text-[#166534] cursor-pointer">
                      Acepto el tratamiento de datos y condiciones RGPD <span className="text-red-500">*</span>
                    </Label>
                    <p className="text-[11px] text-[#166534]/80 leading-tight">
                      Requerido para que la inmobiliaria pueda procesar tu solicitud y contactarte.
                    </p>
                  </div>
                </div>

              </div>
              
              <div className="p-4 md:px-6 md:py-4 bg-[#f9f9f6] border-t border-[#e8e8e3] flex items-center justify-between">
                <Button 
                  type="button" 
                  variant="ghost"
                  onClick={() => setCurrentStep(2)}
                  className="text-[#71716b] hover:text-[#1a1a1a] hover:bg-[#e8e8e3] rounded-[8px] h-[40px] px-4"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Editar
                </Button>
                
                <Button 
                  type="button" 
                  onClick={handleSubmit}
                  disabled={submitting || !rgpdAccepted}
                  className="bg-[#1a1a1a] text-white hover:bg-[#333] rounded-[8px] h-[40px] px-6 font-medium shadow-sm"
                >
                  {submitting ? "Enviando..." : "Enviar solicitud ✓"}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: SUCCESS */}
          {currentStep === 4 && (
            <div className="animate-in zoom-in-95 duration-500 p-8 md:p-12 text-center">
              <div className="w-16 h-16 bg-[#f0fdf4] border-2 border-[#86efac] rounded-full flex items-center justify-center mx-auto mb-5">
                <Check className="w-8 h-8 text-[#166534]" strokeWidth={3} />
              </div>
              <h2 className="text-[22px] font-bold text-[#1a1a1a] mb-2 tracking-tight">¡Solicitud enviada!</h2>
              <p className="text-[14px] text-[#71716b] mb-8 max-w-[280px] mx-auto leading-relaxed">
                Hemos recibido tu solicitud. En breve nos pondremos en contacto contigo para los siguientes pasos.
              </p>
              
              <div className="bg-[#f9f9f6] border border-[#e8e8e3] rounded-[10px] p-4 text-left max-w-[320px] mx-auto">
                <div className="text-[11px] font-semibold text-[#71716b] uppercase tracking-wider mb-1">Tu referencia</div>
                <div className="text-[18px] font-mono font-bold tracking-widest text-[#1a1a1a]">
                  {refCode}
                </div>
              </div>
            </div>
          )}

        </div>
        
        <div className="text-center mt-6 text-[12px] text-[#a3a39e] font-medium">
          Powered by <span className="text-[#71716b] font-bold">RentAFlow</span>
        </div>

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
