// POST /api/recette
// Body: { image: string (base64 pur, sans préfixe data:) }
// Returns: { nom, nb_personnes, cat, ingredients, etapes, allergenes, cout_estime, temps_prep, temps_cuisson, notes }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

function detectMediaType(b64) {
  if (b64.startsWith('/9j/'))        return 'image/jpeg'
  if (b64.startsWith('iVBOR'))       return 'image/png'
  if (b64.startsWith('UklGR'))       return 'image/webp'
  if (b64.startsWith('R0lGO'))       return 'image/gif'
  return 'image/jpeg'
}

const SYSTEM_PROMPT = `Tu es un expert culinaire spécialisé dans la gastronomie française et la gestion de cuisine professionnelle.

Ta mission : analyser l'image d'une fiche recette (papier, livre, écran, notes manuscrites) et extraire toutes les informations structurées.

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après
- Ne jamais inventer de données non visibles sur l'image
- Si une information est absente, utilise null ou un tableau vide []
- Les quantités sont des nombres décimaux
- Les temps sont en minutes (entiers)
- Les prix sont en euros (nombres décimaux)

Allergènes officiels à détecter : gluten, crustaces, oeufs, poisson, arachides, soja, lait, fruits_a_coque, celeri, moutarde, sesame, sulfites, lupin, mollusques

Structure JSON attendue :
{
  "nom": "Nom de la recette",
  "nb_personnes": 4,
  "cat": "entree | plat | dessert | sauce | base | autre",
  "ingredients": [
    {
      "nom": "Nom exact de l'ingrédient",
      "q": 0.0,
      "u": "kg | g | L | cl | ml | pièce | c.à.s | c.à.c | pincée | sachet | bouquet",
      "cat": "viande | poisson | laitier | epicerie | legumes | boissons | autre"
    }
  ],
  "etapes": [
    "Description complète de l'étape 1",
    "Description complète de l'étape 2"
  ],
  "allergenes": ["gluten", "lait"],
  "cout_estime": 0.00,
  "temps_prep": 30,
  "temps_cuisson": 45,
  "notes": "Notes particulières ou null"
}`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { image } = req.body ?? {}
  if (!image) return res.status(400).json({ error: 'Champ "image" manquant' })

  const mediaType = detectMediaType(image)

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 4096,
        system:     SYSTEM_PROMPT,
        messages: [{
          role:    'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text',  text:   'Analyse cette fiche recette et retourne le JSON structuré demandé.' },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return res.status(502).json({ error: 'Erreur Anthropic', detail: err })
    }

    const data  = await response.json()
    const raw   = data.content?.[0]?.text ?? ''

    const clean = raw.replace(/```json|```/g, '').trim()
    if (!clean) {
      console.error('Pas de JSON dans la réponse:', raw)
      return res.status(502).json({ error: 'Réponse non parseable', raw })
    }

    const parsed = JSON.parse(clean)
    return res.status(200).json(parsed)

  } catch (err) {
    console.error('recette error:', err)
    return res.status(500).json({ error: err.message })
  }
}
