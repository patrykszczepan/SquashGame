-- ============================================================
-- SquashLeague Platform â€” Full Schema v2
-- Uruchom w Supabase SQL Editor (rola: service_role)
-- UWAGA: CzyĹ›ci poprzedniÄ… schemÄ™. Baza musi byÄ‡ pusta.
-- ============================================================

-- ============================================================
-- SEKCJA 0: CZYSZCZENIE
-- ============================================================
drop table if exists public.audit_log cascade;
drop table if exists public.notification_preferences cascade;
drop table if exists public.notifications cascade;
drop table if exists public.subscriptions cascade;
drop table if exists public.plans cascade;
drop table if exists public.payment_ledger cascade;
drop table if exists public.payments cascade;
drop table if exists public.invitation_tokens cascade;
drop table if exists public.challenges cascade;
drop table if exists public.ladder_position_history cascade;
drop table if exists public.ladder_positions cascade;
drop table if exists public.ladders cascade;
drop table if exists public.tournament_slots cascade;
drop table if exists public.tournaments cascade;
drop table if exists public.scoring_configs cascade;
drop table if exists public.scoring_templates cascade;
drop table if exists public.match_events cascade;
drop table if exists public.match_sets cascade;
drop table if exists public.matches cascade;
drop table if exists public.rounds cascade;
drop table if exists public.league_players cascade;
drop table if exists public.leagues cascade;
drop table if exists public.seasons cascade;
drop table if exists public.competition_players cascade;
drop table if exists public.competitions cascade;
drop table if exists public.players cascade;
drop table if exists public.center_members cascade;
drop table if exists public.centers cascade;
drop table if exists public.profiles cascade;

drop function if exists public.is_admin() cascade;
drop function if exists auth.my_center_id() cascade;
drop function if exists public.is_center_member(uuid) cascade;

-- ============================================================
-- SEKCJA 1: PROFILE I UĹ»YTKOWNICY
-- ============================================================

-- Profile (rozszerzenie auth.users â€” 1:1)
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  role        text not null check (role in ('admin', 'center', 'player')),
  phone       text,
  avatar_url  text,
  -- Zgody RODO
  consent_contact_share    boolean not null default false,
  consent_contact_share_at timestamptz,
  terms_accepted_at        timestamptz,
  privacy_accepted_at      timestamptz,
  terms_version            text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Centra squash
