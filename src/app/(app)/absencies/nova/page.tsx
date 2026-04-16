import { createClient } from '@/lib/supabase/server'
import NovaAbsenciaForm from './NovaAbsenciaForm'

export default async function NovaAbsenciaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <a href="/absencies" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Absències
        </a>
      </div>

      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
        Comunicar absència
      </h1>

      <NovaAbsenciaForm docentId={docent.id} docentNom={docent.nom} />
    </div>
  )
}
