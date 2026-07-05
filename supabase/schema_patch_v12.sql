-- Schema Patch v12 — is_archived on center_players
ALTER TABLE public.center_players
  ADD COLUMN IF NOT EXISTS is_archived boolean NOT NULL DEFAULT false;
