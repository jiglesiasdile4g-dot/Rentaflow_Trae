import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If environment variables are not set, skip auth check
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase environment variables not found in proxy")
    return supabaseResponse
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  try {
    const {
      data: { user },
      error
    } = await supabase.auth.getUser()

    if (error || !user) {
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
    } else if (user) {
      let perfil: any = null
      let isInactive = false
      try {
        const { data } = await supabase
          .from("Perfiles")
          .select("usuario, activo")
          .eq("usuario", user.email as any)
          .limit(1)
          .maybeSingle()
        perfil = data
        isInactive = perfil && typeof perfil?.activo === "boolean" ? (perfil?.activo === false) : false
      } catch {}
      if (request.nextUrl.pathname.startsWith("/dashboard")) {
        if (isInactive) {
          const response = NextResponse.redirect(new URL("/login", request.url))
          response.cookies.delete('sb-access-token')
          response.cookies.delete('sb-refresh-token')
          return response
        }
      }
      if (request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/register") {
        if (!isInactive) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
      }
    }
  } catch (error) {
    console.error("[v0] Proxy auth check failed:", error)
    if (request.nextUrl.pathname.startsWith("/dashboard")) {
      const response = NextResponse.redirect(new URL("/login", request.url))
      response.cookies.delete('sb-access-token')
      response.cookies.delete('sb-refresh-token')
      return response
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
