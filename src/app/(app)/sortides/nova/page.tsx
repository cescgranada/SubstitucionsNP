import { createClient } from '@/lib/supabase/server'
import NovaSortidaForm from './NovaSortidaForm'
import { esEquipDirectiu } from '@/lib/roles'

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

  // L'equip directiu tria els docents implicats; la sortida queda aprovada
  const { data: rols } = await supabase
    .from('docent_rols').select('rol').eq('docent_id', docent.id)
  let docents: { id: string; nom: string; etapes: string[] }[] | undefined
  if (esEquipDirectiu(rols)) {
    const { data: docentsRaw } = await supabase
      .from('docents')
      .select('id, nom, docent_etapes(etapa:etapa_id(nom))')
      .eq('actiu', true)
      .order('nom')
    docents = (docentsRaw ?? []).map((d: any) => ({
      id: d.id,
      nom: d.nom,
      etapes: ((d.docent_etapes as any[]) ?? [])
        .map(de => (Array.isArray(de.etapa) ? de.etapa[0]?.nom : de.etapa?.nom))
        .filter(Boolean),
    }))
  }

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
      <NovaSortidaForm docentId={docent.id} grups={grups ?? []} docents={docents} />
    </div>
  )
}
