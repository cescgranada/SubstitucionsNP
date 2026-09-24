/**
 * Script de prova de la integració Google Calendar.
 * Crea un event de test i l'elimina tot seguit.
 *
 * Executa amb: npx tsx scripts/test-gcal.ts
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'

// Carrega .env.local manualment (sense dotenv)
const envPath = resolve(process.cwd(), '.env.local')
const envLines = readFileSync(envPath, 'utf-8').split('\n')
for (const line of envLines) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  const key = trimmed.slice(0, idx).trim()
  const val = trimmed.slice(idx + 1).trim()
  if (!process.env[key]) process.env[key] = val
}

import { crearEsdevenimentSortida, eliminarEsdeveniment, gcalConfigurat } from '../src/lib/gcal'

async function main() {
  console.log('─── Test Google Calendar ───')

  if (!gcalConfigurat()) {
    console.error('❌ Variables d\'entorn no configurades.')
    process.exit(1)
  }

  console.log('✓ Credencials trobades')
  console.log('  Compte de servei:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL)
  console.log('  Calendari:', process.env.GOOGLE_CALENDAR_ID)
  console.log()

  // Data de demà per no embrutar el calendari d'avui
  const dema = new Date()
  dema.setDate(dema.getDate() + 1)
  const data = dema.toISOString().split('T')[0]

  console.log(`Creant event de test per al ${data}...`)

  const eventId = await crearEsdevenimentSortida({
    descripcio: '[TEST SubsCoop] Prova integració Calendar',
    data,
    horaInici: '09:00:00',
    horaFi: '11:00:00',
    grups: ['4t ESO', '3r ESO'],
    acompanyants: ['Francesc Granada', 'Laia Canal'],
  })

  if (!eventId) {
    console.error('❌ No s\'ha pogut crear l\'event. Revisa els logs.')
    process.exit(1)
  }

  console.log('✓ Event creat! ID:', eventId)
  console.log('  Comprova que apareix al calendari...')
  console.log()

  // Espera 2 segons i l'elimina
  await new Promise(r => setTimeout(r, 2000))

  console.log('Eliminant event de test...')
  await eliminarEsdeveniment(eventId)
  console.log('✓ Event eliminat correctament')
  console.log()
  console.log('✅ Integració Google Calendar OK!')
}

main().catch(err => {
  console.error('❌ Error inesperat:', err)
  process.exit(1)
})
