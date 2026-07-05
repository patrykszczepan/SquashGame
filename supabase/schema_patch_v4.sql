-- ============================================================
-- Schema Patch v4 — fix is_admin() to check super_admin role
-- Run in Supabase SQL Editor
-- ============================================================

-- FIX: is_admin() checked for role = 'admin' but the codebase uses 'super_admin'
create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  );
$$;
