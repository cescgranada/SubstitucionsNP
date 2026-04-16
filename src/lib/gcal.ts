/**
 * SubsCoop — Integració Google Calendar
 *
 * Usa un compte de servei (service account) de Google per escriure al
 * calendari compartit del centre. No requereix cap paquet addicional:
 * la signatura JWT usa el mòdul `crypto` natiu de Node.js.
 *
 * Variables d'entorn necessàries (afegir a .env.local i a Vercel):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — email del compte de servei
 *   GOOGLE_SERVICE_ACCOUNT_KEY    — clau privada PEM amb \n escapats
 *   GOOGLE_CALENDAR_ID            — ID del calendari del centre
 *
 * Com obtenir-les:
 *   1. Google Cloud Console → IAM → Comptes de servei → Crea compte
 *   2. Crea una clau JSON → copia `client_email` i `private_key`
 *   3. Google Calendar → Configuració del calendari → Comparteix →
 *      afegeix l'email del compte de servei amb permís "Fer canvis als events"
 */

import { createSign } from 'crypto'

const SCOPE = 'https://www.googleapis.com/auth/calendar'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const CAL_API = 'https://www.googleapis.com/calendar/v3/calendars'
const TZ = 'Europe/Madrid'

export function gcalConfigurat(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY &&
    process.env.GOOGLE_CALENDAR_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY !== 'xxx'
  )
}

async function getAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL!
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).toString('base64url')

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${claim}`)
  const signature = sign.sign(privateKey, 'base64url')

  const jwt = `${header}.${claim}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  const data = await res.json()
  if (!data.access_token) throw new Error(`Error obtenint token GCal: ${JSON.stringify(data)}`)
  return data.access_token
}

/**
 * Crea un esdeveniment de sortida al calendari del centre.
 * Retorna l'ID de l'event creat, o null si GCal no està configurat o hi ha error.
 */
export async function crearEsdevenimentSortida(params: {
  descripcio: string
  data: string
  horaInici: string
  horaFi: string
  grups: string[]
  acompanyants: string[]
}): Promise<string | null> {
  if (!gcalConfigurat()) {
    console.log('[gcal] No configurat, saltant creació d\'esdeveniment sortida')
    return null
  }

  try {
    const token = await getAccessToken()
    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)

    const liniesDescripcio = [
      params.grups.length > 0 ? `Grups: ${params.grups.join(', ')}` : null,
      params.acompanyants.length > 0 ? `Acompanyants: ${params.acompanyants.join(', ')}` : null,
    ].filter(Boolean).join('\n')

    const event = {
      summary: `Sortida: ${params.descripcio}`,
      ...(liniesDescripcio ? { description: liniesDescripcio } : {}),
      start: { dateTime: `${params.data}T${params.horaInici}`, timeZone: TZ },
      end: { dateTime: `${params.data}T${params.horaFi}`, timeZone: TZ },
    }

    const res = await fetch(`${CAL_API}/${calendarId}/events`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`HTTP ${res.status}: ${err}`)
    }

    const created = await res.json()
    return created.id as string
  } catch (err) {
    console.error('[gcal] Error creant esdeveniment sortida:', err)
    return null
  }
}

/**
 * Elimina un esdeveniment del calendari del centre.
 * Ignora silenciosament si l'event no existeix (404).
 */
export async function eliminarEsdeveniment(eventId: string): Promise<void> {
  if (!gcalConfigurat()) return

  try {
    const token = await getAccessToken()
    const calendarId = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID!)

    const res = await fetch(`${CAL_API}/${calendarId}/events/${eventId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok && res.status !== 404) {
      console.error('[gcal] Error eliminant event:', res.status, await res.text())
    }
  } catch (err) {
    console.error('[gcal] Error eliminant esdeveniment:', err)
  }
}
