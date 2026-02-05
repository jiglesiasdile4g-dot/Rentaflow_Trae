'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/30">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h2 className="text-xl font-semibold">Algo salió mal</h2>
      <p className="text-sm text-muted-foreground max-w-sm">
        Ha ocurrido un error inesperado. Intenta recargar la página.
      </p>
      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 w-full max-w-lg overflow-auto rounded bg-slate-950 p-4 text-left text-xs text-slate-50">
          {error.message}
          {error.stack}
        </pre>
      )}
      <div className="flex gap-2">
        <Button onClick={() => window.location.reload()} variant="outline">
          Recargar página
        </Button>
        <Button onClick={() => reset()}>
          Intentar de nuevo
        </Button>
      </div>
    </div>
  )
}
