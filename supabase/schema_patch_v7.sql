-- ============================================================
-- Schema Patch v7 — scoring configuration on seasons
-- Run in Supabase SQL Editor
-- ============================================================

-- Add match format and scoring config to seasons
ALTER TABLE public.seasons
  ADD COLUMN IF NOT EXISTS sets_to_win integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS scoring_type text NOT NULL DEFAULT 'advanced'
    CHECK (scoring_type IN ('simple', 'advanced')),
  ADD COLUMN IF NOT EXISTS default_scoring_config jsonb;

-- Populate default scoring config for existing seasons (sets_to_win=3, advanced)
UPDATE public.seasons
SET default_scoring_config = '{
  "type": "advanced",
  "results": {
    "3:0": [6, 0],
    "3:1": [5, 1],
    "3:2": [4, 2]
  }
}'::jsonb
WHERE default_scoring_config IS NULL;

-- Migrate existing leagues.match_format from {type:"best_of",sets:X} to {type:"race_to",sets_to_win:N}
-- best_of:5 → race_to:3, best_of:3 → race_to:2, best_of:7 → race_to:4
UPDATE public.leagues
SET match_format = jsonb_build_object(
  'type', 'race_to',
  'sets_to_win', CEIL((match_format->>'sets')::numeric / 2)
)
WHERE match_format->>'type' = 'best_of';

-- Migrate competitions.default_match_format as well
UPDATE public.competitions
SET default_match_format = jsonb_build_object(
  'type', 'race_to',
  'sets_to_win', CEIL((default_match_format->>'sets')::numeric / 2)
)
WHERE default_match_format->>'type' = 'best_of';
