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
  const [ownInmobiliariaId, setOwnInmobiliariaId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isFetchingRef = useRef(false)
  const hasInitializedRef = useRef(false)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const supabase = createClient()

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

      const { data: perfil, error: perfilError } = await supabase
        .from("Perfiles")
        .select("inmobiliaria, is_admin, role")
        .eq("usuario", user.email)
        .maybeSingle()

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

      if (!perfil || !perfil.inmobiliaria) {
        console.warn("[v0] No profile found for user:", user.email)
        setInmobiliariaId(null)
        setInmobiliariaNombre(null)
        setLoading(false)
        return
      }

      console.log("[v0] Found inmobiliaria ID:", perfil.inmobiliaria)

      const adminFlag = perfil?.is_admin === true
      setIsAdmin(adminFlag)
      // Force "administrador" role if adminFlag is true, ignoring DB role if conflicting
      setRole(adminFlag ? "administrador" : (perfil.role || "agente"))
      const ownId = Number(perfil.inmobiliaria)
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
      await supabase.auth.signOut()
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
