"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface InmobiliariaContextType {
  inmobiliariaId: number | null
  inmobiliariaNombre: string | null
  isAdmin: boolean
  role: string | null
  userEmail: string | null
  demoMode: boolean
  demoSince: string | null
  setDemoMode: (enabled: boolean) => void
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
  resetSessionTimer: () => void
  setAdminSelectedInmobiliaria: (id: number | null) => Promise<void>
}

const InmobiliariaContext = createContext<InmobiliariaContextType>({
  inmobiliariaId: null,
  inmobiliariaNombre: null,
  isAdmin: false,
  role: null,
  userEmail: null,
  demoMode: false,
  demoSince: null,
  setDemoMode: () => {},
  loading: true,
  error: null,
  refreshProfile: async () => {},
  resetSessionTimer: () => {},
  setAdminSelectedInmobiliaria: async () => {},
})

export function InmobiliariaProvider({ children }: { children: React.ReactNode }) {
  const [inmobiliariaId, setInmobiliariaId] = useState<number | null>(null)
  const [inmobiliariaNombre, setInmobiliariaNombre] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [demoMode, setDemoModeState] = useState<boolean>(false)
  const [demoSince, setDemoSince] = useState<string | null>(null)
  const [ownInmobiliariaId, setOwnInmobiliariaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isFetchingRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

  useEffect(() => {
    try {
      const cookieStr = String(document.cookie || "")
      const enabled = /(?:^|;\s*)rf_demo=1(?:;|$)/.test(cookieStr)
      setDemoModeState(enabled)
      const m = cookieStr.match(/(?:^|;\s*)rf_demo_since=([^;]*)(?:;|$)/)
      const since = m && m[1] ? decodeURIComponent(m[1]) : null
      setDemoSince(since || null)
    } catch {}
  }, [])

  const setDemoMode = useCallback((enabled: boolean) => {
    const allowed = isAdmin && inmobiliariaId === 1
    try {
      if (enabled && !allowed) {
        enabled = false
      }
      const base = `rf_demo=${enabled ? "1" : "0"}; Path=/; Max-Age=31536000; SameSite=Lax`
      const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : ""
      document.cookie = base + secure
      if (enabled) {
        const nextSince = new Date().toISOString()
        document.cookie = `rf_demo_since=${encodeURIComponent(nextSince)}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
        setDemoSince(nextSince)
      } else {
        document.cookie = `rf_demo_since=; Path=/; Max-Age=0; SameSite=Lax${secure}`
        setDemoSince(null)
      }
    } catch {}
    setDemoModeState(Boolean(enabled))
  }, [inmobiliariaId, isAdmin])

  useEffect(() => {
    if (loading) return
    const allowed = isAdmin && inmobiliariaId === 1
    if (allowed) return
    if (!demoMode) return
    try {
      const secure = typeof window !== "undefined" && window.location?.protocol === "https:" ? "; Secure" : ""
      document.cookie = `rf_demo=0; Path=/; Max-Age=31536000; SameSite=Lax${secure}`
      document.cookie = `rf_demo_since=; Path=/; Max-Age=0; SameSite=Lax${secure}`
    } catch {}
    setDemoModeState(false)
    setDemoSince(null)
  }, [demoMode, inmobiliariaId, isAdmin, loading])

  const fetchProfile = useCallback(async () => {
    if (isFetchingRef.current) {
      console.log("[v0] Fetch already in progress, skipping...")
      return
    }

    isFetchingRef.current = true
    setError(null)

    try {
      console.log("[v0] Fetching user profile...")

      let user
      try {
        const { data, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        user = data.user
      } catch (authError: any) {
        const isConnError = authError.message?.includes("Failed to fetch") || authError.name === "TypeError"
        const isMissingSession = authError.name === "AuthSessionMissingError" || /Auth session missing/i.test(String(authError.message))
        if (isConnError) {
          setError("No se puede conectar con Supabase. Verifica la configuración de red.")
          setLoading(false)
          return
        }
        if (isMissingSession) {
          setInmobiliariaId(null)
          setInmobiliariaNombre(null)
          setLoading(false)
          return
        }
        console.error("[v0] Auth error:", authError)
        throw authError
      }

      if (!user) {
        console.log("[v0] No user authenticated")
        setInmobiliariaId(null)
        setInmobiliariaNombre(null)
        setLoading(false)
        return
      }

      console.log("[v0] User email:", user.email)
      setUserEmail(user.email || null)

      const normalizeEmail = (value: any) => String(value || "").trim().toLowerCase()
      const rawEmail = String(user.email || "").trim()
      const email = normalizeEmail(rawEmail)
      const emailLocal = email.includes("@") ? email.split("@")[0] : email

      const getProfile = async () => {
        const tryQueries: Array<() => Promise<{ data: any; error: any }>> = [
          async () => {
            try {
              return await supabase.from("Perfiles").select("*").eq("user_id", user.id).maybeSingle()
            } catch (e: any) {
              return { data: null, error: e }
            }
          },
          async () => supabase.from("Perfiles").select("*").eq("usuario", rawEmail).maybeSingle(),
          async () => supabase.from("Perfiles").select("*").ilike("usuario", email).maybeSingle(),
          async () => {
            try {
              return await supabase.from("Perfiles").select("*").eq("Usuario", rawEmail).maybeSingle()
            } catch (e: any) {
              return { data: null, error: e }
            }
          },
          async () => {
            try {
              return await supabase.from("Perfiles").select("*").ilike("Usuario", email).maybeSingle()
            } catch (e: any) {
              return { data: null, error: e }
            }
          },
          async () => {
            if (!emailLocal) return { data: null, error: null }
            return await supabase.from("Perfiles").select("*").ilike("usuario", `${emailLocal}@%`).maybeSingle()
          },
        ]

        for (const run of tryQueries) {
          const { data, error } = await run()
          if (!error && data) return { perfil: data, perfilError: null }
        }

        return { perfil: null, perfilError: null }
      }

      let { perfil, perfilError } = await getProfile()

      const readInmobiliariaId = (p: any) => {
        const v = p?.inmobiliaria ?? p?.Inmobiliaria ?? null
        const n = Number(v)
        return Number.isFinite(n) && n > 0 ? n : null
      }

      const inferInmobiliariaId = async () => {
        const metaValue: any =
          (user as any)?.user_metadata?.inmobiliaria_id ??
          (user as any)?.user_metadata?.inmobiliaria ??
          (user as any)?.raw_user_meta_data?.inmobiliaria_id ??
          null

        const metaNum = Number(metaValue)
        if (Number.isFinite(metaNum) && metaNum > 0) return metaNum

        try {
          const { data: agentRow, error: agentErr } = await supabase
            .from("Agentes")
            .select("idi")
            .ilike("Email", email)
            .limit(1)
            .maybeSingle()
          if (!agentErr) {
            const idiNum = Number((agentRow as any)?.idi)
            if (Number.isFinite(idiNum) && idiNum > 0) return idiNum
          }
        } catch {}

        return null
      }

      const ensureProfileExists = async (targetInmobiliariaId: number) => {
        if (!email) return
        if (perfil && readInmobiliariaId(perfil)) return

        if (!perfil) {
          try {
            const basePayload: any = {
              usuario: rawEmail || email,
              inmobiliaria: targetInmobiliariaId,
              role: "agente",
              is_admin: false,
            }

            try {
              const { error } = await supabase.from("Perfiles").insert([{ ...basePayload, user_id: user.id }])
              if (!error) return
              if (String(error?.message || "").toLowerCase().includes("user_id")) {
                await supabase.from("Perfiles").insert([basePayload])
                return
              }
            } catch {
              await supabase.from("Perfiles").insert([basePayload])
              return
            }
          } catch (e: any) {
            console.error("[v0] Error creating Perfiles row:", e)
          }
        } else {
          try {
            await supabase
              .from("Perfiles")
              .update({ inmobiliaria: targetInmobiliariaId })
              .eq("usuario", (perfil as any)?.usuario || rawEmail || email)
          } catch {}
        }
      }

      if (!perfil || !readInmobiliariaId(perfil)) {
        const inferredId = await inferInmobiliariaId()
        if (inferredId) {
          await ensureProfileExists(inferredId)
          ;({ perfil, perfilError } = await getProfile())
        }
      }

      console.log("[v0] Perfil query result:", { perfil, perfilError })

      if (perfilError) {
        console.error("[v0] Error fetching profile:", perfilError.message)
        setError(`Error al cargar perfil: ${perfilError.message}`)
        setInmobiliariaId(null)
        setInmobiliariaNombre(null)
        setRole(null)
        setLoading(false)
        return
      }

      const perfilInmobiliariaId = readInmobiliariaId(perfil)
      if (!perfil || !perfilInmobiliariaId) {
        console.warn("[v0] No profile found for user:", user.email)
        setInmobiliariaId(null)
        setInmobiliariaNombre(null)
        setLoading(false)
        return
      }

      console.log("[v0] Found inmobiliaria ID:", perfilInmobiliariaId)

      const roleStr = String(perfil?.role || "").toLowerCase()
      const adminFlag = perfil?.is_admin === true || ["administrador", "admin", "superuser", "superadmin"].includes(roleStr)
      setIsAdmin(adminFlag)
      // Force "administrador" role if adminFlag is true, ignoring DB role if conflicting
      setRole(adminFlag ? "administrador" : (perfil.role || "agente"))
      const ownId = Number(perfilInmobiliariaId)
      setOwnInmobiliariaId(ownId)
      const savedRaw = adminFlag ? localStorage.getItem("rf_admin_selected_idi") : null
      const effectiveAll = savedRaw === "all"
      const savedNum = Number(savedRaw || "")
      const effectiveId = adminFlag && !effectiveAll && Number.isFinite(savedNum) ? savedNum : (effectiveAll ? null : ownId)

      let inmobiliariaNombreFetched: string | null = null
      if (effectiveId !== null) {
        const { data: inmobiliaria, error: inmobiliariaError } = await supabase
          .from("Inmobiliarias")
          .select("*")
          .eq("idi", String(effectiveId))
          .limit(1)
          .maybeSingle()
        console.log("[v0] Inmobiliaria query result:", { inmobiliaria, inmobiliariaError })
        if (inmobiliariaError) {
          console.error("[v0] Error fetching inmobiliaria:", inmobiliariaError.message)
          setError(`Error al cargar inmobiliaria: ${inmobiliariaError.message}`)
        }
        if (!inmobiliariaError) {
          inmobiliariaNombreFetched = inmobiliaria?.Nombre || null
        }
      }
      setInmobiliariaId(effectiveId === null ? null : Number(effectiveId))
      setInmobiliariaNombre(effectiveId === null ? "Todas" : (inmobiliariaNombreFetched || null))

      console.log("[v0] Profile loaded successfully:", {
        inmobiliariaId: effectiveId === null ? null : Number(effectiveId),
        inmobiliariaNombre: effectiveId === null ? "Todas" : inmobiliariaNombreFetched,
      })

      setLoading(false)
    } catch (error: any) {
      console.error("[v0] Error in fetchProfile:", error)
      setError(error.message || "Error desconocido al cargar el perfil")
      setLoading(false)
    } finally {
      isFetchingRef.current = false
    }
  }, [supabase])

  const handleSessionTimeout = useCallback(async () => {
    console.log("[v0] Session timeout - logging out user")
    try {
      await supabase.auth.signOut({ scope: "local" } as any)
      // Clear any existing timers
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
        inactivityTimerRef.current = null
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
        sessionTimeoutRef.current = null
      }
    } catch (error) {
      console.error("[v0] Error during session timeout logout:", error)
    }
  }, [supabase])

  const resetSessionTimer = useCallback(() => {
    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
    }

    // Set new inactivity timer (30 minutes)
    inactivityTimerRef.current = setTimeout(() => {
      console.log("[v0] Session timeout due to inactivity")
      handleSessionTimeout()
    }, 30 * 60 * 1000) // 30 minutes
  }, [handleSessionTimeout])

  const setupActivityListeners = useCallback(() => {
    // Reset timer on user activity
    const activityEvents = ["mousedown", "keydown", "scroll", "touchstart"]
    const handleActivity = () => {
      resetSessionTimer()
    }

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetSessionTimer])

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      fetchProfile()

      try {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event) => {
          console.log("[v0] Auth state changed:", event)
          if (event === "SIGNED_OUT") {
            fetchProfile()
            // Clear timers on sign out
            if (inactivityTimerRef.current) {
              clearTimeout(inactivityTimerRef.current)
              inactivityTimerRef.current = null
            }
            if (sessionTimeoutRef.current) {
              clearTimeout(sessionTimeoutRef.current)
              sessionTimeoutRef.current = null
            }
          } else if (event === "SIGNED_IN") {
            // Start session timer on sign in
            resetSessionTimer()
            const cleanup = setupActivityListeners()
            return cleanup
          }
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("[v0] Error setting up auth listener:", error)
      }
    }
  }, [fetchProfile, supabase, resetSessionTimer, setupActivityListeners])

  if (error && error.includes("conectar con Supabase")) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900 mb-2">Error de Conexión</h2>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <p className="text-xs text-red-600">
            Verifica que la URL de Supabase sea accesible: <br />
            <code className="bg-red-100 px-2 py-1 rounded mt-2 inline-block">
              {process.env.NEXT_PUBLIC_SUPABASE_URL}
            </code>
          </p>
          <button
            onClick={() => {
              setError(null)
              fetchProfile()
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const setAdminSelectedInmobiliaria = async (id: number | null) => {
    if (!isAdmin) return
    if (id && Number.isFinite(id)) {
      localStorage.setItem("rf_admin_selected_idi", String(id))
      setInmobiliariaId(id)
      const { data: inmobiliaria } = await supabase
        .from("Inmobiliarias")
        .select("Nombre")
        .eq("idi", id.toString())
        .limit(1)
        .maybeSingle()
      setInmobiliariaNombre(inmobiliaria?.Nombre || null)
    } else {
      localStorage.setItem("rf_admin_selected_idi", "all")
      setInmobiliariaId(null)
      setInmobiliariaNombre("Todas")
    }
  }

  return (
    <InmobiliariaContext.Provider
      value={{
        inmobiliariaId,
        inmobiliariaNombre,
        isAdmin,
        role,
        userEmail,
        demoMode: isAdmin && inmobiliariaId === 1 ? demoMode : false,
        demoSince: isAdmin && inmobiliariaId === 1 ? demoSince : null,
        setDemoMode,
        loading,
        error,
        refreshProfile: fetchProfile,
        resetSessionTimer,
        setAdminSelectedInmobiliaria,
      }}
    >
      {children}
    </InmobiliariaContext.Provider>
  )
}

export function useInmobiliaria() {
  const context = useContext(InmobiliariaContext)
  if (context === undefined) {
    throw new Error("useInmobiliaria must be used within InmobiliariaProvider")
  }
  return context
}
