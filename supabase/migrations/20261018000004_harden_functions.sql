-- ════════════════════════════════════════════════════════════════════
-- SAN VINO · 004 · Trigger-Funktionen nicht über die API aufrufbar machen
-- (Supabase Security Advisor: SECURITY DEFINER per /rest/v1/rpc erreichbar)
-- ════════════════════════════════════════════════════════════════════
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.scan_paths_are_owned() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
