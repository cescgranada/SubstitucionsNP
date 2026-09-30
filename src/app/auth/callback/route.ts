import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { emailDelDomini } from '@/lib/roles'
import { ROL_COOKIE, calculaRolPrincipal } from '@/lib/rol-cookie'

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

      // Desa una pista de rol en una galeta lleugera, perquè el middleware
      // pugui restringir la navegació del PAS sense haver de consultar la
      // base de dades a cada petició. NOMÉS és una ajuda de navegació: la
      // RLS de Supabase segueix sent qui decideix de veritat què es pot
      // llegir o escriure, encara que aquesta galeta es manipulés.
      const { data: docent } = await supabase
        .from('docents')
        .select('id')
        .eq('email', data.user!.email!)
        .single()

      let rolPrincipal = 'docent'
      if (docent) {
        const { data: rols } = await supabase
          .from('docent_rols')
          .select('rol')
          .eq('docent_id', docent.id)
        rolPrincipal = calculaRolPrincipal(rols)
      }

      // El PAS aterra directament a l'apartat de sortides.
      const destinacio = rolPrincipal === 'pas' ? '/sortides' : next

      const response = NextResponse.redirect(`${origin}${destinacio}`)
      response.cookies.set(ROL_COOKIE, rolPrincipal, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30,
      })
      return response
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_error`)
}
