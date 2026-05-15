export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      battle_royale_players: {
        Row: {
          alive: boolean
          answers: Json
          display_name: string
          eliminated_at_question: number | null
          id: string
          joined_at: string
          room_id: string
          score: number
          user_id: string
        }
        Insert: {
          alive?: boolean
          answers?: Json
          display_name?: string
          eliminated_at_question?: number | null
          id?: string
          joined_at?: string
          room_id: string
          score?: number
          user_id: string
        }
        Update: {
          alive?: boolean
          answers?: Json
          display_name?: string
          eliminated_at_question?: number | null
          id?: string
          joined_at?: string
          room_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_royale_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "battle_royale_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_royale_rooms: {
        Row: {
          code: string
          created_at: string
          current_question: number
          host_id: string
          id: string
          max_players: number
          question_ids: Json
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_question?: number
          host_id: string
          id?: string
          max_players?: number
          question_ids?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_question?: number
          host_id?: string
          id?: string
          max_players?: number
          question_ids?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      battles: {
        Row: {
          code: string
          created_at: string
          current_question: number
          id: string
          player1_answers: Json
          player1_name: string
          player1_score: number
          player2_answers: Json
          player2_name: string | null
          player2_score: number
          question_ids: Json
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_question?: number
          id?: string
          player1_answers?: Json
          player1_name: string
          player1_score?: number
          player2_answers?: Json
          player2_name?: string | null
          player2_score?: number
          question_ids?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_question?: number
          id?: string
          player1_answers?: Json
          player1_name?: string
          player1_score?: number
          player2_answers?: Json
          player2_name?: string | null
          player2_score?: number
          question_ids?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      championship_scores: {
        Row: {
          championship_id: string
          correct_answers: number
          display_name: string
          id: string
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          championship_id: string
          correct_answers?: number
          display_name?: string
          id?: string
          points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          championship_id?: string
          correct_answers?: number
          display_name?: string
          id?: string
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "championship_scores_championship_id_fkey"
            columns: ["championship_id"]
            isOneToOne: false
            referencedRelation: "championships"
            referencedColumns: ["id"]
          },
        ]
      }
      championships: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          name: string
          prize_coins_1st: number
          prize_coins_2nd: number
          prize_coins_3rd: number
          start_date: string
        }
        Insert: {
          created_at?: string
          description?: string
          end_date: string
          id?: string
          name: string
          prize_coins_1st?: number
          prize_coins_2nd?: number
          prize_coins_3rd?: number
          start_date: string
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          name?: string
          prize_coins_1st?: number
          prize_coins_2nd?: number
          prize_coins_3rd?: number
          start_date?: string
        }
        Relationships: []
      }
      church_challenge_progress: {
        Row: {
          challenge_id: string
          church_id: string
          completed: boolean
          completed_at: string | null
          current_value: number
          id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          church_id: string
          completed?: boolean
          completed_at?: string | null
          current_value?: number
          id?: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          church_id?: string
          completed?: boolean
          completed_at?: string | null
          current_value?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "church_challenge_progress_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      church_members: {
        Row: {
          church_id: string
          id: string
          joined_at: string
          points_contributed: number
          role: string
          user_id: string
        }
        Insert: {
          church_id: string
          id?: string
          joined_at?: string
          points_contributed?: number
          role?: string
          user_id: string
        }
        Update: {
          church_id?: string
          id?: string
          joined_at?: string
          points_contributed?: number
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "church_members_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      churches: {
        Row: {
          avatar_url: string | null
          code: string
          created_at: string
          denomination: string
          description: string
          id: string
          league_tier: string
          max_members: number
          member_count: number
          name: string
          owner_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          code: string
          created_at?: string
          denomination?: string
          description?: string
          id?: string
          league_tier?: string
          max_members?: number
          member_count?: number
          name: string
          owner_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          code?: string
          created_at?: string
          denomination?: string
          description?: string
          id?: string
          league_tier?: string
          max_members?: number
          member_count?: number
          name?: string
          owner_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      clan_join_requests: {
        Row: {
          church_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          church_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          church_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_join_requests_church_id_fkey"
            columns: ["church_id"]
            isOneToOne: false
            referencedRelation: "churches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          achievements: Json
          active_title: string
          avatar_url: string | null
          best_streak: number
          coins: number
          completed_lessons: Json
          created_at: string
          current_streak: number
          display_name: string
          easy_answered: number
          easy_correct: number
          hard_answered: number
          hard_correct: number
          id: string
          last_play_date: string
          medium_answered: number
          medium_correct: number
          streak_days: number
          titles: Json
          total_answered: number
          total_correct: number
          total_points: number
          total_time_ms: number
          updated_at: string
        }
        Insert: {
          achievements?: Json
          active_title?: string
          avatar_url?: string | null
          best_streak?: number
          coins?: number
          completed_lessons?: Json
          created_at?: string
          current_streak?: number
          display_name?: string
          easy_answered?: number
          easy_correct?: number
          hard_answered?: number
          hard_correct?: number
          id: string
          last_play_date?: string
          medium_answered?: number
          medium_correct?: number
          streak_days?: number
          titles?: Json
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
          updated_at?: string
        }
        Update: {
          achievements?: Json
          active_title?: string
          avatar_url?: string | null
          best_streak?: number
          coins?: number
          completed_lessons?: Json
          created_at?: string
          current_streak?: number
          display_name?: string
          easy_answered?: number
          easy_correct?: number
          hard_answered?: number
          hard_correct?: number
          id?: string
          last_play_date?: string
          medium_answered?: number
          medium_correct?: number
          streak_days?: number
          titles?: Json
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
          updated_at?: string
        }
        Relationships: []
      }
      tournament_matches: {
        Row: {
          created_at: string
          deadline: string | null
          id: string
          match_index: number
          player1_id: string | null
          player1_name: string | null
          player1_score: number | null
          player2_id: string | null
          player2_name: string | null
          player2_score: number | null
          round: number
          status: string
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          id?: string
          match_index: number
          player1_id?: string | null
          player1_name?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_name?: string | null
          player2_score?: number | null
          round: number
          status?: string
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          id?: string
          match_index?: number
          player1_id?: string | null
          player1_name?: string | null
          player1_score?: number | null
          player2_id?: string | null
          player2_name?: string | null
          player2_score?: number | null
          round?: number
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          created_at: string
          display_name: string
          eliminated_round: number | null
          final_place: number | null
          id: string
          seed: number | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          eliminated_round?: number | null
          final_place?: number | null
          id?: string
          seed?: number | null
          tournament_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          eliminated_round?: number | null
          final_place?: number | null
          id?: string
          seed?: number | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_rewards: {
        Row: {
          coins_awarded: number
          created_at: string
          id: string
          place: number
          title: string
          tournament_id: string
          user_id: string
        }
        Insert: {
          coins_awarded?: number
          created_at?: string
          id?: string
          place: number
          title?: string
          tournament_id: string
          user_id: string
        }
        Update: {
          coins_awarded?: number
          created_at?: string
          id?: string
          place?: number
          title?: string
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_rewards_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          bracket_size: number
          created_at: string
          current_round: number
          end_date: string
          id: string
          question_ids: Json
          registration_end: string
          registration_start: string
          season_number: number
          start_date: string
          status: string
          total_rounds: number
          updated_at: string
        }
        Insert: {
          bracket_size?: number
          created_at?: string
          current_round?: number
          end_date: string
          id?: string
          question_ids?: Json
          registration_end: string
          registration_start: string
          season_number: number
          start_date: string
          status?: string
          total_rounds?: number
          updated_at?: string
        }
        Update: {
          bracket_size?: number
          created_at?: string
          current_round?: number
          end_date?: string
          id?: string
          question_ids?: Json
          registration_end?: string
          registration_start?: string
          season_number?: number
          start_date?: string
          status?: string
          total_rounds?: number
          updated_at?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          challenge_type: string
          created_at: string
          description: string
          icon: string
          id: string
          reward_coins: number
          target_value: number
          title: string
          week_end: string
          week_start: string
        }
        Insert: {
          challenge_type: string
          created_at?: string
          description: string
          icon?: string
          id?: string
          reward_coins?: number
          target_value: number
          title: string
          week_end: string
          week_start: string
        }
        Update: {
          challenge_type?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          reward_coins?: number
          target_value?: number
          title?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      add_championship_points: {
        Args: { p_correct: number; p_display_name: string; p_points: number }
        Returns: undefined
      }
      advance_battle_royale: { Args: { p_room_id: string }; Returns: undefined }
      contribute_challenge_progress: {
        Args: {
          p_amount?: number
          p_challenge_type: string
          p_church_id: string
        }
        Returns: undefined
      }
      delete_clan: { Args: { p_church_id: string }; Returns: undefined }
      get_church_stats: {
        Args: { p_church_id: string }
        Returns: {
          avg_points: number
          member_count: number
          total_points: number
        }[]
      }
      get_league_tier: { Args: { p_points: number }; Returns: string }
      kick_clan_member: {
        Args: { p_church_id: string; p_target_user_id: string }
        Returns: undefined
      }
      register_tournament: {
        Args: { p_display_name: string; p_tournament_id: string }
        Returns: undefined
      }
      reject_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      set_active_title: { Args: { p_title: string }; Returns: undefined }
      set_member_role: {
        Args: { p_church_id: string; p_role: string; p_target_user_id: string }
        Returns: undefined
      }
      start_battle_royale: { Args: { p_room_id: string }; Returns: undefined }
      submit_battle_royale_answer: {
        Args: { p_answer: number; p_correct: boolean; p_room_id: string }
        Returns: undefined
      }
      submit_tournament_score: {
        Args: { p_match_id: string; p_score: number }
        Returns: undefined
      }
      transfer_clan_leadership: {
        Args: { p_church_id: string; p_new_leader_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
