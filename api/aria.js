// POST /api/aria
// Body: { message, history: [{role,content}], context: {date,user_name,user_role,stock,fournisseurs,scans_recents,temperatures,stats}, userId }
// Returns: { reply }

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

const ROLE_LABELS = {
  proprietaire: 'Propriétaire',
  chef:         'Chef de cuisine',
  second:       'Second de cuisine',
  cuisinier:    'Cuisinier',
  patissier:    'Pâtissier',
  employe:      'Employé',
}

const ROLE_PERMISSIONS = {
  proprietaire: {
    droits:     'accès total à toutes les fonctionnalités',
    interdit:   [],
  },
  chef: {
    droits:     'accès total sauf finances/abonnement',
    interdit:   [],
  },
  second: {
    droits:     'stock lecture/écriture, recettes, commandes, mise en place, HACCP, marges',
    interdit:   ['supprimer définitivement des données', 'gérer les abonnements'],
  },
  cuisinier: {
    droits:     'stock lecture/écriture, températures, mise en place, réception',
    interdit:   ['passer des commandes fournisseurs', 'consulter les marges ou finances', "gérer l'équipe", 'supprimer des recettes'],
  },
  patissier: {
    droits:     'stock lecture/écriture, recettes, mise en place, températures',
    interdit:   ['passer des commandes fournisseurs', 'consulter les marges ou finances', "gérer l'équipe"],
  },
  employe: {
    droits:     'stock lecture seule, températures, mise en place',
    interdit:   ['modifier ou supprimer le stock', 'passer des commandes', 'consulter les marges ou finances', "gérer l'équipe", 'modifier ou supprimer les recettes'],
  },
}

function buildRoleSection(role) {
  if (!role || role === 'superadmin') return ''
  const info     = ROLE_PERMISSIONS[role]
  if (!info) return ''
  const label    = ROLE_LABELS[role] || role

  let section = `\n## Rôle de l'utilisateur : ${label}\nDroits disponibles : ${info.droits}.`

  if (info.interdit.length > 0) {
    const list = info.interdit.join(', ')
    section += `\nActions NON autorisées pour ce rôle : ${list}.`
    section += `\n\nRÈGLE IMPÉRATIVE : si l'utilisateur te demande d'effectuer une action non autorisée (ex : ${info.interdit[0]}), réponds EXACTEMENT cette phrase, sans t'en écarter :\n"Je suis désolée, cette action nécessite les droits de Chef ou Second de cuisine. Merci de contacter votre responsable."\nAdapte uniquement le rôle minimal requis selon l'action demandée (Chef, Second, Propriétaire…). Ne fournis aucune aide pour contourner cette restriction.`
  }

  return section
}

function buildSystemPrompt(context) {
  const name = context?.user_name
  const role = context?.user_role
  const who  = name
    ? `Tu travailles avec ${name}${role ? ` (${ROLE_LABELS[role] || role})` : ''}`
    : 'Tu assistes le personnel de cuisine'

  return `Tu es Aria, assistante IA experte en gestion de cuisine professionnelle, intégrée à l'application Aria.
${who}.

## Ton expertise
- Stock et traçabilité : DLC, seuils critiques, rotations, catégories de produits
- Commandes fournisseurs : optimisation, bons de commande, comparaison prix, négociation
- HACCP : normes températures (réfrigération ≤4°C, chaud ≥63°C, réception ≤8°C, refroidissement ≤10°C en <2h), alertes non-conformités, traçabilité
- Gestion des coûts : food cost, variations de prix, économies potentielles, ratios
- Organisation : mise en place, planning cuisine, gestion du temps de service
- Équipe & Formation : suivi HACCP des employés, onboarding par rôle

## Utilisation du contexte
Tu reçois les données réelles et actuelles de l'établissement. Exploite-les précisément :
- Cite les produits par leur nom exact issu du stock
- Donne les quantités et unités réelles
- Référence les fournisseurs connus par leur nom
- Calcule les jours restants avant expiration (DLC)
- Identifie les priorités à partir des alertes (sous seuil, DLC proches, températures non-conformes)
- Adapte tes suggestions selon le rôle de l'utilisateur : un employé reçoit des conseils opérationnels simples, un chef des analyses stratégiques

## Comportement
- Français, ton chaleureux et professionnel — tu fais partie de l'équipe cuisine
- Direct : l'information critique en premier
- Actionnable : chaque réponse contient une action concrète à réaliser
- Précis : chiffres exacts, pas d'approximations quand les données sont disponibles
- Honnête : si une information manque dans le contexte, dis-le clairement et demande

## Format des réponses
- Concis pour les questions simples, détaillé si analyse explicitement demandée
- Listes à puces pour les produits, actions et recommandations
- Évite les titres Markdown (###) sauf pour les rapports longs
- Termine par une courte suggestion d'action suivante quand pertinent
- Pour les bons de commande : liste structurée produit / quantité / fournisseur
${buildRoleSection(role)}`
}

