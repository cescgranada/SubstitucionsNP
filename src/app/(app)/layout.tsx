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

  if (!docent) {
    redirect('/login?error=no_docent')
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
