-- ============================================================
-- Schema Patch v11 — center_players (offline players without account)
-- Run in Supabase SQL Editor
-- ============================================================

-- Gracze zarządzani przez centrum (bez konta w systemie)
CREATE TABLE IF NOT EXISTS public.center_players (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  center_id  uuid REFERENCES public.centers(id) ON DELETE CASCADE NOT NULL,
  first_name text NOT NULL,
  last_name  text NOT NULL,
  email      text,
  phone      text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.center_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "center_players: center access"
  ON public.center_players FOR ALL
  USING  (public.is_center_member(center_id) OR public.is_admin())
  WITH CHECK (public.is_center_member(center_id) OR public.is_admin());

-- Dodaj center_player_id do league_players i pozwól na NULL w profile_id
ALTER TABLE public.league_players
  ALTER COLUMN profile_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS center_player_id uuid REFERENCES public.center_players(id) ON DELETE CASCADE;

-- Unikalność: jeden gracz offline per liga
CREATE UNIQUE INDEX IF NOT EXISTS league_players_center_player_idx
  ON public.league_players (league_id, center_player_id)
  WHERE center_player_id IS NOT NULL;
