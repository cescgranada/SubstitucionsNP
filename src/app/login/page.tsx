import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LoginForm from './LoginForm'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const params = await searchParams
  const error = params.error

  // Només redirigim si l'usuari és autenticat I no hi ha cap error pendent
  // (evita loop: layout → /login?error=no_docent → /login redirecta a / → layout → ...)
  if (user && !error) {
    redirect('/')
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            NP
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-primary)' }}>
            SubsCoop
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Escola Cooperativa Nou Patufet
          </p>
        </div>

        {/* Card de login */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Benvingut/da
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Entra amb el teu compte de Google del centre.
          </p>

          {error && (
            <div
              className="rounded-lg px-4 py-3 text-sm mb-4"
              style={{ backgroundColor: '#FEE2E2', color: '#991B1B' }}
            >
              {error === 'auth_error' && 'Hi ha hagut un error d\'autenticació. Torna-ho a provar.'}
              {error === 'no_docent' && 'El teu compte no està registrat al sistema. Contacta amb direcció.'}
              {error !== 'auth_error' && error !== 'no_docent' && 'Error inesperat. Torna-ho a provar.'}
            </div>
          )}

          <LoginForm />
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--color-text-secondary)' }}>
          Només accessible amb correu @noupatufet.coop
        </p>
      </div>
    </div>
  )
}
