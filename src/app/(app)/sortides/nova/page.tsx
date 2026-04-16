import { createClient } from '@/lib/supabase/server'
import NovaSortidaForm from './NovaSortidaForm'

export default async function NovaSortidaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('email', user!.email!)
    .single()

  if (!docent) return null

  const { data: grupsRaw } = await supabase
    .from('grups')
    .select('id, codi, nom, etapa:etapa_id(nom)')
    .order('nom')

  // Normalitza el resultat (Supabase retorna etapa com array de relations)
  const grups = (grupsRaw ?? []).map((g: any) => ({
    id: g.id,
    codi: g.codi,
    nom: g.nom,
    etapa: Array.isArray(g.etapa) ? (g.etapa[0] ?? null) : g.etapa,
  }))

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <a href="/sortides" className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← Sortides
        </a>
      </div>
      <h1 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
        Proposar sortida
      </h1>
      <NovaSortidaForm docentId={docent.id} grups={grups ?? []} />
    </div>
  )
}
