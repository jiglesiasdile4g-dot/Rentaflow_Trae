'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { logClientEventAction } from '@/app/actions/audit'

export function ActiveSessions() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session
      const d = s?.expires_at ? new Date(s.expires_at * 1000) : null
      setExpiresAt(d)
    }).catch(() => {})
  }, [open])

  const signOutLocal = async () => {
    if (loading) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.auth.signOut({ scope: 'local' } as any)
      
      if (user) {
        await logClientEventAction(
          "SESSION_LOGOUT_LOCAL",
          "AUTHENTICATION",
          "SUCCESS",
          user.email,
          user.email,
          user.id
        )
      }
      
      window.location.href = '/login'
    } catch {
      toast({ title: 'Error', description: 'No se pudo cerrar sesión', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const signOutGlobal = async () => {
    if (loading) return
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      await supabase.auth.signOut()
      
      if (user) {
        await logClientEventAction(
          "SESSION_REVOKE_ALL",
          "AUTHENTICATION",
          "SUCCESS",
          user.email,
          user.email,
          user.id
        )
      }
      
      toast({ title: 'Sesiones cerradas', description: 'Se cerraron todas las sesiones' })
      window.location.href = '/login'
    } catch {
      toast({ title: 'Error', description: 'No se pudo cerrar todas las sesiones', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="w-full sm:w-auto bg-transparent" onClick={() => setOpen(true)}>
        Ver Sesiones
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Sesiones Activas</DialogTitle>
            <DialogDescription>Gestiona tus dispositivos y sesiones</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Dispositivo actual</Label>
              <p className="text-sm text-muted-foreground">{typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <Label>Expira</Label>
              <p className="text-sm text-muted-foreground">{expiresAt ? new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(expiresAt) : 'Desconocido'}</p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={signOutLocal} disabled={loading}>Cerrar sesión aquí</Button>
            <Button type="button" onClick={signOutGlobal} disabled={loading}>{loading ? 'Procesando…' : 'Cerrar en todos los dispositivos'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

