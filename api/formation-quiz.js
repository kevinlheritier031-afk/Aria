// POST /api/formation-quiz
// Body: { module_id }
// Returns: { questions: [{ id, question, options, correct, explication }] }
// Strict JSON output — no extra text

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

const MODULE_TOPICS = {
  1: "dangers alimentaires biologiques (bactéries pathogènes, virus, parasites), chimiques (allergènes, résidus), physiques (corps étrangers), conditions de multiplication bactérienne (TIAC), la chaîne du froid et les 14 allergènes réglementaires",
  2: "réglementation HACCP : règlement CE 852/2004, arrêté du 12 février 2024, paquet hygiène, contrôles officiels DDPP, obligations du PMS, traçabilité (article 18 CE 178/2002), déclaration d'activité",
  3: "les 7 principes HACCP, bonnes pratiques d'hygiène (BPH), bonnes pratiques de fabrication (BPF), structure d'un PMS, identification des CCP vs CP, arbre de décision HACCP, enregistrements obligatoires",
  4: "nettoyage et désinfection : protocole 5 étapes, détergents vs désinfectants, concentrations et temps de contact, Plan de Nettoyage et Désinfection (PND), fréquences minimales réglementaires, traçabilité des opérations N+D",
  5: "traçabilité amont/interne/aval, documents obligatoires, gestion des non-conformités, fiches de non-conformité, procédure de retrait/rappel produit, durées de conservation des documents (5 ans minimum)",
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { module_id } = req.body ?? {}
  if (!module_id || !MODULE_TOPICS[module_id]) return res.status(400).json({ error: 'module_id invalide (1-5)' })

  const systemPrompt = `Tu es un générateur de quiz HACCP. Tu dois générer exactement 8 questions à choix multiples sur le thème demandé.

RÈGLE ABSOLUE : Ta réponse doit être UNIQUEMENT du JSON valide, sans aucun texte avant ou après.
Le JSON doit respecter exactement ce format :
{
  "questions": [
    {
      "id": 1,
      "question": "Texte de la question ?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explication": "Explication courte de la bonne réponse."
    }
  ]
}

Règles :
- Exactement 8 questions
- Exactement 4 options par question
- "correct" est l'index (0-3) de la bonne réponse
- Questions variées (définitions, situations pratiques, chiffres réglementaires)
- Niveau de difficulté : intermédiaire (ni trop facile ni trop technique)
- Langue : français uniquement
- Varie les bonnes réponses (ne mets pas toujours la bonne réponse au même index)
- Ne génère PAS les mêmes questions à chaque appel — introduis de la variété`

  const userMessage = `Génère 8 questions de quiz HACCP sur le thème suivant : ${MODULE_TOPICS[module_id]}`

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
        max_tokens: 3000,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userMessage }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return res.status(502).json({ error: 'Erreur Anthropic', detail: errText })
    }

    const data = await response.json()
    const text = data.content?.find(b => b.type === 'text')?.text ?? ''

    let parsed
    try {
      const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      return res.status(500).json({ error: 'Réponse JSON invalide', raw: text.slice(0, 500) })
    }

    if (!Array.isArray(parsed?.questions) || parsed.questions.length === 0) {
      return res.status(500).json({ error: 'Format JSON inattendu', raw: text.slice(0, 500) })
    }

    return res.status(200).json({ questions: parsed.questions })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
