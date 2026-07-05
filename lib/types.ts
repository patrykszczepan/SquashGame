// ============================================================
// Domain types — mirror of Supabase schema
// ============================================================

export type Role = "admin" | "center" | "player"
export type CompetitionVisibility = "public" | "private" | "mixed"
export type SeasonStatus = "draft" | "active" | "finished"
export type MatchStatus =
  | "scheduled"
  | "pending_confirmation"
  | "finished"
  | "walkover"
  | "not_played"
  | "postponed"
export type InvitationTokenType = "link" | "email" | "code"
export type PaymentStatus = "none" | "pending" | "paid" | "overdue"
export type TiebreakerCriterion =
  | "points"
  | "head_to_head"
  | "set_ratio"
  | "small_points"
  | "matches_played"

export interface MatchFormat {
  type: "race_to"
  sets_to_win: number // first player to win this many sets wins the match
}

export interface ScoringConfig {
  win_by_sets: Record<string, number>  // "W:L" → winner points
  loss_by_sets: Record<string, number> // "L:W" → loser points
  set_point: { enabled: boolean; value: number }
  participation_point: { enabled: boolean; value: number }
  walkover: { winner: number; loser: number }
  not_played: { a: number; b: number }
  tiebreaker: TiebreakerCriterion[]
}

// Season-level scoring config (user-facing format)
export interface SimpleSeasonScoring {
  type: "simple"
  win: number
  loss: number
}

export interface AdvancedSeasonScoring {
  type: "advanced"
  results: Record<string, [number, number]> // "W:L" → [winner_pts, loser_pts]
}

export type SeasonScoringConfig = SimpleSeasonScoring | AdvancedSeasonScoring

export function defaultAdvancedResults(setsToWin: number): Record<string, [number, number]> {
  const results: Record<string, [number, number]> = {}
  for (let loser = 0; loser < setsToWin; loser++) {
    results[`${setsToWin}:${loser}`] = [setsToWin * 2 - loser, loser]
  }
  return results
}

export function buildLeagueScoringConfig(setsToWin: number, config: SeasonScoringConfig): ScoringConfig {
  const win_by_sets: Record<string, number> = {}
  const loss_by_sets: Record<string, number> = {}

  if (config.type === "simple") {
    for (let loser = 0; loser < setsToWin; loser++) {
      win_by_sets[`${setsToWin}:${loser}`] = config.win
      loss_by_sets[`${loser}:${setsToWin}`] = config.loss
    }
  } else {
    for (const [key, [winnerPts, loserPts]] of Object.entries(config.results)) {
      const parts = key.split(":")
      win_by_sets[key] = winnerPts
      loss_by_sets[`${parts[1]}:${parts[0]}`] = loserPts
    }
  }

  const maxWinPts = Math.max(...Object.values(win_by_sets), 0)

  return {
    win_by_sets,
    loss_by_sets,
    set_point: { enabled: false, value: 0 },
    participation_point: { enabled: false, value: 0 },
    walkover: { winner: maxWinPts, loser: 0 },
    not_played: { a: 0, b: 0 },
    tiebreaker: ["points", "head_to_head", "set_ratio", "small_points", "matches_played"],
  }
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = buildLeagueScoringConfig(3, {
  type: "advanced",
  results: { "3:0": [6, 0], "3:1": [5, 1], "3:2": [4, 2] },
})

export const DEFAULT_MATCH_FORMAT: MatchFormat = { type: "race_to", sets_to_win: 3 }

export interface Profile {
  id: string
  role: Role
  phone?: string
  avatar_url?: string
  consent_contact_share: boolean
  created_at: string
  updated_at: string
}

export interface Center {
  id: string
  profile_id: string
  name: string
  slug?: string
  address?: string
  postal_code?: string
  city?: string
  phone?: string
  email?: string
  nip?: string
  description?: string
  logo_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Player {
  id: string
  profile_id: string
  first_name: string
  last_name: string
  phone?: string
  avatar_url?: string
  contact_share_phone: boolean
  contact_share_email: boolean
  created_at: string
  updated_at: string
}

export interface Competition {
  id: string
  center_id: string
  name: string
  slug: string
  description?: string
  visibility: CompetitionVisibility
  entry_fee_enabled: boolean
  entry_fee_amount?: number
  entry_fee_currency: string
  payment_block_mode: "hard" | "soft"
  default_match_format: MatchFormat
  default_schedule_mode: "center" | "self"
  default_result_confirm_days: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompetitionPlayer {
  id: string
  competition_id: string
  profile_id: string
  invitation_status: "pending" | "accepted" | "declined"
  invited_at: string
  accepted_at?: string
  payment_status: PaymentStatus
  players?: Player
  profiles?: Profile
}

export interface Season {
  id: string
  competition_id: string
  name: string
  status: SeasonStatus
  start_date?: string
  end_date?: string
  default_promotions: number
  default_demotions: number
  default_round_robin_mode: "single" | "double"
  sets_to_win: number
  scoring_type: "simple" | "advanced"
  default_scoring_config: SeasonScoringConfig | null
  created_at: string
  updated_at: string
}

export interface League {
  id: string
  season_id: string
  name: string
  level: number
  match_format: MatchFormat
  schedule_mode: "center" | "self"
  round_robin_mode: "single" | "double"
  scoring_config_id?: string
  promotions?: number
  demotions?: number
  result_confirm_days: number
  created_at: string
  updated_at: string
}

export interface LeaguePlayer {
  id: string
  league_id: string
  profile_id: string
  position?: number
  confirmed_participation?: boolean
  players?: Player
}

export interface Round {
  id: string
  league_id: string
  name: string
  number: number
  deadline?: string
  created_at: string
}

export interface Match {
  id: string
  league_id?: string
  tournament_id?: string
  ladder_id?: string
  round_id?: string
  player_a_id: string
  player_b_id: string
  status: MatchStatus
  winner_id?: string
  result_source?: "player" | "center"
  submitted_by?: string
  submitted_at?: string
  confirmed_by?: string
  confirmed_at?: string
  disputed_by?: string
  auto_confirm_at?: string
  format_override?: MatchFormat
  scheduled_at?: string
  walkover_type?: "no_show" | "withdrawal" | "disqualification"
  walkover_for_id?: string
  created_at: string
  updated_at: string
  match_sets?: MatchSet[]
  // Joined data
  player_a?: Player
  player_b?: Player
  rounds?: Round
}

export interface MatchSet {
  id: string
  match_id: string
  set_number: number
  points_a: number
  points_b: number
}

export interface InvitationToken {
  id: string
  competition_id?: string
  center_id?: string
  type: InvitationTokenType
  code: string
  email?: string
  used_by?: string
  used_at?: string
  expires_at?: string
  max_uses?: number
  use_count: number
  created_by: string
  created_at: string
}

// ============================================================
// View / computed types
// ============================================================

export interface TableRow {
  profile_id: string
  player_name: string
  played: number
  won: number
  lost: number
  points: number
  sets_won: number
  sets_lost: number
  small_points_won: number
  small_points_lost: number
}

export interface LeagueWithPlayers extends League {
  league_players: Array<LeaguePlayer & { players: Player }>
}

export interface Notification {
  id: string
  profile_id: string
  type: string
  channel: string
  title: string
  body?: string
  data?: Record<string, unknown>
  status: "pending" | "sent" | "failed"
  read_at?: string
  created_at: string
}
