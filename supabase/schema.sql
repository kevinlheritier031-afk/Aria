-- ═══════════════════════════════════════════════════════
--  ARIA — Schema Supabase
--  Coller dans SQL Editor de Supabase et exécuter
-- ═══════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";

create table if not exists profiles (
  id          uuid references auth.users on delete cascade primary key,
  name        text not null,
  email       text not null,
  role        text not null default 'employe',
  etablissement_id uuid,
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists etablissements (
  id          uuid default uuid_generate_v4() primary key,
  nom         text not null,
  adresse     text,
  type        text default 'restaurant',
  owner_id    uuid references profiles(id),
  abonnement  text default 'starter',
  actif       boolean default true,
  created_at  timestamptz default now()
);

create table if not exists stock (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom             text not null,
  q               numeric not null default 0,
  u               text not null default 'unité',
  px              numeric,
  lot             text,
  dlc             text,
  cat             text default 'autre',
  four            text,
  seuil_min       numeric,
  date_reception  text,
  st              text default 'ok',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists fournisseurs (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom             text not null,
  mode            text default 'tel',
  tel             text,
  email           text,
  site            text,
  jours           text[] default '{}',
  heure_limite    text default '09:00',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists scans (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  four            text,
  nb              integer default 0,
  total           numeric,
  conf            text default 'a_verifier',
  heure           text,
  date_scan       text,
  data_json       jsonb,
  created_at      timestamptz default now()
);

create table if not exists prix_historique (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  prod            text not null,
  four            text not null,
  px              numeric not null,
  date_prix       text,
  fac             text,
  created_at      timestamptz default now()
);

create table if not exists temperatures (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  valeur          numeric not null,
  contexte        text not null,
  conforme        boolean,
  note            text,
  created_at      timestamptz default now()
);

create table if not exists recettes (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  nom             text not null,
  ingredients     jsonb default '[]',
  allergenes      text[] default '{}',
  portions        integer default 1,
  temps_prep      integer,
  instructions    text,
  cout_matiere    numeric,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists mise_en_place (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  date_jour       text not null,
  items           jsonb default '[]',
  created_at      timestamptz default now()
);

create table if not exists aria_conversations (
  id              uuid default uuid_generate_v4() primary key,
  user_id         uuid references auth.users on delete cascade,
  etablissement_id uuid references etablissements(id),
  messages        jsonb default '[]',
  contexte        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- RLS
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

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can view own stock" on stock for select using (auth.uid() = user_id);
create policy "Users can insert own stock" on stock for insert with check (auth.uid() = user_id);
create policy "Users can update own stock" on stock for update using (auth.uid() = user_id);
create policy "Users can delete own stock" on stock for delete using (auth.uid() = user_id);
create policy "Users can view own fournisseurs" on fournisseurs for select using (auth.uid() = user_id);
create policy "Users can insert own fournisseurs" on fournisseurs for insert with check (auth.uid() = user_id);
create policy "Users can update own fournisseurs" on fournisseurs for update using (auth.uid() = user_id);
create policy "Users can delete own fournisseurs" on fournisseurs for delete using (auth.uid() = user_id);
create policy "Users can view own scans" on scans for select using (auth.uid() = user_id);
create policy "Users can insert own scans" on scans for insert with check (auth.uid() = user_id);
create policy "Users can view own prix" on prix_historique for select using (auth.uid() = user_id);
create policy "Users can insert own prix" on prix_historique for insert with check (auth.uid() = user_id);
create policy "Users can view own temperatures" on temperatures for select using (auth.uid() = user_id);
create policy "Users can insert own temperatures" on temperatures for insert with check (auth.uid() = user_id);
create policy "Users can view own recettes" on recettes for select using (auth.uid() = user_id);
create policy "Users can insert own recettes" on recettes for insert with check (auth.uid() = user_id);
create policy "Users can update own recettes" on recettes for update using (auth.uid() = user_id);
create policy "Users can delete own recettes" on recettes for delete using (auth.uid() = user_id);
create policy "Users can view own mise_en_place" on mise_en_place for select using (auth.uid() = user_id);
create policy "Users can insert own mise_en_place" on mise_en_place for insert with check (auth.uid() = user_id);
create policy "Users can update own mise_en_place" on mise_en_place for update using (auth.uid() = user_id);
create policy "Users can view own conversations" on aria_conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on aria_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update own conversations" on aria_conversations for update using (auth.uid() = user_id);

-- Trigger création profil auto
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Utilisateur'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employe')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Ajouts Phase 12-13 ────────────────────────────────────────────────────────

-- Colonnes manquantes sur établissements
alter table if exists etablissements
  add column if not exists nb_employes text,
  add column if not exists settings jsonb default '{}';

-- onboarding_completed est stocké dans auth.users.raw_user_meta_data (via updateUser).
-- Aucune migration SQL nécessaire — géré côté client.

-- equipe_membres
create table if not exists equipe_membres (
  id          uuid default uuid_generate_v4() primary key,
  owner_id    uuid references auth.users on delete cascade,
  name        text not null,
  role        text not null default 'employe',
  pin_code    text,
  created_at  timestamptz default now()
);
alter table equipe_membres enable row level security;
create policy if not exists "Equipe owner" on equipe_membres
  for all using (auth.uid() = owner_id);

-- haccp_zones
create table if not exists haccp_zones (
  id                uuid default uuid_generate_v4() primary key,
  etablissement_id  uuid not null,
  nom               text not null,
  temp_min          numeric,
  temp_max          numeric,
  created_at        timestamptz default now()
);
alter table haccp_zones enable row level security;
create policy if not exists "HACCP zones owner" on haccp_zones
  for all using (auth.uid() = etablissement_id);

-- aria_analytics
create table if not exists aria_analytics (
  id                uuid default uuid_generate_v4() primary key,
  etablissement_id  uuid not null,
  date              text,
  message_count     integer default 1,
  topic_tags        text,
  created_at        timestamptz default now()
);
alter table aria_analytics enable row level security;
create policy if not exists "Analytics owner" on aria_analytics
  for all using (auth.uid() = etablissement_id);

-- lab_results
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
alter table lab_results enable row level security;
create policy if not exists "Lab results owner" on lab_results
  for all using (auth.uid() = user_id);