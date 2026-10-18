-- ════════════════════════════════════════════════════════════════════
-- VINO · 001 · Grundschema
-- Identität: auth.users (auch anonyme Nutzer). Alle privaten Tabellen
-- tragen user_id → auth.users(id) ON DELETE CASCADE, damit das Löschen
-- eines Kontos sämtliche persönlichen Daten entfernt.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- updated_at automatisch pflegen
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────── profiles ───────────────────────────
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  taste_type text check (taste_type in ('fruity', 'fresh', 'elegant', 'bold', 'sweet', 'spicy')),
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Ein Datensatz pro (auch anonymem) Nutzer.';

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Profil automatisch beim Anlegen eines Auth-Nutzers erzeugen (auch anonym).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────── taste_answers ───────────────────────────
create table public.taste_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null check (question_key ~ '^q([1-9]|10)_[a-z_]+$'),
  answer jsonb not null check (jsonb_typeof(answer) = 'object' and answer ? 'value'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taste_answers_one_per_question unique (user_id, question_key)
);

create trigger taste_answers_updated_at before update on public.taste_answers
  for each row execute function public.set_updated_at();

-- ─────────────────────────── taste_profiles ───────────────────────────
create table public.taste_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  initial_profile jsonb not null check (jsonb_typeof(initial_profile) = 'object'),
  learned_profile jsonb not null check (jsonb_typeof(learned_profile) = 'object'),
  profile_version integer not null default 1 check (profile_version >= 1),
  confidence text not null default 'initial' check (confidence in ('initial', 'learning', 'established')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.taste_profiles.initial_profile is 'Aus dem Onboarding berechnet – bleibt unverändert, bis die Antworten bearbeitet werden.';
comment on column public.taste_profiles.learned_profile is 'Ausgangsprofil + Lernen aus Bewertungen (jederzeit neu berechenbar).';

create trigger taste_profiles_updated_at before update on public.taste_profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────── scans ───────────────────────────
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scan_type text not null check (scan_type in ('bottle', 'menu')),
  image_path text,
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 6),
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'analyzing', 'analyzed', 'no_wine_found', 'unreadable', 'failed')),
  error_code text,
  analysis_meta jsonb,
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint scans_id_user_unique unique (id, user_id)
);
create index scans_user_created_idx on public.scans (user_id, created_at desc);

-- ─────────────────────────── wines (gemeinsamer Katalog) ───────────────────────────
-- Nur sicher identifizierte Weine landen hier – ausschließlich über Edge Functions
-- (service_role). Nutzer können lesen, aber nie schreiben.
create table public.wines (
  id uuid primary key default gen_random_uuid(),
  catalog_key text not null unique,
  name text not null check (char_length(name) between 1 and 200),
  producer text,
  vintage integer check (vintage between 1900 and 2100),
  grape_varieties jsonb not null default '[]'::jsonb check (jsonb_typeof(grape_varieties) = 'array'),
  country text,
  region text,
  wine_type text not null default 'unknown'
    check (wine_type in ('red', 'white', 'rose', 'sparkling', 'sweet', 'orange', 'other', 'unknown')),
  taste_properties jsonb,
  identification_confidence numeric(4, 3) check (identification_confidence between 0 and 1),
  created_at timestamptz not null default now()
);
create index wines_name_idx on public.wines (lower(name));

-- ─────────────────────────── scan_items ───────────────────────────
create table public.scan_items (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  wine_id uuid references public.wines (id) on delete set null,
  position integer not null default 0,
  extracted_data jsonb not null check (jsonb_typeof(extracted_data) = 'object'),
  evidence jsonb,
  price numeric(10, 2) check (price >= 0),
  currency text check (currency ~ '^[A-Z]{3}$'),
  match_score numeric(5, 2) check (match_score between 0 and 100),
  match_confidence text check (match_confidence in ('high', 'medium', 'low', 'insufficient')),
  match_details jsonb,
  explanation jsonb,
  created_at timestamptz not null default now(),
  constraint scan_items_id_user_unique unique (id, user_id),
  -- Eigentümerschaft: ein Item gehört immer zu einem Scan DESSELBEN Nutzers
  constraint scan_items_scan_owner_fk foreign key (scan_id, user_id)
    references public.scans (id, user_id) on delete cascade
);
create index scan_items_scan_idx on public.scan_items (scan_id, position);
create index scan_items_user_idx on public.scan_items (user_id, created_at desc);

-- ─────────────────────────── user_wines ───────────────────────────
create table public.user_wines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  wine_id uuid references public.wines (id) on delete set null,
  scan_item_id uuid,
  -- Kopie der Weindaten: bleibt erhalten, auch wenn der Scan gelöscht wird.
  wine_snapshot jsonb not null check (jsonb_typeof(wine_snapshot) = 'object'),
  is_favorite boolean not null default false,
  has_tried boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_wines_id_user_unique unique (id, user_id),
  constraint user_wines_scan_item_owner_fk foreign key (scan_item_id, user_id)
    references public.scan_items (id, user_id) on delete set null (scan_item_id),
  constraint user_wines_one_per_scan_item unique (user_id, scan_item_id)
);
create index user_wines_user_idx on public.user_wines (user_id, created_at desc);

create trigger user_wines_updated_at before update on public.user_wines
  for each row execute function public.set_updated_at();

-- ─────────────────────────── wine_ratings ───────────────────────────
create table public.wine_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_wine_id uuid not null,
  rating integer check (rating between 1 and 5),
  verdict text check (verdict in ('loved', 'okay', 'disliked')),
  liked_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(liked_reasons) = 'array'),
  disliked_reasons jsonb not null default '[]'::jsonb check (jsonb_typeof(disliked_reasons) = 'array'),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wine_ratings_has_value check (rating is not null or verdict is not null),
  constraint wine_ratings_one_per_wine unique (user_wine_id),
  constraint wine_ratings_owner_fk foreign key (user_wine_id, user_id)
    references public.user_wines (id, user_id) on delete cascade
);
create index wine_ratings_user_idx on public.wine_ratings (user_id, created_at desc);

create trigger wine_ratings_updated_at before update on public.wine_ratings
  for each row execute function public.set_updated_at();

-- ─────────────────────────── ai_usage (Kosten- & Missbrauchsschutz) ───────────────────────────
-- Wird ausschließlich von Edge Functions (service_role) geschrieben.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  function_name text not null check (function_name in ('analyze-wine-image', 'generate-wine-explanation')),
  model text,
  input_tokens integer,
  output_tokens integer,
  success boolean not null default true,
  created_at timestamptz not null default now()
);
create index ai_usage_user_fn_created_idx on public.ai_usage (user_id, function_name, created_at desc);
