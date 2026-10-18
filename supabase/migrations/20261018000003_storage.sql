-- ════════════════════════════════════════════════════════════════════
-- VINO · 003 · Privater Storage-Bucket für Scan-Fotos
-- Pfadschema: <user_id>/<scan_id>/<n>.jpg
-- Kein öffentlicher Zugriff – nur eigene Dateien, Anzeige über signierte URLs.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wine-scans', 'wine-scans', false, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "wine_scans_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'wine-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wine_scans_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'wine-scans'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and array_length(storage.foldername(name), 1) = 2
  );

create policy "wine_scans_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'wine-scans' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'wine-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "wine_scans_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wine-scans' and (storage.foldername(name))[1] = (select auth.uid())::text);
