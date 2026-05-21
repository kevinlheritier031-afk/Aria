// POST /api/ticket-caisse
// Body: { image: string (base64 pur), menus: [{nom, prix_vente}] }
// Returns: { menus: [{nom, nb_couverts}] }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

function detectMediaType(b64) {
  if (b64.startsWith('/9j/'))  return 'image/jpeg'
  if (b64.startsWith('iVBOR')) return 'image/png'
  if (b64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { image, menus = [] } = req.body ?? {}
  if (!image) return res.status(400).json({ error: 'Champ "image" manquant' })

  const mediaType   = detectMediaType(image)
  const menuContext = menus.length > 0
    ? `\nMenus connus dans cet établissement : ${menus.map(m => m.nom).join(', ')}.`
    : ''

  const systemPrompt = `Tu es un assistant de restauration. Analyse ce ticket de fin de service.
Extrais pour chaque menu : nom exact et nombre de couverts vendus.
Réponds UNIQUEMENT en JSON sans markdown :
{ "menus": [{ "nom": "string", "nb_couverts": number }] }${menuContext}`

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 512,
        system:     systemPrompt,
        messages:   [{
          role:    'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text',  text: 'Analyse ce ticket de caisse et extrais les ventes par menu.' },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return res.status(502).json({ error: 'Erreur Anthropic', detail: err })
    }

    const data   = await response.json()
    const raw    = data.content?.[0]?.text ?? ''
    const clean  = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    return res.status(200).json(parsed)

  } catch (err) {
    console.error('ticket-caisse error:', err)
    return res.status(500).json({ error: err.message })
  }
}
