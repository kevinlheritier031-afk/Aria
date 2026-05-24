import { supabase } from './supabase'

export async function calculateConformiteScore(etablissementId) {
  if (!etablissementId) return { score: 0, niveau: 'découverte', couleur: 'gray', détails: {} }

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()

  const [
    { data: etab },
    { data: tempsFroid },
    { data: tempsChaud },
    { data: tempsRefroid },
    { data: membres },
    { data: formData },
  ] = await Promise.all([
    supabase.from('etablissements').select('settings').eq('id', etablissementId).single(),
    supabase.from('haccp_temperatures').select('created_at').eq('etablissement_id', etablissementId).eq('type', 'froid').gte('created_at', since7d),
    supabase.from('haccp_temperatures').select('created_at').eq('etablissement_id', etablissementId).eq('type', 'chaud').gte('created_at', since7d),
    supabase.from('haccp_temperatures').select('created_at').eq('etablissement_id', etablissementId).eq('type', 'refroidissement').gte('created_at', since7d),
    supabase.from('equipe_membres').select('id').eq('etablissement_id', etablissementId),
    supabase.from('haccp_formation_progression').select('user_id').eq('etablissement_id', etablissementId).eq('statut', 'valide'),
  ])

  const modules  = etab?.settings?.modules || {}
  const isActive = (k) => modules[k] !== false

  let score = 0
  const détails = {}

  const modFroid   = isActive('haccp_froid')
  const modChaud   = isActive('haccp_chaud')
  const modRefroid = isActive('haccp_refroidissement')
  const modForm    = isActive('haccp_formation')

  if (modFroid)   score += 10
  if (modChaud)   score += 10
  if (modRefroid) score += 10
  if (modForm)    score += 10

  // Froid — jours avec 2+ relevés / 7j = 15pts
  const froidByDay = {}
  ;(tempsFroid || []).forEach(t => {
    const d = t.created_at.slice(0, 10)
    froidByDay[d] = (froidByDay[d] || 0) + 1
  })
  const froidValidDays = Object.values(froidByDay).filter(n => n >= 2).length
  const froidPts = modFroid ? Math.round((Math.min(froidValidDays, 7) / 7) * 15) : 0
  score += froidPts
  détails.froid = { points: froidPts, max: 15, jours: froidValidDays, inactive: !modFroid }

  // Chaud — jours avec 1+ relevé / 7j = 15pts
  const chaudDays = new Set((tempsChaud || []).map(t => t.created_at.slice(0, 10))).size
  const chaudPts  = modChaud ? Math.round((Math.min(chaudDays, 7) / 7) * 15) : 0
  score += chaudPts
  détails.chaud = { points: chaudPts, max: 15, jours: chaudDays, inactive: !modChaud }

  // Refroidissement — 3+ relevés / 7j = 10pts (proportionnel)
  const refCount = (tempsRefroid || []).length
  const refPts   = modRefroid ? Math.min(10, Math.round((refCount / 3) * 10)) : 0
  score += refPts
  détails.refroidissement = { points: refPts, max: 10, count: refCount, inactive: !modRefroid }

  // Formation — % employés avec module validé = 20pts
  const totalMembres = Math.max((membres || []).length + 1, 1)
  const formesCount  = new Set((formData || []).map(f => f.user_id)).size
  const formPts      = modForm ? Math.round(Math.min(formesCount / totalMembres, 1) * 20) : 0
  score += formPts
  détails.formation = { points: formPts, max: 20, formes: formesCount, total: totalMembres, inactive: !modForm }

  const niveau = score < 40 ? 'découverte' : score < 80 ? 'partiel' : 'complet'
  const couleur = score < 40 ? 'gray' : score < 80 ? 'orange' : 'green'

  return { score, niveau, couleur, détails }
}