create table public.centers (
  id          uuid default gen_random_uuid() primary key,
  profile_id  uuid references public.profiles(id) on delete cascade unique not null,
  name        text not null,
  slug        text unique,
  address     text,
  postal_code text,
  city        text,
  phone       text,
  email       text,
  nip         text,
  description text,
  logo_url    text,
  -- Branding (plan Pro)
  brand_color   text,
  custom_domain text,
  is_active   boolean not null default true,
  blocked_at  timestamptz,
  blocked_reason text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- CzĹ‚onkowie centrum (dodatkowi adminowie / personel)
create table public.center_members (
  id          uuid default gen_random_uuid() primary key,
  center_id   uuid references public.centers(id) on delete cascade not null,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  role        text not null check (role in ('admin', 'staff')),
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  unique (center_id, profile_id)
);

-- Profil zawodnika
create table public.players (
  id          uuid default gen_random_uuid() primary key,
  profile_id  uuid references public.profiles(id) on delete cascade unique not null,
  first_name  text not null,
  last_name   text not null,
  phone       text,
  avatar_url  text,
  -- Zgody na udostÄ™pnianie danych kontaktowych rywalom
  contact_share_phone boolean not null default false,
  contact_share_email boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SEKCJA 2: HIERARCHIA ROZGRYWEK
-- ============================================================

-- Rozgrywki (kontener dla sezonĂłw)
create table public.competitions (
  id          uuid default gen_random_uuid() primary key,
  center_id   uuid references public.centers(id) on delete cascade not null,
  name        text not null,
  slug        text not null,
  description text,
  -- WidocznoĹ›Ä‡: public / private / mixed
  visibility  text not null default 'public' check (visibility in ('public', 'private', 'mixed')),
  public_show_tables   boolean not null default true,
  public_show_schedule boolean not null default true,
  public_show_contacts boolean not null default false,
  public_short_names   boolean not null default false,
  -- Wpisowe
  entry_fee_enabled  boolean not null default false,
  entry_fee_amount   numeric(10,2),
  entry_fee_currency text not null default 'PLN',
  payment_block_mode text not null default 'soft' check (payment_block_mode in ('hard', 'soft')),
  -- DomyĹ›lny format meczu (nadpisywalny per sezon/liga)
  default_match_format  jsonb not null default '{"type":"best_of","sets":5}'::jsonb,
  default_schedule_mode text not null default 'self' check (default_schedule_mode in ('center','self')),
  default_result_confirm_days integer not null default 3,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (center_id, slug)
);

-- Pula zawodnikĂłw rozgrywek
create table public.competition_players (
  id             uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  profile_id     uuid references public.profiles(id) on delete cascade not null,
  invitation_status text not null default 'pending'
    check (invitation_status in ('pending','accepted','declined')),
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  invitation_token_id uuid, -- FK dodany po stworzeniu invitation_tokens
  -- Zgoda RODO na poziomie rozgrywek
  consent_contact_share    boolean not null default false,
  consent_contact_share_at timestamptz,
  -- Status opĹ‚at
  payment_status text not null default 'none'
    check (payment_status in ('none','pending','paid','overdue')),
  paid_at timestamptz,
  unique (competition_id, profile_id)
);

-- ============================================================
-- SEKCJA 3: SEZONY I LIGI
-- ============================================================

-- Sezony
create table public.seasons (
  id             uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  name           text not null,
  status         text not null default 'draft' check (status in ('draft','active','finished')),
  start_date     date,
  end_date       date,
  default_promotions integer not null default 2,
  default_demotions  integer not null default 2,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Ligi w sezonie (poziom 1 = najwyĹĽsza)
create table public.leagues (
  id              uuid default gen_random_uuid() primary key,
  season_id       uuid references public.seasons(id) on delete cascade not null,
  name            text not null,
  level           integer not null,
  match_format    jsonb not null default '{"type":"best_of","sets":5}'::jsonb,
  schedule_mode   text not null default 'self' check (schedule_mode in ('center','self')),
  round_robin_mode text not null default 'single' check (round_robin_mode in ('single','double')),
  scoring_config_id uuid, -- FK dodany po scoring_configs
  promotions      integer,
  demotions       integer,
  result_confirm_days integer not null default 3,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (season_id, level)
);

-- Zawodnicy w lidze
create table public.league_players (
  id          uuid default gen_random_uuid() primary key,
  league_id   uuid references public.leagues(id) on delete cascade not null,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  position    integer,
  confirmed_participation boolean,
  confirmed_at            timestamptz,
  promotion_status text check (promotion_status in ('promoted','demoted','stayed','wildcard')),
  unique (league_id, profile_id)
);

-- Rundy / kolejki
create table public.rounds (
  id          uuid default gen_random_uuid() primary key,
  league_id   uuid references public.leagues(id) on delete cascade not null,
  name        text not null,
  number      integer not null,
  deadline    date,
  reminder_days integer[] not null default '{7,2}'::integer[],
  created_at  timestamptz not null default now(),
  unique (league_id, number)
);

-- ============================================================
-- SEKCJA 4: MECZE
-- ============================================================

-- Mecze (liga / turniej / drabinka)
create table public.matches (
  id              uuid default gen_random_uuid() primary key,
  -- Kontekst â€” jedno z poniĹĽszych jest ustawione:
  league_id       uuid references public.leagues(id) on delete cascade,
  tournament_id   uuid, -- FK po stworzeniu tournaments
  ladder_id       uuid, -- FK po stworzeniu ladders
  round_id        uuid references public.rounds(id) on delete set null,
  -- Zawodnicy
  player_a_id     uuid references public.profiles(id) on delete restrict not null,
  player_b_id     uuid references public.profiles(id) on delete restrict not null,
  -- Status
  status          text not null default 'scheduled' check (status in (
    'scheduled','pending_confirmation','finished','walkover','not_played','postponed'
  )),
  winner_id       uuid references public.profiles(id),
  -- ĹąrĂłdĹ‚o wyniku
  result_source   text check (result_source in ('player','center')),
  submitted_by    uuid references public.profiles(id),
  submitted_at    timestamptz,
  confirmed_by    uuid references public.profiles(id),
  confirmed_at    timestamptz,
  disputed_by     uuid references public.profiles(id),
  disputed_at     timestamptz,
  auto_confirm_at timestamptz,
  -- Nadpisanie formatu meczu (np. finaĹ‚ best-of-5 vs faza grupowa best-of-3)
  format_override jsonb,
  -- Termin ustalony przez zawodnikĂłw/centrum
  scheduled_at    timestamptz,
  -- Walkower
  walkover_type   text check (walkover_type in ('no_show','withdrawal','disqualification')),
  walkover_for_id uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Sety meczu
create table public.match_sets (
  id          uuid default gen_random_uuid() primary key,
  match_id    uuid references public.matches(id) on delete cascade not null,
  set_number  integer not null,
  points_a    integer not null,
  points_b    integer not null,
  unique (match_id, set_number)
);

-- Log zdarzeĹ„ meczu (potwierdzenia, korekty, kwestionowania)
create table public.match_events (
  id          uuid default gen_random_uuid() primary key,
  match_id    uuid references public.matches(id) on delete cascade not null,
  event_type  text not null check (event_type in (
    'result_submitted','result_confirmed','result_disputed','result_corrected',
    'auto_confirmed','status_changed','walkover_declared',
    'postponement_requested','postponement_approved'
  )),
  actor_id    uuid references public.profiles(id),
  old_data    jsonb,
  new_data    jsonb,
  note        text,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SEKCJA 5: SILNIK PUNKTACJI
-- ============================================================

-- Szablony punktacji (globalne: center_id = null; wĹ‚asne centrum: center_id ustawione)
-- Struktura config: {
--   win_by_sets:  {"3:0": 5, "3:1": 4, "3:2": 3},
--   loss_by_sets: {"0:3": 0, "1:3": 1, "2:3": 2},
--   set_point:    {enabled: bool, value: number},
--   participation_point: {enabled: bool, value: number},
--   walkover:     {winner: number, loser: number},
--   not_played:   {a: 0, b: 0},
--   tiebreaker:   ["points","head_to_head","set_ratio","small_points","matches_played"]
-- }
create table public.scoring_templates (
  id          uuid default gen_random_uuid() primary key,
  center_id   uuid references public.centers(id) on delete cascade,
  name        text not null,
  description text,
  config      jsonb not null,
  is_global   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Snapshot konfiguracji punktacji uĹĽytej w lidze
create table public.scoring_configs (
  id          uuid default gen_random_uuid() primary key,
  league_id   uuid references public.leagues(id) on delete cascade unique not null,
  template_id uuid references public.scoring_templates(id),
  config      jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Dodanie FK z leagues do scoring_configs
alter table public.leagues
  add constraint leagues_scoring_config_fk
  foreign key (scoring_config_id)
  references public.scoring_configs(id) deferrable initially deferred;

-- ============================================================
-- SEKCJA 6: TURNIEJE
-- ============================================================

create table public.tournaments (
  id             uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  season_id      uuid references public.seasons(id) on delete set null,
  name           text not null,
  format         text not null check (format in ('single_elimination','double_elimination','groups_bracket')),
  seeding_type   text not null default 'manual'
    check (seeding_type in ('league_position','ranking','manual','random')),
  config         jsonb not null default '{}'::jsonb,
  status         text not null default 'draft' check (status in ('draft','active','finished')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Sloty drabinki turniejowej
create table public.tournament_slots (
  id            uuid default gen_random_uuid() primary key,
  tournament_id uuid references public.tournaments(id) on delete cascade not null,
  round         integer not null,
  position      integer not null,
  profile_id    uuid references public.profiles(id),
  match_id      uuid references public.matches(id),
  is_bye        boolean not null default false,
  unique (tournament_id, round, position)
);

-- Dodanie FK z matches do tournament / ladder (deferrable, bo FK jest cykliczne)
alter table public.matches
  add constraint matches_tournament_fk
  foreign key (tournament_id) references public.tournaments(id) on delete cascade deferrable initially deferred;

-- ============================================================
-- SEKCJA 7: DRABINKA CHALLENGE
-- ============================================================

create table public.ladders (
  id             uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade not null,
  name           text not null,
  -- Parametry (wartoĹ›ci domyĹ›lne per specyfikacja sekcja 10)
  max_challenge_distance  integer not null default 2,
  challenge_deadline_days integer not null default 7,
  protection_days         integer not null default 3,
  status         text not null default 'active' check (status in ('active','paused','finished')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.ladder_positions (
  id                  uuid default gen_random_uuid() primary key,
  ladder_id           uuid references public.ladders(id) on delete cascade not null,
  profile_id          uuid references public.profiles(id) on delete cascade not null,
  position            integer not null,
  previous_position   integer,
  position_changed_at timestamptz not null default now(),
  protected_until     timestamptz,
  unique (ladder_id, profile_id)
);

-- Historia zmian pozycji (dla wykresu)
create table public.ladder_position_history (
  id          uuid default gen_random_uuid() primary key,
  ladder_id   uuid references public.ladders(id) on delete cascade not null,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  position    integer not null,
  recorded_at timestamptz not null default now()
);

create table public.challenges (
  id            uuid default gen_random_uuid() primary key,
  ladder_id     uuid references public.ladders(id) on delete cascade not null,
  challenger_id uuid references public.profiles(id) on delete cascade not null,
  challenged_id uuid references public.profiles(id) on delete cascade not null,
  match_id      uuid references public.matches(id),
  status        text not null default 'pending'
    check (status in ('pending','accepted','declined','played','walkover')),
  deadline      date not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.matches
  add constraint matches_ladder_fk
  foreign key (ladder_id) references public.ladders(id) on delete cascade deferrable initially deferred;

-- ============================================================
-- SEKCJA 8: ZAPROSZENIA
-- ============================================================

create table public.invitation_tokens (
  id             uuid default gen_random_uuid() primary key,
  competition_id uuid references public.competitions(id) on delete cascade,
  center_id      uuid references public.centers(id) on delete cascade,
  -- Typ: link (bez e-mail), email (konkretna osoba), code (krĂłtki kod)
  type           text not null check (type in ('link','email','code')),
  code           text unique not null,
  email          text,
  used_by        uuid references public.profiles(id),
  used_at        timestamptz,
  expires_at     timestamptz,
  max_uses       integer,
  use_count      integer not null default 0,
  created_by     uuid references public.profiles(id) not null,
  created_at     timestamptz not null default now()
);

-- Dodanie FK z competition_players do invitation_tokens
alter table public.competition_players
  add constraint competition_players_token_fk
  foreign key (invitation_token_id) references public.invitation_tokens(id);

-- ============================================================
-- SEKCJA 9: PĹATNOĹšCI
-- ============================================================

-- PĹ‚atnoĹ›ci online (HotPay)
create table public.payments (
  id                      uuid default gen_random_uuid() primary key,
  competition_player_id   uuid references public.competition_players(id) on delete restrict not null,
  amount                  numeric(10,2) not null,
  currency                text not null default 'PLN',
  provider                text not null default 'hotpay',
  provider_transaction_id text unique,
  status                  text not null
    check (status in ('pending','completed','failed','refunded')),
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Ewidencja rÄ™czna (gotĂłwka / przelew odnotowany przez centrum)
create table public.payment_ledger (
  id                    uuid default gen_random_uuid() primary key,
  competition_player_id uuid references public.competition_players(id) on delete restrict not null,
  amount                numeric(10,2) not null,
  type                  text not null check (type in ('entry_fee','refund','adjustment')),
  notes                 text,
  recorded_by           uuid references public.profiles(id) not null,
  recorded_at           timestamptz not null default now()
);

-- ============================================================
-- SEKCJA 10: ABONAMENTY
-- ============================================================

-- Plany (konfigurowane przez super-admina)
create table public.plans (
  id                      uuid default gen_random_uuid() primary key,
  name                    text not null unique,
  max_active_competitions integer,
  max_players             integer,
  sms_enabled             boolean not null default false,
  custom_branding         boolean not null default false,
  price_monthly           numeric(10,2),
  is_active               boolean not null default true,
  created_at              timestamptz not null default now()
);

-- Abonamenty centrĂłw
create table public.subscriptions (
  id          uuid default gen_random_uuid() primary key,
  center_id   uuid references public.centers(id) on delete cascade unique not null,
  plan_id     uuid references public.plans(id) not null,
  status      text not null check (status in ('active','cancelled','expired','trial')),
  started_at  timestamptz not null default now(),
  expires_at  timestamptz,
  cancelled_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SEKCJA 11: POWIADOMIENIA
-- ============================================================

create table public.notifications (
  id          uuid default gen_random_uuid() primary key,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  type        text not null,
  channel     text not null check (channel in ('in_app','email','push','sms')),
  title       text not null,
  body        text,
  data        jsonb,
  status      text not null default 'pending' check (status in ('pending','sent','failed')),
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create table public.notification_preferences (
  id          uuid default gen_random_uuid() primary key,
  profile_id  uuid references public.profiles(id) on delete cascade not null,
  event_type  text not null,
  channel     text not null check (channel in ('in_app','email','push','sms')),
  enabled     boolean not null default true,
  unique (profile_id, event_type, channel)
);

-- ============================================================
-- SEKCJA 12: LOG AUDYTOWY
-- ============================================================

create table public.audit_log (
  id               uuid default gen_random_uuid() primary key,
  actor_id         uuid references public.profiles(id) on delete set null,
  impersonated_id  uuid references public.profiles(id) on delete set null,
  action           text not null,
  entity_type      text,
  entity_id        uuid,
  old_data         jsonb,
  new_data         jsonb,
  ip_address       text,
  session_id       text,
  created_at       timestamptz not null default now()
);

-- ============================================================
-- SEKCJA 13: FUNKCJE POMOCNICZE (public schema)
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_center_member(p_center_id uuid)
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.centers
    where id = p_center_id and profile_id = auth.uid()
  ) or exists (
    select 1 from public.center_members
    where center_id = p_center_id
      and profile_id = auth.uid()
      and accepted_at is not null
  );
$$;

-- ============================================================
-- SEKCJA 14: ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles                  enable row level security;
alter table public.centers                   enable row level security;
alter table public.center_members            enable row level security;
alter table public.players                   enable row level security;
alter table public.competitions              enable row level security;
alter table public.competition_players       enable row level security;
alter table public.seasons                   enable row level security;
alter table public.leagues                   enable row level security;
alter table public.league_players            enable row level security;
alter table public.rounds                    enable row level security;
alter table public.matches                   enable row level security;
alter table public.match_sets                enable row level security;
alter table public.match_events              enable row level security;
alter table public.scoring_templates         enable row level security;
alter table public.scoring_configs           enable row level security;
alter table public.tournaments               enable row level security;
alter table public.tournament_slots          enable row level security;
alter table public.ladders                   enable row level security;
alter table public.ladder_positions          enable row level security;
alter table public.ladder_position_history   enable row level security;
alter table public.challenges                enable row level security;
alter table public.invitation_tokens         enable row level security;
alter table public.payments                  enable row level security;
alter table public.payment_ledger            enable row level security;
alter table public.plans                     enable row level security;
alter table public.subscriptions             enable row level security;
alter table public.notifications             enable row level security;
alter table public.notification_preferences  enable row level security;
alter table public.audit_log                 enable row level security;

-- PROFILES
create policy "profiles: own read"
  on public.profiles for select
  using (auth.uid() = id or public.is_admin());

create policy "profiles: own insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles: own update"
  on public.profiles for update
  using (auth.uid() = id or public.is_admin());

-- CENTERS
create policy "centers: public read"
  on public.centers for select
  using (is_active = true or auth.uid() = profile_id or public.is_admin());

create policy "centers: own insert"
  on public.centers for insert
  with check (profile_id = auth.uid());

create policy "centers: own update"
  on public.centers for update
  using (profile_id = auth.uid() or public.is_admin());

create policy "centers: admin delete"
  on public.centers for delete
  using (public.is_admin());

-- CENTER MEMBERS
create policy "center_members: center read"
  on public.center_members for select
  using (public.is_center_member(center_id) or public.is_admin());

create policy "center_members: center write"
  on public.center_members for all
  using (
    exists (select 1 from public.centers where id = center_id and profile_id = auth.uid())
    or public.is_admin()
  );

-- PLAYERS
create policy "players: public read"
  on public.players for select using (true);

create policy "players: own insert"
  on public.players for insert
  with check (profile_id = auth.uid());

create policy "players: own update"
  on public.players for update
  using (profile_id = auth.uid() or public.is_admin());

-- COMPETITIONS
create policy "competitions: readable"
  on public.competitions for select
  using (
    visibility = 'public'
    or public.is_center_member(center_id)
    or public.is_admin()
    or exists (
      select 1 from public.competition_players cp
      where cp.competition_id = id and cp.profile_id = auth.uid()
    )
  );

create policy "competitions: center write"
  on public.competitions for all
  using (public.is_center_member(center_id) or public.is_admin());

-- COMPETITION PLAYERS
create policy "competition_players: readable"
  on public.competition_players for select
  using (
    profile_id = auth.uid()
    or public.is_center_member(
      (select center_id from public.competitions where id = competition_id)
    )
    or public.is_admin()
  );

create policy "competition_players: self insert"
  on public.competition_players for insert
  with check (profile_id = auth.uid());

create policy "competition_players: center update"
  on public.competition_players for update
  using (
    public.is_center_member(
      (select center_id from public.competitions where id = competition_id)
    )
    or profile_id = auth.uid()
    or public.is_admin()
  );

-- SEASONS
create policy "seasons: readable"
  on public.seasons for select
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and (
          c.visibility = 'public'
          or public.is_center_member(c.center_id)
          or public.is_admin()
          or exists (
            select 1 from public.competition_players cp
            where cp.competition_id = c.id and cp.profile_id = auth.uid()
          )
        )
    )
  );

create policy "seasons: center write"
  on public.seasons for all
  using (
    public.is_center_member(
      (select center_id from public.competitions where id = competition_id)
    )
    or public.is_admin()
  );

-- LEAGUES
create policy "leagues: readable"
  on public.leagues for select
  using (
    exists (
      select 1 from public.seasons s
      join public.competitions c on c.id = s.competition_id
      where s.id = season_id
        and (
          c.visibility = 'public'
          or public.is_center_member(c.center_id)
          or public.is_admin()
          or exists (
            select 1 from public.competition_players cp
            where cp.competition_id = c.id and cp.profile_id = auth.uid()
          )
        )
    )
  );

create policy "leagues: center write"
  on public.leagues for all
  using (
    public.is_center_member(
      (select c.center_id
       from public.seasons s
       join public.competitions c on c.id = s.competition_id
       where s.id = season_id)
    )
    or public.is_admin()
  );

-- LEAGUE PLAYERS
create policy "league_players: readable"
  on public.league_players for select
  using (
    profile_id = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    )
    or exists (
      select 1 from public.leagues l
      join public.seasons s on s.id = l.season_id
      join public.competitions c on c.id = s.competition_id
      where l.id = league_id and c.visibility = 'public'
    )
  );

create policy "league_players: center write"
  on public.league_players for all
  using (
    public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    )
    or public.is_admin()
  );

-- ROUNDS
create policy "rounds: readable"
  on public.rounds for select using (true);

create policy "rounds: center write"
  on public.rounds for all
  using (
    public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    )
    or public.is_admin()
  );

-- MATCHES
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
  );

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
  );

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
  );

-- MATCH SETS
create policy "match_sets: public read"
  on public.match_sets for select using (true);

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
        )
    )
  );

-- MATCH EVENTS
create policy "match_events: public read"
  on public.match_events for select using (true);

create policy "match_events: authenticated insert"
  on public.match_events for insert
  with check (auth.uid() is not null);

-- SCORING TEMPLATES
create policy "scoring_templates: readable"
  on public.scoring_templates for select
  using (
    is_global = true
    or center_id is null
    or public.is_center_member(center_id)
    or public.is_admin()
  );

create policy "scoring_templates: write"
  on public.scoring_templates for all
  using (
    (center_id is not null and public.is_center_member(center_id))
    or public.is_admin()
  );

-- SCORING CONFIGS
create policy "scoring_configs: public read"
  on public.scoring_configs for select using (true);

create policy "scoring_configs: center write"
  on public.scoring_configs for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select c.center_id
       from public.leagues l
       join public.seasons s on s.id = l.season_id
       join public.competitions c on c.id = s.competition_id
       where l.id = league_id)
    )
  );

