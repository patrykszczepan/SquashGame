-- ============================================================
-- Schema Patch v4 — fix role constraint + is_admin()
-- Run in Supabase SQL Editor
-- ============================================================

-- FIX 1: profiles role constraint doesn't allow 'super_admin'
-- Drop old constraint and add new one
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'center', 'player'));

-- FIX 2: is_admin() was checking 'admin' but codebase uses 'super_admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;
