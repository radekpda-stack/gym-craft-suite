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
      analytics_saved_views: {
        Row: {
          created_at: string
          description: string | null
          filters: Json
          id: string
          is_default: boolean | null
          name: string
          sort_order: number | null
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name: string
          sort_order?: number | null
          updated_at?: string
          user_id: string
          view_type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          filters?: Json
          id?: string
          is_default?: boolean | null
          name?: string
          sort_order?: number | null
          updated_at?: string
          user_id?: string
          view_type?: string
        }
        Relationships: []
      }
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
      calendar_shares: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          shared_with_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          shared_with_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          shared_with_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cardio_entries: {
        Row: {
          avg_heart_rate: number | null
          avg_speed_kmh: number | null
          avg_watts: number | null
          client_id: string
          created_at: string
          date: string
          distance_meters: number | null
          duration_seconds: number
          exercise_id: string | null
          exercise_name: string
          id: string
          is_pr: boolean | null
          is_test: boolean | null
          leg_fatigue: boolean | null
          max_heart_rate: number | null
          max_speed_kmh: number | null
          max_watts: number | null
          notes: string | null
          rpe: number | null
          training_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_heart_rate?: number | null
          avg_speed_kmh?: number | null
          avg_watts?: number | null
          client_id: string
          created_at?: string
          date?: string
          distance_meters?: number | null
          duration_seconds: number
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_pr?: boolean | null
          is_test?: boolean | null
          leg_fatigue?: boolean | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          max_watts?: number | null
          notes?: string | null
          rpe?: number | null
          training_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_heart_rate?: number | null
          avg_speed_kmh?: number | null
          avg_watts?: number | null
          client_id?: string
          created_at?: string
          date?: string
          distance_meters?: number | null
          duration_seconds?: number
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_pr?: boolean | null
          is_test?: boolean | null
          leg_fatigue?: boolean | null
          max_heart_rate?: number | null
          max_speed_kmh?: number | null
          max_watts?: number | null
          notes?: string | null
          rpe?: number | null
          training_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardio_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_entries_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_budget_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          shared_balance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shared_balance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shared_balance?: number | null
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
      client_packages: {
        Row: {
          client_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          package_id: string | null
          package_name: string
          price_paid: number
          purchased_at: string | null
          trainings_total: number
          trainings_used: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id?: string | null
          package_name: string
          price_paid: number
          purchased_at?: string | null
          trainings_total: number
          trainings_used?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          package_id?: string | null
          package_name?: string
          price_paid?: number
          purchased_at?: string | null
          trainings_total?: number
          trainings_used?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_packages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_packages_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "training_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      client_recurring_schedules: {
        Row: {
          client_id: string
          created_at: string
          day_of_week: number
          duration: number
          id: string
          is_active: boolean
          notes: string | null
          time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          day_of_week: number
          duration?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          day_of_week?: number
          duration?: number
          id?: string
          is_active?: boolean
          notes?: string | null
          time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_recurring_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      client_training_phases: {
        Row: {
          client_id: string
          created_at: string
          end_date: string | null
          id: string
          notes: string | null
          phase_name: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          phase_name: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string | null
          id?: string
          notes?: string | null
          phase_name?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_training_phases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          credit_balance: number | null
          current_activities: string[] | null
          dietary_restrictions: string[] | null
          email: string | null
          feedback_enabled: boolean | null
          gender: string | null
          handedness: string | null
          health_restrictions: string | null
          id: string
          is_archived: boolean
          is_favorite: boolean
          name: string
          notes: string | null
          occupation: string | null
          payment_mode: string | null
          phone: string | null
          sitting_hours_daily: number | null
          sleep_hours: number | null
          sports_history: string | null
          stress_level: number | null
          supplements: string[] | null
          training_goals: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          credit_balance?: number | null
          current_activities?: string[] | null
          dietary_restrictions?: string[] | null
          email?: string | null
          feedback_enabled?: boolean | null
          gender?: string | null
          handedness?: string | null
          health_restrictions?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name: string
          notes?: string | null
          occupation?: string | null
          payment_mode?: string | null
          phone?: string | null
          sitting_hours_daily?: number | null
          sleep_hours?: number | null
          sports_history?: string | null
          stress_level?: number | null
          supplements?: string[] | null
          training_goals?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          credit_balance?: number | null
          current_activities?: string[] | null
          dietary_restrictions?: string[] | null
          email?: string | null
          feedback_enabled?: boolean | null
          gender?: string | null
          handedness?: string | null
          health_restrictions?: string | null
          id?: string
          is_archived?: boolean
          is_favorite?: boolean
          name?: string
          notes?: string | null
          occupation?: string | null
          payment_mode?: string | null
          phone?: string | null
          sitting_hours_daily?: number | null
          sleep_hours?: number | null
          sports_history?: string | null
          stress_level?: number | null
          supplements?: string[] | null
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
          group_id: string | null
          id: string
          payment_method: string | null
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
          group_id?: string | null
          id?: string
          payment_method?: string | null
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
          group_id?: string | null
          id?: string
          payment_method?: string | null
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
            foreignKeyName: "credit_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "client_budget_groups"
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
      diagnostic_answers: {
        Row: {
          assessment_id: string
          created_at: string | null
          id: string
          question_id: string
          value: Json
        }
        Insert: {
          assessment_id: string
          created_at?: string | null
          id?: string
          question_id: string
          value: Json
        }
        Update: {
          assessment_id?: string
          created_at?: string | null
          id?: string
          question_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_answers_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_assessments_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_assessments: {
        Row: {
          ai_analysis: string | null
          ai_avoid_exercises: string[] | null
          ai_contraindications: string[] | null
          ai_must_do_exercises: string[] | null
          ai_priorities: string[] | null
          ai_recommendations: string | null
          ai_risk_factors: string[] | null
          ai_strengths: string[] | null
          all_restrictions: string[] | null
          allergies: string[] | null
          core_stability: string | null
          core_stability_note: string | null
          created_at: string
          current_activities: string[] | null
          diagnostic_id: string
          diagnostic_level: string | null
          dietary_restrictions: string[] | null
          discipline_level: number | null
          diseases: string[] | null
          eating_regularity: string | null
          family_health_history: string | null
          food_allergies: string[] | null
          handedness: string | null
          hip_hinge_note: string | null
          hip_hinge_quality: string | null
          hip_hinge_side: string | null
          id: string
          injuries: string[] | null
          is_draft: boolean | null
          long_term_goals: string | null
          lunge_note: string | null
          lunge_quality: string | null
          lunge_side: string | null
          meditates: boolean | null
          mobility_ankles: string | null
          mobility_ankles_note: string | null
          mobility_ankles_side: string | null
          mobility_hips: string | null
          mobility_hips_note: string | null
          mobility_hips_side: string | null
          mobility_shoulders: string | null
          mobility_shoulders_note: string | null
          mobility_shoulders_side: string | null
          mobility_thoracic: string | null
          mobility_thoracic_note: string | null
          mobility_thoracic_side: string | null
          motivation_level: number | null
          occupation: string | null
          pain_ankle: string | null
          pain_ankle_duration: string | null
          pain_ankle_side: string | null
          pain_ankle_trigger: string[] | null
          pain_areas: string[] | null
          pain_hip: string | null
          pain_hip_duration: string | null
          pain_hip_side: string | null
          pain_hip_trigger: string[] | null
          pain_knee: string | null
          pain_knee_duration: string | null
          pain_knee_side: string | null
          pain_knee_trigger: string[] | null
          pain_lumbar: string | null
          pain_lumbar_duration: string | null
          pain_lumbar_side: string | null
          pain_lumbar_trigger: string[] | null
          pain_neck: string | null
          pain_neck_duration: string | null
          pain_neck_side: string | null
          pain_neck_trigger: string[] | null
          pain_shoulder: string | null
          pain_shoulder_duration: string | null
          pain_shoulder_side: string | null
          pain_shoulder_trigger: string[] | null
          pain_si: string | null
          pain_si_duration: string | null
          pain_si_side: string | null
          pain_si_trigger: string[] | null
          pain_thoracic: string | null
          pain_thoracic_duration: string | null
          pain_thoracic_side: string | null
          pain_thoracic_trigger: string[] | null
          preferred_training_style: string | null
          pull_note: string | null
          pull_quality: string | null
          pull_side: string | null
          push_note: string | null
          push_quality: string | null
          push_side: string | null
          regeneration_methods: string[] | null
          short_term_goals: string | null
          sitting_hours_daily: number | null
          sleep_hours: number | null
          sleep_quality: number | null
          sports_history: string | null
          squat_note: string | null
          squat_quality: string | null
          squat_side: string | null
          stress_level: number | null
          stress_management: string | null
          supplements: string[] | null
          surgeries: string[] | null
          trainer_limitations: string | null
          trainer_other_notes: string | null
          trainer_priorities: string | null
          trainer_risks: string | null
          training_barrier: string | null
          training_priorities: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_avoid_exercises?: string[] | null
          ai_contraindications?: string[] | null
          ai_must_do_exercises?: string[] | null
          ai_priorities?: string[] | null
          ai_recommendations?: string | null
          ai_risk_factors?: string[] | null
          ai_strengths?: string[] | null
          all_restrictions?: string[] | null
          allergies?: string[] | null
          core_stability?: string | null
          core_stability_note?: string | null
          created_at?: string
          current_activities?: string[] | null
          diagnostic_id: string
          diagnostic_level?: string | null
          dietary_restrictions?: string[] | null
          discipline_level?: number | null
          diseases?: string[] | null
          eating_regularity?: string | null
          family_health_history?: string | null
          food_allergies?: string[] | null
          handedness?: string | null
          hip_hinge_note?: string | null
          hip_hinge_quality?: string | null
          hip_hinge_side?: string | null
          id?: string
          injuries?: string[] | null
          is_draft?: boolean | null
          long_term_goals?: string | null
          lunge_note?: string | null
          lunge_quality?: string | null
          lunge_side?: string | null
          meditates?: boolean | null
          mobility_ankles?: string | null
          mobility_ankles_note?: string | null
          mobility_ankles_side?: string | null
          mobility_hips?: string | null
          mobility_hips_note?: string | null
          mobility_hips_side?: string | null
          mobility_shoulders?: string | null
          mobility_shoulders_note?: string | null
          mobility_shoulders_side?: string | null
          mobility_thoracic?: string | null
          mobility_thoracic_note?: string | null
          mobility_thoracic_side?: string | null
          motivation_level?: number | null
          occupation?: string | null
          pain_ankle?: string | null
          pain_ankle_duration?: string | null
          pain_ankle_side?: string | null
          pain_ankle_trigger?: string[] | null
          pain_areas?: string[] | null
          pain_hip?: string | null
          pain_hip_duration?: string | null
          pain_hip_side?: string | null
          pain_hip_trigger?: string[] | null
          pain_knee?: string | null
          pain_knee_duration?: string | null
          pain_knee_side?: string | null
          pain_knee_trigger?: string[] | null
          pain_lumbar?: string | null
          pain_lumbar_duration?: string | null
          pain_lumbar_side?: string | null
          pain_lumbar_trigger?: string[] | null
          pain_neck?: string | null
          pain_neck_duration?: string | null
          pain_neck_side?: string | null
          pain_neck_trigger?: string[] | null
          pain_shoulder?: string | null
          pain_shoulder_duration?: string | null
          pain_shoulder_side?: string | null
          pain_shoulder_trigger?: string[] | null
          pain_si?: string | null
          pain_si_duration?: string | null
          pain_si_side?: string | null
          pain_si_trigger?: string[] | null
          pain_thoracic?: string | null
          pain_thoracic_duration?: string | null
          pain_thoracic_side?: string | null
          pain_thoracic_trigger?: string[] | null
          preferred_training_style?: string | null
          pull_note?: string | null
          pull_quality?: string | null
          pull_side?: string | null
          push_note?: string | null
          push_quality?: string | null
          push_side?: string | null
          regeneration_methods?: string[] | null
          short_term_goals?: string | null
          sitting_hours_daily?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sports_history?: string | null
          squat_note?: string | null
          squat_quality?: string | null
          squat_side?: string | null
          stress_level?: number | null
          stress_management?: string | null
          supplements?: string[] | null
          surgeries?: string[] | null
          trainer_limitations?: string | null
          trainer_other_notes?: string | null
          trainer_priorities?: string | null
          trainer_risks?: string | null
          training_barrier?: string | null
          training_priorities?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_avoid_exercises?: string[] | null
          ai_contraindications?: string[] | null
          ai_must_do_exercises?: string[] | null
          ai_priorities?: string[] | null
          ai_recommendations?: string | null
          ai_risk_factors?: string[] | null
          ai_strengths?: string[] | null
          all_restrictions?: string[] | null
          allergies?: string[] | null
          core_stability?: string | null
          core_stability_note?: string | null
          created_at?: string
          current_activities?: string[] | null
          diagnostic_id?: string
          diagnostic_level?: string | null
          dietary_restrictions?: string[] | null
          discipline_level?: number | null
          diseases?: string[] | null
          eating_regularity?: string | null
          family_health_history?: string | null
          food_allergies?: string[] | null
          handedness?: string | null
          hip_hinge_note?: string | null
          hip_hinge_quality?: string | null
          hip_hinge_side?: string | null
          id?: string
          injuries?: string[] | null
          is_draft?: boolean | null
          long_term_goals?: string | null
          lunge_note?: string | null
          lunge_quality?: string | null
          lunge_side?: string | null
          meditates?: boolean | null
          mobility_ankles?: string | null
          mobility_ankles_note?: string | null
          mobility_ankles_side?: string | null
          mobility_hips?: string | null
          mobility_hips_note?: string | null
          mobility_hips_side?: string | null
          mobility_shoulders?: string | null
          mobility_shoulders_note?: string | null
          mobility_shoulders_side?: string | null
          mobility_thoracic?: string | null
          mobility_thoracic_note?: string | null
          mobility_thoracic_side?: string | null
          motivation_level?: number | null
          occupation?: string | null
          pain_ankle?: string | null
          pain_ankle_duration?: string | null
          pain_ankle_side?: string | null
          pain_ankle_trigger?: string[] | null
          pain_areas?: string[] | null
          pain_hip?: string | null
          pain_hip_duration?: string | null
          pain_hip_side?: string | null
          pain_hip_trigger?: string[] | null
          pain_knee?: string | null
          pain_knee_duration?: string | null
          pain_knee_side?: string | null
          pain_knee_trigger?: string[] | null
          pain_lumbar?: string | null
          pain_lumbar_duration?: string | null
          pain_lumbar_side?: string | null
          pain_lumbar_trigger?: string[] | null
          pain_neck?: string | null
          pain_neck_duration?: string | null
          pain_neck_side?: string | null
          pain_neck_trigger?: string[] | null
          pain_shoulder?: string | null
          pain_shoulder_duration?: string | null
          pain_shoulder_side?: string | null
          pain_shoulder_trigger?: string[] | null
          pain_si?: string | null
          pain_si_duration?: string | null
          pain_si_side?: string | null
          pain_si_trigger?: string[] | null
          pain_thoracic?: string | null
          pain_thoracic_duration?: string | null
          pain_thoracic_side?: string | null
          pain_thoracic_trigger?: string[] | null
          preferred_training_style?: string | null
          pull_note?: string | null
          pull_quality?: string | null
          pull_side?: string | null
          push_note?: string | null
          push_quality?: string | null
          push_side?: string | null
          regeneration_methods?: string[] | null
          short_term_goals?: string | null
          sitting_hours_daily?: number | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          sports_history?: string | null
          squat_note?: string | null
          squat_quality?: string | null
          squat_side?: string | null
          stress_level?: number | null
          stress_management?: string | null
          supplements?: string[] | null
          surgeries?: string[] | null
          trainer_limitations?: string | null
          trainer_other_notes?: string | null
          trainer_priorities?: string | null
          trainer_risks?: string | null
          training_barrier?: string | null
          training_priorities?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_assessments_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_assessments_v2: {
        Row: {
          ai_analysis: string | null
          ai_avoid_exercises: string[] | null
          ai_contraindications: string[] | null
          ai_must_do_exercises: string[] | null
          ai_priorities: string[] | null
          ai_recommendations: string | null
          ai_risk_factors: string[] | null
          ai_strengths: string[] | null
          assessment_type: string | null
          client_id: string
          created_at: string | null
          diagnostic_id: string | null
          id: string
          is_draft: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_analysis?: string | null
          ai_avoid_exercises?: string[] | null
          ai_contraindications?: string[] | null
          ai_must_do_exercises?: string[] | null
          ai_priorities?: string[] | null
          ai_recommendations?: string | null
          ai_risk_factors?: string[] | null
          ai_strengths?: string[] | null
          assessment_type?: string | null
          client_id: string
          created_at?: string | null
          diagnostic_id?: string | null
          id?: string
          is_draft?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_analysis?: string | null
          ai_avoid_exercises?: string[] | null
          ai_contraindications?: string[] | null
          ai_must_do_exercises?: string[] | null
          ai_priorities?: string[] | null
          ai_recommendations?: string | null
          ai_risk_factors?: string[] | null
          ai_strengths?: string[] | null
          assessment_type?: string | null
          client_id?: string
          created_at?: string | null
          diagnostic_id?: string | null
          id?: string
          is_draft?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_assessments_v2_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_assessments_v2_diagnostic_id_fkey"
            columns: ["diagnostic_id"]
            isOneToOne: false
            referencedRelation: "diagnostics"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_questions: {
        Row: {
          created_at: string | null
          help_text: string | null
          id: string
          is_active: boolean | null
          is_required: boolean | null
          max_value: number | null
          min_value: number | null
          options: Json | null
          question_text: string
          question_text_en: string | null
          question_type: string
          section_id: string
          sort_order: number | null
          unit: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          question_text: string
          question_text_en?: string | null
          question_type: string
          section_id: string
          sort_order?: number | null
          unit?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          help_text?: string | null
          id?: string
          is_active?: boolean | null
          is_required?: boolean | null
          max_value?: number | null
          min_value?: number | null
          options?: Json | null
          question_text?: string
          question_text_en?: string | null
          question_type?: string
          section_id?: string
          sort_order?: number | null
          unit?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_sections: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          name_en: string | null
          sort_order: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_en?: string | null
          sort_order?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_en?: string | null
          sort_order?: number | null
          user_id?: string | null
        }
        Relationships: []
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
      equipment: {
        Row: {
          category: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          name_cz: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          name_cz: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          name_cz?: string
        }
        Relationships: []
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
          training_phase: string | null
          training_type: string | null
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
          training_phase?: string | null
          training_type?: string | null
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
          training_phase?: string | null
          training_type?: string | null
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
      exercise_equipment: {
        Row: {
          created_at: string
          equipment: string
          exercise_id: string
          id: string
        }
        Insert: {
          created_at?: string
          equipment: string
          exercise_id: string
          id?: string
        }
        Update: {
          created_at?: string
          equipment?: string
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_equipment_map: {
        Row: {
          created_at: string | null
          equipment_id: string
          exercise_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          equipment_id: string
          exercise_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          equipment_id?: string
          exercise_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_equipment_map_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_equipment_map_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscle_groups: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          muscle_group_id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          muscle_group_id: string
          role: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          muscle_group_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscle_groups_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_muscle_groups_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_muscles: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          muscle: string
          role: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          muscle: string
          role?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          muscle?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_muscles_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_relations: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          note_cs: string | null
          note_en: string | null
          related_exercise_id: string
          relation_type: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          note_cs?: string | null
          note_en?: string | null
          related_exercise_id: string
          relation_type: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          note_cs?: string | null
          note_en?: string | null
          related_exercise_id?: string
          relation_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_relations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_relations_related_exercise_id_fkey"
            columns: ["related_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_tag_map: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_tag_map_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          category: string
          contraindicated_areas: string[] | null
          created_at: string
          default_unit: string
          description: string | null
          description_cs: string | null
          description_en: string | null
          difficulty: string | null
          environment: string | null
          equipment: string[] | null
          exercise_type: string | null
          exercise_type_v2: string | null
          fatigue_accumulation: string | null
          id: string
          image_url: string | null
          instructions_cs: string | null
          instructions_en: string | null
          is_archived: boolean
          is_bodyweight: boolean
          is_time_based: boolean
          is_unilateral: boolean
          movement_pattern: string | null
          muscle_groups: string[] | null
          name: string
          name_cs: string | null
          name_en: string | null
          performance_load: string | null
          recovery_hours: number | null
          rehab_safe: boolean | null
          requires_supervision: boolean | null
          risk_level: string | null
          risk_notes: string | null
          search_name: string | null
          secondary_muscle_groups: string[] | null
          slug: string | null
          source: string
          subcategory: string | null
          subjective_difficulty: number | null
          supported_metrics: string[] | null
          trainer_notes: string | null
          training_type: string[] | null
          updated_at: string
          user_id: string | null
          video_url: string | null
        }
        Insert: {
          category: string
          contraindicated_areas?: string[] | null
          created_at?: string
          default_unit?: string
          description?: string | null
          description_cs?: string | null
          description_en?: string | null
          difficulty?: string | null
          environment?: string | null
          equipment?: string[] | null
          exercise_type?: string | null
          exercise_type_v2?: string | null
          fatigue_accumulation?: string | null
          id?: string
          image_url?: string | null
          instructions_cs?: string | null
          instructions_en?: string | null
          is_archived?: boolean
          is_bodyweight?: boolean
          is_time_based?: boolean
          is_unilateral?: boolean
          movement_pattern?: string | null
          muscle_groups?: string[] | null
          name: string
          name_cs?: string | null
          name_en?: string | null
          performance_load?: string | null
          recovery_hours?: number | null
          rehab_safe?: boolean | null
          requires_supervision?: boolean | null
          risk_level?: string | null
          risk_notes?: string | null
          search_name?: string | null
          secondary_muscle_groups?: string[] | null
          slug?: string | null
          source?: string
          subcategory?: string | null
          subjective_difficulty?: number | null
          supported_metrics?: string[] | null
          trainer_notes?: string | null
          training_type?: string[] | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Update: {
          category?: string
          contraindicated_areas?: string[] | null
          created_at?: string
          default_unit?: string
          description?: string | null
          description_cs?: string | null
          description_en?: string | null
          difficulty?: string | null
          environment?: string | null
          equipment?: string[] | null
          exercise_type?: string | null
          exercise_type_v2?: string | null
          fatigue_accumulation?: string | null
          id?: string
          image_url?: string | null
          instructions_cs?: string | null
          instructions_en?: string | null
          is_archived?: boolean
          is_bodyweight?: boolean
          is_time_based?: boolean
          is_unilateral?: boolean
          movement_pattern?: string | null
          muscle_groups?: string[] | null
          name?: string
          name_cs?: string | null
          name_en?: string | null
          performance_load?: string | null
          recovery_hours?: number | null
          rehab_safe?: boolean | null
          requires_supervision?: boolean | null
          risk_level?: string | null
          risk_notes?: string | null
          search_name?: string | null
          secondary_muscle_groups?: string[] | null
          slug?: string | null
          source?: string
          subcategory?: string | null
          subjective_difficulty?: number | null
          supported_metrics?: string[] | null
          trainer_notes?: string | null
          training_type?: string[] | null
          updated_at?: string
          user_id?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      external_calendar_events: {
        Row: {
          all_day: boolean | null
          created_at: string | null
          end_time: string
          external_id: string
          id: string
          source: string | null
          start_time: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          created_at?: string | null
          end_time: string
          external_id: string
          id?: string
          source?: string | null
          start_time: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          created_at?: string | null
          end_time?: string
          external_id?: string
          id?: string
          source?: string | null
          start_time?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          feature_category: string
          feature_name: string
          id: string
          metadata: Json | null
          session_id: string | null
          success: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature_category: string
          feature_name: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          feature_category?: string
          feature_name?: string
          id?: string
          metadata?: Json | null
          session_id?: string | null
          success?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_requests: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          custom_message: string | null
          expires_at: string
          id: string
          is_link_generated: boolean | null
          last_reminder_at: string | null
          reminder_count: number | null
          send_channel: string | null
          sent_at: string | null
          status: string
          token: string
          trainer_signature: string | null
          training_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          custom_message?: string | null
          expires_at?: string
          id?: string
          is_link_generated?: boolean | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          send_channel?: string | null
          sent_at?: string | null
          status?: string
          token?: string
          trainer_signature?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          custom_message?: string | null
          expires_at?: string
          id?: string
          is_link_generated?: boolean | null
          last_reminder_at?: string | null
          reminder_count?: number | null
          send_channel?: string | null
          sent_at?: string | null
          status?: string
          token?: string
          trainer_signature?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_requests_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_settings: {
        Row: {
          auto_send_after_training: boolean | null
          created_at: string
          default_language: string | null
          expiration_hours: number | null
          feedback_questions: Json | null
          id: string
          reminder_intervals: number[] | null
          trainer_signature: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_send_after_training?: boolean | null
          created_at?: string
          default_language?: string | null
          expiration_hours?: number | null
          feedback_questions?: Json | null
          id?: string
          reminder_intervals?: number[] | null
          trainer_signature?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_send_after_training?: boolean | null
          created_at?: string
          default_language?: string | null
          expiration_hours?: number | null
          feedback_questions?: Json | null
          id?: string
          reminder_intervals?: number[] | null
          trainer_signature?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      health_conditions: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          name_en: string | null
          synonyms: string[] | null
          usage_count: number | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          name_en?: string | null
          synonyms?: string[] | null
          usage_count?: number | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          name_en?: string | null
          synonyms?: string[] | null
          usage_count?: number | null
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
          source_file_url: string | null
          thigh_left: number | null
          thigh_right: number | null
          user_id: string | null
          visceral_fat: number | null
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
          source_file_url?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          user_id?: string | null
          visceral_fat?: number | null
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
          source_file_url?: string | null
          thigh_left?: number | null
          thigh_right?: number | null
          user_id?: string | null
          visceral_fat?: number | null
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
      mobility_entries: {
        Row: {
          client_id: string
          created_at: string
          date: string
          duration_seconds: number | null
          exercise_id: string | null
          exercise_name: string
          hold_seconds: number | null
          id: string
          notes: string | null
          quality_rating: string | null
          range_of_motion: string | null
          rpe: number | null
          sets: number | null
          side: string | null
          training_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          date?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name: string
          hold_seconds?: number | null
          id?: string
          notes?: string | null
          quality_rating?: string | null
          range_of_motion?: string | null
          rpe?: number | null
          sets?: number | null
          side?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          date?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name?: string
          hold_seconds?: number | null
          id?: string
          notes?: string | null
          quality_rating?: string | null
          range_of_motion?: string | null
          rpe?: number | null
          sets?: number | null
          side?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobility_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_entries_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_group_aliases: {
        Row: {
          alias: string
          created_at: string | null
          id: string
          muscle_group_id: string | null
        }
        Insert: {
          alias: string
          created_at?: string | null
          id?: string
          muscle_group_id?: string | null
        }
        Update: {
          alias?: string
          created_at?: string | null
          id?: string
          muscle_group_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "muscle_group_aliases_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            isOneToOne: false
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      muscle_groups: {
        Row: {
          created_at: string | null
          display_order: number | null
          id: string
          name: string
          name_cz: string
          name_en: string
          region: string
          side_relevant: boolean | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name: string
          name_cz: string
          name_en: string
          region: string
          side_relevant?: boolean | null
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          id?: string
          name?: string
          name_cz?: string
          name_en?: string
          region?: string
          side_relevant?: boolean | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string
          severity: string | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          severity?: string | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          severity?: string | null
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
      nutrition_coffee_entries: {
        Row: {
          after_16: boolean | null
          client_id: string
          coffee_type: string
          count: number
          created_at: string
          entry_date: string
          entry_time: string
          id: string
          milk: string | null
          note: string | null
          session_id: string
          sugar: boolean | null
          sugar_spoons: number | null
          user_id: string | null
        }
        Insert: {
          after_16?: boolean | null
          client_id: string
          coffee_type: string
          count?: number
          created_at?: string
          entry_date: string
          entry_time?: string
          id?: string
          milk?: string | null
          note?: string | null
          session_id: string
          sugar?: boolean | null
          sugar_spoons?: number | null
          user_id?: string | null
        }
        Update: {
          after_16?: boolean | null
          client_id?: string
          coffee_type?: string
          count?: number
          created_at?: string
          entry_date?: string
          entry_time?: string
          id?: string
          milk?: string | null
          note?: string | null
          session_id?: string
          sugar?: boolean | null
          sugar_spoons?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_coffee_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_coffee_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_daily_analysis: {
        Row: {
          alcohol_sugar_score: number | null
          analysis_date: string
          analyzed_at: string | null
          calorie_level: string | null
          calorie_range_high: number | null
          calorie_range_low: number | null
          carb_quality_score: number | null
          carb_sources: Json | null
          client_id: string
          created_at: string | null
          fat_quality_score: number | null
          fat_sources: Json | null
          feedback_improve: string | null
          feedback_positive: string | null
          feedback_suggestions: Json | null
          hydration_score: number | null
          id: string
          meal_regularity_score: number | null
          protein_score: number | null
          protein_sources: Json | null
          session_id: string
          ultra_processed: Json | null
          ultra_processed_score: number | null
          user_id: string | null
          vegetable_fiber_score: number | null
          vegetables_fruits: Json | null
        }
        Insert: {
          alcohol_sugar_score?: number | null
          analysis_date: string
          analyzed_at?: string | null
          calorie_level?: string | null
          calorie_range_high?: number | null
          calorie_range_low?: number | null
          carb_quality_score?: number | null
          carb_sources?: Json | null
          client_id: string
          created_at?: string | null
          fat_quality_score?: number | null
          fat_sources?: Json | null
          feedback_improve?: string | null
          feedback_positive?: string | null
          feedback_suggestions?: Json | null
          hydration_score?: number | null
          id?: string
          meal_regularity_score?: number | null
          protein_score?: number | null
          protein_sources?: Json | null
          session_id: string
          ultra_processed?: Json | null
          ultra_processed_score?: number | null
          user_id?: string | null
          vegetable_fiber_score?: number | null
          vegetables_fruits?: Json | null
        }
        Update: {
          alcohol_sugar_score?: number | null
          analysis_date?: string
          analyzed_at?: string | null
          calorie_level?: string | null
          calorie_range_high?: number | null
          calorie_range_low?: number | null
          carb_quality_score?: number | null
          carb_sources?: Json | null
          client_id?: string
          created_at?: string | null
          fat_quality_score?: number | null
          fat_sources?: Json | null
          feedback_improve?: string | null
          feedback_positive?: string | null
          feedback_suggestions?: Json | null
          hydration_score?: number | null
          id?: string
          meal_regularity_score?: number | null
          protein_score?: number | null
          protein_sources?: Json | null
          session_id?: string
          ultra_processed?: Json | null
          ultra_processed_score?: number | null
          user_id?: string | null
          vegetable_fiber_score?: number | null
          vegetables_fruits?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_daily_analysis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_daily_analysis_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_day_status: {
        Row: {
          client_id: string
          created_at: string | null
          day_date: string
          id: string
          note: string | null
          session_id: string
          status: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          day_date: string
          id?: string
          note?: string | null
          session_id: string
          status: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          day_date?: string
          id?: string
          note?: string | null
          session_id?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_day_status_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_day_status_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_drink_entries: {
        Row: {
          amount_container_count: number | null
          amount_container_type: string | null
          amount_ml: number | null
          client_id: string
          created_at: string
          drink_name: string | null
          drink_type: string
          entry_date: string
          entry_time: string
          id: string
          note: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          amount_container_count?: number | null
          amount_container_type?: string | null
          amount_ml?: number | null
          client_id: string
          created_at?: string
          drink_name?: string | null
          drink_type: string
          entry_date: string
          entry_time?: string
          id?: string
          note?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          amount_container_count?: number | null
          amount_container_type?: string | null
          amount_ml?: number | null
          client_id?: string
          created_at?: string
          drink_name?: string | null
          drink_type?: string
          entry_date?: string
          entry_time?: string
          id?: string
          note?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_drink_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_drink_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_drink_items: {
        Row: {
          created_at: string | null
          created_by_user_id: string | null
          default_ml: number | null
          drink_type: string
          id: string
          is_approved: boolean | null
          is_carbonated: boolean | null
          name: string
          name_normalized: string
          usage_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by_user_id?: string | null
          default_ml?: number | null
          drink_type: string
          id?: string
          is_approved?: boolean | null
          is_carbonated?: boolean | null
          name: string
          name_normalized: string
          usage_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by_user_id?: string | null
          default_ml?: number | null
          drink_type?: string
          id?: string
          is_approved?: boolean | null
          is_carbonated?: boolean | null
          name?: string
          name_normalized?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      nutrition_food_entries: {
        Row: {
          calorie_estimate_high: number | null
          calorie_estimate_low: number | null
          client_id: string
          created_at: string
          description: string
          energy_after: string | null
          entry_date: string
          entry_time: string
          feeling_after: string | null
          grams: number | null
          id: string
          meal_type: string | null
          note: string | null
          photo_url: string | null
          portion_estimate: string | null
          portion_mode: string
          portion_size: string | null
          quality: string | null
          satiation: string | null
          session_id: string
          units_count: number | null
          units_label: string | null
          user_id: string | null
        }
        Insert: {
          calorie_estimate_high?: number | null
          calorie_estimate_low?: number | null
          client_id: string
          created_at?: string
          description: string
          energy_after?: string | null
          entry_date: string
          entry_time?: string
          feeling_after?: string | null
          grams?: number | null
          id?: string
          meal_type?: string | null
          note?: string | null
          photo_url?: string | null
          portion_estimate?: string | null
          portion_mode: string
          portion_size?: string | null
          quality?: string | null
          satiation?: string | null
          session_id: string
          units_count?: number | null
          units_label?: string | null
          user_id?: string | null
        }
        Update: {
          calorie_estimate_high?: number | null
          calorie_estimate_low?: number | null
          client_id?: string
          created_at?: string
          description?: string
          energy_after?: string | null
          entry_date?: string
          entry_time?: string
          feeling_after?: string | null
          grams?: number | null
          id?: string
          meal_type?: string | null
          note?: string | null
          photo_url?: string | null
          portion_estimate?: string | null
          portion_mode?: string
          portion_size?: string | null
          quality?: string | null
          satiation?: string | null
          session_id?: string
          units_count?: number | null
          units_label?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_food_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_food_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_food_items: {
        Row: {
          category: string | null
          created_at: string | null
          created_by_user_id: string | null
          default_grams: number | null
          default_portion_mode: string | null
          id: string
          is_approved: boolean | null
          name: string
          name_normalized: string
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_grams?: number | null
          default_portion_mode?: string | null
          id?: string
          is_approved?: boolean | null
          name: string
          name_normalized: string
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          default_grams?: number | null
          default_portion_mode?: string | null
          id?: string
          is_approved?: boolean | null
          name?: string
          name_normalized?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      nutrition_log_sessions: {
        Row: {
          client_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          end_date: string
          id?: string
          start_date?: string
          status?: string
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_log_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      nutrition_weekly_summary: {
        Row: {
          analyzed_at: string | null
          avg_calorie_range_high: number | null
          avg_calorie_range_low: number | null
          avg_quality_scores: Json | null
          calorie_trend: string | null
          client_id: string
          client_recommendations: Json | null
          client_strengths: Json | null
          client_weaknesses: Json | null
          created_at: string | null
          id: string
          quality_trend_summary: string | null
          session_id: string
          trainer_conclusion: string | null
          trainer_observations: string | null
          trainer_risks: Json | null
          user_id: string | null
        }
        Insert: {
          analyzed_at?: string | null
          avg_calorie_range_high?: number | null
          avg_calorie_range_low?: number | null
          avg_quality_scores?: Json | null
          calorie_trend?: string | null
          client_id: string
          client_recommendations?: Json | null
          client_strengths?: Json | null
          client_weaknesses?: Json | null
          created_at?: string | null
          id?: string
          quality_trend_summary?: string | null
          session_id: string
          trainer_conclusion?: string | null
          trainer_observations?: string | null
          trainer_risks?: Json | null
          user_id?: string | null
        }
        Update: {
          analyzed_at?: string | null
          avg_calorie_range_high?: number | null
          avg_calorie_range_low?: number | null
          avg_quality_scores?: Json | null
          calorie_trend?: string | null
          client_id?: string
          client_recommendations?: Json | null
          client_strengths?: Json | null
          client_weaknesses?: Json | null
          created_at?: string | null
          id?: string
          quality_trend_summary?: string | null
          session_id?: string
          trainer_conclusion?: string | null
          trainer_observations?: string | null
          trainer_risks?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nutrition_weekly_summary_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nutrition_weekly_summary_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "nutrition_log_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_days: {
        Row: {
          created_at: string | null
          day_number: number
          id: string
          intended_focus: string | null
          optional_flag: boolean | null
          plan_week_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_number: number
          id?: string
          intended_focus?: string | null
          optional_flag?: boolean | null
          plan_week_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_number?: number
          id?: string
          intended_focus?: string | null
          optional_flag?: boolean | null
          plan_week_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_days_plan_week_id_fkey"
            columns: ["plan_week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_exercises: {
        Row: {
          alternative_exercise_id: string | null
          created_at: string | null
          exercise_id: string | null
          exercise_name: string
          id: string
          notes: string | null
          plan_workout_id: string
          progression_type: string | null
          rest_seconds: number | null
          sort_order: number | null
          target_reps_max: number | null
          target_reps_min: number | null
          target_rir: number | null
          target_rpe: number | null
          target_sets: number | null
          tempo: string | null
          user_id: string
        }
        Insert: {
          alternative_exercise_id?: string | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          notes?: string | null
          plan_workout_id: string
          progression_type?: string | null
          rest_seconds?: number | null
          sort_order?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number | null
          tempo?: string | null
          user_id: string
        }
        Update: {
          alternative_exercise_id?: string | null
          created_at?: string | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          notes?: string | null
          plan_workout_id?: string
          progression_type?: string | null
          rest_seconds?: number | null
          sort_order?: number | null
          target_reps_max?: number | null
          target_reps_min?: number | null
          target_rir?: number | null
          target_rpe?: number | null
          target_sets?: number | null
          tempo?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_exercises_alternative_exercise_id_fkey"
            columns: ["alternative_exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_exercises_plan_workout_id_fkey"
            columns: ["plan_workout_id"]
            isOneToOne: false
            referencedRelation: "plan_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_weeks: {
        Row: {
          created_at: string | null
          deload_flag: boolean | null
          focus_note: string | null
          id: string
          training_plan_id: string
          user_id: string
          week_number: number
        }
        Insert: {
          created_at?: string | null
          deload_flag?: boolean | null
          focus_note?: string | null
          id?: string
          training_plan_id: string
          user_id: string
          week_number: number
        }
        Update: {
          created_at?: string | null
          deload_flag?: boolean | null
          focus_note?: string | null
          id?: string
          training_plan_id?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "plan_weeks_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_workouts: {
        Row: {
          created_at: string | null
          estimated_duration: number | null
          id: string
          notes: string | null
          plan_day_id: string
          sort_order: number | null
          user_id: string
          workout_name: string
          workout_type: string | null
        }
        Insert: {
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          plan_day_id: string
          sort_order?: number | null
          user_id: string
          workout_name: string
          workout_type?: string | null
        }
        Update: {
          created_at?: string | null
          estimated_duration?: number | null
          id?: string
          notes?: string | null
          plan_day_id?: string
          sort_order?: number | null
          user_id?: string
          workout_name?: string
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plan_workouts_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_diagnostic_answer_history: {
        Row: {
          answer_id: string
          changed_at: string
          changed_by: string | null
          id: string
          new_value: Json
          previous_value: Json
        }
        Insert: {
          answer_id: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value: Json
          previous_value: Json
        }
        Update: {
          answer_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_value?: Json
          previous_value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pre_diagnostic_answer_history_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "pre_diagnostic_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_diagnostic_answers: {
        Row: {
          created_at: string
          edited_at: string | null
          edited_by_trainer: boolean | null
          field_key: string
          form_id: string
          id: string
          original_value: Json | null
          value: Json
        }
        Insert: {
          created_at?: string
          edited_at?: string | null
          edited_by_trainer?: boolean | null
          field_key: string
          form_id: string
          id?: string
          original_value?: Json | null
          value: Json
        }
        Update: {
          created_at?: string
          edited_at?: string | null
          edited_by_trainer?: boolean | null
          field_key?: string
          form_id?: string
          id?: string
          original_value?: Json | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "pre_diagnostic_answers_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "pre_diagnostic_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      pre_diagnostic_forms: {
        Row: {
          approved_at: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          locked: boolean
          source: string
          status: string
          summary_approved: boolean | null
          token: string
          trainer_recommendations: string | null
          trainer_restrictions: string | null
          trainer_summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          locked?: boolean
          source?: string
          status?: string
          summary_approved?: boolean | null
          token?: string
          trainer_recommendations?: string | null
          trainer_restrictions?: string | null
          trainer_summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          locked?: boolean
          source?: string
          status?: string
          summary_approved?: boolean | null
          token?: string
          trainer_recommendations?: string | null
          trainer_restrictions?: string | null
          trainer_summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_diagnostic_forms_client_id_fkey"
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
      profiles: {
        Row: {
          account_status: string
          admin_note: string | null
          approved_at: string | null
          approved_by: string | null
          client_limit: number
          created_at: string | null
          display_name: string | null
          email: string
          first_login_at: string | null
          id: string
          last_login_at: string | null
          subscription_type: string
          trial_until: string | null
          updated_at: string | null
        }
        Insert: {
          account_status?: string
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_limit?: number
          created_at?: string | null
          display_name?: string | null
          email: string
          first_login_at?: string | null
          id: string
          last_login_at?: string | null
          subscription_type?: string
          trial_until?: string | null
          updated_at?: string | null
        }
        Update: {
          account_status?: string
          admin_note?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_limit?: number
          created_at?: string | null
          display_name?: string | null
          email?: string
          first_login_at?: string | null
          id?: string
          last_login_at?: string | null
          subscription_type?: string
          trial_until?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      progression_log: {
        Row: {
          created_at: string | null
          exercise_id: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          plan_exercise_id: string | null
          rule_id: string | null
          training_session_id: string | null
          user_id: string
          was_manual_override: boolean | null
        }
        Insert: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          plan_exercise_id?: string | null
          rule_id?: string | null
          training_session_id?: string | null
          user_id: string
          was_manual_override?: boolean | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          plan_exercise_id?: string | null
          rule_id?: string | null
          training_session_id?: string | null
          user_id?: string
          was_manual_override?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "progression_log_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_log_plan_exercise_id_fkey"
            columns: ["plan_exercise_id"]
            isOneToOne: false
            referencedRelation: "plan_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_log_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "progression_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "progression_log_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      progression_rules: {
        Row: {
          action_type: string
          action_value: number | null
          condition_threshold: number | null
          condition_type: string
          created_at: string | null
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          user_id: string | null
        }
        Insert: {
          action_type: string
          action_value?: number | null
          condition_threshold?: number | null
          condition_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          user_id?: string | null
        }
        Update: {
          action_type?: string
          action_value?: number | null
          condition_threshold?: number | null
          condition_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      reminders: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_completed: boolean
          is_notified: boolean
          remind_at: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_notified?: boolean
          remind_at: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_completed?: boolean
          is_notified?: boolean
          remind_at?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      skill_entries: {
        Row: {
          attempts: number | null
          client_id: string
          created_at: string
          date: string
          duration_seconds: number | null
          exercise_id: string | null
          exercise_name: string
          id: string
          is_breakthrough: boolean | null
          notes: string | null
          rpe: number | null
          successful: number | null
          technique_rating: string | null
          training_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          client_id: string
          created_at?: string
          date?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_breakthrough?: boolean | null
          notes?: string | null
          rpe?: number | null
          successful?: number | null
          technique_rating?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          client_id?: string
          created_at?: string
          date?: string
          duration_seconds?: number | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_breakthrough?: boolean | null
          notes?: string | null
          rpe?: number | null
          successful?: number | null
          technique_rating?: string | null
          training_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_entries_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_entries_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stat_events: {
        Row: {
          client_id: string | null
          context_json: Json | null
          created_at: string
          event_name: string
          event_type: string
          id: string
          recorded_at: string
          session_id: string | null
          unit: string | null
          user_id: string
          value_numeric: number | null
          value_text: string | null
        }
        Insert: {
          client_id?: string | null
          context_json?: Json | null
          created_at?: string
          event_name: string
          event_type: string
          id?: string
          recorded_at?: string
          session_id?: string | null
          unit?: string | null
          user_id: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Update: {
          client_id?: string | null
          context_json?: Json | null
          created_at?: string
          event_name?: string
          event_type?: string
          id?: string
          recorded_at?: string
          session_id?: string | null
          unit?: string | null
          user_id?: string
          value_numeric?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stat_events_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stat_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          affects_credit: boolean | null
          affects_load: boolean | null
          color: string
          created_at: string
          id: string
          is_system: boolean | null
          name: string
          tag_type: string | null
          user_id: string | null
        }
        Insert: {
          affects_credit?: boolean | null
          affects_load?: boolean | null
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          name: string
          tag_type?: string | null
          user_id?: string | null
        }
        Update: {
          affects_credit?: boolean | null
          affects_load?: boolean | null
          color?: string
          created_at?: string
          id?: string
          is_system?: boolean | null
          name?: string
          tag_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      trainer_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          start_time: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      training_feedback: {
        Row: {
          body_feel: number | null
          client_id: string
          comment: string | null
          created_at: string
          difficulty: number | null
          energy_level: string
          energy_rating: number | null
          fatigue_level: number
          feedback_request_id: string | null
          fun: number | null
          goal_relevance: string
          id: string
          is_processed: boolean | null
          is_red_flag: boolean | null
          mood_rating: number
          muscle_soreness: string[] | null
          muscle_soreness_comment: string | null
          pain: number | null
          pain_area: string | null
          pain_area_intensities: Json | null
          pain_area_other: string | null
          pain_type: string | null
          red_flag_reasons: string[] | null
          rpe_rating: number
          session_fit: number | null
          sleep_after: string | null
          sleep_hours: number | null
          sleep_quality: number | null
          soreness: number | null
          source: string | null
          technique_rating: number
          training_date: string
          training_session_id: string
          training_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body_feel?: number | null
          client_id: string
          comment?: string | null
          created_at?: string
          difficulty?: number | null
          energy_level: string
          energy_rating?: number | null
          fatigue_level: number
          feedback_request_id?: string | null
          fun?: number | null
          goal_relevance: string
          id?: string
          is_processed?: boolean | null
          is_red_flag?: boolean | null
          mood_rating: number
          muscle_soreness?: string[] | null
          muscle_soreness_comment?: string | null
          pain?: number | null
          pain_area?: string | null
          pain_area_intensities?: Json | null
          pain_area_other?: string | null
          pain_type?: string | null
          red_flag_reasons?: string[] | null
          rpe_rating: number
          session_fit?: number | null
          sleep_after?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          source?: string | null
          technique_rating: number
          training_date: string
          training_session_id: string
          training_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body_feel?: number | null
          client_id?: string
          comment?: string | null
          created_at?: string
          difficulty?: number | null
          energy_level?: string
          energy_rating?: number | null
          fatigue_level?: number
          feedback_request_id?: string | null
          fun?: number | null
          goal_relevance?: string
          id?: string
          is_processed?: boolean | null
          is_red_flag?: boolean | null
          mood_rating?: number
          muscle_soreness?: string[] | null
          muscle_soreness_comment?: string | null
          pain?: number | null
          pain_area?: string | null
          pain_area_intensities?: Json | null
          pain_area_other?: string | null
          pain_type?: string | null
          red_flag_reasons?: string[] | null
          rpe_rating?: number
          session_fit?: number | null
          sleep_after?: string | null
          sleep_hours?: number | null
          sleep_quality?: number | null
          soreness?: number | null
          source?: string | null
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
            foreignKeyName: "training_feedback_feedback_request_id_fkey"
            columns: ["feedback_request_id"]
            isOneToOne: false
            referencedRelation: "feedback_requests"
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
      training_packages: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          training_count: number
          updated_at: string | null
          user_id: string
          validity_days: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          training_count: number
          updated_at?: string | null
          user_id: string
          validity_days?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          training_count?: number
          updated_at?: string | null
          user_id?: string
          validity_days?: number | null
        }
        Relationships: []
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
      training_plans: {
        Row: {
          client_id: string
          created_at: string | null
          days_per_week: number | null
          equipment: string[] | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          period_end: string | null
          period_start: string
          phase: string | null
          primary_goal: string
          secondary_goal: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          days_per_week?: number | null
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          period_end?: string | null
          period_start: string
          phase?: string | null
          primary_goal: string
          secondary_goal?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          days_per_week?: number | null
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          period_end?: string | null
          period_start?: string
          phase?: string | null
          primary_goal?: string
          secondary_goal?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
          completion_quality: string | null
          created_at: string
          date: string
          duration: number
          final_price: number | null
          id: string
          intensity_notes: string | null
          is_generated: boolean | null
          is_high_intensity_test: boolean | null
          is_late_cancellation: boolean | null
          notes: string | null
          pain_notes: string | null
          pain_reported: boolean | null
          parent_session_id: string | null
          participant_count: number | null
          payment_method: string | null
          payment_status: string | null
          plan_day_id: string | null
          plan_week_id: string | null
          plan_workout_id: string | null
          prep_notes: string | null
          recurrence_end_date: string | null
          recurrence_type: string | null
          rir: number | null
          rpe: number | null
          session_notes: string | null
          status: string
          subjective_difficulty: number | null
          subjective_rating: number | null
          total_volume: number | null
          trainer_problems: string | null
          trainer_recommendations: string | null
          trainer_went_well: string | null
          training_goal: string | null
          training_plan_id: string | null
          training_type: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          canceled_at?: string | null
          client_id: string
          completion_quality?: string | null
          created_at?: string
          date: string
          duration?: number
          final_price?: number | null
          id?: string
          intensity_notes?: string | null
          is_generated?: boolean | null
          is_high_intensity_test?: boolean | null
          is_late_cancellation?: boolean | null
          notes?: string | null
          pain_notes?: string | null
          pain_reported?: boolean | null
          parent_session_id?: string | null
          participant_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          plan_day_id?: string | null
          plan_week_id?: string | null
          plan_workout_id?: string | null
          prep_notes?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          rir?: number | null
          rpe?: number | null
          session_notes?: string | null
          status?: string
          subjective_difficulty?: number | null
          subjective_rating?: number | null
          total_volume?: number | null
          trainer_problems?: string | null
          trainer_recommendations?: string | null
          trainer_went_well?: string | null
          training_goal?: string | null
          training_plan_id?: string | null
          training_type?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          canceled_at?: string | null
          client_id?: string
          completion_quality?: string | null
          created_at?: string
          date?: string
          duration?: number
          final_price?: number | null
          id?: string
          intensity_notes?: string | null
          is_generated?: boolean | null
          is_high_intensity_test?: boolean | null
          is_late_cancellation?: boolean | null
          notes?: string | null
          pain_notes?: string | null
          pain_reported?: boolean | null
          parent_session_id?: string | null
          participant_count?: number | null
          payment_method?: string | null
          payment_status?: string | null
          plan_day_id?: string | null
          plan_week_id?: string | null
          plan_workout_id?: string | null
          prep_notes?: string | null
          recurrence_end_date?: string | null
          recurrence_type?: string | null
          rir?: number | null
          rpe?: number | null
          session_notes?: string | null
          status?: string
          subjective_difficulty?: number | null
          subjective_rating?: number | null
          total_volume?: number | null
          trainer_problems?: string | null
          trainer_recommendations?: string | null
          trainer_went_well?: string | null
          training_goal?: string | null
          training_plan_id?: string | null
          training_type?: string | null
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
          {
            foreignKeyName: "training_sessions_plan_day_id_fkey"
            columns: ["plan_day_id"]
            isOneToOne: false
            referencedRelation: "plan_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_week_id_fkey"
            columns: ["plan_week_id"]
            isOneToOne: false
            referencedRelation: "plan_weeks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_plan_workout_id_fkey"
            columns: ["plan_workout_id"]
            isOneToOne: false
            referencedRelation: "plan_workouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_training_plan_id_fkey"
            columns: ["training_plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
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
      user_approval_log: {
        Row: {
          action: string
          created_at: string
          id: string
          note: string | null
          performed_by: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          note?: string | null
          performed_by: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          note?: string | null
          performed_by?: string
          user_id?: string
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          last_seen: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          last_seen?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          last_seen?: string
          user_id?: string
        }
        Relationships: []
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
      user_sessions: {
        Row: {
          browser: string | null
          created_at: string
          device_type: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          os: string | null
          screen_height: number | null
          screen_width: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          os?: string | null
          screen_height?: number | null
          screen_width?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          browser?: string | null
          created_at?: string
          device_type?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          os?: string | null
          screen_height?: number | null
          screen_width?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      workout_entries: {
        Row: {
          calories: number | null
          created_at: string
          distance_meters: number | null
          exercise_id: string | null
          exercise_name: string
          id: string
          is_pr: boolean | null
          notes: string | null
          reps: number | null
          rpe: number | null
          set_number: number
          time_seconds: number | null
          training_session_id: string
          user_id: string | null
          watts: number | null
          weight_kg: number | null
        }
        Insert: {
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          exercise_id?: string | null
          exercise_name: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          time_seconds?: number | null
          training_session_id: string
          user_id?: string | null
          watts?: number | null
          weight_kg?: number | null
        }
        Update: {
          calories?: number | null
          created_at?: string
          distance_meters?: number | null
          exercise_id?: string | null
          exercise_name?: string
          id?: string
          is_pr?: boolean | null
          notes?: string | null
          reps?: number | null
          rpe?: number | null
          set_number?: number
          time_seconds?: number | null
          training_session_id?: string
          user_id?: string | null
          watts?: number | null
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
      generate_search_name: {
        Args: { name_cs: string; name_en: string }
        Returns: string
      }
      get_current_user_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      normalize_text: { Args: { input_text: string }; Returns: string }
      update_client_balance_atomic: {
        Args: { p_client_id: string; p_delta: number }
        Returns: number
      }
      update_shared_balance_atomic: {
        Args: { p_delta: number; p_group_id: string }
        Returns: number
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