-- TOURNAMENTS
create policy "tournaments: readable"
  on public.tournaments for select
  using (
    exists (
      select 1 from public.competitions c
      where c.id = competition_id
        and (c.visibility = 'public' or public.is_center_member(c.center_id) or public.is_admin())
    )
  );

create policy "tournaments: center write"
  on public.tournaments for all
  using (
    public.is_center_member(competition_id) or public.is_admin()
  );

-- TOURNAMENT SLOTS
create policy "tournament_slots: public read"
  on public.tournament_slots for select using (true);

create policy "tournament_slots: center write"
  on public.tournament_slots for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select competition_id from public.tournaments where id = tournament_id)
    )
  );

-- LADDERS
create policy "ladders: public read"
  on public.ladders for select using (true);

create policy "ladders: center write"
  on public.ladders for all
  using (public.is_center_member(competition_id) or public.is_admin());

-- LADDER POSITIONS
create policy "ladder_positions: public read"
  on public.ladder_positions for select using (true);

create policy "ladder_positions: center write"
  on public.ladder_positions for all
  using (
    public.is_admin()
    or public.is_center_member(
      (select competition_id from public.ladders where id = ladder_id)
    )
  );

-- LADDER POSITION HISTORY
create policy "ladder_position_history: public read"
  on public.ladder_position_history for select using (true);

