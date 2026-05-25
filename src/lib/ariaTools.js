// ariaTools — fonctions Supabase qu'Aria peut appeler côté client.
// L'API (api/aria.js) a sa propre implémentation serveur avec la service key.
// Ce module est utilisable depuis Aria.jsx pour des appels directs si besoin.

import { supabase } from './supabase'

function ok(data)  { return { success: true,  data, error: null } }
function err(e)    { return { success: false, data: null, error: e?.message || String(e) } }

export const ariaTools = {

  // ── STOCK ────────────────────────────────────────────────────────────────────

  lire_stock: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('stock').select('*').eq('user_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  modifier_stock: async ({ id, champ, valeur }) => {
    const { data, error } = await supabase.from('stock').update({ [champ]: valeur }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  ajouter_produit_stock: async (produit) => {
    const { data, error } = await supabase.from('stock').insert(produit).select()
    return error ? err(error) : ok(data)
  },

  // ── RECETTES ─────────────────────────────────────────────────────────────────

  lire_recettes: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('recettes').select('*').eq('user_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  creer_recette: async (recette) => {
    const { data, error } = await supabase.from('recettes').insert(recette).select()
    return error ? err(error) : ok(data)
  },

  modifier_recette: async ({ id, champ, valeur }) => {
    const { data, error } = await supabase.from('recettes').update({ [champ]: valeur }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  // ── MENUS ────────────────────────────────────────────────────────────────────

  lire_menus: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('menus').select('*').eq('etablissement_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  creer_menu: async (menu) => {
    const { data, error } = await supabase.from('menus').insert(menu).select()
    return error ? err(error) : ok(data)
  },

  modifier_menu: async ({ id, champ, valeur }) => {
    const { data, error } = await supabase.from('menus').update({ [champ]: valeur }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  // ── CLÔTURES DE SERVICE ───────────────────────────────────────────────────────

  lire_clotures: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('clotures_service').select('*')
      .eq('etablissement_id', etablissement_id)
      .order('created_at', { ascending: false })
      .limit(30)
    return error ? err(error) : ok(data)
  },

  modifier_cloture: async ({ id, champ, valeur }) => {
    const { data, error } = await supabase.from('clotures_service').update({ [champ]: valeur }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  modifier_couverts_service: async ({ id, menu_nom, nb_couverts }) => {
    const { data: row, error: readErr } = await supabase.from('clotures_service').select('ventes').eq('id', id).single()
    if (readErr) return err(readErr)
    const ventes = (row.ventes || []).map(v =>
      (v.nom || '').toLowerCase() === (menu_nom || '').toLowerCase() ? { ...v, nb: nb_couverts } : v
    )
    const { data, error } = await supabase.from('clotures_service').update({ ventes }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  // ── FOURNISSEURS ──────────────────────────────────────────────────────────────

  lire_fournisseurs: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('fournisseurs').select('*').eq('user_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  modifier_fournisseur: async ({ id, champ, valeur }) => {
    const { data, error } = await supabase.from('fournisseurs').update({ [champ]: valeur }).eq('id', id).select()
    return error ? err(error) : ok(data)
  },

  // ── TEMPÉRATURES ─────────────────────────────────────────────────────────────

  lire_temperatures: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('temperatures').select('*')
      .eq('user_id', etablissement_id)
      .order('created_at', { ascending: false })
      .limit(50)
    return error ? err(error) : ok(data)
  },

  // ── ÉQUIPE ───────────────────────────────────────────────────────────────────

  lire_equipe: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('equipe_membres').select('*').eq('owner_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  // ── ÉTIQUETTES ───────────────────────────────────────────────────────────────

  lire_etiquettes: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('etiquettes').select('*').eq('etablissement_id', etablissement_id)
    return error ? err(error) : ok(data)
  },

  creer_etiquette: async (etiquette) => {
    const { data, error } = await supabase.from('etiquettes').insert(etiquette).select()
    return error ? err(error) : ok(data)
  },

  // ── COMMANDES / SCANS ─────────────────────────────────────────────────────────

  lire_commandes: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('scans').select('*')
      .eq('user_id', etablissement_id)
      .order('created_at', { ascending: false })
      .limit(30)
    return error ? err(error) : ok(data)
  },

  // ── ÉTABLISSEMENT ────────────────────────────────────────────────────────────

  lire_etablissement: async ({ etablissement_id }) => {
    const { data, error } = await supabase.from('etablissements').select('*').eq('owner_id', etablissement_id).single()
    return error ? err(error) : ok(data)
  },

  modifier_etablissement: async ({ etablissement_id, champ, valeur }) => {
    const { data, error } = await supabase.from('etablissements').update({ [champ]: valeur }).eq('owner_id', etablissement_id).select()
    return error ? err(error) : ok(data)
  },
}
