import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { esEquipDirectiu } from '@/lib/roles'
import { iniciCurs, fiCurs } from '@/lib/curs'
import { FormAfegirDies, BotoEliminarDia, TIPUS_DIA } from './FormDies'

const MESOS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']

export default async function CalendariEscolarPage({
  searchParams,
}: {
  searchParams: Promise<{ curs?: string }>
}) {
  const { curs: cursParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: docent } = await supabase.from('docents').select('id').eq('email', user!.email!).single()
  if (!docent) redirect('/login')
  const { data: rols } = await supabase.from('docent_rols').select('rol').eq('docent_id', docent.id)
  if (!esEquipDirectiu(rols)) redirect('/')

  // El curs es tria pel seu any d'inici (2026 = curs 2026-27)
  const avui = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date())
  const anyInici = /^\d{4}$/.test(cursParam ?? '') ? Number(cursParam) : Number(iniciCurs(avui).slice(0, 4))
  const des = `${anyInici}-09-01`
  const fins = fiCurs(des)

  const { data: dies } = await supabase
    .from('calendari_escolar')
    .select('data, tipus, descripcio')
    .gte('data', des)
    .lte('data', fins)
    .order('data')

  // Els dies de juliol i agost "fora de curs" s'amaguen en una sola línia: són molts i no cal llistar-los un a un
  const llistables = (dies ?? []).filter(d => d.tipus !== 'fora_de_curs')
  const foraDeCurs = (dies ?? []).filter(d => d.tipus === 'fora_de_curs')

  const perMes = new Map<string, typeof llistables>()
  for (const d of llistables) {
    const clau = d.data.slice(0, 7)
    perMes.set(clau, [...(perMes.get(clau) ?? []), d])
  }

  const format = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric' })

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--color-primary)' }}>Calendari escolar</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Dies laborables sense classe del curs {anyInici}-{String(anyInici + 1).slice(2)}. No s&apos;hi generen substitucions.
        </p>
        <div className="flex gap-4 mt-2 text-sm font-medium">
          <Link href={`/calendari-escolar?curs=${anyInici - 1}`} style={{ color: 'var(--color-accent)' }}>← Curs anterior</Link>
          <Link href={`/calendari-escolar?curs=${anyInici + 1}`} style={{ color: 'var(--color-accent)' }}>Curs següent →</Link>
        </div>
      </div>

      <FormAfegirDies />

      {llistables.length === 0 && foraDeCurs.length === 0 ? (
        <div className="card text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>
          <p className="text-sm">Aquest curs encara no té cap dia sense classe. Tots els dies laborables compten com a lectius.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(perMes.entries()).map(([mes, files]) => (
            <div key={mes} className="card">
              <h2 className="text-sm font-semibold capitalize mb-2" style={{ color: 'var(--color-text)' }}>
                {MESOS[Number(mes.slice(5, 7)) - 1]} {mes.slice(0, 4)}
              </h2>
              <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                {files.map(d => (
                  <li key={d.data} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="capitalize" style={{ color: 'var(--color-text)' }}>{format(d.data)}</span>
                    <span className="flex-1 truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {TIPUS_DIA[d.tipus] ?? d.tipus}{d.descripcio && d.descripcio !== TIPUS_DIA[d.tipus] ? ` · ${d.descripcio}` : ''}
                    </span>
                    <BotoEliminarDia data={d.data} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {foraDeCurs.length > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              + {foraDeCurs.length} dies laborables fora de curs ({foraDeCurs[0].data} a {foraDeCurs[foraDeCurs.length - 1].data}).
            </p>
          )}
        </div>
      )}
    </div>
  )
}