create policy "ladder_position_history: authenticated insert"
  on public.ladder_position_history for insert
  with check (auth.uid() is not null);

-- CHALLENGES
create policy "challenges: readable"
  on public.challenges for select
  using (
    challenger_id = auth.uid()
    or challenged_id = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      (select competition_id from public.ladders where id = ladder_id)
    )
  );

create policy "challenges: challenger insert"
  on public.challenges for insert
  with check (challenger_id = auth.uid());

create policy "challenges: player or center update"
  on public.challenges for update
  using (
    challenger_id = auth.uid()
    or challenged_id = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      (select competition_id from public.ladders where id = ladder_id)
    )
  );

-- INVITATION TOKENS
create policy "invitation_tokens: center read"
  on public.invitation_tokens for select
  using (
    created_by = auth.uid()
    or public.is_admin()
    or public.is_center_member(
      coalesce(center_id, (select center_id from public.competitions where id = competition_id))
    )
  );

create policy "invitation_tokens: center insert"
  on public.invitation_tokens for insert
  with check (
    created_by = auth.uid()
    and (
      (center_id is not null and public.is_center_member(center_id))
      or (competition_id is not null and public.is_center_member(
        (select center_id from public.competitions where id = competition_id)
      ))
    )
  );

-- PAYMENTS
create policy "payments: readable"
  on public.payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.competition_players cp
      where cp.id = competition_player_id and cp.profile_id = auth.uid()
    )
    or public.is_center_member(
      (select c.center_id
       from public.competition_players cp
       join public.competitions c on c.id = cp.competition_id
       where cp.id = competition_player_id)
    )
  );

