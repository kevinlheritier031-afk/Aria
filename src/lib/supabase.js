import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error("⚠️ Variables Supabase manquantes dans .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: { autoRefreshToken:true, persistSession:true, detectSessionInUrl:true },
});

export async function signUp({ email, password, name, role }) {
  const { data, error } = await supabase.auth.signUp({ email, password, options:{ data:{ name, role } } });
  return { data, error };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data:{ session } } = await supabase.auth.getSession();
  return session;
}

export async function getUser() {
  const { data:{ user } } = await supabase.auth.getUser();
  return user;
}

export async function fetchStock(userId) {
  const { data, error } = await supabase.from("stock").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  return { data, error };
}

export async function upsertStock(items) {
  const { data, error } = await supabase.from("stock").upsert(items,{onConflict:"id"});
  return { data, error };
}

export async function deleteStockItem(id) {
  const { error } = await supabase.from("stock").delete().eq("id",id);
  return { error };
}

export async function fetchFournisseurs(userId) {
  const { data, error } = await supabase.from("fournisseurs").select("*").eq("user_id",userId).order("nom",{ascending:true});
  return { data, error };
}

export async function upsertFournisseur(fournisseur) {
  const { data, error } = await supabase.from("fournisseurs").upsert(fournisseur,{onConflict:"id"});
  return { data, error };
}

export async function deleteFournisseur(id) {
  const { error } = await supabase.from("fournisseurs").delete().eq("id",id);
  return { error };
}

export async function fetchScans(userId) {
  const { data, error } = await supabase.from("scans").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  return { data, error };
}

export async function insertScan(scan) {
  const { data, error } = await supabase.from("scans").insert(scan);
  return { data, error };
}

export async function fetchPrix(userId) {
  const { data, error } = await supabase.from("prix_historique").select("*").eq("user_id",userId).order("created_at",{ascending:false});
  return { data, error };
}

export async function insertPrix(prix) {
  const { data, error } = await supabase.from("prix_historique").insert(prix);
  return { data, error };
}

export async function fetchTemperatures(userId) {
  const { data, error } = await supabase.from("temperatures").select("*").eq("user_id",userId).order("created_at",{ascending:false}).limit(100);
  return { data, error };
}

export async function insertTemperature(temp) {
  const { data, error } = await supabase.from("temperatures").insert(temp);
  return { data, error };
}