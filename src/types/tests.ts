// Test definitions and sessions types

export type TestCategory = 'cardio' | 'strength' | 'endurance' | 'grip_core' | 'mobility';
export type DeviceFamily = 'SkillRow' | 'SkillUp' | 'SkillRun';
export type MetricBetter = 'lower_is_better' | 'higher_is_better';
export type ResistanceMode = 'level_1_10' | 'magnet_1_3';
export type WarmupType = 'general' | 'specific' | 'mobility_prep' | 'none';
export type TestDueStatus = 'due' | 'soon' | 'ok';

export interface MetricSchema {
  type: 'number' | 'string' | 'boolean';
  label: string;
  required?: boolean;
  readonly?: boolean;
  default?: number | string;
  min?: number;
  max?: number;
}

export interface ComparabilityRules {
  requires_same_resistance?: boolean;
  requires_same_device_family?: boolean;
  requires_same_incline?: boolean;
  incline_tolerance?: number;
  always_comparable?: boolean;
}

export interface TestDefinition {
  id: string;
  user_id: string | null;
  name: string;
  name_cs: string | null;
  category: TestCategory;
  linked_exercise_id: string | null;
  device_family: DeviceFamily | null;
  primary_metric_key: string;
  primary_metric_better: MetricBetter;
  protocol_text: string | null;
  how_to_steps: string[];
  standardization_checklist: string[];
  equipment_setup: Record<string, unknown>;
  common_mistakes: string[];
  validity_rules: string[];
  required_metrics_schema: Record<string, MetricSchema>;
  optional_metrics_schema: Record<string, MetricSchema>;
  scoring_rules: Record<string, unknown>;
  recommended_frequency_days: number;
  comparability_rules_json: ComparabilityRules;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  exercises?: {
    id: string;
    name: string;
  } | null;
}

export interface MachineSettings {
  device_family: DeviceFamily;
  device_model?: string;
  mode?: string;
  // SkillRow/SkillUp - mutually exclusive
  resistance_mode?: ResistanceMode;
  resistance_level_1_10?: number; // 1-10, only when resistance_mode = level_1_10
  magnet_1_3?: number; // 1-3, only when resistance_mode = magnet_1_3
  // SkillRun
  incline_pct?: number; // 1-15
  speed_control_mode?: string;
  notes?: string;
}

export interface SplitEntry {
  distance_m: number;
  time_s: number;
  pace_s_per_500?: number;
}

export interface TestSession {
  id: string;
  user_id: string;
  test_definition_id: string;
  client_id: string;
  date_time: string;
  metrics_json: Record<string, number | string | null>;
  splits_json: SplitEntry[] | null;
  machine_settings_json: MachineSettings | null;
  warmup_done: boolean;
  warmup_type: WarmupType[];
  warmup_notes: string | null;
  is_valid: boolean;
  invalid_reason: string | null;
  quality_rating_1_5: number | null;
  rpe_1_10: number | null;
  is_comparable: boolean;
  non_comparable_reason: string | null;
  notes: string | null;
  environment_json: Record<string, unknown> | null;
  attachments: string[] | null;
  exercise_entry_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined relations
  test_definitions?: TestDefinition;
  clients?: {
    id: string;
    name: string;
  } | null;
}

export interface CreateTestSessionInput {
  test_definition_id: string;
  client_id: string;
  date_time: string;
  metrics_json: Record<string, number | string | null>;
  splits_json?: SplitEntry[] | null;
  machine_settings_json?: MachineSettings | null;
  warmup_done: boolean;
  warmup_type: WarmupType[];
  warmup_notes?: string | null;
  is_valid: boolean;
  invalid_reason?: string | null;
  quality_rating_1_5?: number | null;
  rpe_1_10?: number | null;
  notes?: string | null;
}

export interface TestStats {
  lastResult: TestSession | null;
  pr: {
    value: number;
    date: string;
    session: TestSession;
  } | null;
  trendVsLast: {
    absoluteChange: number;
    percentChange: number;
  } | null;
  trendVsPr: {
    absoluteChange: number;
    percentChange: number;
  } | null;
  totalSessions: number;
  validComparableSessions: number;
  dueStatus: TestDueStatus;
  daysSinceLastTest: number | null;
}
