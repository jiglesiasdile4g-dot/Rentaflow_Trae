'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (searchParams.get('action') === 'set_password') {
      setOpen(true)
      // Clean up URL
      const params = new URLSearchParams(searchParams)
      params.delete('action')
      router.replace(`${pathname}?${params.toString()}`)
    }
  }, [searchParams, pathname, router])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (newPassword.length < 6) {
      toast({ title: 'Contraseña demasiado corta', description: 'Debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Las contraseñas no coinciden', description: 'Verifica los campos', variant: 'destructive' })
      return
    }
    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        toast({ title: 'Error al actualizar', description: error.message, variant: 'destructive' })
        return
      }
      toast({ title: 'Contraseña actualizada', description: 'Tu contraseña ha sido cambiada correctamente' })
      setOpen(false)
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar la contraseña', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button variant="outline" className="w-full sm:w-auto bg-transparent" onClick={() => setOpen(true)}>
        Cambiar Contraseña
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>Introduce tu nueva contraseña</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">Nueva contraseña</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirmar contraseña</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando…' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
