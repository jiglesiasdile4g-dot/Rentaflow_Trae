"use client"

import { useState, useTransition } from "react"
import { BellRing, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { sendLeadIncompleteReminderAction } from "@/app/dashboard/leads/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface RemindIncompleteButtonProps {
  lead: any | null
}

export function RemindIncompleteButton({ lead }: RemindIncompleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  // Solo tiene sentido recordar el formulario a leads con datos incompletos.
  const isIncomplete = lead?.Estado === "Datos Incompletos" || lead?.Estado === "Incompleto"
  if (!isIncomplete) return null

  const hasContact = !!(
    String(lead?.Correo || lead?.correo_proxy || "").trim() ||
    String(lead?.n_whatsapp || lead?.Telefono || "").trim()
  )
  const disabled = !hasContact || isPending

  function handleSend() {
    if (!lead) return
    setOpen(false)
    startTransition(async () => {
      const res: any = await sendLeadIncompleteReminderAction(Number(lead.id))
      if (res?.ok) {
        toast({
          title: "Recordatorio enviado",
          description: `Enviado a ${res.count} canal(es).`,
        })
      } else if (res?.skipped) {
        toast({
          title: "No enviado",
          description: res.reason || "El lead no cumple los requisitos.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Error",
          description: res?.error || "No se pudo enviar el recordatorio.",
          variant: "destructive",
        })
      }
    })
  }

  return (
    <>
      <button
        className={`flex items-center gap-0.5 px-3 py-2 text-sm font-medium border rounded-md transition-all ${
          disabled
            ? "border-amber-300 text-amber-300 cursor-not-allowed dark:border-amber-900 dark:text-amber-900"
            : "border-amber-600 text-amber-600 hover:bg-amber-100 hover:border-amber-700 hover:text-amber-700 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900/40 cursor-pointer"
        }`}
        onClick={(e) => {
          e.stopPropagation()
          if (disabled) return
          setOpen(true)
        }}
        disabled={disabled}
        title={hasContact ? "Enviar recordatorio de datos incompletos" : "El lead no tiene email ni teléfono"}
      >
        {isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <BellRing className="h-4 w-4 mr-1" />}
        Enviar recordatorio
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent style={{ zIndex: 30000 }}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <BellRing className="h-5 w-5" />
              Enviar recordatorio de datos incompletos
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              Se enviará un recordatorio a{" "}
              <span className="font-medium">{lead?.Nombre || "este lead"}</span> para que complete el formulario,
              por los canales disponibles (email y/o WhatsApp).
              <br />
              <br />
              Quedará marcado como recordado y no se le volverá a enviar desde el proceso automático.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
