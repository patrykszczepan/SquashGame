-- Patch v13: Allow center_player UUIDs in matches (not only profile UUIDs)
-- matches.player_a_id and player_b_id currently FK-reference profiles(id),
-- which prevents storing center_player_id there. Drop FK constraints.
-- NOT NULL stays — every match must have both players.

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_player_a_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_player_b_id_fkey;

-- Also drop the restrict-on-delete index if it was named differently
-- (Supabase may name it differently depending on migration order)
ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_player_a_id_fkey1,
  DROP CONSTRAINT IF EXISTS matches_player_b_id_fkey1;
