import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { esEquipDirectiu } from '@/lib/roles'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docentActual } = await supabase
    .from('docents')
    .select('id')
    .eq('email', user!.email!)
    .single()

  if (!docentActual) redirect('/login')

  const { data: rols } = await supabase
    .from('docent_rols')
    .select('rol')
    .eq('docent_id', docentActual.id)

  // Accés exclusiu per a l'equip directiu.
  if (!esEquipDirectiu(rols)) redirect('/')

  const { data: docents } = await supabase
    .from('docents')
    .select('id, nom')
    .eq('actiu', true)
    .order('nom')

  // Substitucions rellevants: excloem les generades per sortides (no compten,
  // per definició) i les eliminades (retirades, no van passar de veritat).
  // Regla de càlcul: 1 substitució per cada classe/franja individual afectada.
  const { data: substitucions } = await supabase
    .from('substitucions')
    .select('substitut_id, estat, absencia:absencia_id(docent_id)')
    .is('sortida_id', null)
    .not('absencia_id', 'is', null)
    .neq('estat', 'eliminada')

  const generades = new Map<string, number>()
  const realitzades = new Map<string, number>()
  const noCalAssignar = new Map<string, number>()

  for (const s of (substitucions ?? []) as any[]) {
    const docentAbsentId = s.absencia?.docent_id
    if (docentAbsentId) {
      generades.set(docentAbsentId, (generades.get(docentAbsentId) ?? 0) + 1)
      if (s.estat === 'no_cal') {
        noCalAssignar.set(docentAbsentId, (noCalAssignar.get(docentAbsentId) ?? 0) + 1)
      }
    }
    if (s.estat === 'confirmada' && s.substitut_id) {
      realitzades.set(s.substitut_id, (realitzades.get(s.substitut_id) ?? 0) + 1)
    }
  }

  const files = (docents ?? [])
    .map(d => ({
      id: d.id,
      nom: d.nom,
      generades: generades.get(d.id) ?? 0,
      realitzades: realitzades.get(d.id) ?? 0,
      noCal: noCalAssignar.get(d.id) ?? 0,
    }))
    .filter(f => f.generades > 0 || f.realitzades > 0)
    .sort((a, b) => b.generades + b.realitzades - (a.generades + a.realitzades))

  const totalGenerades = files.reduce((sum, f) => sum + f.generades, 0)
  const totalRealitzades = files.reduce((sum, f) => sum + f.realitzades, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Resum de substitucions per docent. Les sortides escolars no hi compten.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{totalGenerades}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Substitucions generades</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{totalRealitzades}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Substitucions realitzades</p>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              {['Docent', 'Generades', 'Sense assignar substitut', 'Realitzades'].map(h => (
                <th
                  key={h}
                  style={{
                    padding: '8px 12px',
                    textAlign: h === 'Docent' ? 'left' : 'center',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 600,
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {files.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Encara no hi ha cap substitució registrada.
                </td>
              </tr>
            ) : (
              files.map((f, i) => (
                <tr
                  key={f.id}
                  style={{
                    borderBottom: '1px solid var(--color-border)',
                    backgroundColor: i % 2 === 0 ? 'white' : 'var(--color-bg)',
                  }}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--color-text)' }}>{f.nom}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {f.generades}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {f.noCal}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
                    {f.realitzades}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
