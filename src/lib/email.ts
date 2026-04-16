/**
 * SubsCoop — Notificacions per correu via Resend
 *
 * Per activar: afegir RESEND_API_KEY i RESEND_FROM a .env.local
 * Obtén una clau gratuïta a https://resend.com
 */

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.RESEND_FROM ?? 'SubsCoop <noreply@noupatufet.coop>'

function esConfigurat(): boolean {
  return !!process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_xxxx'
}

// ─── Plantilles HTML ──────────────────────────────────────────────

function htmlBase(contingut: string): string {
  return `
<!DOCTYPE html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: 'Inter', system-ui, sans-serif; background: #F8FAFB; margin: 0; padding: 0; color: #1B3A4B; }
    .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .header { background: #1B3A4B; padding: 24px 32px; }
    .header-title { color: white; font-size: 18px; font-weight: 600; margin: 0; }
    .header-sub { color: #7FB5D5; font-size: 13px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .body p { font-size: 15px; line-height: 1.6; margin: 0 0 16px; color: #1B3A4B; }
    .info-box { background: #E8EFF3; border-radius: 8px; padding: 16px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 8px; }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: #5A7D8A; }
    .info-value { font-weight: 500; }
    .feina-box { background: #EDF5FA; border-left: 3px solid #7FB5D5; border-radius: 0 8px 8px 0; padding: 12px 16px; margin: 16px 0; font-size: 14px; font-style: italic; color: #1B3A4B; }
    .footer { padding: 16px 32px; border-top: 1px solid #D8E3E8; font-size: 12px; color: #5A7D8A; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-title">SubsCoop</p>
      <p class="header-sub">Escola Cooperativa Nou Patufet</p>
    </div>
    <div class="body">${contingut}</div>
    <div class="footer">
      Aquest missatge ha estat generat automàticament per SubsCoop. No respon a aquest correu.
    </div>
  </div>
</body>
</html>`
}

// ─── Funcions d'enviament ─────────────────────────────────────────

/**
 * Notifica al substitut que ha estat assignat a una substitució
 */
export async function enviarNotificacioSubstitut(params: {
  emailSubstitut: string
  nomSubstitut: string
  nomDocentAbsent: string
  data: string
  horaInici: string
  horaFi: string
  grup?: string
  materia?: string
  aula?: string
  feinaSubstitut?: string
}): Promise<void> {
  if (!esConfigurat()) {
    console.log('[email] Resend no configurat, saltant notificació a', params.emailSubstitut)
    return
  }

  const dataFormatada = new Date(params.data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const contingut = `
    <p>Hola, <strong>${params.nomSubstitut}</strong>!</p>
    <p>Has estat assignat/da per fer una substitució:</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Data</span>
        <span class="info-value">${dataFormatada}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Franja</span>
        <span class="info-value">${params.horaInici.slice(0, 5)} – ${params.horaFi.slice(0, 5)}</span>
      </div>
      ${params.grup ? `<div class="info-row"><span class="info-label">Grup</span><span class="info-value">${params.grup}</span></div>` : ''}
      ${params.materia ? `<div class="info-row"><span class="info-label">Matèria</span><span class="info-value">${params.materia}</span></div>` : ''}
      ${params.aula ? `<div class="info-row"><span class="info-label">Aula</span><span class="info-value">${params.aula}</span></div>` : ''}
      <div class="info-row">
        <span class="info-label">Substituïu a</span>
        <span class="info-value">${params.nomDocentAbsent}</span>
      </div>
    </div>
    ${params.feinaSubstitut ? `<p>Feina deixada per ${params.nomDocentAbsent}:</p><div class="feina-box">${params.feinaSubstitut}</div>` : '<p>El/la docent encara no ha deixat feina. Consulta SubsCoop per si s\'actualitza.</p>'}
    <p>Pots veure el detall a SubsCoop.</p>
  `

  await resend.emails.send({
    from: FROM,
    to: params.emailSubstitut,
    subject: `Substitució assignada — ${dataFormatada}`,
    html: htmlBase(contingut),
  })
}

/**
 * Notifica al cap de personal que hi ha una absència per dia personal pendent d'aprovació
 */
export async function enviarNotificacioAprovacioPendent(params: {
  emailGestor: string
  nomGestor: string
  nomDocent: string
  data: string
  motiu: string
}): Promise<void> {
  if (!esConfigurat()) {
    console.log('[email] Resend no configurat, saltant notificació a', params.emailGestor)
    return
  }

  const dataFormatada = new Date(params.data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const contingut = `
    <p>Hola, <strong>${params.nomGestor}</strong>!</p>
    <p><strong>${params.nomDocent}</strong> ha comunicat una absència pendent d'aprovació:</p>
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Data</span>
        <span class="info-value">${dataFormatada}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Motiu</span>
        <span class="info-value">${params.motiu === 'dia_personal' ? 'Dia personal' : params.motiu}</span>
      </div>
    </div>
    <p>Accedeix a SubsCoop per aprovar o rebutjar la sol·licitud.</p>
  `

  await resend.emails.send({
    from: FROM,
    to: params.emailGestor,
    subject: `Absència pendent d'aprovació — ${params.nomDocent}`,
    html: htmlBase(contingut),
  })
}

/**
 * Notifica al docent que la seva absència ha estat aprovada o rebutjada
 */
export async function enviarNotificacioRessolucioAbsencia(params: {
  emailDocent: string
  nomDocent: string
  data: string
  estat: 'aprovada' | 'rebutjada'
  nomGestor: string
}): Promise<void> {
  if (!esConfigurat()) {
    console.log('[email] Resend no configurat, saltant notificació a', params.emailDocent)
    return
  }

  const dataFormatada = new Date(params.data + 'T12:00:00').toLocaleDateString('ca-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const aprovada = params.estat === 'aprovada'

  const contingut = `
    <p>Hola, <strong>${params.nomDocent}</strong>!</p>
    <p>La teva absència del <strong>${dataFormatada}</strong> ha estat <strong>${aprovada ? 'aprovada' : 'rebutjada'}</strong> per ${params.nomGestor}.</p>
    ${aprovada ? '<p>Les substitucions corresponents ja han estat generades automàticament.</p>' : '<p>Si tens dubtes, contacta amb el cap de personal.</p>'}
  `

  await resend.emails.send({
    from: FROM,
    to: params.emailDocent,
    subject: `Absència ${aprovada ? 'aprovada' : 'rebutjada'} — ${dataFormatada}`,
    html: htmlBase(contingut),
  })
}
