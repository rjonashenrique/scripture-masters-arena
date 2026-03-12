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
          user_id: string
        }
        Insert: {
          church_id: string
          id?: string
          joined_at?: string
          points_contributed?: number
          user_id: string
        }
        Update: {
          church_id?: string
          id?: string
          joined_at?: string
          points_contributed?: number
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
          code: string
          created_at: string
          denomination: string
          id: string
          member_count: number
          name: string
          owner_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          denomination?: string
          id?: string
          member_count?: number
          name: string
          owner_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          denomination?: string
          id?: string
          member_count?: number
          name?: string
          owner_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json
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
          total_answered: number
          total_correct: number
          total_points: number
          total_time_ms: number
          updated_at: string
        }
        Insert: {
          achievements?: Json
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
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
          updated_at?: string
        }
        Update: {
          achievements?: Json
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
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
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
      contribute_challenge_progress: {
        Args: {
          p_amount?: number
          p_challenge_type: string
          p_church_id: string
        }
        Returns: undefined
      }
      get_church_stats: {
        Args: { p_church_id: string }
        Returns: {
          avg_points: number
          member_count: number
          total_points: number
        }[]
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
