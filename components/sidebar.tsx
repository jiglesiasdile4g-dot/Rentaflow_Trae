"use client"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, Megaphone, Users, Info, User, Building2, Settings, Calendar, ChevronsLeft, Menu } from "lucide-react"
import LogoutButton from "@/components/logout-button"
import { useInmobiliaria } from "@/lib/contexts/inmobiliaria-context"
import { APP_VERSION, APP_NAME } from "@/lib/version"
import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"

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
  const { inmobiliariaId, inmobiliariaNombre, loading, isAdmin, isSuperAdmin, role, setAdminSelectedInmobiliaria, demoMode, setDemoMode } = useInmobiliaria()
  const supabase = createClient()
  const [inmos, setInmos] = useState<{ idi: number; Nombre: string }[]>([])
  const router = useRouter()
  const searchParams = useSearchParams()
  const [logoVersion, setLogoVersion] = useState<number>(0)
  const [logoError, setLogoError] = useState(false)
  const [hasLogo, setHasLogo] = useState(false)
  const [dbLogoUrl, setDbLogoUrl] = useState<string | null>(null)

  const withCacheBuster = (url: string, v: number) => {
    const base = String(url || "").trim()
    if (!base) return base
    if (!v) return base
    return base.includes("?") ? `${base}&v=${v}` : `${base}?v=${v}`
  }

  const normalizeLogoUrl = (url: string) => {
    const raw = String(url || "").trim()
    if (!raw) return raw
    const marker = "/storage/v1/object/public/"
    const idx = raw.indexOf(marker)
    if (idx === -1) return raw
    const after = raw.slice(idx + marker.length)
    const [bucket, ...rest] = after.split("/").filter(Boolean)
    const objectPath = rest.join("/")
    if (!bucket || !objectPath) return raw
    const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath)
    return data.publicUrl || raw
  }

  const logoUrl = useMemo(() => {
    if (!inmobiliariaId || !hasLogo) return null
    if (dbLogoUrl) return withCacheBuster(normalizeLogoUrl(dbLogoUrl), logoVersion)
    const { data } = supabase.storage.from('imagenes').getPublicUrl(`logos/${inmobiliariaId}-logo.png`)
    return logoVersion ? `${data.publicUrl}?v=${logoVersion}` : data.publicUrl
  }, [dbLogoUrl, hasLogo, inmobiliariaId, supabase, logoVersion])

  useEffect(() => {
    const handleUpdate = () => {
         setLogoVersion(Date.now())
         setLogoError(false)
         setHasLogo(true)
    }
    window.addEventListener('logo-updated', handleUpdate)
    return () => window.removeEventListener('logo-updated', handleUpdate)
  }, [])

  useEffect(() => {
    let active = true
    const check = async () => {
      if (!inmobiliariaId) {
        if (active) {
          setHasLogo(false)
          setLogoError(false)
          setDbLogoUrl(null)
        }
        return
      }

      try {
        const { data: inmo } = await supabase
          .from("Inmobiliarias")
          .select("logo_url")
          .eq("idi", inmobiliariaId)
          .limit(1)
          .maybeSingle()
        const url = (inmo as any)?.logo_url ? String((inmo as any).logo_url).trim() : ""
        if (active) {
          setDbLogoUrl(url || null)
          if (url) {
            setHasLogo(true)
            return
          }
        }
      } catch {
        if (active) setDbLogoUrl(null)
      }

      const fileName = `${inmobiliariaId}-logo.png`
      const { data } = await supabase.storage.from("imagenes").list("logos", {
        limit: 10,
        offset: 0,
        search: fileName,
      })

      const file = (data || []).find((f) => f.name === fileName)
      if (!active) return

      if (file) {
        setHasLogo(true)
        const v = file.updated_at ? new Date(file.updated_at).getTime() : Date.now()
        setLogoVersion(v)
        setLogoError(false)
      } else {
        setHasLogo(false)
      }
    }
    check()
    return () => {
      active = false
    }
  }, [inmobiliariaId, supabase])

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

  const navQuery = useMemo(() => {
    if (!isAdmin) return ""
    if (inmobiliariaId) return `?idi=${inmobiliariaId}`
    const hasAll = searchParams?.get("idi") === "all" || inmobiliariaNombre === "Todas"
    return hasAll ? "?idi=all" : ""
  }, [isAdmin, inmobiliariaId, inmobiliariaNombre, searchParams])

  return (
    <div className={cn("bg-background border-r border-border flex flex-col h-full transition-all duration-300 overflow-y-auto overflow-x-hidden", collapsed ? "w-[70px] items-center" : "w-64")}>
      {/* Header */}
      <div 
        className={cn(
          "border-b border-border flex flex-col transition-colors relative", 
          collapsed ? "p-2 pt-4 items-center justify-start h-[88px]" : "p-6"
        )}
      >
        <div className="flex items-center justify-between w-full">
            {!collapsed ? (
              <>
                <div 
                    className="flex flex-col overflow-hidden mr-2 w-full relative items-center cursor-pointer"
                    onClick={onToggle}
                >
                    {logoUrl && !logoError ? (
                        <div className="relative h-12 w-full max-w-[180px]">
                            <Image 
                                src={logoUrl} 
                                alt={APP_NAME} 
                                fill 
                                className="object-contain object-center"
                                onError={() => setLogoError(true)}
                                unoptimized
                            />
                        </div>
                    ) : (
                        <h1 className="text-xl font-bold truncate text-primary tracking-tight">{APP_NAME}</h1>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 absolute right-2 top-2 z-10" onClick={onToggle}>
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 cursor-pointer w-full" onClick={onToggle}>
                  {logoUrl && !logoError ? (
                    <div className="relative h-8 w-8">
                        <Image 
                            src={logoUrl} 
                            alt="RF" 
                            fill 
                            className="object-contain"
                            onError={() => setLogoError(true)}
                            unoptimized
                        />
                    </div>
                  ) : (
                    <>
                      <span className="font-bold text-lg">RF</span>
                      <Menu className="h-4 w-4 text-muted-foreground" />
                    </>
                  )}
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
              {isSuperAdmin && <option value="__ALL__">Todas las inmobiliarias</option>}
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
            const href = navQuery ? `${item.href}${navQuery}` : item.href

            return (
              <li key={item.href}>
                <Link
                  href={href}
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
        {!collapsed && (
          <div className="mb-2">
            <p className="text-xs text-muted-foreground">Versión {APP_VERSION}</p>
          </div>
        )}
        {!collapsed && (
          <>
            {isAdmin && inmobiliariaId === 1 && (
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs text-muted-foreground">Modo demo</span>
                <Switch checked={demoMode} onCheckedChange={(v) => setDemoMode(Boolean(v))} />
              </div>
            )}
          </>
        )}
        <div className={cn("flex", collapsed ? "justify-center" : "")}>
           <LogoutButton />
        </div>
      </div>
    </div>
  )
}
