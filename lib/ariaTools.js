// Tool definitions and executors for new Aria agent capabilities

export const EXTRA_TOOLS = [
  {
    name: 'get_dlc_alertes',
    description: "Obtenir les produits dont la DLC est dans les 3 prochains jours ou déjà dépassée — déclenche des alertes proactives et propose des recettes ou le retrait du produit",
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'create_non_conformite',
    description: "Enregistrer une non-conformité HACCP (température hors norme, emballage endommagé, anomalie hygiène) dans haccp_temperatures — appelé automatiquement dès qu'une anomalie est détectée",
    input_schema: {
      type: 'object',
      properties: {
        contexte: { type: 'string', description: 'Zone ou appareil concerné (ex: Chambre froide 1, Four 2)' },
        valeur:   { type: 'number', description: 'Température mesurée en °C (si applicable)' },
        motif:    { type: 'string', description: 'Description précise de la non-conformité' },
        action:   { type: 'string', description: 'Action corrective immédiatement appliquée' },
      },
      required: ['contexte', 'motif'],
    },
  },
  {
    name: 'get_formation_progression',
    description: "Lire la progression de formation HACCP de l'équipe — utilisé pour signaler les modules en retard, les scores insuffisants ou les attestations à renouveler",
    input_schema: {
      type: 'object',
      properties: {
        target_user_id: { type: 'string', description: "UUID d'un membre spécifique (optionnel — tous les membres si absent)" },
      },
      required: [],
    },
  },
  {
    name: 'create_bon_commande',
    description: "Créer un bon de commande fournisseur pré-rempli — appelé quand un stock passe sous le seuil ou qu'une commande est validée par l'utilisateur",
    input_schema: {
      type: 'object',
      properties: {
        fournisseur_id:  { type: 'string', description: 'UUID du fournisseur (optionnel si nom connu)' },
        fournisseur_nom: { type: 'string', description: 'Nom du fournisseur' },
        produits:        { type: 'array',  description: 'Liste de produits [{nom, q, u, px_estime}]' },
        date_livraison:  { type: 'string', description: 'Date souhaitée ISO 8601 (optionnel)' },
        notes:           { type: 'string', description: 'Notes ou instructions spéciales (optionnel)' },
      },
      required: ['produits'],
    },
  },
  {
    name: 'get_prix_historique',
    description: "Consulter l'évolution du prix d'un produit chez un fournisseur — utilisé pour détecter les hausses > 5% après scan de facture et alerter l'utilisateur",
    input_schema: {
      type: 'object',
      properties: {
        produit_nom:     { type: 'string', description: 'Nom du produit' },
        fournisseur_nom: { type: 'string', description: 'Nom du fournisseur (optionnel — tous les fournisseurs si absent)' },
      },
      required: ['produit_nom'],
    },
  },
  {
    name: 'insert_prix_historique',
    description: "Enregistrer un nouveau prix pour un produit chez un fournisseur — appelé automatiquement après chaque scan de facture pour tenir l'historique à jour et détecter les hausses futures",
    input_schema: {
      type: 'object',
      properties: {
        produit_nom:     { type: 'string' },
        fournisseur_nom: { type: 'string' },
        prix:            { type: 'number', description: 'Prix unitaire en euros' },
        unite:           { type: 'string', description: 'Unité du prix (kg, L, pièce…)' },
        date_facture:    { type: 'string', description: 'Date de la facture JJ/MM/AAAA' },
      },
      required: ['produit_nom', 'fournisseur_nom', 'prix'],
    },
  },
  {
    name: 'get_mise_en_place',
    description: "Lire les tâches de mise en place du jour ou d'une date donnée — utilisé pour suivre l'avancement et proposer de l'aide proactive",
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: "Date ISO AAAA-MM-JJ (aujourd'hui par défaut si absent)" },
      },
      required: [],
    },
  },
]

export async function executeExtraTool(name, input, { userId, etablissementId, sb }) {
  switch (name) {
    case 'get_dlc_alertes': {
      const today   = new Date()
      const limit   = new Date(today)
      limit.setDate(limit.getDate() + 3)
      const limitIso = limit.toISOString().slice(0, 10)
      const todayIso = today.toISOString().slice(0, 10)
      const { data, error } = await sb.from('stock').select('*')
        .eq('user_id', userId)
        .not('dlc', 'is', null)
        .lte('dlc', limitIso)
        .order('dlc')
      if (error) return { error: error.message }
      return (data || []).map(p => ({
        ...p,
        statut_dlc: p.dlc < todayIso ? 'DÉPASSÉE' : p.dlc === todayIso ? 'EXPIRE_AUJOURD_HUI' : 'PROCHE',
      }))
    }

    case 'create_non_conformite': {
      const { contexte, valeur, motif, action } = input
      const { data, error } = await sb.from('haccp_temperatures').insert({
        etablissement_id:  etablissementId,
        user_id:           userId,
        contexte,
        valeur:            valeur ?? null,
        conforme:          false,
        motif_non_conf:    motif,
        action_corrective: action ?? null,
        created_at:        new Date().toISOString(),
      }).select()
      return error ? { error: error.message } : (data || [])
    }

    case 'get_formation_progression': {
      const { target_user_id } = input
      let q = sb.from('haccp_formation_progression')
        .select('*, profiles(name, display_name, role)')
        .eq('etablissement_id', etablissementId)
        .order('module_id')
      if (target_user_id) q = q.eq('user_id', target_user_id)
      const { data, error } = await q
      return error ? { error: error.message } : (data || [])
    }

    case 'create_bon_commande': {
      const { fournisseur_id, fournisseur_nom, produits, date_livraison, notes } = input
      const { data, error } = await sb.from('commandes').insert({
        etablissement_id: etablissementId,
        user_id:          userId,
        fournisseur_id:   fournisseur_id ?? null,
        fournisseur_nom:  fournisseur_nom ?? null,
        produits:         produits || [],
        date_livraison:   date_livraison ?? null,
        notes:            notes ?? null,
        statut:           'en_attente',
        created_at:       new Date().toISOString(),
      }).select()
      return error ? { error: error.message } : (data || [])
    }

    case 'get_prix_historique': {
      const { produit_nom, fournisseur_nom } = input
      let q = sb.from('prix_historique')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .ilike('produit_nom', `%${produit_nom}%`)
        .order('created_at', { ascending: false })
        .limit(20)
      if (fournisseur_nom) q = q.ilike('fournisseur_nom', `%${fournisseur_nom}%`)
      const { data, error } = await q
      return error ? { error: error.message } : (data || [])
    }

    case 'insert_prix_historique': {
      const { produit_nom, fournisseur_nom, prix, unite, date_facture } = input
      const { data, error } = await sb.from('prix_historique').insert({
        etablissement_id: etablissementId,
        user_id:          userId,
        produit_nom,
        fournisseur_nom,
        prix,
        unite:            unite ?? null,
        date_facture:     date_facture ?? null,
        created_at:       new Date().toISOString(),
      }).select()
      return error ? { error: error.message } : (data || [])
    }

    case 'get_mise_en_place': {
      const dateStr = input.date || new Date().toISOString().slice(0, 10)
      const { data, error } = await sb.from('mise_en_place')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .eq('date', dateStr)
        .order('created_at')
      return error ? { error: error.message } : (data || [])
    }

    default:
      return null
  }
}
