-- ═══════════════════════════════════════════════════════════════════════════
--  ARIA — Schema Complet Supabase  (référentiel unique, idempotent)
--  Coller dans SQL Editor → Exécuter. Aucune erreur si déjà en place.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

-- ── 1. TABLES ────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id                   uuid references auth.users on delete cascade primary key,
  name                 text,
  display_name         text,
  email                text,
  role                 text not null default 'employe',
  etablissement_id     uuid,
  avatar_url           text,
  onboarding_completed boolean default false,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);
alter table profiles add column if not exists display_name         text;
alter table profiles add column if not exists onboarding_completed boolean default false;
alter table profiles add column if not exists etablissement_id     uuid;
-- Supprimer les contraintes NOT NULL du schéma original (name/email fournis par trigger, pas l'upsert)
alter table profiles alter column name  drop not null;
alter table profiles alter column email drop not null;

create table if not exists etablissements (
  id          uuid default uuid_generate_v4() primary key,
  nom         text not null,
  adresse     text,
  type        text default 'restaurant',
  owner_id    uuid references profiles(id),
  abonnement  text default 'starter',
  plan        text default 'starter',
  actif       boolean default true,
  nb_employes integer,
  settings    jsonb default '{}',
  created_at  timestamptz default now()
);
alter table etablissements add column if not exists type        text    default 'restaurant';
alter table etablissements add column if not exists plan        text    default 'starter';
alter table etablissements add column if not exists nb_employes integer;
alter table etablissements add column if not exists settings    jsonb   default '{}';
-- Contrainte UNIQUE sur owner_id (nécessaire pour upsert onConflict)
do $$ begin
  alter table etablissements add constraint etablissements_owner_id_key unique (owner_id);
exception when duplicate_table then null;
         when others then null;
end $$;

create table if not exists stock (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom              text not null,
  q                numeric not null default 0,
  u                text not null default 'unité',
  px               numeric,
  lot              text,
  dlc              text,
  cat              text default 'autre',
  four             text,
  seuil_min        numeric,
  date_reception   text,
  st               text default 'ok',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists fournisseurs (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom              text not null,
  mode             text default 'tel',
  tel              text,
  email            text,
  site             text,
  jours            text[] default '{}',
  heure_limite     text default '09:00',
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists scans (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  four             text,
  nb               integer default 0,
  total            numeric,
  conf             text default 'a_verifier',
  heure            text,
  date_scan        text,
  data_json        jsonb,
  created_at       timestamptz default now()
);

create table if not exists prix_historique (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  prod             text not null,
  four             text not null,
  px               numeric not null,
  date_prix        text,
  fac              text,
  created_at       timestamptz default now()
);

create table if not exists temperatures (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  valeur           numeric not null,
  contexte         text not null,
  conforme         boolean,
  note             text,
  created_at       timestamptz default now()
);

create table if not exists recettes (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom              text not null,
  ingredients      jsonb default '[]',
  allergenes       text[] default '{}',
  portions         integer default 1,
  temps_prep       integer,
  instructions     text,
  cout_matiere     numeric,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists mise_en_place (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  date_jour        text not null,
  items            jsonb default '[]',
  created_at       timestamptz default now()
);

create table if not exists aria_conversations (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  messages         jsonb default '[]',
  contexte         text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table if not exists couverts (
  id               uuid default uuid_generate_v4() primary key,
  user_id          uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  date             text,
  service          text,
  nb               integer not null default 0,
  notes            text,
  created_at       timestamptz default now()
);

create table if not exists equipe_membres (
  id          uuid default uuid_generate_v4() primary key,
  owner_id    uuid references auth.users on delete cascade,
  name        text not null,
  email       text default '',
  role        text not null default 'employe',
  pin_code    text,
  actif       boolean default true,
  statut      text default 'actif',
  formation   jsonb default '{}',
  created_at  timestamptz default now()
);
-- Ensure all columns exist in case the table was created with an older schema
alter table equipe_membres add column if not exists name      text;
alter table equipe_membres add column if not exists email     text      default '';
alter table equipe_membres add column if not exists actif     boolean   default true;
alter table equipe_membres add column if not exists statut    text      default 'actif';
alter table equipe_membres add column if not exists formation jsonb     default '{}';

create table if not exists haccp_zones (
  id               uuid default uuid_generate_v4() primary key,
  etablissement_id uuid not null,
  nom              text not null,
  temp_min         numeric,
  temp_max         numeric,
  created_at       timestamptz default now()
);

create table if not exists aria_analytics (
  id               uuid default uuid_generate_v4() primary key,
  etablissement_id uuid not null,
  date             text,
  message_count    integer default 1,
  topic_tags       text,
  created_at       timestamptz default now()
);

create table if not exists lab_results (
  id                 uuid default uuid_generate_v4() primary key,
  user_id            uuid references auth.users on delete cascade,
  product_name       text,
  analysis_date      text,
  lab_name           text,
  status             text,
  dlc_certified      text,
  recommendations    text,
  certificate_number text,
  raw_data           text,
  created_at         timestamptz default now()
);

create table if not exists menus (
  id               uuid default gen_random_uuid() primary key,
  etablissement_id uuid not null,
  nom              text not null,
  prix_vente       numeric(10,2) not null,
  cout_matiere     numeric(10,2) default 0,
  actif            boolean default true,
  created_at       timestamptz default now()
);

create table if not exists clotures_service (
  id               uuid default gen_random_uuid() primary key,
  etablissement_id uuid not null,
  service          text not null,
  date             date not null,
  ventes           jsonb not null default '[]',
  ca_reel          numeric(10,2),
  cout_total       numeric(10,2),
  marge_reelle     numeric(5,2),
  nb_couverts      integer,
  created_at       timestamptz default now()
);

create table if not exists etiquettes (
  id                uuid default gen_random_uuid() primary key,
  etablissement_id  uuid references etablissements(id),
  created_by        uuid references profiles(id),
  created_by_name   text not null,
  produit           text not null,
  type              text not null,
  date_fabrication  timestamptz not null,
  dlc_calculee      timestamptz not null,
  ddm_calculee      timestamptz,
  base_calcul       text not null,
  resultats_labo    jsonb,
  statut_impression text default 'en_attente',
  imprimee_at       timestamptz,
  nb_impressions    integer default 0,
  created_at        timestamptz default now()
);

-- ── 2. ROW LEVEL SECURITY ────────────────────────────────────────────────────

alter table profiles           enable row level security;
alter table etablissements     enable row level security;
alter table stock              enable row level security;
alter table fournisseurs       enable row level security;
alter table scans              enable row level security;
alter table prix_historique    enable row level security;
alter table temperatures       enable row level security;
alter table recettes           enable row level security;
alter table mise_en_place      enable row level security;
alter table aria_conversations enable row level security;
alter table couverts           enable row level security;
alter table equipe_membres     enable row level security;
alter table haccp_zones        enable row level security;
alter table aria_analytics     enable row level security;
alter table lab_results        enable row level security;
alter table menus              enable row level security;
alter table clotures_service   enable row level security;
alter table etiquettes         enable row level security;

-- ── 3. POLICIES ──────────────────────────────────────────────────────────────

-- profiles — accès par id utilisateur
drop policy if exists "profiles_select"                on profiles;
drop policy if exists "profiles_insert"                on profiles;
drop policy if exists "profiles_update"                on profiles;
drop policy if exists "Users can view own profile"     on profiles;
drop policy if exists "Users can update own profile"   on profiles;
create policy "profiles_select" on profiles for select using      (auth.uid() = id);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using      (auth.uid() = id);

-- etablissements — accès par owner_id
drop policy if exists "etablissements_all" on etablissements;
create policy "etablissements_all" on etablissements
  for all
  using      (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- equipe_membres — accès par owner_id
drop policy if exists "equipe_membres_all" on equipe_membres;
drop policy if exists "Equipe owner"       on equipe_membres;
create policy "equipe_membres_all" on equipe_membres
  for all
  using      (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- lab_results — accès par user_id
drop policy if exists "lab_results_all"    on lab_results;
drop policy if exists "Lab results owner"  on lab_results;
create policy "lab_results_all" on lab_results
  for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tables liées via etablissement_id → sous-requête vers etablissements
-- stock
drop policy if exists "stock_all"                on stock;
drop policy if exists "Users can view own stock" on stock;
drop policy if exists "Users can insert own stock" on stock;
drop policy if exists "Users can update own stock" on stock;
drop policy if exists "Users can delete own stock" on stock;
create policy "stock_all" on stock
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- fournisseurs
drop policy if exists "fournisseurs_all"               on fournisseurs;
drop policy if exists "Users can view own fournisseurs" on fournisseurs;
drop policy if exists "Users can insert own fournisseurs" on fournisseurs;
drop policy if exists "Users can update own fournisseurs" on fournisseurs;
drop policy if exists "Users can delete own fournisseurs" on fournisseurs;
create policy "fournisseurs_all" on fournisseurs
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- scans
drop policy if exists "scans_all"                on scans;
drop policy if exists "Users can view own scans" on scans;
drop policy if exists "Users can insert own scans" on scans;
create policy "scans_all" on scans
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- prix_historique
drop policy if exists "prix_historique_all"        on prix_historique;
drop policy if exists "Users can view own prix"    on prix_historique;
drop policy if exists "Users can insert own prix"  on prix_historique;
create policy "prix_historique_all" on prix_historique
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- temperatures
drop policy if exists "temperatures_all"                  on temperatures;
drop policy if exists "Users can view own temperatures"   on temperatures;
drop policy if exists "Users can insert own temperatures" on temperatures;
create policy "temperatures_all" on temperatures
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- recettes
drop policy if exists "recettes_all"                on recettes;
drop policy if exists "Users can view own recettes" on recettes;
drop policy if exists "Users can insert own recettes" on recettes;
drop policy if exists "Users can update own recettes" on recettes;
drop policy if exists "Users can delete own recettes" on recettes;
create policy "recettes_all" on recettes
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- mise_en_place
drop policy if exists "mise_en_place_all"                on mise_en_place;
drop policy if exists "Users can view own mise_en_place" on mise_en_place;
drop policy if exists "Users can insert own mise_en_place" on mise_en_place;
drop policy if exists "Users can update own mise_en_place" on mise_en_place;
create policy "mise_en_place_all" on mise_en_place
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- aria_conversations
drop policy if exists "aria_conversations_all"              on aria_conversations;
drop policy if exists "Users can view own conversations"    on aria_conversations;
drop policy if exists "Users can insert own conversations"  on aria_conversations;
drop policy if exists "Users can update own conversations"  on aria_conversations;
create policy "aria_conversations_all" on aria_conversations
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- couverts
drop policy if exists "couverts_all" on couverts;
create policy "couverts_all" on couverts
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- haccp_zones
drop policy if exists "haccp_zones_all"   on haccp_zones;
drop policy if exists "HACCP zones owner" on haccp_zones;
create policy "haccp_zones_all" on haccp_zones
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- aria_analytics
drop policy if exists "aria_analytics_all" on aria_analytics;
drop policy if exists "Analytics owner"    on aria_analytics;
create policy "aria_analytics_all" on aria_analytics
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- menus
drop policy if exists "menus_all"    on menus;
drop policy if exists "Menus owner"  on menus;
create policy "menus_all" on menus
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- clotures_service
drop policy if exists "clotures_service_all" on clotures_service;
drop policy if exists "Clotures owner"       on clotures_service;
create policy "clotures_service_all" on clotures_service
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- etiquettes
drop policy if exists "etiquettes_all"   on etiquettes;
drop policy if exists "Etiquettes owner" on etiquettes;
create policy "etiquettes_all" on etiquettes
  for all
  using      (etablissement_id in (select id from etablissements where owner_id = auth.uid()))
  with check (etablissement_id in (select id from etablissements where owner_id = auth.uid()));

-- ── 4. TRIGGER — création profil automatique ─────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, display_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employe')
  )
  on conflict (id) do update set
    display_name = coalesce(excluded.display_name, profiles.display_name),
    name         = coalesce(nullif(excluded.name, ''), profiles.name),
    updated_at   = now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
