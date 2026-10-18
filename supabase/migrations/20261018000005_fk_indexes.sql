-- ════════════════════════════════════════════════════════════════════
-- SAN VINO · 005 · Indizes für Fremdschlüssel (Supabase Performance Advisor)
-- ════════════════════════════════════════════════════════════════════
create index if not exists scan_items_scan_owner_idx on public.scan_items (scan_id, user_id);
create index if not exists scan_items_wine_idx on public.scan_items (wine_id);
create index if not exists user_wines_scan_item_owner_idx on public.user_wines (scan_item_id, user_id);
create index if not exists user_wines_wine_idx on public.user_wines (wine_id);
create index if not exists wine_ratings_owner_idx on public.wine_ratings (user_wine_id, user_id);
