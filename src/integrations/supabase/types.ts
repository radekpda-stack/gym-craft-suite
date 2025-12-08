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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          user_id: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          user_id?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          user_id?: string | null
          value?: Json
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      client_budget_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_budget_members: {
        Row: {
          client_id: string
          created_at: string
          group_id: string
          id: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          group_id: string
          id?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          group_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_budget_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_budget_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_budget_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      client_media: {
        Row: {
          body_area: string | null
          category: string | null
          client_id: string
          created_at: string
          date: string
          description: string | null
          diagnostic_id: string | null
          duration_seconds: number | null
          file_name: string
          file_url: string
          id: string
          tags: string[] | null
          type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          body_area?: string | null
          category?: string | null
          client_id: string
          created_at?: string
          date?: string
          description?: string | null
          diagnostic_id?: string | null
          duration_seconds?: number | null
          file_name: string
          file_url: string
          id?: string
          tags?: string[] | null
          type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          body_area?: string | null
          category?: string | null
          client_id?: string
          created_at?: string
          date?: string
          description?: string | null
          diagnostic_id?: string | null
          duration_seconds?: number | null
          file_name?: string
          file_url?: string
          id?: string
          tags?: string[] | null
          type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_media_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_media_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      client_tags: {
        Row: {
          client_id: string
          created_at: string
          id: string
          tag_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          tag_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_tags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          credit_balance: number | null
          email: string | null
          health_restrictions: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          name: string
          notes: string | null
          phone: string | null
          training_goals: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          health_restrictions?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          training_goals?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          credit_balance?: number | null
          email?: string | null
          health_restrictions?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          training_goals?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          product_id: string | null
          reference_id: string | null
          training_session_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          reference_id?: string | null
          training_session_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          product_id?: string | null
          reference_id?: string | null
          training_session_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostics: {
        Row: {
          area_name: string
          area_type: string
          client_id: string
          created_at: string
          date: string
          findings: string
          id: string
          notes: string | null
          user_id: string | null
        }
        Insert: {
          area_name: string
          area_type: string
          client_id: string
          created_at?: string
          date?: string
          findings: string
          id?: string
          notes?: string | null
          user_id?: string | null
        }
        Update: {
          area_name?: string
          area_type?: string
          client_id?: string
          created_at?: string
          date?: string
          findings?: string
          id?: string
          notes?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostics_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_entries: {
        Row: {
          client_id: string
          created_at: string
          date: string
          exercise_id: string | null
          exercise_name: string
          id: string
          is_bodyweight: boolean | null
          is_pr: boolean | null
          notes: string | null
          reps: number | null
          sets: number
          tempo: string | null
          time_seconds: number | null
          updated_at: string
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_bodyweight?: boolean | null
          is_pr?: boolean | null
          notes?: string | null
          reps?: number | null
          sets?: number
          tempo?: string | null
          time_seconds?: number | null
          updated_at?: string
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_bodyweight?: boolean | null
          is_pr?: boolean | null
          notes?: string | null
          reps?: number | null
          sets?: number
          tempo?: string | null
          time_seconds?: number | null
          updated_at?: string
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          created_at: string
          description: string | null
          equipment: string[] | null
          id: string
          muscle_groups: string[] | null
          name: string
          subcategory: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          equipment?: string[] | null
          id?: string
          muscle_groups?: string[] | null
          name: string
          subcategory?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          equipment?: string[] | null
          id?: string
          muscle_groups?: string[] | null
          name?: string
          subcategory?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      measurements: {
        Row: {
          basal_metabolism: number | null
          bicep_left: number | null
          bicep_right: number | null
          body_fat_percentage: number | null
          calf_left: number | null
          calf_right: number | null
          chest: number | null
          client_id: string
          created_at: string
          date: string
          hips: number | null
          id: string
          mental_state: number | null
          muscle_mass: number | null
          notes: string | null
          thigh_left: number | null
          thigh_right: number | null
          user_id: string | null
          waist: number | null
          weight: number | null
        }
        Insert: {
          basal_metabolism?: number | null
          bicep_left?: number | null
          bicep_right?: number | null
          body_fat_percentage?: number | null
          calf_left?: number | null
          calf_right?: number | null
          chest?: number | null
          client_id: string
          created_at?: string
          date?: string
          hips?: number | null
          id?: string
          mental_state?: number | null
          muscle_mass?: number | null
          notes?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          user_id?: string | null
          waist?: number | null
          weight?: number | null
        }
        Update: {
          basal_metabolism?: number | null
          bicep_left?: number | null
          bicep_right?: number | null
          body_fat_percentage?: number | null
          calf_left?: number | null
          calf_right?: number | null
          chest?: number | null
          client_id?: string
          created_at?: string
          date?: string
          hips?: number | null
          id?: string
          mental_state?: number | null
          muscle_mass?: number | null
          notes?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          user_id?: string | null
          waist?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean
          low_stock_threshold: number | null
          name: string
          price: number
          purchase_price: number | null
          stock_quantity: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number | null
          name: string
          price?: number
          purchase_price?: number | null
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          low_stock_threshold?: number | null
          name?: string
          price?: number
          purchase_price?: number | null
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      training_feedback: {
        Row: {
          client_id: string
          comment: string | null
          created_at: string
          energy_level: string
          fatigue_level: number
          goal_relevance: string
          id: string
          mood_rating: number
          muscle_soreness: string[] | null
          muscle_soreness_comment: string | null
          rpe_rating: number
          sleep_hours: number | null
          sleep_quality: number | null
          technique_rating: number
          training_date: string
          training_session_id: string
          training_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          comment?: string | null
          created_at?: string
          energy_level: string
          fatigue_level: number
          goal_relevance: string
          id?: string
          mood_rating: number
          muscle_soreness?: string[] | null
          muscle_soreness_comment?: string | null
          rpe_rating: number
          sleep_hours?: number | null
          sleep_quality?: number | null
          technique_rating: number
          training_date: string
          training_session_id: string
          training_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          comment?: string | null
          created_at?: string
          energy_level?: string
          fatigue_level?: number
          goal_relevance?: string
          id?: string
          mood_rating?: number
          muscle_soreness?: string[] | null
          muscle_soreness_comment?: string | null
          rpe_rating?: number
          sleep_hours?: number | null
          sleep_quality?: number | null
          technique_rating?: number
          training_date?: string
          training_session_id?: string
          training_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_feedback_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_feedback_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_participants: {
        Row: {
          client_id: string
          created_at: string
          id: string
          price_share: number
          training_session_id: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          price_share?: number
          training_session_id: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          price_share?: number
          training_session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_participants_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_tags: {
        Row: {
          created_at: string
          id: string
          tag_id: string
          training_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag_id: string
          training_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag_id?: string
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_tags_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          canceled_at: string | null
          client_id: string
          created_at: string
          date: string
          duration: number
          id: string
          is_late_cancellation: boolean | null
          notes: string | null
          parent_session_id: string | null
          participant_count: number | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          status: string
          subjective_rating: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          client_id: string
          created_at?: string
          date: string
          duration?: number
          id?: string
          is_late_cancellation?: boolean | null
          notes?: string | null
          parent_session_id?: string | null
          participant_count?: number | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          subjective_rating?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          client_id?: string
          created_at?: string
          date?: string
          duration?: number
          id?: string
          is_late_cancellation?: boolean | null
          notes?: string | null
          parent_session_id?: string | null
          participant_count?: number | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          status?: string
          subjective_rating?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_parent_session_id_fkey"
            columns: ["parent_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tags: {
        Row: {
          id: string
          tag_id: string
          transaction_id: string
        }
        Insert: {
          id?: string
          tag_id: string
          transaction_id: string
        }
        Update: {
          id?: string
          tag_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_tags_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      workout_entries: {
        Row: {
          created_at: string
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          reps: number | null
          rpe: number | null
          set_number: number
          training_session_id: string
          user_id: string | null
          weight_kg: number | null
        }
        Insert: {
          created_at?: string
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          training_session_id: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Update: {
          created_at?: string
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          training_session_id?: string
          user_id?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_entries_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
