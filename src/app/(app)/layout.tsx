import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import BottomNav from '@/components/layout/BottomNav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Carrega el docent associat a l'usuari autenticat
  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom, email')
    .eq('email', user.email!)
    .single()

  // No redirigim a /login si no hi ha docent — causaria un loop infinit
  // (login veu usuari autenticat → redirigeix a / → layout → redirigeix a /login → ...)
  if (!docent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="card max-w-sm w-full text-center">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>NP</div>
          <h1 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Accés no autoritzat</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            El compte <strong>{user.email}</strong> no està registrat al sistema.<br />Contacta amb la direcció del centre.
          </p>
          <form action="/auth/signout" method="POST">
            <button type="submit" className="btn-secondary w-full">Tanca la sessió</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — visible només a desktop */}
      <Sidebar docent={docent} />

      {/* Contingut principal */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
        <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Navegació inferior — visible només a mòbil */}
      <BottomNav />
    </div>
  )
}
