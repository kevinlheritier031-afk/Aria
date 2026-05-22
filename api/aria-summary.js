// POST /api/aria-summary
// Body: { expired, critical, ruptures, lastScan: { four, date } | null }
// Returns: { reply }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { expired = 0, critical = 0, ruptures = 0, lastScan = null, etabNom = 'votre cuisine' } = req.body ?? {}

  const systemPrompt = `Tu es Aria, assistante IA pour la cuisine professionnelle de ${etabNom}.
Génère UN message court (2 phrases max) et utile basé sur les données fournies.
Sois directe, professionnelle, bienveillante. Pas de formule de politesse.`

  const userContent = [
    `Données actuelles :`,
    `- Produits expirés : ${expired}`,
    `- Produits J-3 : ${critical}`,
    `- Stock en rupture : ${ruptures}`,
    lastScan
      ? `- Dernière réception : ${lastScan.four || 'fournisseur inconnu'} le ${lastScan.date}`
      : `- Aucune réception récente`,
  ].join('\n')

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
        max_tokens: 100,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Anthropic error:', err)
      return res.status(502).json({ error: 'Erreur Anthropic', detail: err })
    }

    const data  = await response.json()
    const reply = data.content?.[0]?.text ?? ''
    return res.status(200).json({ reply })
  } catch (err) {
    console.error('aria-summary error:', err)
    return res.status(500).json({ error: err.message })
  }
}
