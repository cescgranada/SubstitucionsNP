/**
 * Script per carregar horaris_normalitzats.json a Supabase
 *
 * Ús: npx tsx scripts/load-horaris.ts
 *
 * Requisits:
 * - Fitxer data/horaris_normalitzats.json existent
 * - Variables d'entorn NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY configurades
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('ERROR: Cal configurar NEXT_PUBLIC_SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeig de noms curts als emails complets
const NOM_CURT_A_EMAIL: Record<string, string> = {
  'Cesc': 'francesc.granada@noupatufet.coop',
  'Laia C.': 'laia.canal@noupatufet.coop',
  'Laia Canal': 'laia.canal@noupatufet.coop',
  'Laia P.': 'laia.pantinat@noupatufet.coop',
  'Laia Pantinat': 'laia.pantinat@noupatufet.coop',
  'Àgata': 'agata.miquel@noupatufet.coop',
  'Júlia': 'julia.ruiz@noupatufet.coop',
  'Sol': 'sol.echegaray@noupatufet.coop',
  'Josep': 'josep.cuervas@noupatufet.coop',
  'Jordi Pere': 'jordi.tarraga@noupatufet.coop',
  'Jordi B.': 'jordi.bosch@noupatufet.coop',
  'Jordi Bosch': 'jordi.bosch@noupatufet.coop',
  'Vanessa': 'vanessa.roma@noupatufet.coop',
  'David': 'david.lozano@noupatufet.coop',
  'Beto': 'albert.oriol@noupatufet.coop',
  'Txell': 'txell.casadesus@noupatufet.coop',
  'Anna': 'anna.rimbau@noupatufet.coop',
  'Glòria': 'gloria.pons@noupatufet.coop',
  'Berta': 'berta.roca@noupatufet.coop',
  'Maria B.': 'maria.batllo@noupatufet.coop',
  'Maria Batlló': 'maria.batllo@noupatufet.coop',
  'Ingrid': 'ingrid.ribelles@noupatufet.coop',
  'Maria V.': 'maria.valles@noupatufet.coop',
  'Maria Vallés': 'maria.valles@noupatufet.coop',
  'Pau': 'pau.coya@noupatufet.coop',
  'Gerard': 'gerard.companys@noupatufet.coop',
  'Milena': 'milena.novas@noupatufet.coop',
  'Roberto': 'roberto.degodos@noupatufet.coop',
}

const DIA_A_NUM: Record<string, number> = {
  'dilluns': 1,
  'dimarts': 2,
  'dimecres': 3,
  'dijous': 4,
  'divendres': 5,
}

interface HorariEntry {
  docent: string
  dia: string
  hora_inici: string
  hora_fi: string
  tipus: string
  grup?: string | null
  materia?: string | null
  etapa: string
  parella_amb?: string | null
  tipus_parella?: string | null
  aula?: string | null
}

async function main() {
  const jsonPath = path.join(process.cwd(), 'data', 'horaris_normalitzats.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`ERROR: No s'ha trobat ${jsonPath}`)
    console.error('Col·loca el fitxer horaris_normalitzats.json a la carpeta data/')
    process.exit(1)
  }

  const horaris: HorariEntry[] = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  console.log(`Carregant ${horaris.length} entrades d'horari...`)

  // Carregar dades de referència
  console.log('Connectant a Supabase...')
  const { data: docentsList, error: err1 } = await supabase.from('docents').select('id, nom, email')
  if (err1) console.error('Error docents:', err1)
  const { data: etapesList } = await supabase.from('etapes').select('id, codi')
  const { data: grupsList } = await supabase.from('grups').select('id, codi')

  if (!docentsList || !etapesList || !grupsList) {
    console.error('ERROR: No s\'han pogut carregar les dades de referència. Executa primer les migracions i seeds.')
    process.exit(1)
  }

  const docentPerEmail = Object.fromEntries(docentsList.map(d => [d.email, d.id]))
  const docentPerNom = Object.fromEntries(docentsList.map(d => [d.nom, d.id]))
  const etapaPerCodi = Object.fromEntries(etapesList.map(e => [e.codi, e.id]))
  const grupPerCodi = Object.fromEntries(grupsList.map(g => [g.codi, g.id]))
  console.log('Dades de referència carregades correctament.')

  function getDocentId(nom: string): string | null {
    // Prova per nom complet
    if (docentPerNom[nom]) return docentPerNom[nom]
    // Prova per email via mapeig de noms curts
    const email = NOM_CURT_A_EMAIL[nom]
    if (email && docentPerEmail[email]) return docentPerEmail[email]
    return null
  }

  // Extreure franges úniques per etapa
  console.log('Inserint franges horàries úniques...')
  const frangesVistes = new Set<string>()
  const frangesAInserir: { etapa_id: string; hora_inici: string; hora_fi: string; ordre: number }[] = []
  const ordrePerEtapa: Record<string, number> = {}

  for (const entry of horaris) {
    const etapaId = etapaPerCodi[entry.etapa]
    if (!etapaId) continue
    const key = `${etapaId}|${entry.hora_inici}|${entry.hora_fi}`
    if (!frangesVistes.has(key)) {
      frangesVistes.add(key)
      if (!ordrePerEtapa[etapaId]) ordrePerEtapa[etapaId] = 1
      frangesAInserir.push({
        etapa_id: etapaId,
        hora_inici: entry.hora_inici,
        hora_fi: entry.hora_fi,
        ordre: ordrePerEtapa[etapaId]++,
      })
    }
  }

  const { error: frangesError } = await supabase
    .from('franges_horaries')
    .upsert(frangesAInserir, { onConflict: 'etapa_id,hora_inici,hora_fi' })

  if (frangesError) {
    console.error('ERROR inserint franges:', frangesError)
    process.exit(1)
  }

  // Recarregar franges amb IDs
  const { data: frangesList } = await supabase
    .from('franges_horaries')
    .select('id, etapa_id, hora_inici, hora_fi')

  if (!frangesList) {
    console.error('ERROR: No s\'han pogut carregar les franges horàries')
    process.exit(1)
  }

  const normalitzaHora = (h: string) => h.slice(0, 5) // "09:00:00" → "09:00"
  const franjaKey = (etapaId: string, horaInici: string, horaFi: string) =>
    `${etapaId}|${normalitzaHora(horaInici)}|${normalitzaHora(horaFi)}`
  const franjaPerKey = Object.fromEntries(
    frangesList.map(f => [franjaKey(f.etapa_id, f.hora_inici, f.hora_fi), f.id])
  )

  // Inserir horari setmanal
  console.log('Inserint horari setmanal...')
  let inserits = 0
  let errors = 0

  for (const entry of horaris) {
    const docentId = getDocentId(entry.docent)
    if (!docentId) {
      console.warn(`  AVÍS: Docent no trobat: "${entry.docent}"`)
      errors++
      continue
    }

    const etapaId = etapaPerCodi[entry.etapa]
    if (!etapaId) {
      console.warn(`  AVÍS: Etapa no trobada: "${entry.etapa}"`)
      errors++
      continue
    }

    const franjaId = franjaPerKey[franjaKey(etapaId, entry.hora_inici, entry.hora_fi)]
    if (!franjaId) {
      console.warn(`  AVÍS: Franja no trobada: ${entry.etapa} ${entry.hora_inici}-${entry.hora_fi}`)
      errors++
      continue
    }

    const diaSemana = DIA_A_NUM[entry.dia.toLowerCase()]
    if (!diaSemana) {
      console.warn(`  AVÍS: Dia no reconegut: "${entry.dia}"`)
      errors++
      continue
    }

    const grupId = entry.grup ? (grupPerCodi[entry.grup] ?? null) : null
    const parellaDocentId = entry.parella_amb ? getDocentId(entry.parella_amb) : null

    const { error } = await supabase.from('horari_setmanal').insert({
      docent_id: docentId,
      franja_id: franjaId,
      dia_setmana: diaSemana,
      tipus: entry.tipus,
      grup_id: grupId,
      materia: entry.materia ?? null,
      aula: entry.aula ?? null,
      parella_docent_id: parellaDocentId,
      tipus_parella: entry.tipus_parella ?? null,
    })

    if (error) {
      console.warn(`  ERROR inserint entrada: ${entry.docent} ${entry.dia} ${entry.hora_inici}:`, error.message)
      errors++
    } else {
      inserits++
    }
  }

  console.log(`\nResultat:`)
  console.log(`  Franges horàries: ${frangesAInserir.length}`)
  console.log(`  Entrades d'horari inserides: ${inserits}`)
  console.log(`  Errors/avisos: ${errors}`)
  console.log('\nFet!')
}

main().catch(console.error)
