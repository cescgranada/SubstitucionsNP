import { createClient } from '@/lib/supabase/server'
import { esEquipDirectiu } from '@/lib/roles'
import { aCsv, informeDetall, informeResum } from '@/lib/informe'

export const dynamic = 'force-dynamic'

const DATA = /^\d{4}-\d{2}-\d{2}$/

/** Descàrrega de l'informe en CSV (resum per docent o detall per classe). Només l'equip directiu. */
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return new Response('No autenticat', { status: 401 })

  const { data: docent } = await supabase.from('docents').select('id').eq('email', user.email).single()
  const { data: rols } = docent
    ? await supabase.from('docent_rols').select('rol').eq('docent_id', docent.id)
    : { data: null }
  if (!esEquipDirectiu(rols)) return new Response('Sense permís', { status: 403 })

  const params = new URL(request.url).searchParams
  const des = params.get('des') ?? ''
  const fins = params.get('fins') ?? ''
  if (!DATA.test(des) || !DATA.test(fins) || des > fins) {
    return new Response('Dates no vàlides', { status: 400 })
  }
  const detall = params.get('tipus') === 'detall'

  const files = detall
    ? await informeDetall(supabase, des, fins)
    : [
        ['Docent', 'Dies d\'absència', 'Classes amb substitució', 'No calia substitut', 'Classes cobertes', 'Hores cobertes'],
        ...(await informeResum(supabase, des, fins)).map(f => [
          f.nom, f.diesAbsencia, f.generades, f.noCal, f.realitzades, String(f.hores).replace('.', ','),
        ]),
      ]

  return new Response(aCsv(files), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="substitucions-${detall ? 'detall' : 'resum'}-${des}-${fins}.csv"`,
    },
  })
}
