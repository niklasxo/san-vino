-- ════════════════════════════════════════════════════════════════════
-- SAN VINO · 006 · Geschmacks-Swipes („Geschmack verfeinern“)
-- Zusätzliche Alltagsfragen (Ja / Nein / Weiß nicht), die das Profil feiner
-- einstellen. Privat wie alle Profildaten: nur der eigene Nutzer sieht sie.
-- Konto löschen → ON DELETE CASCADE entfernt alles.
-- ════════════════════════════════════════════════════════════════════

create table public.taste_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question_key text not null check (question_key ~ '^s[0-9]{2}_[a-z_]+$'),
  answer text not null check (answer in ('yes', 'no', 'unsure')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint taste_swipes_one_per_question unique (user_id, question_key)
);
comment on table public.taste_swipes is 'Antworten auf die optionalen Swipe-Fragen zur Verfeinerung des Geschmacksprofils.';

create trigger taste_swipes_updated_at before update on public.taste_swipes
  for each row execute function public.set_updated_at();

alter table public.taste_swipes enable row level security;

create policy "taste_swipes_select_own" on public.taste_swipes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "taste_swipes_insert_own" on public.taste_swipes
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "taste_swipes_update_own" on public.taste_swipes
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "taste_swipes_delete_own" on public.taste_swipes
  for delete to authenticated using ((select auth.uid()) = user_id);
