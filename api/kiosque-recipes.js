// GET /api/kiosque-recipes?ownerId=...
// Public endpoint — no auth required
// Returns: { recipes: [{id, nom, allergenes, categorie}] }

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Méthode non autorisée' })

  const { ownerId } = req.query
  if (!ownerId) return res.status(400).json({ error: 'ownerId requis' })

  const url = process.env.SUPABASE_URL     || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_ANON_KEY
           || process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) return res.status(500).json({ error: 'Configuration Supabase manquante' })

  const supabase = createClient(url, key)

  const { data, error } = await supabase
    .from('recettes')
    .select('id, nom, allergenes, categorie')
    .eq('user_id', ownerId)
    .order('nom', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ recipes: data || [] })
}
