"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Megaphone, Users, Info, User, Building2, Settings } from "lucide-react"
import LogoutButton from "@/components/logout-button"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { APP_VERSION, APP_NAME } from "@/lib/version"

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
    title: "Información",
    href: "/dashboard/informacion",
    icon: Info,
  },
  {
    title: "Configuración",
    href: "/dashboard/configuracion",
    icon: Settings,
  },
]

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { inmobiliariaNombre, loading } = useInmobiliaria()

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-semibold text-foreground">Dashboard Básico</h1>
        <p className="text-sm text-muted-foreground">
          {APP_NAME} {APP_VERSION}
        </p>
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
        <div className="flex items-center gap-3 mb-3">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground truncate">{user.email}</span>
        </div>
        <LogoutButton />
      </div>
    </div>
  )
}
