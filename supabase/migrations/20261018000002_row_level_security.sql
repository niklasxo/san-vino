-- ════════════════════════════════════════════════════════════════════
-- VINO · 002 · Row Level Security
-- Grundregel: Jeder (auch anonyme) Nutzer sieht und verändert nur Zeilen
-- mit user_id = auth.uid(). Anonyme Nutzer haben die Rolle "authenticated".
-- Die user_id wird nie vom Frontend vertraut: WITH CHECK erzwingt auth.uid().
-- (select auth.uid()) statt auth.uid() → wird pro Abfrage nur einmal ausgewertet.
-- ════════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.taste_answers enable row level security;
alter table public.taste_profiles enable row level security;
alter table public.scans enable row level security;
alter table public.wines enable row level security;
alter table public.scan_items enable row level security;
alter table public.user_wines enable row level security;
alter table public.wine_ratings enable row level security;
alter table public.ai_usage enable row level security;

-- Öffentliche (nicht angemeldete) Rolle bekommt gar keinen Tabellenzugriff.
revoke all on all tables in schema public from anon;

-- ─── profiles: lesen & aktualisieren (Anlage passiert per Trigger) ───
create policy "profiles_select_own" on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- ─── taste_answers: voller Zugriff auf eigene Antworten ───
create policy "taste_answers_select_own" on public.taste_answers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "taste_answers_insert_own" on public.taste_answers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "taste_answers_update_own" on public.taste_answers
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "taste_answers_delete_own" on public.taste_answers
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── taste_profiles ───
create policy "taste_profiles_select_own" on public.taste_profiles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "taste_profiles_insert_own" on public.taste_profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "taste_profiles_update_own" on public.taste_profiles
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "taste_profiles_delete_own" on public.taste_profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── scans: anlegen, lesen, löschen. Status setzt nur die Edge Function. ───
create policy "scans_select_own" on public.scans
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "scans_insert_own" on public.scans
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status in ('pending', 'uploaded'));
create policy "scans_update_own" on public.scans
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id and status in ('pending', 'uploaded'));
create policy "scans_delete_own" on public.scans
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Bildpfade müssen im eigenen Storage-Ordner liegen.
create or replace function public.scan_paths_are_owned()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  p text;
begin
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.user_id::text then
    raise exception 'image_path must be inside the owner folder';
  end if;
  foreach p in array coalesce(new.image_paths, '{}') loop
    if split_part(p, '/', 1) <> new.user_id::text or split_part(p, '/', 2) <> new.id::text then
      raise exception 'image_paths must be inside <user_id>/<scan_id>/';
    end if;
  end loop;
  return new;
end;
$$;
create trigger scans_paths_owned before insert or update on public.scans
  for each row execute function public.scan_paths_are_owned();

-- ─── wines: Katalog nur lesbar. Keine Insert/Update/Delete-Policies → nur service_role schreibt. ───
create policy "wines_select_authenticated" on public.wines
  for select to authenticated using (true);
revoke insert, update, delete on public.wines from authenticated;

-- ─── scan_items: Anlage nur durch Edge Function; Nutzer darf eigene lesen, korrigieren, löschen ───
create policy "scan_items_select_own" on public.scan_items
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "scan_items_update_own" on public.scan_items
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "scan_items_delete_own" on public.scan_items
  for delete to authenticated using ((select auth.uid()) = user_id);
revoke insert on public.scan_items from authenticated;
-- Nutzer dürfen den Katalogbezug nicht auf fremde/beliebige Weine umbiegen.
revoke update on public.scan_items from authenticated;
grant update (extracted_data, price, currency, match_score, match_confidence, match_details) on public.scan_items to authenticated;

-- ─── user_wines ───
create policy "user_wines_select_own" on public.user_wines
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_wines_insert_own" on public.user_wines
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_wines_update_own" on public.user_wines
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_wines_delete_own" on public.user_wines
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── wine_ratings ───
create policy "wine_ratings_select_own" on public.wine_ratings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "wine_ratings_insert_own" on public.wine_ratings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "wine_ratings_update_own" on public.wine_ratings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "wine_ratings_delete_own" on public.wine_ratings
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ─── ai_usage: nur eigene Nutzung lesen ───
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.ai_usage from authenticated;
