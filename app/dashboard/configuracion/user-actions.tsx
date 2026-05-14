"use client"

import { useState } from "react"
import { MoreVertical, Trash2, ShieldCheck, UserCheck, Power, PowerOff, Mail, Loader2, UserPlus, UserMinus, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
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

interface UserActionsProps {
  user: {
    id?: any
    usuario: string
    nombre?: string
    telefono?: string
    is_admin: boolean
    activo?: boolean | null
    role?: string
    has_agent_record?: boolean
  }
  idi: number
  toggleRoleAction: (formData: FormData) => Promise<void | any>
  toggleActiveAction: (formData: FormData) => Promise<void | any>
  deleteAgentAction: (formData: FormData) => Promise<void | any>
  resendUserConfirmationAction: (formData: FormData) => Promise<void | any>
  toggleAgentFunctionsAction?: (formData: FormData) => Promise<void | any>
  updateUserDetailsAction?: (formData: FormData) => Promise<void | any>
}

export function UserActions({
  user,
  idi,
  toggleRoleAction,
  toggleActiveAction,
  deleteAgentAction,
  resendUserConfirmationAction,
  toggleAgentFunctionsAction,
  updateUserDetailsAction
}: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editName, setEditName] = useState(user.nombre || "")
  const [editPhone, setEditPhone] = useState(user.telefono || "")
  const { toast } = useToast()

  const handleAction = async (action: (fd: FormData) => Promise<any>, extraData: Record<string, string> = {}) => {
    try {
      setLoading(true)
      const formData = new FormData()
      formData.append("email", user.usuario)
      formData.append("idi", String(idi))
      if (user.id) {
        formData.append("id", String(user.id))
      }
      Object.entries(extraData).forEach(([key, value]) => {
        formData.append(key, value)
      })
      
      const result = await action(formData)

      if (result?.error) {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error
        })
      } else if (result?.success) {
        toast({
            title: "Éxito",
            description: "Acción completada correctamente"
        })
      }
    } catch (error) {
      console.error("Action error:", error)
      toast({
        variant: "destructive",
        title: "Error inesperado",
        description: "Ha ocurrido un error al procesar la solicitud"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-6 w-6 p-0" disabled={loading}>
            <span className="sr-only">Menú</span>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <MoreVertical className="h-3 w-3" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              setShowEditDialog(true)
            }}
            disabled={loading}
            className="cursor-pointer"
          >
            <Edit className="mr-2 h-4 w-4" />
            <span>Editar detalles</span>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {user.role === "administrador" ? (
                <ShieldCheck className="mr-2 h-4 w-4" />
              ) : user.role === "supervisor" ? (
                <UserCheck className="mr-2 h-4 w-4" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span>Cambiar rol</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup
                value={user.role || "agente"}
                onValueChange={(value) => {
                  handleAction(toggleRoleAction, { role: value })
                }}
              >
                <DropdownMenuRadioItem value="administrador">Administrador</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="supervisor">Supervisor</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="agente">Agente</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          {toggleAgentFunctionsAction && (user.role !== "agente" || !user.has_agent_record) && (
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault()
                handleAction(toggleAgentFunctionsAction, { enable: String(!user.has_agent_record) })
              }}
              disabled={loading}
              className="cursor-pointer"
            >
              {user.has_agent_record ? (
                <>
                  <UserMinus className="mr-2 h-4 w-4" />
                  <span>Desactivar funciones agente</span>
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  <span>Activar funciones agente</span>
                </>
              )}
            </DropdownMenuItem>
          )}

          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              handleAction(toggleActiveAction, { active: String(user.activo === false) })
            }}
            disabled={loading}
            className="cursor-pointer"
          >
            {user.activo === false ? (
              <>
                <Power className="mr-2 h-4 w-4" />
                <span>Activar cuenta</span>
              </>
            ) : (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                <span>Desactivar cuenta</span>
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault()
              handleAction(resendUserConfirmationAction)
            }}
            disabled={loading}
            className="cursor-pointer"
          >
            <Mail className="mr-2 h-4 w-4" />
            <span>Reenviar enlace</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => setShowDeleteAlert(true)}
            disabled={loading}
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Eliminar usuario</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente al usuario <strong>{user.usuario}</strong>. 
              <br />
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault()
                handleAction(deleteAgentAction).then(() => setShowDeleteAlert(false))
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar detalles de usuario</DialogTitle>
            <DialogDescription>
              Actualiza el nombre y teléfono de {user.usuario}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault()
              if (!updateUserDetailsAction) return
              
              try {
                  setLoading(true)
                  const formData = new FormData()
                  formData.append("email", user.usuario)
                  formData.append("idi", String(idi))
                  if (user.id) formData.append("id", String(user.id))
                  formData.append("name", editName)
                  formData.append("phone", editPhone)
                  
                  await updateUserDetailsAction(formData)
                  setShowEditDialog(false)
              } catch (error) {
                  console.error("Error updating user details:", error)
              } finally {
                  setLoading(false)
              }
            }}
            className="space-y-4 py-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input 
                  id="name" 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  placeholder="Nombre completo" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input 
                  id="phone" 
                  value={editPhone} 
                  onChange={(e) => setEditPhone(e.target.value)} 
                  placeholder="+56 9 ..." 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Guardar cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
