'use client'

import { useEffect, useState, useTransition } from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { updateSignatureAction, updateWebsiteAction } from './actions'
import { useToast } from '@/hooks/use-toast'
import { Globe, Save } from 'lucide-react'

interface AppearanceSettingsProps {
  idi?: number
  initialSignature?: string
  initialWebsite?: string
  canEdit?: boolean
}
export function AppearanceSettings({ idi, initialSignature, initialWebsite, canEdit }: AppearanceSettingsProps) {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [compact, setCompact] = useState<boolean>(false)
  const [signature, setSignature] = useState(initialSignature || "")
  const [website, setWebsite] = useState(initialWebsite || "")
  const [isPending, startTransition] = useTransition()
  const [isWebsitePending, startWebsiteTransition] = useTransition()
  const { toast } = useToast()

  useEffect(() => {
    try {
      document.documentElement.classList.toggle('compact', compact)
    } catch {}
  }, [compact])

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true)
      try {
        const saved = localStorage.getItem('rf_compact_view') === '1'
        setCompact(saved)
        document.documentElement.classList.toggle('compact', saved)
      } catch {}
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const toggleCompact = (val: boolean) => {
    setCompact(val)
    try {
      document.documentElement.classList.toggle('compact', val)
      localStorage.setItem('rf_compact_view', val ? '1' : '0')
    } catch {}
  }

  const handleSaveSignature = () => {
    if (!idi) return

    startTransition(async () => {
      const formData = new FormData()
      formData.append("idi", String(idi))
      formData.append("firma_html", signature)

      try {
        await updateSignatureAction(formData)
        toast({
          title: "Firma actualizada",
          description: "La firma para comunicados ha sido guardada correctamente.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo actualizar la firma.",
          variant: "destructive",
        })
      }
    })
  }

  const handleSaveWebsite = () => {
    if (!idi) {
      toast({
        title: "Error",
        description: "No se ha identificado la inmobiliaria (Falta ID).",
        variant: "destructive"
      })
      return
    }

    startWebsiteTransition(async () => {
      const formData = new FormData()
      formData.append("idi", String(idi))
      formData.append("website", website)
      
      try {
        await updateWebsiteAction(formData)
        toast({
          title: "Web actualizada",
          description: "La URL de la web ha sido guardada correctamente.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudo guardar la URL. Verifica que el campo exista en la base de datos.",
          variant: "destructive"
        })
      }
    })
  }

  const isDark = mounted ? ((resolvedTheme || theme) === 'dark') : false

  if (!mounted) {
    return <div className="space-y-6" />
  }

  const normalizedInitialWebsite = initialWebsite || ""

  return (
    <div className="space-y-6">
      {canEdit && idi && (
        <>
          <div className="flex flex-col gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="website-url">Web Inmobiliaria</Label>
              <p className="text-sm text-muted-foreground">URL de la página web para redirecciones (ej. botón Salir en visitas)</p>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="website-url" 
                  value={website} 
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://tuinmobiliaria.com"
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSaveWebsite} disabled={isWebsitePending || website === normalizedInitialWebsite}>
                {isWebsitePending ? "Guardando..." : <><Save className="mr-2 h-4 w-4" /> Guardar</>}
              </Button>
            </div>
          </div>
          <Separator />
        </>
      )}

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="dark-mode">Modo Oscuro</Label>
          <p className="text-sm text-muted-foreground">Activa el tema oscuro de la interfaz</p>
        </div>
        <Switch id="dark-mode" checked={isDark} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="compact-view">Vista Compacta</Label>
          <p className="text-sm text-muted-foreground">Reduce el espaciado en las tablas</p>
        </div>
        <Switch id="compact-view" checked={compact} onCheckedChange={toggleCompact} />
      </div>

      {canEdit && idi && (
        <>
          <Separator />
          <div className="space-y-4">
            <div className="space-y-0.5">
              <Label htmlFor="signature">Firma de Comunicados</Label>
              <p className="text-sm text-muted-foreground">
                Ingresa el texto o HTML que se incluirá como firma en los comunicados enviados.
              </p>
            </div>
            <div className="space-y-2">
              <Textarea 
                id="signature" 
                placeholder="<p>Atentamente,<br><strong>Mi Empresa</strong></p>" 
                className="font-mono text-sm min-h-[150px]"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveSignature} disabled={isPending}>
                  {isPending ? "Guardando..." : "Guardar Firma"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
