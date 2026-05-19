// Permission matrix — keyed by action slug
const MATRIX = {
  delete_stock:     ['proprietaire', 'chef', 'second'],
  edit_stock:       ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier'],
  read_stock:       ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe'],
  edit_recette:     ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier'],
  delete_recette:   ['proprietaire', 'chef', 'second'],
  passer_commande:  ['proprietaire', 'chef', 'second'],
  voir_marges:      ['proprietaire', 'chef', 'second'],
  gerer_equipe:     ['proprietaire', 'chef'],
  voir_haccp:       ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe'],
  saisir_temp:      ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe'],
  valider_mep:      ['proprietaire', 'chef', 'second', 'cuisinier', 'patissier', 'employe'],
  voir_business:    ['proprietaire', 'chef', 'second'],
  gerer_formation:  ['proprietaire', 'chef'],
}

// Descriptions for Aria's role-based refusal messages
export const RESTRICTED_LABELS = {
  delete_stock:    { label:'supprimer un produit du stock',       minRole:'Chef ou Second de cuisine' },
  edit_stock:      { label:'modifier le stock',                   minRole:'Cuisinier' },
  edit_recette:    { label:'modifier les recettes',               minRole:'Cuisinier' },
  delete_recette:  { label:'supprimer une recette',               minRole:'Chef ou Second de cuisine' },
  passer_commande: { label:'passer une commande fournisseur',     minRole:'Chef ou Second de cuisine' },
  voir_marges:     { label:'consulter les marges financières',    minRole:'Chef ou Second de cuisine' },
  gerer_equipe:    { label:"gérer l'équipe",                      minRole:'Chef de cuisine' },
}

export function canDo(action, role) {
  if (!role) return false
  if (role === 'superadmin') return true
  const allowed = MATRIX[action]
  if (!allowed) return true
  return allowed.includes(role)
}

export function usePermissions(profile) {
  const role = profile?.role || 'employe'
  return {
    role,
    can: (action) => canDo(action, role),
    canDo,
  }
}
