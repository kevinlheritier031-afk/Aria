// POST /api/aria
// Body: { message, history, context, userId, accessToken }
// Returns: { reply }

import { createClient } from '@supabase/supabase-js'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL         = 'claude-sonnet-4-6'

// ── Supabase client (with user JWT for RLS) ──────────────────────────────────

function getSupabase(accessToken) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, accessToken
    ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
    : {}
  )
}

// ── Tool definitions ─────────────────────────────────────────────────────────

const TOOLS_DEFINITION = [
  {
    name: 'lire_stock',
    description: "Lire tout le stock de l'établissement",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'modifier_stock',
    description: 'Modifier un champ d\'un produit en stock',
    input_schema: {
      type: 'object',
      properties: {
        id:     { type: 'string', description: 'UUID du produit' },
        champ:  { type: 'string', description: 'Nom du champ (q, nom, px, dlc, cat…)' },
        valeur: { description: 'Nouvelle valeur' },
      },
      required: ['id', 'champ', 'valeur'],
    },
  },
  {
    name: 'ajouter_produit_stock',
    description: 'Ajouter un nouveau produit au stock',
    input_schema: {
      type: 'object',
      properties: {
        nom:  { type: 'string' },
        q:    { type: 'number', description: 'Quantité' },
        u:    { type: 'string', description: 'Unité (kg, L, pièce…)' },
        px:   { type: 'number', description: 'Prix unitaire' },
        cat:  { type: 'string', description: 'Catégorie (viande, poisson, legumes, laitier, epicerie, boissons, autre)' },
        four: { type: 'string', description: 'Nom du fournisseur' },
        dlc:  { type: 'string', description: 'Date limite de consommation JJ/MM/AAAA' },
      },
      required: ['nom', 'q', 'u'],
    },
  },
  {
    name: 'lire_recettes',
    description: 'Lire toutes les recettes',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'creer_recette',
    description: 'Créer une recette complète avec ingrédients, étapes et allergènes',
    input_schema: {
      type: 'object',
      properties: {
        nom:         { type: 'string' },
        ingredients: { type: 'array', description: '[{nom, q, u, px}]' },
        instructions:{ type: 'string' },
        portions:    { type: 'number' },
        allergenes:  { type: 'array', items: { type: 'string' } },
        cout_matiere:{ type: 'number' },
      },
      required: ['nom', 'ingredients'],
    },
  },
  {
    name: 'modifier_recette',
    description: 'Modifier un champ d\'une recette existante',
    input_schema: {
      type: 'object',
      properties: {
        id:     { type: 'string' },
        champ:  { type: 'string' },
        valeur: {},
      },
      required: ['id', 'champ', 'valeur'],
    },
  },
  {
    name: 'lire_menus',
    description: 'Lire tous les menus',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'creer_menu',
    description: 'Créer un menu avec nom et prix de vente',
    input_schema: {
      type: 'object',
      properties: {
        nom:        { type: 'string' },
        prix_vente: { type: 'number' },
      },
      required: ['nom', 'prix_vente'],
    },
  },
  {
    name: 'modifier_menu',
    description: 'Modifier un menu existant',
    input_schema: {
      type: 'object',
      properties: {
        id:     { type: 'string' },
        champ:  { type: 'string' },
        valeur: {},
      },
      required: ['id', 'champ', 'valeur'],
    },
  },
  {
    name: 'lire_clotures',
    description: 'Lire les dernières clôtures de service',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'modifier_couverts_service',
    description: 'Corriger le nombre de couverts d\'un menu dans une clôture passée',
    input_schema: {
      type: 'object',
      properties: {
        id:          { type: 'string', description: 'UUID de la clôture' },
        menu_nom:    { type: 'string' },
        nb_couverts: { type: 'number' },
      },
      required: ['id', 'menu_nom', 'nb_couverts'],
    },
  },
  {
    name: 'lire_fournisseurs',
    description: 'Lire tous les fournisseurs',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'modifier_fournisseur',
    description: 'Modifier un fournisseur existant',
    input_schema: {
      type: 'object',
      properties: {
        id:     { type: 'string' },
        champ:  { type: 'string' },
        valeur: {},
      },
      required: ['id', 'champ', 'valeur'],
    },
  },
  {
    name: 'upsert_fournisseur',
    description: 'Créer ou mettre à jour un fournisseur par nom',
    input_schema: {
      type: 'object',
      properties: {
        nom:       { type: 'string', description: 'Nom du fournisseur' },
        adresse:   { type: 'string' },
        telephone: { type: 'string' },
        email:     { type: 'string' },
        siret:     { type: 'string' },
      },
      required: ['nom'],
    },
  },
  {
    name: 'lire_temperatures',
    description: 'Lire l\'historique des températures (50 dernières)',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'lire_equipe',
    description: 'Lire les membres de l\'équipe',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'creer_etiquette',
    description: 'Créer une étiquette DLC/DDM',
    input_schema: {
      type: 'object',
      properties: {
        produit:          { type: 'string' },
        type:             { type: 'string', description: 'mise_en_place | sous_vide | congele | autre' },
        date_fabrication: { type: 'string', description: 'ISO 8601' },
        dlc_calculee:     { type: 'string', description: 'ISO 8601' },
        base_calcul:      { type: 'string' },
        created_by_name:  { type: 'string' },
      },
      required: ['produit', 'type', 'date_fabrication', 'dlc_calculee'],
    },
  },
  {
    name: 'lire_commandes',
    description: 'Lire les dernières commandes / scans',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'lire_etablissement',
    description: 'Lire les informations de l\'établissement',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'modifier_etablissement',
    description: 'Modifier un paramètre de l\'établissement',
    input_schema: {
      type: 'object',
      properties: {
        champ:  { type: 'string' },
        valeur: {},
      },
      required: ['champ', 'valeur'],
    },
  },
]

