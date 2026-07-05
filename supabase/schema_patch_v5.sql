-- ============================================================
-- Schema Patch v5 — fix infinite recursion in RLS policies
-- Run in Supabase SQL Editor
-- ============================================================

-- PROBLEM: infinite recursion
--   competitions: readable  → checks competition_players
--   competition_players: readable → checks competitions (to get center_id)
--
-- FIX: helper function with SECURITY DEFINER bypasses RLS when looking up center_id

CREATE OR REPLACE FUNCTION public.competition_center_id(p_competition_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT center_id FROM public.competitions WHERE id = p_competition_id;
$$;

CREATE OR REPLACE FUNCTION public.season_center_id(p_season_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT c.center_id
  FROM public.seasons s
  JOIN public.competitions c ON c.id = s.competition_id
  WHERE s.id = p_season_id;
$$;

CREATE OR REPLACE FUNCTION public.league_center_id(p_league_id uuid)
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT c.center_id
  FROM public.leagues l
  JOIN public.seasons s ON s.id = l.season_id
  JOIN public.competitions c ON c.id = s.competition_id
  WHERE l.id = p_league_id;
$$;

-- FIX competition_players: readable — was querying competitions directly
DROP POLICY IF EXISTS "competition_players: readable" ON public.competition_players;
CREATE POLICY "competition_players: readable"
  ON public.competition_players FOR SELECT
  USING (
    profile_id = auth.uid()
    OR public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
  );

-- FIX competition_players: center update — same issue
DROP POLICY IF EXISTS "competition_players: center update" ON public.competition_players;
CREATE POLICY "competition_players: center update"
  ON public.competition_players FOR UPDATE
  USING (
    public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
  );

-- FIX seasons: readable — queries competitions
DROP POLICY IF EXISTS "seasons: readable" ON public.seasons;
CREATE POLICY "seasons: readable"
  ON public.seasons FOR SELECT
  USING (
    public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.competitions c
      WHERE c.id = competition_id AND c.visibility = 'public'
    )
  );

-- FIX seasons: center write — queries competitions
DROP POLICY IF EXISTS "seasons: center write" ON public.seasons;
CREATE POLICY "seasons: center write"
  ON public.seasons FOR ALL
  USING (
    public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
  );

-- FIX leagues: readable — queries seasons → competitions
DROP POLICY IF EXISTS "leagues: readable" ON public.leagues;
CREATE POLICY "leagues: readable"
  ON public.leagues FOR SELECT
  USING (
    public.is_center_member(public.league_center_id(id))
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.competitions c ON c.id = s.competition_id
      WHERE s.id = season_id AND c.visibility = 'public'
    )
  );

-- FIX leagues: center write
DROP POLICY IF EXISTS "leagues: center write" ON public.leagues;
CREATE POLICY "leagues: center write"
  ON public.leagues FOR ALL
  USING (
    public.is_center_member(public.league_center_id(id))
    OR public.is_admin()
  );

-- FIX league_players: readable
DROP POLICY IF EXISTS "league_players: readable" ON public.league_players;
CREATE POLICY "league_players: readable"
  ON public.league_players FOR SELECT
  USING (
    profile_id = auth.uid()
    OR public.is_admin()
    OR public.is_center_member(public.league_center_id(league_id))
    OR EXISTS (
      SELECT 1 FROM public.seasons s
      JOIN public.competitions c ON c.id = s.competition_id
      JOIN public.leagues l ON l.season_id = s.id
      WHERE l.id = league_id AND c.visibility = 'public'
    )
  );

-- FIX league_players: center write
DROP POLICY IF EXISTS "league_players: center write" ON public.league_players;
CREATE POLICY "league_players: center write"
  ON public.league_players FOR ALL
  USING (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  );

-- FIX rounds: center write
DROP POLICY IF EXISTS "rounds: center write" ON public.rounds;
CREATE POLICY "rounds: center write"
  ON public.rounds FOR ALL
  USING (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  );

-- FIX scoring_configs: center write
DROP POLICY IF EXISTS "scoring_configs: center write" ON public.scoring_configs;
CREATE POLICY "scoring_configs: center write"
  ON public.scoring_configs FOR ALL
  USING (
    public.is_admin()
    OR public.is_center_member(public.league_center_id(league_id))
  );
