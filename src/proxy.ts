import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROL_COOKIE } from '@/lib/rol-cookie'

// Parses the raw Cookie header to correctly handle chunked Supabase tokens
// (cookies named like "sb-xxx-auth-token.0", ".1", etc.)
// request.cookies.getAll() can miss these in some Next.js versions.
function parseCookies(request: NextRequest): { name: string; value: string }[] {
  const cookieHeader = request.headers.get('cookie') ?? ''
  if (!cookieHeader) return []
  return cookieHeader.split(';').flatMap(part => {
    const eqIdx = part.indexOf('=')
    if (eqIdx === -1) return []
    const name = part.slice(0, eqIdx).trim()
    const value = part.slice(eqIdx + 1).trim()
    return name ? [{ name, value }] : []
  })
}

// Rutes on el rol PAS pot entrar: la llista i fitxa de sortides (mai
// "nova", ja que el PAS no en proposa) i el seu propi perfil.
function potAccedirPas(pathname: string): boolean {
  if (pathname.startsWith('/perfil')) return true
  if (pathname === '/sortides/nova') return false
  return pathname === '/sortides' || pathname.startsWith('/sortides/')
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies(request)
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Si getUser() falla (xarxa, timeout...), no bloquejem l'accés.
    // Els layouts del servidor faran la verificació definitiva.
  }

  const pathname = request.nextUrl.pathname

  if (!pathname.startsWith('/login') && !pathname.startsWith('/auth')) {
    // Redirigim a /login NOMÉS si sabem amb certesa que no hi ha sessió:
    // no hi ha usuari I no hi ha cap cookie de sessió de Supabase.
    const hasSessionCookie = parseCookies(request).some(
      c => c.name.startsWith('sb-') && c.name.includes('-auth-token')
    )
    if (!user && !hasSessionCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Restricció de navegació per al PAS: només Sortides i Perfil. És
    // només una ajuda de navegació (evita menús/pantalles que no li
    // calen) — la protecció real de les dades la fa la RLS, no aquesta
    // galeta.
    const rolCookie = parseCookies(request).find(c => c.name === ROL_COOKIE)?.value
    if (rolCookie === 'pas' && !potAccedirPas(pathname)) {
      const url = request.nextUrl.clone()
      url.pathname = '/sortides'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
