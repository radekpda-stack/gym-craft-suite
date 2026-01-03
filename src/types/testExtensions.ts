// Extended test types for goals, schedules, batteries, context, and benchmarks

export interface TestGoal {
  id: string;
  user_id: string;
  client_id: string;
  test_definition_id: string;
  target_value: number;
  target_date: string | null;
  achieved_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TestSchedule {
  id: string;
  user_id: string;
  client_id: string;
  test_definition_id: string;
  scheduled_date: string;
  reminder_days_before: number;
  is_completed: boolean;
  completed_session_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  test_definitions?: {
    id: string;
    name: string;
    name_cs: string | null;
    category: string;
  };
}

export interface TestBattery {
  id: string;
  user_id: string;
  name: string;
  name_cs: string | null;
  description: string | null;
  test_definition_ids: string[];
  recommended_order: number[];
  rest_between_tests_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TestContext {
  id: string;
  test_session_id: string;
  sleep_quality_1_5: number | null;
  sleep_hours: number | null;
  stress_level_1_5: number | null;
  motivation_level_1_5: number | null;
  nutrition_quality_1_5: number | null;
  hours_since_last_meal: number | null;
  caffeine_mg: number | null;
  hydration_level_1_5: number | null;
  days_since_last_training: number | null;
  last_training_intensity: string | null;
  subjective_readiness_1_10: number | null;
  notes: string | null;
  created_at: string;
}

export interface TestBenchmark {
  id: string;
  test_definition_id: string;
  gender: 'male' | 'female' | 'any';
  age_min: number | null;
  age_max: number | null;
  percentile_5: number | null;
  percentile_25: number | null;
  percentile_50: number | null;
  percentile_75: number | null;
  percentile_95: number | null;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface CreateTestGoalInput {
  client_id: string;
  test_definition_id: string;
  target_value: number;
  target_date?: string | null;
  notes?: string | null;
}

export interface CreateTestScheduleInput {
  client_id: string;
  test_definition_id: string;
  scheduled_date: string;
  reminder_days_before?: number;
  notes?: string | null;
}

export interface CreateTestContextInput {
  test_session_id: string;
  sleep_quality_1_5?: number | null;
  sleep_hours?: number | null;
  stress_level_1_5?: number | null;
  motivation_level_1_5?: number | null;
  nutrition_quality_1_5?: number | null;
  hours_since_last_meal?: number | null;
  caffeine_mg?: number | null;
  hydration_level_1_5?: number | null;
  days_since_last_training?: number | null;
  last_training_intensity?: string | null;
  subjective_readiness_1_10?: number | null;
  notes?: string | null;
}
