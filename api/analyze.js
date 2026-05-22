// POST /api/analyze
// Body: { image: string (base64 pur, sans préfixe data:), userId: string, etablissementId?: string, accessToken?: string }
// Returns: { fournisseur, date, total, nb, conf, produits: [...], fournisseur_cree?: bool, fournisseur_id?: string }

import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

function getSupabase(accessToken) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, accessToken
    ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    : {}
  )
}

async function upsertFournisseur({ nom, etablissementId, userId, accessToken }) {
  const sb = getSupabase(accessToken)
  if (!sb || !nom || !etablissementId) return {}
  const { data: existing } = await sb
    .from('fournisseurs')
    .select('id')
    .eq('etablissement_id', etablissementId)
    .ilike('nom', nom)
    .maybeSingle()
  if (existing) return { fournisseur_cree: false, fournisseur_id: existing.id }
  const { data, error } = await sb
    .from('fournisseurs')
    .insert({ nom, etablissement_id: etablissementId, user_id: userId, mode: 'tel' })
    .select('id')
    .single()
  if (error) { console.error('❌ INSERT fournisseur:', error); return {} }
  return { fournisseur_cree: true, fournisseur_id: data.id }
}

// Détecte le type MIME depuis les premiers octets base64
function detectMediaType(b64) {
  if (b64.startsWith('/9j/'))        return 'image/jpeg'
  if (b64.startsWith('iVBOR'))       return 'image/png'
  if (b64.startsWith('UklGR'))       return 'image/webp'
  if (b64.startsWith('R0lGO'))       return 'image/gif'
  return 'image/jpeg' // fallback
}

const SYSTEM_PROMPT = `Tu es un OCR expert spécialisé dans les documents de restauration française (bons de livraison, factures fournisseurs, étiquettes produits).

Ta mission : analyser l'image et extraire toutes les informations produits avec une précision maximale.

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après
- Ne jamais inventer de données non visibles sur l'image
- Si une information est illisible ou absente, utilise null
- Les dates sont au format JJ/MM/AAAA
- IMPORTANT : le champ "dlc" est la Date Limite de Consommation (date d'EXPIRATION), jamais la date de fabrication, de production ou de conditionnement. Si le document indique "Fabriqué le" ou "Production :" sans DLC visible, utilise null.
- Les prix sont en euros (nombres décimaux)
- Les quantités sont des nombres décimaux
- Pour "cat", choisir parmi : viande, poisson, laitier, epicerie, legumes, boissons, autre

Structure JSON attendue :
{
  "fournisseur": "Nom du fournisseur",
  "date": "JJ/MM/AAAA ou null",
  "total": 0.00,
  "nb": 0,
  "conf": "conforme | non_conforme | a_verifier",
  "motif_non_conf": "Raison si non conforme, sinon null",
  "produits": [
    {
      "nom": "Nom exact du produit",
      "q": 0.0,
      "u": "kg | g | L | cl | ml | pièce | caisse | carton | bouteille | sac | boîte | barquette | filet | botte | unité",
      "px": 0.00,
      "px_total": 0.00,
      "dlc": "JJ/MM/AAAA ou null",
      "lot": "numéro de lot ou null",
      "cat": "viande | poisson | laitier | epicerie | legumes | boissons | autre",
      "tva": 0.0
    }
  ]
}

Évaluation conformité HACCP :
- "conforme" : température correcte visible, emballages intacts, DLC valides, produits conformes
- "non_conforme" : température hors norme, emballage endommagé, DLC dépassée, anomalie visible
- "a_verifier" : informations insuffisantes pour statuer`

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { image, userId, etablissementId, accessToken } = req.body ?? {}
  if (!image) return res.status(400).json({ error: 'Champ "image" manquant' })

  const mediaType = detectMediaType(image)

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-api-key':       apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type:   'image',
                source: { type: 'base64', media_type: mediaType, data: image },
              },
              {
                type: 'text',
                text: 'Analyse ce document de restauration et retourne le JSON structuré demandé.',
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return res.status(502).json({ error: 'Erreur Anthropic', detail: err })
    }

    const data = await response.json()
    const raw  = data.content?.[0]?.text ?? ''

    // Extraire le JSON même si Claude ajoute du texte autour
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('Pas de JSON dans la réponse:', raw)
      return res.status(502).json({ error: 'Réponse non parseable', raw })
    }

    const parsed = JSON.parse(match[0])

    // Auto-upsert fournisseur if recognized
    let fourExtra = {}
    if (parsed.fournisseur && etablissementId) {
      fourExtra = await upsertFournisseur({ nom: parsed.fournisseur, etablissementId, userId, accessToken })
    }

    return res.status(200).json({ ...parsed, ...fourExtra })

  } catch (err) {
    console.error('analyze error:', err)
    return res.status(500).json({ error: err.message })
  }
}
