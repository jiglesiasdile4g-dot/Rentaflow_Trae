"use client"

import { useState } from "react"
import { MoreVertical, Trash2, ShieldCheck, UserCheck, Power, PowerOff, Mail, Loader2, UserPlus, UserMinus } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    is_admin: boolean
    activo?: boolean | null
    role?: string
    has_agent_record?: boolean
  }
  idi: number
  toggleRoleAction: (formData: FormData) => Promise<void>
  toggleActiveAction: (formData: FormData) => Promise<void>
  deleteAgentAction: (formData: FormData) => Promise<void>
  resendUserConfirmationAction: (formData: FormData) => Promise<void>
  toggleAgentFunctionsAction?: (formData: FormData) => Promise<void>
}

export function UserActions({
  user,
  idi,
  toggleRoleAction,
  toggleActiveAction,
  deleteAgentAction,
  resendUserConfirmationAction,
  toggleAgentFunctionsAction
}: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)

  const handleAction = async (action: (fd: FormData) => Promise<void>, extraData: Record<string, string> = {}) => {
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
      
      await action(formData)
    } catch (error) {
      console.error("Action error:", error)
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
          
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {user.is_admin ? (
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
                value={user.is_admin ? "administrador" : user.role || "agente"}
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

          {user.is_admin && toggleAgentFunctionsAction && (
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
    </>
  )
}
