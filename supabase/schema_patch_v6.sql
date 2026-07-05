-- ============================================================
-- Schema Patch v6 — fix leagues INSERT policy (league_center_id fails for new rows)
-- Run in Supabase SQL Editor
-- ============================================================

-- PROBLEM: leagues: center write uses league_center_id(id) for WITH CHECK.
-- On INSERT the league row doesn't exist yet → function returns NULL → blocked.
-- FIX: separate USING (existing rows) and WITH CHECK (new rows via season_id).

DROP POLICY IF EXISTS "leagues: center write" ON public.leagues;
CREATE POLICY "leagues: center write"
  ON public.leagues FOR ALL
  USING (
    public.is_center_member(public.league_center_id(id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_center_member(public.season_center_id(season_id))
    OR public.is_admin()
  );

-- Same issue for scoring_configs — league exists by the time config is inserted,
-- but add explicit WITH CHECK just to be safe.
DROP POLICY IF EXISTS "scoring_configs: center write" ON public.scoring_configs;
CREATE POLICY "scoring_configs: center write"
  ON public.scoring_configs FOR ALL
  USING (
    public.is_admin()
    OR public.is_center_member(public.league_center_id(league_id))
  )
  WITH CHECK (
    public.is_admin()
    OR public.is_center_member(public.league_center_id(league_id))
  );

-- Same fix for league_players: center write
DROP POLICY IF EXISTS "league_players: center write" ON public.league_players;
CREATE POLICY "league_players: center write"
  ON public.league_players FOR ALL
  USING (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  );

-- Same fix for rounds: center write
DROP POLICY IF EXISTS "rounds: center write" ON public.rounds;
CREATE POLICY "rounds: center write"
  ON public.rounds FOR ALL
  USING (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_center_member(public.league_center_id(league_id))
    OR public.is_admin()
  );

-- Fix seasons: center write — same pattern (season_id not yet in DB on INSERT)
DROP POLICY IF EXISTS "seasons: center write" ON public.seasons;
CREATE POLICY "seasons: center write"
  ON public.seasons FOR ALL
  USING (
    public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
  )
  WITH CHECK (
    public.is_center_member(public.competition_center_id(competition_id))
    OR public.is_admin()
  );
