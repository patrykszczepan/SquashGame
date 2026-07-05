-- Patch v15: Drop FK constraint on matches.winner_id
-- player_a_id/player_b_id already have FK dropped (v13) to support center_player UUIDs.
-- winner_id must follow the same pattern — a winner can be a center_player, not only a profile user.

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_winner_id_fkey;
