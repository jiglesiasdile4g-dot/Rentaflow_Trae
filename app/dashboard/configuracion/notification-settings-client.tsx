'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'

export function NotificationSettings() {
  const disabledSection = true
  const [mounted, setMounted] = useState(false)
  const [emailNotif, setEmailNotif] = useState<boolean>(true)
  const [leadAlerts, setLeadAlerts] = useState<boolean>(true)
  const [weeklyReport, setWeeklyReport] = useState<boolean>(false)
  const { toast } = useToast()

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true)
      const supabase = createClient()
      supabase.auth.getUser().then(({ data }) => {
        const meta = data.user?.user_metadata || {}
        setEmailNotif(Boolean(meta.notif_email ?? true))
        setLeadAlerts(Boolean(meta.lead_alerts ?? true))
        setWeeklyReport(Boolean(meta.weekly_report ?? false))
      }).catch(() => {})
    }, 0)
    return () => clearTimeout(t)
  }, [])

  const updateMeta = async (key: 'notif_email' | 'lead_alerts' | 'weekly_report', value: boolean) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ data: { [key]: value } })
      if (error) {
        toast({ title: 'Error', description: 'No se pudo guardar la preferencia', variant: 'destructive' })
        return
      }
      toast({ title: 'Preferencia guardada', description: 'Se actualizó correctamente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo guardar la preferencia', variant: 'destructive' })
    }
  }

  if (!mounted) {
    return <div className="space-y-6" />
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>
          Esta sección está desactivada temporalmente. Próximamente.
        </AlertDescription>
      </Alert>
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications">Notificaciones por Email</Label>
          <p className="text-sm text-muted-foreground">Recibe alertas de nuevos leads por correo</p>
        </div>
        <Switch id="email-notifications" checked={emailNotif} disabled onCheckedChange={undefined} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="lead-notifications">Alertas de Leads</Label>
          <p className="text-sm text-muted-foreground">Notificación cuando un lead completa sus datos</p>
        </div>
        <Switch id="lead-notifications" checked={leadAlerts} disabled onCheckedChange={undefined} />
      </div>
      <Separator />
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="weekly-report">Reporte Semanal</Label>
          <p className="text-sm text-muted-foreground">Resumen semanal de actividad y métricas</p>
        </div>
        <Switch id="weekly-report" checked={weeklyReport} disabled onCheckedChange={undefined} />
      </div>
    </div>
  )
}
