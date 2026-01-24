"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Megaphone, Users, Info, User, Building2, Settings, Calendar, ChevronsLeft, Menu } from "lucide-react"
import LogoutButton from "@/components/logout-button"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { APP_VERSION, APP_NAME } from "@/lib/version"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  user: {
    email?: string
    id: string
    name?: string
  }
  collapsed?: boolean
  onToggle?: () => void
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    title: "Anuncios",
    href: "/dashboard/anuncios",
    icon: Megaphone,
  },
  {
    title: "Leads",
    href: "/dashboard/leads",
    icon: Users,
  },
  {
    title: "Agenda",
    href: "/dashboard/agenda",
    icon: Calendar,
  },
  {
    title: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
  {
    title: "Información",
    href: "/dashboard/informacion",
    icon: Info,
  },
]

export default function Sidebar({ user, collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { inmobiliariaId, inmobiliariaNombre, loading, isAdmin, role, setAdminSelectedInmobiliaria } = useInmobiliaria()
  const supabase = createClient()
  const [inmos, setInmos] = useState<{ idi: number; Nombre: string }[]>([])
  const router = useRouter()
  const [logoVersion, setLogoVersion] = useState<number>(0)
  const [logoError, setLogoError] = useState(false)

  const logoUrl = useMemo(() => {
    if (!inmobiliariaId) return null
    const { data } = supabase.storage.from('imagenes').getPublicUrl(`logos/${inmobiliariaId}-logo.png`)
    return logoVersion ? `${data.publicUrl}?v=${logoVersion}` : data.publicUrl
  }, [inmobiliariaId, supabase, logoVersion])

  useEffect(() => {
    const handleUpdate = () => {
         setLogoVersion(Date.now())
         setLogoError(false)
    }
    window.addEventListener('logo-updated', handleUpdate)
    return () => window.removeEventListener('logo-updated', handleUpdate)
  }, [])

  useEffect(() => {
    let active = true
    const run = async () => {
      if (!isAdmin) return
      const { data } = await supabase.from("Inmobiliarias").select("idi, Nombre").order("Nombre", { ascending: true })
      if (active) setInmos((data || []).map((d: any) => ({ idi: Number(d.idi), Nombre: d.Nombre })))
    }
    run()
    return () => {
      active = false
    }
  }, [isAdmin, supabase])

  return (
    <div className={cn("bg-[#ffffff] border-r border-border flex flex-col h-full transition-all duration-300 overflow-y-auto overflow-x-hidden", collapsed ? "w-[70px] items-center" : "w-64")}>
      {/* Header */}
      <div 
        className={cn(
          "border-b border-border flex flex-col transition-colors", 
          collapsed ? "p-2 items-center justify-center h-[88px]" : "p-6"
        )}
      >
        <div className="flex items-center justify-between w-full">
            {!collapsed ? (
              <>
                <div className="flex flex-col overflow-hidden mr-2 w-full relative">
                    {logoUrl && !logoError ? (
                        <div className="relative h-12 w-full max-w-[180px]">
                            <Image 
                                src={logoUrl} 
                                alt={APP_NAME} 
                                fill 
                                className="object-contain object-left"
                                onError={() => setLogoError(true)}
                                unoptimized
                            />
                        </div>
                    ) : (
                        <>
                            <h1 className="text-xl font-bold truncate text-primary tracking-tight">{APP_NAME}</h1>
                            <p className="text-xs text-muted-foreground">Versión {APP_VERSION}</p>
                        </>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onToggle}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 cursor-pointer w-full" onClick={onToggle}>
                  <span className="font-bold text-lg">RF</span>
                  <Menu className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
        </div>
        
        {isAdmin && !collapsed && (
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Seleccionar inmobiliaria</label>
            <select
              className="mt-1 w-full border rounded-md px-2 py-1 text-sm bg-background"
              value={inmobiliariaId ?? undefined}
              onChange={(e) => {
                const raw = e.target.value
                if (raw === "__ALL__") {
                  setAdminSelectedInmobiliaria(null)
                  router.push(`${pathname}?idi=all`)
                  return
                }
                const val = Number(raw)
                setAdminSelectedInmobiliaria(Number.isFinite(val) ? val : null)
                if (Number.isFinite(val)) {
                  router.push(`${pathname}?idi=${val}`)
                }
              }}
            >
              <option value={inmobiliariaId ?? undefined}>Actual: {inmobiliariaNombre || "(sin nombre)"}</option>
              <option value="__ALL__">Todas las inmobiliarias</option>
              {inmos.map((i) => (
                <option key={i.idi} value={i.idi}>
                  {i.Nombre} (IDI {i.idi})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 w-full">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.title : undefined}
                >
                  <Icon className="h-4 w-4 min-h-4 min-w-4" />
                  {!collapsed && <span className="truncate">{item.title}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User info and logout */}
      <div className={cn("border-t border-border flex flex-col", collapsed ? "p-2 items-center" : "p-4")}>
        {!loading && inmobiliariaNombre && !collapsed && (
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">{inmobiliariaNombre}</span>
          </div>
        )}
        <div className={cn("flex items-start mb-3", collapsed ? "justify-center" : "gap-3")}>
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-medium text-foreground truncate" title={user.name || user.email}>
                {user.name || user.email}
              </span>
              {user.name && user.name !== user.email && (
                  <span className="text-xs text-muted-foreground truncate" title={user.email}>{user.email}</span>
              )}
              <div className="flex items-center gap-1.5 text-xs mt-0.5">
                {role && <span className="font-medium text-foreground capitalize">{role}</span>}
                {isAdmin && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                      Superusuario
                    </span>
                )}
              </div>
            </div>
          )}
        </div>
        <div className={cn("flex", collapsed ? "justify-center" : "")}>
           <LogoutButton />
        </div>
      </div>
    </div>
  )
}
