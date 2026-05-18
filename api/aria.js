// POST /api/aria
// Body: { message, history: [{role, content}], context: {date, stock, fournisseurs, scans_recents}, userId }
// Returns: { reply }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

const SYSTEM_PROMPT = `Tu es Aria, assistante IA experte en gestion de cuisine professionnelle, intégrée à l'application Aria.

## Ton rôle
Tu assistes les chefs, cuisiniers et gestionnaires de restaurants dans leur quotidien opérationnel :
- Analyser l'état du stock et détecter les risques (DLC critiques, ruptures imminentes)
- Anticiper et optimiser les commandes fournisseurs
- Veiller à la conformité HACCP et à la sécurité alimentaire
- Conseiller sur la gestion des coûts matières et les variations de prix
- Répondre à toute question liée à la gestion d'une cuisine professionnelle

## Contexte disponible
Tu reçois en temps réel les données de l'établissement : stock actuel, fournisseurs configurés et historique des réceptions. Exploite ces données pour donner des réponses précises et actionnables, pas génériques.

## Règles de comportement
- Répondre en français, ton professionnel mais accessible
- Être concis et direct : prioriser les informations critiques
- Donner des chiffres exacts quand les données sont disponibles
- Proposer des actions concrètes, pas seulement des constats
- Pour les alertes DLC : mentionner le produit, la date et l'action recommandée
- Pour les commandes : lister les produits sous seuil avec les quantités suggérées
- Ne jamais inventer de données non fournies dans le contexte
- Si tu n'as pas assez d'informations, le dire clairement et demander

## Format des réponses
- Réponses courtes pour les questions simples
- Listes à puces pour les énumérations de produits ou actions
- Pas de markdown excessif (pas de ### ou *** superflu)
- Terminer par une question ou suggestion d'action si pertinent`

function buildContextBlock(context) {
  if (!context) return ''

  const lines = [`📅 Date : ${context.date || 'inconnue'}`]

  if (context.stock?.length > 0) {
    const alerts = context.stock.filter(i => {
      if (!i.dlc) return false
      const [d, m, y] = i.dlc.split('/')
      const dt = new Date(`${y}-${m}-${d}`)
      const days = Math.ceil((dt - new Date()) / 86400000)
      return days <= 7
    })

    lines.push(`\n📦 Stock : ${context.stock.length} produits`)

    if (alerts.length > 0) {
      lines.push(`⚠️ DLC critiques (≤ J-7) :`)
      alerts.slice(0, 15).forEach(i => {
        lines.push(`  • ${i.nom} — ${i.q} ${i.u} — DLC ${i.dlc}`)
      })
    }

    const critiques = context.stock.filter(i => {
      const s = parseFloat(i.seuil_min)
      return isNaN(s) ? i.q <= 2 : i.q <= s
    })
    if (critiques.length > 0) {
      lines.push(`📉 Produits sous seuil :`)
      critiques.slice(0, 10).forEach(i => {
        lines.push(`  • ${i.nom} — ${i.q} ${i.u} (seuil ${i.seuil_min ?? 2} ${i.u}) — four: ${i.four || '—'}`)
      })
    }
  }

  if (context.fournisseurs?.length > 0) {
    lines.push(`\n🚚 Fournisseurs : ${context.fournisseurs.map(f => `${f.nom} (${f.mode}${f.jours?.length ? ', ' + f.jours.join('/') : ''})`).join(', ')}`)
  }

  if (context.scans_recents?.length > 0) {
    lines.push(`\n📷 Dernières réceptions :`)
    context.scans_recents.slice(0, 5).forEach(s => {
      lines.push(`  • ${s.date_scan} — ${s.four || '—'} — ${s.nb} produits — ${s.conf}`)
    })
  }

  return lines.join('\n')
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { message, history = [], context, userId } = req.body ?? {}
  if (!message?.trim()) return res.status(400).json({ error: 'Champ "message" manquant' })

  // Injecter le contexte dans le premier message utilisateur de cet échange
  const contextBlock = buildContextBlock(context)
  const userContent  = contextBlock
    ? `[Contexte établissement]\n${contextBlock}\n\n[Question]\n${message}`
    : message

  // Construire l'historique : max 10 échanges précédents
  const historyMessages = history
    .slice(-10)
    .filter(m => m.role && m.content)
    .map(m => ({ role: m.role, content: m.content }))

  const messages = [
    ...historyMessages,
    { role: 'user', content: userContent },
  ]

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
        max_tokens: 1024,
        system:     SYSTEM_PROMPT,
        messages,
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
    console.error('aria error:', err)
    return res.status(500).json({ error: err.message })
  }
}
