-- ============================================================
-- Schema Patch v8 — add default_round_robin_mode to seasons
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS default_round_robin_mode text NOT NULL DEFAULT 'single'
    CHECK (default_round_robin_mode IN ('single', 'double'));
