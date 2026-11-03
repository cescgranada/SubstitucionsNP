import { resumVespre } from '@/lib/resum-vespre'

// Vercel Cron hi crida cada tarda de dilluns a divendres (vegeu vercel.json)
// amb `Authorization: Bearer <CRON_SECRET>`. Sense aquest secret no s'executa.
// `?simula=1` retorna el que s'enviaria sense enviar res; `?data=YYYY-MM-DD`
// força el dia (només amb simulació, per no enviar correus per error).
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return Response.json({ error: 'CRON_SECRET no configurat' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'No autoritzat' }, { status: 401 })
  }

  const url = new URL(request.url)
  const simula = url.searchParams.get('simula') === '1'
  const data = url.searchParams.get('data') ?? undefined
  if (data && (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !simula)) {
    return Response.json({ error: 'data només amb simula=1 i format YYYY-MM-DD' }, { status: 400 })
  }

  try {
    return Response.json(await resumVespre({ simula, data }))
  } catch (e) {
    console.error('[cron resum-vespre]', e)
    return Response.json({ error: e instanceof Error ? e.message : 'Error desconegut' }, { status: 500 })
  }
}
