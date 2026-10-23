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
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          admin_name: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          reason: string | null
        }
        Insert: {
          action: string
          admin_id: string
          admin_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          admin_name?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          reason?: string | null
        }
        Relationships: []
      }
      ai_generation_logs: {
        Row: {
          category: string | null
          created_at: string
          difficulty: string | null
          display_name: string
          id: string
          question_count: number
          source_text: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          display_name?: string
          id?: string
          question_count?: number
          source_text: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          difficulty?: string | null
          display_name?: string
          id?: string
          question_count?: number
          source_text?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          category: string
          key: string
          label: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          category?: string
          key: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          category?: string
          key?: string
          label?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
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
      challenge_contribution_log: {
        Row: {
          amount: number
          challenge_type: string
          church_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          amount: number
          challenge_type: string
          church_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          amount?: number
          challenge_type?: string
          church_id?: string
          created_at?: string
          id?: string
          user_id?: string
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
      clan_applications: {
        Row: {
          clan_id: string
          created_at: string
          display_name: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          clan_id: string
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          clan_id?: string
          created_at?: string
          display_name?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_applications_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_inventory: {
        Row: {
          acquired_at: string
          bought_by: string
          clan_id: string
          item_id: string
        }
        Insert: {
          acquired_at?: string
          bought_by: string
          clan_id: string
          item_id: string
        }
        Update: {
          acquired_at?: string
          bought_by?: string
          clan_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_inventory_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clan_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_invites: {
        Row: {
          accepted_at: string | null
          clan_id: string
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invited_by: string
          invited_by_name: string
          invited_user_id: string | null
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          clan_id: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_code: string
          invited_by: string
          invited_by_name?: string
          invited_user_id?: string | null
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          clan_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          invite_code?: string
          invited_by?: string
          invited_by_name?: string
          invited_user_id?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clan_invites_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
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
      clan_members: {
        Row: {
          clan_id: string
          display_name: string
          id: string
          joined_at: string
          role: string
          user_id: string
          xp_contributed: number
        }
        Insert: {
          clan_id: string
          display_name?: string
          id?: string
          joined_at?: string
          role?: string
          user_id: string
          xp_contributed?: number
        }
        Update: {
          clan_id?: string
          display_name?: string
          id?: string
          joined_at?: string
          role?: string
          user_id?: string
          xp_contributed?: number
        }
        Relationships: [
          {
            foreignKeyName: "clan_members_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_xp_log: {
        Row: {
          clan_id: string
          correct_answers: number
          created_at: string
          id: string
          source: string
          user_id: string
          xp: number
        }
        Insert: {
          clan_id: string
          correct_answers?: number
          created_at?: string
          id?: string
          source?: string
          user_id: string
          xp: number
        }
        Update: {
          clan_id?: string
          correct_answers?: number
          created_at?: string
          id?: string
          source?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "clan_xp_log_clan_id_fkey"
            columns: ["clan_id"]
            isOneToOne: false
            referencedRelation: "clans"
            referencedColumns: ["id"]
          },
        ]
      }
      clans: {
        Row: {
          avatar_url: string | null
          cosmetic_banner: string | null
          cosmetic_frame: string | null
          created_at: string
          deleted_at: string | null
          description: string
          emblem: string
          id: string
          invite_code: string
          is_active: boolean
          league: string
          level: number
          max_members: number
          member_count: number
          name: string
          owner_id: string
          tag: string
          updated_at: string
          visibility: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          cosmetic_banner?: string | null
          cosmetic_frame?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          emblem?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          league?: string
          level?: number
          max_members?: number
          member_count?: number
          name: string
          owner_id: string
          tag: string
          updated_at?: string
          visibility?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          cosmetic_banner?: string | null
          cosmetic_frame?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string
          emblem?: string
          id?: string
          invite_code?: string
          is_active?: boolean
          league?: string
          level?: number
          max_members?: number
          member_count?: number
          name?: string
          owner_id?: string
          tag?: string
          updated_at?: string
          visibility?: string
          xp?: number
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          balance_after: number
          created_at: string
          id: string
          reason: string
          ref: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          created_at?: string
          id?: string
          reason: string
          ref?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          created_at?: string
          id?: string
          reason?: string
          ref?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_rewards: {
        Row: {
          amount: number
          created_at: string
          day: string
          streak: number
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day: string
          streak: number
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day?: string
          streak?: number
          user_id?: string
        }
        Relationships: []
      }
      moderation_reports: {
        Row: {
          category: string
          created_at: string
          description: string
          handled_at: string | null
          handled_by: string | null
          id: string
          reporter_id: string | null
          reporter_name: string
          resolution: string
          status: string
          target_id: string | null
          target_label: string
          target_type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reporter_id?: string | null
          reporter_name?: string
          resolution?: string
          status?: string
          target_id?: string | null
          target_label?: string
          target_type: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          handled_at?: string | null
          handled_by?: string | null
          id?: string
          reporter_id?: string | null
          reporter_name?: string
          resolution?: string
          status?: string
          target_id?: string | null
          target_label?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_xp_log: {
        Row: {
          correct_answers: number
          created_at: string
          duration_ms: number
          flagged: boolean
          id: string
          source: string
          total_questions: number
          user_id: string
          xp: number
        }
        Insert: {
          correct_answers?: number
          created_at?: string
          duration_ms?: number
          flagged?: boolean
          id?: string
          source: string
          total_questions?: number
          user_id: string
          xp: number
        }
        Update: {
          correct_answers?: number
          created_at?: string
          duration_ms?: number
          flagged?: boolean
          id?: string
          source?: string
          total_questions?: number
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json
          active_title: string
          admin_note: string
          avatar_url: string | null
          best_streak: number
          coins: number
          competitive_blocked: boolean
          completed_lessons: Json
          created_at: string
          current_streak: number
          display_name: string
          easy_answered: number
          easy_correct: number
          equipped_avatar: string | null
          equipped_badge: string | null
          equipped_effect: string | null
          equipped_frame: string | null
          featured_badges: Json
          hard_answered: number
          hard_correct: number
          id: string
          last_play_date: string
          last_seen_at: string | null
          level: number
          level_reached_at: string
          medium_answered: number
          medium_correct: number
          status: string
          streak_days: number
          suspended_until: string | null
          titles: Json
          total_answered: number
          total_correct: number
          total_points: number
          total_time_ms: number
          updated_at: string
          xp: number
        }
        Insert: {
          achievements?: Json
          active_title?: string
          admin_note?: string
          avatar_url?: string | null
          best_streak?: number
          coins?: number
          competitive_blocked?: boolean
          completed_lessons?: Json
          created_at?: string
          current_streak?: number
          display_name?: string
          easy_answered?: number
          easy_correct?: number
          equipped_avatar?: string | null
          equipped_badge?: string | null
          equipped_effect?: string | null
          equipped_frame?: string | null
          featured_badges?: Json
          hard_answered?: number
          hard_correct?: number
          id: string
          last_play_date?: string
          last_seen_at?: string | null
          level?: number
          level_reached_at?: string
          medium_answered?: number
          medium_correct?: number
          status?: string
          streak_days?: number
          suspended_until?: string | null
          titles?: Json
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
          updated_at?: string
          xp?: number
        }
        Update: {
          achievements?: Json
          active_title?: string
          admin_note?: string
          avatar_url?: string | null
          best_streak?: number
          coins?: number
          competitive_blocked?: boolean
          completed_lessons?: Json
          created_at?: string
          current_streak?: number
          display_name?: string
          easy_answered?: number
          easy_correct?: number
          equipped_avatar?: string | null
          equipped_badge?: string | null
          equipped_effect?: string | null
          equipped_frame?: string | null
          featured_badges?: Json
          hard_answered?: number
          hard_correct?: number
          id?: string
          last_play_date?: string
          last_seen_at?: string | null
          level?: number
          level_reached_at?: string
          medium_answered?: number
          medium_correct?: number
          status?: string
          streak_days?: number
          suspended_until?: string | null
          titles?: Json
          total_answered?: number
          total_correct?: number
          total_points?: number
          total_time_ms?: number
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      question_categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          category: string | null
          correct_answer: number
          created_at: string
          difficulty: string | null
          explanation: string | null
          id: number
          options: Json
          question: string | null
          question_type: string
          reference: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          correct_answer: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: number
          options?: Json
          question?: string | null
          question_type?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          correct_answer?: number
          created_at?: string
          difficulty?: string | null
          explanation?: string | null
          id?: number
          options?: Json
          question?: string | null
          question_type?: string
          reference?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_bundle_items: {
        Row: {
          bundle_id: string
          item_id: string
        }
        Insert: {
          bundle_id: string
          item_id: string
        }
        Update: {
          bundle_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_bundle_items_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "shop_bundles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_bundle_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_bundles: {
        Row: {
          created_at: string
          description: string
          featured: boolean
          icon: string
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string
          featured?: boolean
          icon?: string
          id: string
          is_active?: boolean
          name: string
          price: number
        }
        Update: {
          created_at?: string
          description?: string
          featured?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      shop_collections: {
        Row: {
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          reward_item_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          icon?: string
          id: string
          name: string
          reward_item_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          reward_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shop_collections_reward_item_id_fkey"
            columns: ["reward_item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_events: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_items: {
        Row: {
          category: string
          clan_slot: string | null
          collection: string | null
          created_at: string
          description: string
          ends_at: string | null
          event_label: string
          featured: boolean
          icon: string
          id: string
          is_active: boolean
          min_level: number
          name: string
          price: number
          purchasable: boolean
          rarity: string
          requirement: string | null
          requirement_label: string
          sold_count: number
          sort_order: number
          starts_at: string | null
          stock_limit: number | null
          style: string
        }
        Insert: {
          category: string
          clan_slot?: string | null
          collection?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          event_label?: string
          featured?: boolean
          icon: string
          id: string
          is_active?: boolean
          min_level?: number
          name: string
          price: number
          purchasable?: boolean
          rarity?: string
          requirement?: string | null
          requirement_label?: string
          sold_count?: number
          sort_order?: number
          starts_at?: string | null
          stock_limit?: number | null
          style?: string
        }
        Update: {
          category?: string
          clan_slot?: string | null
          collection?: string | null
          created_at?: string
          description?: string
          ends_at?: string | null
          event_label?: string
          featured?: boolean
          icon?: string
          id?: string
          is_active?: boolean
          min_level?: number
          name?: string
          price?: number
          purchasable?: boolean
          rarity?: string
          requirement?: string | null
          requirement_label?: string
          sold_count?: number
          sort_order?: number
          starts_at?: string | null
          stock_limit?: number | null
          style?: string
        }
        Relationships: []
      }
      system_announcements: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          message: string
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          starts_at?: string
          title?: string
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
      user_favorites: {
        Row: {
          created_at: string
          item_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          item_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_favorites_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          acquired_at: string
          acquisition_source: string
          id: string
          item_id: string
          price_paid: number
          user_id: string
        }
        Insert: {
          acquired_at?: string
          acquisition_source?: string
          id?: string
          item_id: string
          price_paid?: number
          user_id: string
        }
        Update: {
          acquired_at?: string
          acquisition_source?: string
          id?: string
          item_id?: string
          price_paid?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      _grant_item: {
        Args: {
          p_item: Database["public"]["Tables"]["shop_items"]["Row"]
          p_source: string
          p_uid: string
        }
        Returns: undefined
      }
      accept_clan_application: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      accept_clan_invite: {
        Args: {
          p_code?: string
          p_display_name?: string
          p_invite_id?: string
          p_token?: string
        }
        Returns: string
      }
      accept_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      add_championship_points: {
        Args: { p_correct: number; p_display_name: string; p_points: number }
        Returns: undefined
      }
      admin_clean_clan: {
        Args: {
          p_clan_id: string
          p_clear_avatar?: boolean
          p_description?: string
          p_reason?: string
        }
        Returns: undefined
      }
      admin_dashboard: { Args: { p_days?: number }; Returns: Json }
      admin_exists: { Args: never; Returns: boolean }
      admin_list_clans: {
        Args: { p_limit?: number; p_search?: string }
        Returns: {
          avatar_url: string
          created_at: string
          description: string
          emblem: string
          id: string
          is_active: boolean
          leader_name: string
          league: string
          level: number
          max_members: number
          member_count: number
          name: string
          tag: string
          visibility: string
          xp: number
        }[]
      }
      admin_list_invites: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          clan_name: string
          clan_tag: string
          created_at: string
          expires_at: string
          id: string
          invited_by_name: string
          invited_name: string
          status: string
        }[]
      }
      admin_list_users: {
        Args: {
          p_limit?: number
          p_role?: string
          p_search?: string
          p_status?: string
        }
        Returns: {
          admin_note: string
          avatar_url: string
          clan_name: string
          clan_role: string
          coins: number
          competitive_blocked: boolean
          created_at: string
          display_name: string
          email: string
          id: string
          roles: string[]
          status: string
          streak_days: number
          suspended_until: string
          total_answered: number
          total_points: number
          updated_at: string
        }[]
      }
      admin_log: {
        Args: {
          p_action: string
          p_entity_id?: string
          p_entity_type: string
          p_new?: Json
          p_old?: Json
          p_reason?: string
        }
        Returns: undefined
      }
      admin_resolve_report: {
        Args: { p_report_id: string; p_resolution?: string; p_status: string }
        Returns: undefined
      }
      admin_set_clan_status: {
        Args: { p_active: boolean; p_clan_id: string; p_reason?: string }
        Returns: undefined
      }
      admin_set_question_status: {
        Args: { p_id: number; p_status: string }
        Returns: undefined
      }
      admin_set_role: {
        Args: { p_grant: boolean; p_role: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_setting: {
        Args: {
          p_category?: string
          p_key: string
          p_label?: string
          p_value: Json
        }
        Returns: undefined
      }
      admin_set_user_status: {
        Args: {
          p_competitive_blocked?: boolean
          p_days?: number
          p_note?: string
          p_reason?: string
          p_status: string
          p_user_id: string
        }
        Returns: undefined
      }
      admin_shop_analytics: { Args: { p_days?: number }; Returns: Json }
      admin_suspicious: {
        Args: never
        Returns: {
          accuracy: number
          display_name: string
          risk: string
          total_answered: number
          total_points: number
          user_id: string
          xp_today: number
        }[]
      }
      advance_battle_royale: { Args: { p_room_id: string }; Returns: undefined }
      award_clan_xp: {
        Args: { p_correct: number; p_source?: string; p_total: number }
        Returns: Json
      }
      award_player_xp: {
        Args: {
          p_correct: number
          p_duration_ms: number
          p_source: string
          p_total: number
        }
        Returns: Json
      }
      buy_shop_item: { Args: { p_item_id: string }; Returns: Json }
      cancel_clan_invite: { Args: { p_invite_id: string }; Returns: undefined }
      claim_admin: { Args: never; Returns: undefined }
      claim_daily_reward: { Args: never; Returns: Json }
      clan_invites_list: {
        Args: { p_clan_id: string }
        Returns: {
          accepted_at: string
          created_at: string
          expires_at: string
          id: string
          invite_code: string
          invited_by_name: string
          invited_name: string
          invited_user_id: string
          status: string
        }[]
      }
      clan_league_from_xp: { Args: { p_xp: number }; Returns: string }
      clan_level_from_xp: { Args: { p_xp: number }; Returns: number }
      clan_role_of: {
        Args: { _clan_id: string; _user_id: string }
        Returns: string
      }
      contribute_challenge_progress: {
        Args: {
          p_amount?: number
          p_challenge_type: string
          p_church_id: string
        }
        Returns: undefined
      }
      create_clan: {
        Args: {
          p_description?: string
          p_display_name?: string
          p_emblem?: string
          p_name: string
          p_tag: string
          p_visibility?: string
        }
        Returns: string
      }
      create_clan_invite: {
        Args: { p_clan_id: string; p_invited_user_id?: string }
        Returns: Json
      }
      daily_reward_status: { Args: never; Returns: Json }
      decline_clan_invite: { Args: { p_invite_id: string }; Returns: undefined }
      delete_clan: { Args: { p_church_id: string }; Returns: undefined }
      delete_clan_v2: {
        Args: { p_clan_id: string; p_confirm_name: string }
        Returns: undefined
      }
      equip_inventory_item: {
        Args: { p_equip?: boolean; p_item_id: string }
        Returns: undefined
      }
      equip_item: {
        Args: { p_category: string; p_item_id: string }
        Returns: undefined
      }
      finish_battle: { Args: { p_battle_id: string }; Returns: undefined }
      gen_invite_code: { Args: never; Returns: string }
      get_admin_metrics: { Args: never; Returns: Json }
      get_church_stats: {
        Args: { p_church_id: string }
        Returns: {
          avg_points: number
          member_count: number
          total_points: number
        }[]
      }
      get_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          active_title: string
          avatar_url: string
          best_streak: number
          display_name: string
          id: string
          total_answered: number
          total_correct: number
          total_points: number
        }[]
      }
      get_league_tier: { Args: { p_points: number }; Returns: string }
      get_xp_leaderboard: {
        Args: { p_limit?: number }
        Returns: {
          active_title: string
          avatar_url: string
          display_name: string
          id: string
          level: number
          total_answered: number
          total_correct: number
          xp: number
        }[]
      }
      has_admin_role: {
        Args: { _roles: string[]; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      join_battle: {
        Args: { p_code: string; p_player_name: string }
        Returns: string
      }
      kick_clan_member: {
        Args: { p_church_id: string; p_target_user_id: string }
        Returns: undefined
      }
      kick_clan_member_v2: {
        Args: { p_clan_id: string; p_target: string }
        Returns: undefined
      }
      leave_clan: { Args: never; Returns: undefined }
      level_milestone_coins: { Args: { p_level: number }; Returns: number }
      level_title: { Args: { p_level: number }; Returns: string }
      my_admin_roles: { Args: never; Returns: string[] }
      my_clan_id: { Args: never; Returns: string }
      my_clan_invites: {
        Args: never
        Returns: {
          clan_emblem: string
          clan_id: string
          clan_league: string
          clan_level: number
          clan_name: string
          clan_tag: string
          created_at: string
          expires_at: string
          id: string
          invited_by_name: string
          max_members: number
          member_count: number
        }[]
      }
      my_level_info: { Args: never; Returns: Json }
      player_level_info: { Args: { p_xp: number }; Returns: Json }
      player_level_name: { Args: { p_level: number }; Returns: string }
      preview_clan_invite: {
        Args: { p_code?: string; p_token?: string }
        Returns: Json
      }
      purchase_bundle: { Args: { p_bundle_id: string }; Returns: Json }
      purchase_shop_item: { Args: { p_item_id: string }; Returns: Json }
      register_tournament: {
        Args: { p_display_name: string; p_tournament_id: string }
        Returns: undefined
      }
      reject_clan_application: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      reject_join_request: {
        Args: { p_request_id: string }
        Returns: undefined
      }
      request_join_clan: {
        Args: { p_clan_id: string; p_display_name: string }
        Returns: string
      }
      search_clans: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          description: string
          emblem: string
          id: string
          league: string
          level: number
          max_members: number
          member_count: number
          name: string
          tag: string
          visibility: string
          xp: number
        }[]
      }
      search_players: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          in_clan: boolean
          invited: boolean
          total_points: number
        }[]
      }
      set_active_title: { Args: { p_title: string }; Returns: undefined }
      set_clan_member_role: {
        Args: { p_clan_id: string; p_role: string; p_target: string }
        Returns: undefined
      }
      set_member_role: {
        Args: { p_church_id: string; p_role: string; p_target_user_id: string }
        Returns: undefined
      }
      shop_requirement_met: {
        Args: { p_req: string; p_uid: string }
        Returns: boolean
      }
      start_battle_royale: { Args: { p_room_id: string }; Returns: undefined }
      submit_battle_answer: {
        Args: {
          p_answer: number
          p_battle_id: string
          p_player_num: number
          p_question_index: number
        }
        Returns: undefined
      }
      submit_battle_royale_answer: {
        Args: { p_answer: number; p_room_id: string }
        Returns: undefined
      }
      submit_tournament_score: {
        Args: { p_match_id: string; p_score: number }
        Returns: undefined
      }
      sync_earned_items: { Args: never; Returns: number }
      transfer_clan_lead: {
        Args: { p_clan_id: string; p_new_leader: string }
        Returns: undefined
      }
      transfer_clan_leadership: {
        Args: { p_church_id: string; p_new_leader_id: string }
        Returns: undefined
      }
      update_clan: {
        Args: {
          p_avatar_url?: string
          p_clan_id: string
          p_description: string
          p_emblem: string
          p_visibility: string
        }
        Returns: undefined
      }
      xp_for_next_level: { Args: { p_level: number }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user" | "super_admin" | "moderator" | "editor"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "super_admin", "moderator", "editor"],
    },
  },
} as const