-- PAYMENT LEDGER
create policy "payment_ledger: center write"
  on public.payment_ledger for all
  using (public.is_admin() or recorded_by = auth.uid());

create policy "payment_ledger: player read"
  on public.payment_ledger for select
  using (
    exists (
      select 1 from public.competition_players cp
      where cp.id = competition_player_id and cp.profile_id = auth.uid()
    )
    or public.is_admin()
  );

-- PLANS
create policy "plans: public read"
  on public.plans for select using (true);

create policy "plans: admin write"
  on public.plans for all using (public.is_admin());

-- SUBSCRIPTIONS
create policy "subscriptions: center read"
  on public.subscriptions for select
  using (public.is_center_member(center_id) or public.is_admin());

create policy "subscriptions: admin write"
  on public.subscriptions for all using (public.is_admin());

-- NOTIFICATIONS
create policy "notifications: own read"
  on public.notifications for select
  using (profile_id = auth.uid() or public.is_admin());

create policy "notifications: system insert"
  on public.notifications for insert
  with check (auth.uid() is not null);

create policy "notifications: own update"
  on public.notifications for update
  using (profile_id = auth.uid());

-- NOTIFICATION PREFERENCES
create policy "notification_preferences: own"
  on public.notification_preferences for all
  using (profile_id = auth.uid() or public.is_admin());

