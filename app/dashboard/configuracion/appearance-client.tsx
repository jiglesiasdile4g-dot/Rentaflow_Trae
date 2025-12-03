'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'

export function AppearanceSettings() {
  const { resolvedTheme, theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [compact, setCompact] = useState<boolean>(false)

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

  const isDark = mounted ? ((resolvedTheme || theme) === 'dark') : false

  if (!mounted) {
    return <div className="space-y-6" />
  }

  return (
    <div className="space-y-6">
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
    </div>
  )
}
