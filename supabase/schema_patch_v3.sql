-- ============================================================
-- Schema Patch v3 — RLS fixes for tournaments, ladders, matches
-- Run in Supabase SQL Editor
-- ============================================================

-- FIX 1: tournaments — policy passed competition_id to is_center_member (expects center_id)
drop policy if exists "tournaments: center write" on public.tournaments;
create policy "tournaments: center write"
  on public.tournaments for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select center_id from public.competitions where id = competition_id)
    )
  );

-- FIX 2: ladders — same bug
drop policy if exists "ladders: center write" on public.ladders;
create policy "ladders: center write"
  on public.ladders for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select center_id from public.competitions where id = competition_id)
    )
  );

-- FIX 3: tournament_slots — passed competition_id (from tournament) instead of center_id
drop policy if exists "tournament_slots: center write" on public.tournament_slots;
create policy "tournament_slots: center write"
  on public.tournament_slots for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.tournaments t
       join public.competitions c on c.id = t.competition_id
       where t.id = tournament_id)
    )
  );

-- FIX 4: ladder_positions — same bug (competition_id from ladder lookup)
drop policy if exists "ladder_positions: center write" on public.ladder_positions;
create policy "ladder_positions: center write"
  on public.ladder_positions for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.ladders l
       join public.competitions c on c.id = l.competition_id
       where l.id = ladder_id)
    )
  );

-- FIX 5: challenges — same bug
drop policy if exists "challenges: readable" on public.challenges;
create policy "challenges: readable"
  on public.challenges for select
  using (
    challenger_id = auth.uid()
    or challenged_id = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.ladders l
       join public.competitions c on c.id = l.competition_id
       where l.id = ladder_id)
    )
  );

drop policy if exists "challenges: player or center update" on public.challenges;
create policy "challenges: player or center update"
  on public.challenges for update
  using (
    challenger_id = auth.uid()
    or challenged_id = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.ladders l
       join public.competitions c on c.id = l.competition_id
       where l.id = ladder_id)
    )
  );

-- FIX 6: matches insert — allow center to insert tournament/ladder matches
drop policy if exists "matches: center insert" on public.matches;
create policy "matches: center insert"
  on public.matches for insert
  with check (
    public.is_admin()
    or (league_id is not null and public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    ))
    or (tournament_id is not null and public.is_center_member(
      (select c.center_id
       from public.tournaments t
       join public.competitions c on c.id = t.competition_id
       where t.id = tournament_id)
    ))
    or (ladder_id is not null and public.is_center_member(
      (select c.center_id
       from public.ladders l
       join public.competitions c on c.id = l.competition_id
       where l.id = ladder_id)
    ))
  );

-- FIX 7: matches update — allow center to update tournament/ladder matches
drop policy if exists "matches: player or center update" on public.matches;
create policy "matches: player or center update"
  on public.matches for update
  using (
    player_a_id = auth.uid()
    or player_b_id = auth.uid()
    or public.is_admin()
    or (league_id is not null and public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    ))
    or (tournament_id is not null and public.is_center_member(
      (select c.center_id
       from public.tournaments t
       join public.competitions c on c.id = t.competition_id
       where t.id = tournament_id)
    ))
    or (ladder_id is not null and public.is_center_member(
      (select c.center_id
       from public.ladders l
       join public.competitions c on c.id = l.competition_id
       where l.id = ladder_id)
    ))
  );

-- FIX 8: match_sets write — allow center to write sets for tournament/ladder matches
drop policy if exists "match_sets: write via match" on public.match_sets;
create policy "match_sets: write via match"
  on public.match_sets for all
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (
          m.player_a_id = auth.uid()
          or m.player_b_id = auth.uid()
          or public.is_admin()
          or (m.league_id is not null and public.is_center_member(
            (select c.center_id
             from public.leagues l
             join public.seasons s on s.id = l.season_id
             join public.competitions c on c.id = s.competition_id
             where l.id = m.league_id)
          ))
          or (m.tournament_id is not null and public.is_center_member(
            (select c.center_id
             from public.tournaments t
             join public.competitions c on c.id = t.competition_id
             where t.id = m.tournament_id)
          ))
          or (m.ladder_id is not null and public.is_center_member(
            (select c.center_id
             from public.ladders l
             join public.competitions c on c.id = l.competition_id
             where l.id = m.ladder_id)
          ))
        )
    )
  );

-- FIX 9: matches readable — allow center to read tournament/ladder matches
drop policy if exists "matches: readable" on public.matches;
create policy "matches: readable"
  on public.matches for select
  using (
    player_a_id = auth.uid()
    or player_b_id = auth.uid()
    or public.is_admin()
    or (league_id is not null and exists (
      select 1 from public.leagues l
      join public.seasons s on s.id = l.season_id
      join public.competitions c on c.id = s.competition_id
      where l.id = league_id
        and (c.visibility = 'public' or public.is_center_member(c.center_id))
    ))
    or (tournament_id is not null and exists (
      select 1 from public.tournaments t
      join public.competitions c on c.id = t.competition_id
      where t.id = tournament_id
        and (c.visibility = 'public' or public.is_center_member(c.center_id))
    ))
    or (ladder_id is not null and exists (
      select 1 from public.ladders l
      join public.competitions c on c.id = l.competition_id
      where l.id = ladder_id
        and (c.visibility = 'public' or public.is_center_member(c.center_id))
    ))
  );

-- Note: invitation_tokens column is 'use_count' (not 'used_count')
-- and there is no 'revoked_at' column — these are code-side fixes only.