-- AUDIT LOG
create policy "audit_log: admin read"
  on public.audit_log for select using (public.is_admin());

create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  with check (auth.uid() is not null);

-- ============================================================
-- SEKCJA 15: INDEKSY
-- ============================================================

create index idx_competitions_center      on public.competitions(center_id);
create index idx_seasons_competition      on public.seasons(competition_id);
create index idx_leagues_season           on public.leagues(season_id);
create index idx_league_players_league    on public.league_players(league_id);
create index idx_league_players_profile   on public.league_players(profile_id);
create index idx_competition_players_comp on public.competition_players(competition_id);
create index idx_competition_players_prof on public.competition_players(profile_id);
create index idx_matches_league           on public.matches(league_id);
create index idx_matches_players          on public.matches(player_a_id, player_b_id);
create index idx_matches_status           on public.matches(status);
create index idx_match_sets_match         on public.match_sets(match_id);
create index idx_notifications_profile    on public.notifications(profile_id, read_at);
create index idx_audit_log_actor          on public.audit_log(actor_id, created_at);
create index idx_invitation_tokens_code   on public.invitation_tokens(code);
create index idx_ladder_positions_ladder  on public.ladder_positions(ladder_id, position);

-- ============================================================
-- SEKCJA 16: DANE DOMYĹšLNE
-- ============================================================

-- Globalny szablon punktacji "Standard" (per specyfikacja sekcja 21)
insert into public.scoring_templates (name, description, config, is_global, center_id)
values (
  'Standard',
  'DomyĹ›lny szablon: 3:0=5 pkt, 3:1=4, 3:2=3, 2:3=2, 1:3=1, 0:3=0',
  '{
    "win_by_sets":  {"3:0": 5, "3:1": 4, "3:2": 3},
    "loss_by_sets": {"0:3": 0, "1:3": 1, "2:3": 2},
    "set_point":    {"enabled": false, "value": 0},
    "participation_point": {"enabled": false, "value": 0},
    "walkover":     {"winner": 5, "loser": 0},
    "not_played":   {"a": 0, "b": 0},
    "tiebreaker":   ["points", "head_to_head", "set_ratio", "small_points", "matches_played"]
  }'::jsonb,
  true,
  null
);

-- Plany abonamentĂłw (per specyfikacja sekcja 16.2, propozycja freemium)
insert into public.plans (name, max_active_competitions, max_players, sms_enabled, custom_branding, price_monthly)
values
  ('Darmowy', 1, 20, false, false, 0.00),
  ('Pro',     null, null, true, true, null); -- cena do decyzji biznesowej


