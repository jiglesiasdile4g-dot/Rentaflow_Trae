"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"

export default function ChangePlanButton({ 
  idi, 
  planId, 
  current, 
  redirectPath = "/dashboard/informacion", 
  onSuccess, 
  onError,
  isAdmin = false
}: { 
  idi: number; 
  planId: number; 
  current: boolean; 
  redirectPath?: string; 
  onSuccess?: (newPlanId: number) => void; 
  onError?: (msg: string) => void;
  isAdmin?: boolean;
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [immediate, setImmediate] = useState(false)

  const confirm = async () => {
    setLoading(true)
    try {
      const body: any = { idi, planId }
      if (isAdmin && immediate) {
        body.forceImmediate = true
      }

      const res = await fetch("/api/inmobiliarias/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (res.ok && j?.ok) {
        if (j?.scheduled) {
             const d = j?.scheduledAt ? new Date(j.scheduledAt) : null
             const when = d && !isNaN(d.getTime()) ? formatDate(d) : "próximo periodo"
             toast({ title: "Downgrade programado", description: `Se aplicará en el siguiente periodo: ${when}` })
             router.replace(`${redirectPath}?planUpdate=scheduled&planId=${planId}`)
        } else {
             toast({ title: "Éxito", description: "Plan actualizado correctamente" })
             router.replace(`${redirectPath}?planUpdate=success&planId=${planId}`)
        }
        router.refresh()
        try { onSuccess && onSuccess(planId) } catch {}
      } else {
        const msg = j?.error || `Error ${res.status}`
        toast({ title: "Error", description: msg, variant: "destructive" })
        router.replace(`${redirectPath}?planUpdate=error&msg=${encodeURIComponent(msg)}`)
        router.refresh()
        try { onError && onError(msg) } catch {}
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
          <AlertDialogDescription>
            Se reiniciará el consumo mensual desde hoy. No se realizará ningún pago real.
            {isAdmin && (
                <div className="mt-4 flex items-center space-x-2 border p-2 rounded-md bg-muted/50">
                    <input 
                        type="checkbox" 
                        id="immediate-change" 
                        className="h-4 w-4 rounded border-gray-300"
                        checked={immediate}
                        onChange={(e) => setImmediate(e.target.checked)}
                    />
                    <label htmlFor="immediate-change" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Aplicar inmediatamente (Admin)
                    </label>
                </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirm}>Confirmar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}