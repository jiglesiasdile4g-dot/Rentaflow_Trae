"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Megaphone, Users, Info, User, Building2, Settings } from "lucide-react"
import LogoutButton from "@/components/logout-button"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { APP_VERSION, APP_NAME } from "@/lib/version"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface SidebarProps {
  user: {
    email?: string
    id: string
  }
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

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { inmobiliariaId, inmobiliariaNombre, loading, isAdmin, role, setAdminSelectedInmobiliaria } = useInmobiliaria()
  const supabase = createClient()
  const [inmos, setInmos] = useState<{ idi: number; Nombre: string }[]>([])
  const router = useRouter()

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
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Dashboard Básico</h1>
        <p className="text-xs text-muted-foreground">Versión {APP_VERSION}</p>
        {isAdmin && (
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
      <nav className="flex-1 p-4">
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
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-border">
        {!loading && inmobiliariaNombre && (
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground truncate">{inmobiliariaNombre}</span>
          </div>
        )}
        <div className="flex items-start gap-3 mb-3">
          <User className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex flex-col min-w-0">
            <span className="text-sm text-muted-foreground truncate" title={user.email}>{user.email}</span>
            <div className="flex items-center gap-1.5 text-xs mt-0.5">
               {role && <span className="font-medium text-foreground capitalize">{role}</span>}
               {isAdmin && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap">
                    Superusuario
                  </span>
               )}
            </div>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  )
}
