"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateUserDetailsAction } from "./actions"
import { Loader2, Save } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface UserProfileFormProps {
  email: string
  initialName: string
  initialPhone: string
  idi: number
  userRoleLabel: string
}

export function UserProfileForm({ email, initialName, initialPhone, idi, userRoleLabel }: UserProfileFormProps) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("idi", String(idi))
      formData.append("name", name)
      formData.append("phone", phone)

      await updateUserDetailsAction(formData)
      toast({ title: "Perfil actualizado correctamente", description: "Los cambios se han guardado con éxito." })
    } catch (err: any) {
      console.error("Error updating profile:", err)
      setError("Error al actualizar el perfil. Inténtalo de nuevo.")
      toast({ title: "Error", description: "Error al actualizar el perfil", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
            <Label htmlFor="profile-name">Nombre Completo</Label>
            <Input 
                id="profile-name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="Tu nombre" 
            />
        </div>
        
        <div className="space-y-2">
            <Label htmlFor="profile-phone">Teléfono</Label>
            <Input 
                id="profile-phone" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Tu teléfono" 
            />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Correo Electrónico</Label>
        <Input id="email" type="email" value={email} disabled className="bg-muted" />
        <p className="text-xs text-muted-foreground">El correo electrónico no se puede modificar</p>
      </div>

      <Button type="submit" disabled={loading || (name === initialName && phone === initialPhone)}>
        {loading ? (
            <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
            </>
        ) : (
            <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
            </>
        )}
      </Button>
    </form>
  )
}
