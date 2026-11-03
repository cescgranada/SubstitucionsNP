import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { esEquipDirectiu } from '@/lib/roles'
import { informeResum } from '@/lib/informe'
import { iniciCurs } from '@/lib/curs'

const DATA = /^\d{4}-\d{2}-\d{2}$/

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ des?: string; fins?: string }>
}) {
  const { des: desParam, fins: finsParam } = await searchParams
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

  // Per defecte, el curs actual fins avui
  const avui = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  let des = desParam && DATA.test(desParam) ? desParam : iniciCurs(avui)
  let fins = finsParam && DATA.test(finsParam) ? finsParam : avui
  if (des > fins) [des, fins] = [fins, des]

  // Regla de càlcul: 1 per cada classe, encara que ocupi diverses franges de
  // 30 minuts seguides (es compten com un sol bloc). Sortides i eliminades fora.
  const files = await informeResum(supabase, des, fins)

  const totalGenerades = files.reduce((sum, f) => sum + f.generades, 0)
  const totalRealitzades = files.reduce((sum, f) => sum + f.realitzades, 0)
  const totalHores = files.reduce((sum, f) => sum + f.hores, 0)
  const cerca = `des=${des}&fins=${fins}`
  const format = (n: number) => String(n).replace('.', ',')

  const capcaleres = ['Docent', "Dies d'absència", 'Generades', 'No calia substitut', 'Realitzades', 'Hores cobertes']

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

      <form method="get" className="card flex flex-wrap items-end gap-3">
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Des del
          <input type="date" name="des" defaultValue={des} className="block mt-1" />
        </label>
        <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Fins al
          <input type="date" name="fins" defaultValue={fins} className="block mt-1" />
        </label>
        <button type="submit" className="btn-primary text-sm" style={{ padding: '8px 16px', minHeight: '40px' }}>
          Aplicar
        </button>
        <a href={`/dashboard?des=${iniciCurs(avui)}&fins=${avui}`} className="text-sm font-medium py-2" style={{ color: 'var(--color-accent)' }}>
          Curs actual
        </a>
      </form>

      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{totalGenerades}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Substitucions generades</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>{totalRealitzades}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Substitucions realitzades</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{format(totalHores)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Hores cobertes</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm font-medium">
        <a href={`/dashboard/csv?${cerca}`} style={{ color: 'var(--color-accent)' }}>
          Descarregar resum (CSV)
        </a>
        <a href={`/dashboard/csv?${cerca}&tipus=detall`} style={{ color: 'var(--color-accent)' }}>
          Descarregar detall per classe (CSV)
        </a>
      </div>

      <div className="card overflow-x-auto">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
              {capcaleres.map(h => (
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
                <td colSpan={capcaleres.length} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  No hi ha cap substitució en aquestes dates.
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
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {f.diesAbsencia}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-primary)', fontWeight: 600 }}>
                    {f.generades}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {f.noCal}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
                    {f.realitzades}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                    {format(f.hores)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
        Dies d&apos;absència: dies lectius amb absència aprovada (una absència parcial compta com un dia).
        Una classe de diverses franges seguides compta una vegada; les hores es calculen per franges de 30 minuts.
      </p>
    </div>
  )
}
