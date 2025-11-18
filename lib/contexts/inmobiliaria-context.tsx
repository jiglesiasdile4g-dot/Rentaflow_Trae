"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

interface InmobiliariaContextType {
  inmobiliariaId: number | null
  inmobiliariaNombre: string | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
}

const InmobiliariaContext = createContext<InmobiliariaContextType>({
  inmobiliariaId: null,
  inmobiliariaNombre: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
})

export function InmobiliariaProvider({ children }: { children: React.ReactNode }) {
  const [inmobiliariaId, setInmobiliariaId] = useState<number | null>(null)
  const [inmobiliariaNombre, setInmobiliariaNombre] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isFetchingRef = useRef(false)
  const hasInitializedRef = useRef(false)

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
        console.error("[v0] Auth error:", authError)
        if (authError.message?.includes("Failed to fetch") || authError.name === "TypeError") {
          setError("No se puede conectar con Supabase. Verifica la configuración de red.")
          setLoading(false)
          return
        }
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

      const { data: perfil, error: perfilError } = await supabase
        .from("Perfiles")
        .select("inmobiliaria")
        .eq("usuario", user.email)
        .maybeSingle()

      console.log("[v0] Perfil query result:", { perfil, perfilError })

      if (perfilError) {
        console.error("[v0] Error fetching profile:", perfilError.message)
        setError(`Error al cargar perfil: ${perfilError.message}`)
        setInmobiliariaId(null)
        setInmobiliariaNombre(null)
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

      const { data: inmobiliaria, error: inmobiliariaError } = await supabase
        .from("Inmobiliarias")
        .select("idi, Nombre")
        .eq("idi", perfil.inmobiliaria)
        .single()

      console.log("[v0] Inmobiliaria query result:", { inmobiliaria, inmobiliariaError })

      if (inmobiliariaError) {
        console.error("[v0] Error fetching inmobiliaria:", inmobiliariaError.message)
        setError(`Error al cargar inmobiliaria: ${inmobiliariaError.message}`)
      }

      const numericId = Number(perfil.inmobiliaria)
      setInmobiliariaId(numericId)
      setInmobiliariaNombre(inmobiliaria?.Nombre || null)

      console.log("[v0] Profile loaded successfully:", {
        inmobiliariaId: numericId,
        inmobiliariaNombre: inmobiliaria?.Nombre,
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
          }
        })

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error("[v0] Error setting up auth listener:", error)
      }
    }
  }, [fetchProfile, supabase])

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

  return (
    <InmobiliariaContext.Provider
      value={{
        inmobiliariaId,
        inmobiliariaNombre,
        loading,
        error,
        refreshProfile: fetchProfile,
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
