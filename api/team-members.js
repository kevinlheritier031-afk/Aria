// POST /api/team-members
// Body: { ownerId }
// Returns: { membres: [{id, name, role}] }
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

  const { ownerId } = req.body || {}
  if (!ownerId || ownerId.length < 10) {
    return res.status(400).json({ error: 'Code établissement invalide' })
  }

  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('equipe_membres')
      .select('id, name, role')
      .eq('owner_id', ownerId)
      .eq('actif', true)
      .order('name', { ascending: true })

    if (error) return res.status(500).json({ error: 'Erreur serveur' })
    return res.status(200).json({ membres: data || [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
