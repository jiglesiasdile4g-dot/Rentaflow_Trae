"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

export default function ChangePlanButton({ idi, planId, current }: { idi: number; planId: number; current: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const confirm = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/inmobiliarias/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idi, planId }),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.ok) {
        toast({ title: "Éxito", description: "Plan actualizado correctamente" })
        router.replace(`/dashboard/informacion?planUpdate=success&planId=${planId}`)
        router.refresh()
      } else {
        const msg = j?.error || `Error ${res.status}`
        toast({ title: "Error", description: msg, variant: "destructive" })
        router.replace(`/dashboard/informacion?planUpdate=error&msg=${encodeURIComponent(msg)}`)
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" className="shrink-0" variant={current ? "outline" : "default"} disabled={loading}>
          {current ? "Mantener" : loading ? "Procesando..." : "Seleccionar"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar cambio de plan</AlertDialogTitle>
          <AlertDialogDescription>Se reiniciará el consumo mensual desde hoy. No se realizará ningún pago real.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}