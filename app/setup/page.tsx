import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function SetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Configurar entorno</CardTitle>
          <CardDescription>Faltan variables de entorno para conectar con Supabase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Requerido</Badge>
            <span className="text-sm">NEXT_PUBLIC_SUPABASE_URL</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Requerido</Badge>
            <span className="text-sm">NEXT_PUBLIC_SUPABASE_ANON_KEY</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Crea un archivo <span className="font-mono">.env.local</span> en la raíz del proyecto del dashboard y añade estas variables.
          </div>
          <div className="space-y-2">
            <div className="font-mono text-xs bg-muted p-3 rounded">
              NEXT_PUBLIC_SUPABASE_URL=tu-url
              <br />
              NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/login">Ir a inicio de sesión</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}