// POST /api/analyze-lab
// Body: { image: string (base64), userId: string }
// Returns: { product_name, analysis_date, lab_name, status, dlc_certified, germs, recommendations, certificate_number }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

function detectMediaType(b64) {
  if (b64.startsWith('/9j/'))   return 'image/jpeg'
  if (b64.startsWith('iVBOR'))  return 'image/png'
  if (b64.startsWith('UklGR'))  return 'image/webp'
  if (b64.startsWith('JVBERi')) return 'application/pdf'
  return 'image/jpeg'
}

const SYSTEM_PROMPT = `Tu es un expert en analyses microbiologiques et certifications de conformité alimentaire.

Ta mission : analyser le document (rapport d'analyse, certificat de conformité, compte rendu de laboratoire) et extraire les informations clés.

Règles :
- Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ni après
- Si une information est absente, utilise null
- Les dates sont au format JJ/MM/AAAA

Structure JSON attendue :
{
  "product_name": "Nom du produit analysé",
  "analysis_date": "JJ/MM/AAAA ou null",
  "lab_name": "Nom du laboratoire ou null",
  "status": "conforme | non_conforme | a_verifier",
  "dlc_certified": "JJ/MM/AAAA ou null",
  "germs": [
    { "name": "E. coli", "value": "< 10 UFC/g", "limit": "100 UFC/g", "ok": true }
  ],
  "recommendations": "Texte ou null",
  "certificate_number": "Numéro ou null"
}

Évaluation du statut :
- "conforme" : tous les critères sont dans les normes réglementaires
- "non_conforme" : au moins un critère hors norme
- "a_verifier" : données insuffisantes ou ambiguës`

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
  if (mediaType === 'application/pdf') {
    return res.status(400).json({ error: 'PDF non supporté. Veuillez convertir en image JPG ou PNG.' })
  }

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
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Analyse ce document de laboratoire et retourne le JSON structuré demandé.' },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Erreur Anthropic', detail: err })
    }

    const data  = await response.json()
    const raw   = data.content?.[0]?.text ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return res.status(502).json({ error: 'Réponse non parseable', raw })

    return res.status(200).json(JSON.parse(match[0]))
  } catch (err) {
    console.error('analyze-lab error:', err)
    return res.status(500).json({ error: err.message })
  }
}
