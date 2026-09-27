import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailDelDomini } from '@/lib/roles'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Restricció de domini: només comptes @noupatufet.coop poden entrar.
      // El paràmetre `hd` de Google Login és només una pista visual i no
      // impedeix triar un altre compte, així que cal comprovar-ho aquí.
      if (!emailDelDomini(data.user?.email)) {
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/login?error=domini`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