function buildContextBlock(context) {
  if (!context) return ''

  const lines = [`📅 Date : ${context.date || 'inconnue'}`]

  if (context.stats) {
    const s = context.stats
    const recettesPart  = s.recettes         !== undefined ? ` — ${s.recettes} recettes` : ''
    const couvertsPart  = s.couverts_semaine !== undefined ? ` — ${s.couverts_semaine} couverts/semaine` : ''
    lines.push(`📊 Résumé : ${s.stock_total} produits en stock — ${s.stock_critique} DLC critiques — ${s.sous_seuil} sous seuil — ${s.fournisseurs} fournisseurs${recettesPart}${couvertsPart}`)
  }

  if (context.stock?.length > 0) {
    lines.push(`\n📦 Stock (${context.stock.length} produits) :`)
    context.stock.forEach(i => {
      const dlcPart   = i.dlc        ? ` | DLC ${i.dlc}` : ''
      const seuilPart = i.seuil_min  ? ` | seuil min ${i.seuil_min} ${i.u}` : ''
      const pxPart    = i.px         ? ` | ${i.px}€/${i.u}` : ''
      const fourPart  = i.four       ? ` [${i.four}]` : ''
      lines.push(`  • ${i.nom} — ${i.q} ${i.u} (${i.cat || '?'})${dlcPart}${seuilPart}${pxPart}${fourPart}`)
    })

    const dlcAlerts = context.stock.filter(i => {
      if (!i.dlc) return false
      const [d, m, y] = i.dlc.split('/')
      return Math.ceil((new Date(`${y}-${m}-${d}`) - new Date()) / 86400000) <= 7
    })
    if (dlcAlerts.length > 0) {
      lines.push(`\n⚠️ Alertes DLC imminentes (≤ J-7) :`)
      dlcAlerts.forEach(i => {
        const [d, m, y] = i.dlc.split('/')
        const days = Math.ceil((new Date(`${y}-${m}-${d}`) - new Date()) / 86400000)
        const urgence = days < 0 ? 'EXPIRÉ' : `J-${days}`
        lines.push(`  • ${i.nom} — ${i.q} ${i.u} — ${urgence} (DLC: ${i.dlc})${i.four ? ` — four: ${i.four}` : ''}`)
      })
    }

    const sousSeuil = context.stock.filter(i => {
      const s = parseFloat(i.seuil_min)
      return isNaN(s) ? parseFloat(i.q) <= 2 : parseFloat(i.q) <= s
    })
    if (sousSeuil.length > 0) {
      lines.push(`\n📉 Produits sous seuil :`)
      sousSeuil.forEach(i => {
        lines.push(`  • ${i.nom} — ${i.q} ${i.u} (seuil: ${i.seuil_min ?? 2} ${i.u})${i.four ? ` — fournisseur: ${i.four}` : ''}`)
      })
    }
  }

  if (context.fournisseurs?.length > 0) {
    lines.push(`\n🚚 Fournisseurs (${context.fournisseurs.length}) :`)
    context.fournisseurs.forEach(f => {
      const contact = [f.tel && `📞 ${f.tel}`, f.email && `✉️ ${f.email}`].filter(Boolean).join(' ')
      const jours   = f.jours?.length ? `, livraison: ${f.jours.join('/')}` : ''
      lines.push(`  • ${f.nom} — mode: ${f.mode || '—'}${jours}${contact ? ` — ${contact}` : ''}`)
    })
  }

  if (context.scans_recents?.length > 0) {
    lines.push(`\n📷 Dernières réceptions (${context.scans_recents.length}) :`)
    context.scans_recents.forEach(s => {
      const total = s.total ? ` — ${Number(s.total).toFixed(2)} €` : ''
      lines.push(`  • ${s.date_scan || '—'} — ${s.four || 'Fournisseur ?'} — ${s.nb || 0} produits — ${s.conf}${total}`)
    })
  }

  if (context.temperatures?.length > 0) {
    lines.push(`\n🌡️ Températures récentes (${context.temperatures.length}) :`)
    context.temperatures.slice(0, 12).forEach(t => {
      const ok = t.conforme === true ? '✅' : t.conforme === false ? '⚠️ NON CONFORME' : '—'
      lines.push(`  • ${(t.created_at || '').slice(0, 16)} — ${t.contexte} — ${t.valeur}°C ${ok}`)
    })
    const ncCount = context.temperatures.filter(t => t.conforme === false).length
    if (ncCount > 0) {
      lines.push(`  → ${ncCount} non-conformité${ncCount > 1 ? 's' : ''} identifiée${ncCount > 1 ? 's' : ''}`)
    }
  }

  return lines.join('\n')
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { message, history = [], context, userId } = req.body ?? {}
  if (!message?.trim()) return res.status(400).json({ error: 'Champ "message" manquant' })

  const systemPrompt  = buildSystemPrompt(context)
  const contextBlock  = buildContextBlock(context)
  const userContent   = contextBlock
    ? `[Contexte établissement]\n${contextBlock}\n\n[Message]\n${message}`
    : message

  const historyMessages = history
    .slice(-12)
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
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 2048,
        system:     systemPrompt,
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
