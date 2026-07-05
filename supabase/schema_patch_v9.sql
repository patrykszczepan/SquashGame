-- ============================================================
-- Schema Patch v9 — is_archived flag for leagues
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.leagues
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
