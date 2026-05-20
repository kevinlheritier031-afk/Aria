// POST /api/team-login
// Body: { ownerId, memberId, pin }
// Returns: { memberId, name, role, ownerId } on success
// Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars

const { createClient } = require('@supabase/supabase-js')

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars manquantes')
  return createClient(url, key)
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' })

  const { ownerId, memberId, pin } = req.body || {}
  if (!ownerId || !memberId || !pin) {
    return res.status(400).json({ error: 'Paramètres manquants' })
  }
  if (String(pin).length !== 4 || !/^\d{4}$/.test(String(pin))) {
    return res.status(400).json({ error: 'Le PIN doit être composé de 4 chiffres' })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('equipe_membres')
      .select('id, name, role, pin_code, actif')
      .eq('id', memberId)
      .eq('owner_id', ownerId)
      .single()

    if (error || !data) return res.status(401).json({ error: 'Membre introuvable' })
    if (!data.actif)     return res.status(401).json({ error: 'Ce compte est désactivé' })
    if (!data.pin_code)  return res.status(401).json({ error: 'Aucun PIN configuré pour ce membre' })
    if (String(data.pin_code) !== String(pin)) {
      return res.status(401).json({ error: 'PIN incorrect' })
    }

    return res.status(200).json({
      memberId: data.id,
      name:     data.name,
      role:     data.role,
      ownerId,
      loginAt:  new Date().toISOString(),
    })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