// ── Tool executor ─────────────────────────────────────────────────────────────

async function executeTool(name, input, { userId, accessToken }) {
  const sb = getSupabase(accessToken)
  if (!sb) return { error: 'Supabase non configuré' }

  switch (name) {
    case 'lire_stock': {
      const { data, error } = await sb.from('stock').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      return error ? { error: error.message } : (data || [])
    }
    case 'modifier_stock': {
      const { id, champ, valeur } = input
      const { data, error } = await sb.from('stock').update({ [champ]: valeur, updated_at: new Date().toISOString() }).eq('id', id).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'ajouter_produit_stock': {
      const produit = { ...input, user_id: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      const { data, error } = await sb.from('stock').insert(produit).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_recettes': {
      const { data, error } = await sb.from('recettes').select('*').eq('user_id', userId).order('nom')
      return error ? { error: error.message } : (data || [])
    }
    case 'creer_recette': {
      const recette = { ...input, user_id: userId, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      const { data, error } = await sb.from('recettes').insert(recette).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'modifier_recette': {
      const { id, champ, valeur } = input
      const { data, error } = await sb.from('recettes').update({ [champ]: valeur, updated_at: new Date().toISOString() }).eq('id', id).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_menus': {
      const { data, error } = await sb.from('menus').select('*').eq('etablissement_id', userId).order('created_at')
      return error ? { error: error.message } : (data || [])
    }
    case 'creer_menu': {
      const menu = { ...input, etablissement_id: userId, actif: true, created_at: new Date().toISOString() }
      const { data, error } = await sb.from('menus').insert(menu).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'modifier_menu': {
      const { id, champ, valeur } = input
      const { data, error } = await sb.from('menus').update({ [champ]: valeur }).eq('id', id).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_clotures': {
      const { data, error } = await sb.from('clotures_service').select('*')
        .eq('etablissement_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      return error ? { error: error.message } : (data || [])
    }
    case 'modifier_couverts_service': {
      const { id, menu_nom, nb_couverts } = input
      const { data: row, error: readErr } = await sb.from('clotures_service').select('ventes').eq('id', id).single()
      if (readErr) return { error: readErr.message }
      const ventes = (row.ventes || []).map(v =>
        (v.nom || '').toLowerCase() === (menu_nom || '').toLowerCase() ? { ...v, nb: nb_couverts } : v
      )
      const { data, error } = await sb.from('clotures_service').update({ ventes }).eq('id', id).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_fournisseurs': {
      const { data, error } = await sb.from('fournisseurs').select('*').eq('user_id', userId).order('nom')
      return error ? { error: error.message } : (data || [])
    }
    case 'modifier_fournisseur': {
      const { id, champ, valeur } = input
      const { data, error } = await sb.from('fournisseurs').update({ [champ]: valeur }).eq('id', id).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'upsert_fournisseur': {
      const { nom, ...rest } = input
      const { data: existing } = await sb.from('fournisseurs').select('id').eq('user_id', userId).ilike('nom', nom).maybeSingle()
      if (existing) {
        const updates = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined))
        const { data, error } = await sb.from('fournisseurs').update({ nom, ...updates }).eq('id', existing.id).select()
        return error ? { error: error.message } : (data || [])
      }
      const { data, error } = await sb.from('fournisseurs').insert({ nom, ...rest, user_id: userId, mode: 'tel' }).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_temperatures': {
      const { data, error } = await sb.from('temperatures').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_equipe': {
      const { data, error } = await sb.from('equipe_membres').select('*').eq('owner_id', userId)
      return error ? { error: error.message } : (data || [])
    }
    case 'creer_etiquette': {
      const etiquette = {
        ...input,
        etablissement_id: userId,
        base_calcul: input.base_calcul || 'standard',
        created_by_name: input.created_by_name || 'Aria',
        statut_impression: 'en_attente',
        nb_impressions: 0,
        created_at: new Date().toISOString(),
      }
      const { data, error } = await sb.from('etiquettes').insert(etiquette).select()
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_commandes': {
      const { data, error } = await sb.from('scans').select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)
      return error ? { error: error.message } : (data || [])
    }
    case 'lire_etablissement': {
      const { data, error } = await sb.from('etablissements').select('*').eq('owner_id', userId).single()
      return error ? { error: error.message } : (data || {})
    }
    case 'modifier_etablissement': {
      const { champ, valeur } = input
      const { data, error } = await sb.from('etablissements').update({ [champ]: valeur }).eq('owner_id', userId).select()
      return error ? { error: error.message } : (data || [])
    }
    default:
      return { error: `Outil inconnu : ${name}` }
  }
}

// ── Prompts ───────────────────────────────────────────────────────────────────

const ROLE_LABELS = {
  proprietaire: 'Propriétaire', chef: 'Chef de cuisine',
  second: 'Second de cuisine', cuisinier: 'Cuisinier',
  patissier: 'Pâtissier',     employe: 'Employé',
}

const ROLE_PERMISSIONS = {
  proprietaire: { droits: 'accès total', interdit: [] },
  chef:         { droits: 'accès total sauf finances/abonnement', interdit: [] },
  second:       { droits: 'stock, recettes, commandes, mise en place, HACCP, marges', interdit: ['supprimer définitivement des données', 'gérer les abonnements'] },
  cuisinier:    { droits: 'stock, températures, mise en place, réception', interdit: ['passer des commandes fournisseurs', 'consulter les marges', "gérer l'équipe", 'supprimer des recettes'] },
  patissier:    { droits: 'stock, recettes, mise en place, températures', interdit: ['passer des commandes fournisseurs', 'consulter les marges', "gérer l'équipe"] },
  employe:      { droits: 'stock lecture seule, températures, mise en place', interdit: ['modifier le stock', 'passer des commandes', 'consulter les marges', "gérer l'équipe", 'modifier les recettes'] },
}

function buildRoleSection(role) {
  if (!role || role === 'superadmin') return ''
  const info  = ROLE_PERMISSIONS[role]
  if (!info) return ''
  const label = ROLE_LABELS[role] || role
  let section = `\n## Rôle : ${label}\nDroits : ${info.droits}.`
  if (info.interdit.length > 0) {
    section += `\nInterdit : ${info.interdit.join(', ')}.`
    section += `\n\nRÈGLE : si l'utilisateur demande une action non autorisée, réponds exactement : "Je suis désolée, cette action nécessite les droits de Chef ou Second de cuisine."`
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

## Tes capacités
Tu as accès en LECTURE et en ÉCRITURE à toutes les données de l'établissement via des outils.
Utilise-les dès qu'un utilisateur demande de lire, créer ou modifier des données.

## Outils disponibles
- Stock : lire_stock, modifier_stock, ajouter_produit_stock
- Recettes : lire_recettes, creer_recette, modifier_recette
- Menus : lire_menus, creer_menu, modifier_menu
- Clôtures : lire_clotures, modifier_couverts_service
- Fournisseurs : lire_fournisseurs, modifier_fournisseur
- Températures : lire_temperatures
- Équipe : lire_equipe
- Étiquettes DLC : creer_etiquette
- Commandes : lire_commandes
- Établissement : lire_etablissement, modifier_etablissement

## Calculs HACCP
- Marge brute = ((prix_vente - cout_matiere) / prix_vente) × 100
- DLC : mise en place 3j / sous vide 6j / congélation 90j
- Températures conformes : réfrigération ≤4°C, chaud ≥63°C, réception ≤8°C

## Comportement
- Français, ton chaleureux et professionnel
- Utilise les outils pour accéder aux données réelles avant de répondre
- Confirme avant toute modification importante
- Direct et actionnable : l'information critique en premier
- Format concis (listes à puces), pas de titres Markdown sauf pour les rapports longs
${buildRoleSection(role)}`
}

function buildContextBlock(context) {
  if (!context) return ''
  const lines = [`📅 Date : ${context.date || 'inconnue'}`]
  if (context.stats) {
    const s = context.stats
    lines.push(`📊 Stock: ${s.stock_total} produits — ${s.stock_critique} DLC critiques — ${s.sous_seuil} sous seuil — ${s.fournisseurs} fournisseurs — ${s.recettes || 0} recettes`)
  }
  if (context.stock?.length > 0) {
    lines.push(`\n📦 Stock (${context.stock.length}) :`)
    context.stock.forEach(i => {
      const parts = [i.nom, `${i.q} ${i.u}`, i.cat]
      if (i.dlc)       parts.push(`DLC ${i.dlc}`)
      if (i.seuil_min) parts.push(`seuil ${i.seuil_min} ${i.u}`)
      if (i.px)        parts.push(`${i.px}€/${i.u}`)
      if (i.four)      parts.push(`[${i.four}]`)
      lines.push(`  • ${parts.join(' — ')}`)
    })
  }
  if (context.fournisseurs?.length > 0) {
    lines.push(`\n🚚 Fournisseurs :`)
    context.fournisseurs.forEach(f => {
      const contact = [f.tel && `📞 ${f.tel}`, f.email && `✉️ ${f.email}`].filter(Boolean).join(' ')
      lines.push(`  • ${f.nom}${f.jours?.length ? ` — livraison: ${f.jours.join('/')}` : ''}${contact ? ` — ${contact}` : ''}`)
    })
  }
  if (context.temperatures?.length > 0) {
    lines.push(`\n🌡️ Températures récentes :`)
    context.temperatures.slice(0, 10).forEach(t => {
      const ok = t.conforme === true ? '✅' : t.conforme === false ? '⚠️NC' : '—'
      lines.push(`  • ${(t.created_at || '').slice(0, 16)} — ${t.contexte} — ${t.valeur}°C ${ok}`)
    })
  }
  return lines.join('\n')
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Méthode non autorisée' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY manquante' })

  const { message, history = [], context, userId, accessToken } = req.body ?? {}
  if (!message?.trim()) return res.status(400).json({ error: 'Champ "message" manquant' })

  const systemPrompt  = buildSystemPrompt(context)
  const contextBlock  = buildContextBlock(context)
  const userContent   = contextBlock
    ? `[Contexte établissement]\n${contextBlock}\n\n[Message]\n${message}`
    : message

  let conversationMessages = [
    ...history.slice(-12).filter(m => m.role && m.content).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: userContent },
  ]

  const toolCtx = { userId, accessToken }
  let iterations = 0

  try {
    while (iterations < 10) {
      iterations++

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
          system:     systemPrompt,
          tools:      TOOLS_DEFINITION,
          messages:   conversationMessages,
        }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error('Anthropic error:', errText)
        return res.status(502).json({ error: 'Erreur Anthropic', detail: errText })
      }

      const data = await response.json()

      if (data.stop_reason === 'end_turn') {
        const reply = data.content?.find(b => b.type === 'text')?.text ?? ''
        return res.status(200).json({ reply })
      }

      if (data.stop_reason === 'tool_use') {
        const toolUseBlocks = (data.content || []).filter(b => b.type === 'tool_use')
        const toolResults   = []

        for (const toolUse of toolUseBlocks) {
          let result
          try {
            result = await executeTool(toolUse.name, toolUse.input || {}, toolCtx)
          } catch (err) {
            result = { error: err.message }
          }
          toolResults.push({
            type:        'tool_result',
            tool_use_id: toolUse.id,
            content:     JSON.stringify(result),
          })
        }

        conversationMessages = [
          ...conversationMessages,
          { role: 'assistant', content: data.content },
          { role: 'user',      content: toolResults },
        ]
        continue
      }

      // Unexpected stop reason — extract any text and return
      const reply = data.content?.find(b => b.type === 'text')?.text ?? ''
      return res.status(200).json({ reply })
    }

    return res.status(200).json({ reply: "Aria a terminé son traitement." })

  } catch (err) {
    console.error('aria error:', err)
    return res.status(500).json({ error: err.message })
  }
}
