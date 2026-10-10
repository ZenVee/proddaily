export type AppRole = 'developer' | 'manager' | 'staff' | 'user';
export type WordlePuzzleStatus = 'draft' | 'scheduled' | 'published' | 'completed';
export type WordleAttemptStatus = 'in_progress' | 'won' | 'lost';
export type CrosswordDifficultyDb = 'easy' | 'medium' | 'hard';
export type CrosswordPuzzleStatusDb = 'draft' | 'published';
export type CrosswordProgressStatus = 'in_progress' | 'completed' | 'abandoned';
export type AuditResult = 'success' | 'failure' | 'rejected';

export interface ProfileRow {
  id: string;
  discord_id: string | null;
  discord_username: string | null;
  discord_avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  state_id: string | null;
  custom_avatar_path: string | null;
  role_id: string;
  profile_setup_complete: boolean;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoleRow {
  id: string;
  key: AppRole;
  label: string;
  description: string;
}

export interface PermissionRow {
  id: string;
  key: string;
  category: string;
  description: string;
}

export interface RolePermissionRow {
  role_id: string;
  permission_id: string;
}

export interface WordleStatsRow {
  user_id: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  current_streak: number;
  longest_streak: number;
  total_guesses: number;
  guess_distribution: number[];
  last_played_date: string | null;
  last_won_date: string | null;
}

export interface CrosswordStatsRow {
  user_id: string;
  started: number;
  completed: number;
  clean_completions: number;
  assisted_completions: number;
  total_active_seconds: number;
  fastest_seconds: number | null;
  hints_used: number;
  reveals_used: number;
  checks_used: number;
  last_played_at: string | null;
}

export interface AuditLogRow {
  id: string;
  actor_id: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  previous_values: Record<string, unknown> | null;
  updated_values: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  request_id: string | null;
  ip_address: string | null;
  result: AuditResult;
  created_at: string;
}

export interface GameplayActivityRow {
  id: string;
  user_id: string;
  event_type: string;
  game_type: 'wordle' | 'crossword';
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow>; Update: Partial<ProfileRow> };
      roles: { Row: RoleRow; Insert: Partial<RoleRow>; Update: Partial<RoleRow> };
      permissions: { Row: PermissionRow; Insert: Partial<PermissionRow>; Update: Partial<PermissionRow> };
      role_permissions: {
        Row: RolePermissionRow;
        Insert: RolePermissionRow;
        Update: Partial<RolePermissionRow>;
      };
      wordle_stats: { Row: WordleStatsRow; Insert: Partial<WordleStatsRow>; Update: Partial<WordleStatsRow> };
      crossword_stats: { Row: CrosswordStatsRow; Insert: Partial<CrosswordStatsRow>; Update: Partial<CrosswordStatsRow> };
      audit_logs: { Row: AuditLogRow; Insert: Partial<AuditLogRow>; Update: Partial<AuditLogRow> };
      gameplay_activity: {
        Row: GameplayActivityRow;
        Insert: Partial<GameplayActivityRow>;
        Update: Partial<GameplayActivityRow>;
      };
      app_settings: {
        Row: { key: string; value: unknown; updated_by: string | null; updated_at: string };
        Insert: { key: string; value: unknown; updated_by?: string | null };
        Update: { value?: unknown; updated_by?: string | null };
      };
    };
    Functions: {
      has_permission: { Args: { perm_key: string }; Returns: boolean };
      is_staff_role: { Args: Record<string, never>; Returns: boolean };
      get_my_role_key: { Args: Record<string, never>; Returns: AppRole };
      complete_profile_setup: {
        Args: { p_first_name: string; p_last_name: string; p_state_id: string; p_nickname?: string | null };
        Returns: ProfileRow;
      };
      update_own_profile: {
        Args: { p_first_name: string; p_last_name: string; p_state_id: string; p_nickname?: string | null };
        Returns: ProfileRow;
      };
      get_public_profile: { Args: { p_user_id: string }; Returns: unknown };
      get_public_profile_by_ref: { Args: { p_ref: string }; Returns: unknown };
      admin_set_user_role: { Args: { p_user_id: string; p_role: AppRole }; Returns: ProfileRow };
      admin_list_user_game_history: { Args: { p_user_id: string }; Returns: unknown };
      admin_reset_user_stats: {
        Args: {
          p_user_id: string;
          p_scope: string;
          p_puzzle_date?: string | null;
          p_word?: string | null;
          p_puzzle_id?: string | null;
        };
        Returns: unknown;
      };
      get_active_wordle_puzzle: { Args: Record<string, never>; Returns: unknown };
      submit_wordle_guess: { Args: { p_guess: string }; Returns: unknown };
      is_allowed_wordle_word: { Args: { p_word: string }; Returns: boolean };
      admin_search_wordle_words: {
        Args: { p_query?: string; p_limit?: number; p_offset?: number };
        Returns: { total: number; words: string[] };
      };
      admin_add_wordle_word: { Args: { p_word: string }; Returns: undefined };
      admin_add_wordle_words: {
        Args: { p_words: string[] };
        Returns: {
          added: number;
          skipped: number;
          invalid: number;
          invalid_sample: string[];
        };
      };
      admin_remove_wordle_word: { Args: { p_word: string }; Returns: undefined };
      get_published_crosswords: { Args: Record<string, never>; Returns: unknown };
      get_crossword_for_play: { Args: { p_puzzle_id: string }; Returns: unknown };
      save_crossword_progress: {
        Args: {
          p_puzzle_id: string;
          p_entered_letters: unknown;
          p_active_seconds?: number;
          p_hints_used?: number;
          p_reveals_used?: number;
          p_checks_used?: number;
        };
        Returns: unknown;
      };
      complete_crossword: {
        Args: { p_puzzle_id: string; p_entered_letters: unknown; p_active_seconds?: number };
        Returns: unknown;
      };
    };
  };
};
