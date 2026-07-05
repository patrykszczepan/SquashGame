-- ============================================================
-- Schema Patch v10 — is_archived flag for competitions
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.competitions
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
