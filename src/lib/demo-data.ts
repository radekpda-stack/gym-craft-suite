// Demo data store - in-memory mock data for demo mode
// All data resets on page reload

export interface DemoClient {
  id: string;
  name: string;
  email: string;
  phone: string;
  birth_date: string;
  gender: string;
  notes: string;
  credit_balance: number;
  is_favorite: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  training_goals: string[];
  health_restrictions: string;
  occupation: string;
}

export interface DemoTraining {
  id: string;
  client_id: string;
  date: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'canceled';
  notes: string;
  participant_count: number;
  subjective_rating: number | null;
  training_type: string;
  training_goal: string;
  final_price: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
}

export interface DemoDashboardStats {
  totalClients: number;
  activeClients: number;
  totalTrainings: number;
  completedTrainings: number;
  monthlyRevenue: number;
  weeklyTrainings: number;
  upcomingTrainings: number;
  averageRating: number;
}

export interface DemoExercise {
  id: string;
  name: string;
  name_cs: string;
  category: string;
  exercise_type: 'strength' | 'cardio' | 'mobility' | 'skill';
  is_bodyweight: boolean;
  is_time_based: boolean;
  is_unilateral: boolean;
  default_unit: string;
}

export interface DemoTag {
  id: string;
  name: string;
  color: string;
  category: string;
}

// Demo client data
const createDemoClient = (): DemoClient => ({
  id: 'demo-client-001',
  name: 'Jan Novák',
  email: 'jan.novak@demo.local',
  phone: '+420 777 123 456',
  birth_date: '1985-03-15',
  gender: 'male',
  notes: 'Demo klient - silový trénink, rehabilitace kolene',
  credit_balance: 2500,
  is_favorite: true,
  is_archived: false,
  created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
  training_goals: ['síla', 'hubnutí', 'zdraví'],
  health_restrictions: 'Stav po operaci kolene (ACL) - 2023',
  occupation: 'IT specialista',
});

// Demo training data
const createDemoTraining = (): DemoTraining => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  
  return {
    id: 'demo-training-001',
    client_id: 'demo-client-001',
    date: tomorrow.toISOString(),
    duration: 60,
    status: 'scheduled',
    notes: 'Silový trénink - zaměření na dolní končetiny',
    participant_count: 1,
    subjective_rating: null,
    training_type: 'strength',
    training_goal: 'síla',
    final_price: 800,
    payment_status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
};

// Demo dashboard stats
const createDemoDashboardStats = (): DemoDashboardStats => ({
  totalClients: 1,
  activeClients: 1,
  totalTrainings: 24,
  completedTrainings: 23,
  monthlyRevenue: 18400,
  weeklyTrainings: 6,
  upcomingTrainings: 1,
  averageRating: 4.7,
});

// Demo exercises
const createDemoExercises = (): DemoExercise[] => [
  {
    id: 'demo-ex-001',
    name: 'Back Squat',
    name_cs: 'Dřep se vzpěračskou tyčí',
    category: 'Dolní tělo',
    exercise_type: 'strength',
    is_bodyweight: false,
    is_time_based: false,
    is_unilateral: false,
    default_unit: 'reps',
  },
  {
    id: 'demo-ex-002',
    name: 'Romanian Deadlift',
    name_cs: 'Rumunský mrtvý tah',
    category: 'Dolní tělo',
    exercise_type: 'strength',
    is_bodyweight: false,
    is_time_based: false,
    is_unilateral: false,
    default_unit: 'reps',
  },
  {
    id: 'demo-ex-003',
    name: 'Rowing 2000m',
    name_cs: 'Veslo - 2000m',
    category: 'Kardio',
    exercise_type: 'cardio',
    is_bodyweight: true,
    is_time_based: true,
    is_unilateral: false,
    default_unit: 'cardio_machine',
  },
  {
    id: 'demo-ex-004',
    name: 'Hip Stretch',
    name_cs: 'Protažení kyčlí',
    category: 'Mobilita',
    exercise_type: 'mobility',
    is_bodyweight: true,
    is_time_based: true,
    is_unilateral: true,
    default_unit: 'seconds',
  },
  {
    id: 'demo-ex-005',
    name: 'Turkish Get-Up',
    name_cs: 'Turecký vstávák',
    category: 'Skill',
    exercise_type: 'skill',
    is_bodyweight: false,
    is_time_based: false,
    is_unilateral: true,
    default_unit: 'reps',
  },
];

// Demo tags
const createDemoTags = (): DemoTag[] => [
  { id: 'demo-tag-001', name: 'silový', color: '#ef4444', category: 'training_type' },
  { id: 'demo-tag-002', name: 'dolní končetiny', color: '#3b82f6', category: 'body_part' },
  { id: 'demo-tag-003', name: 'rehabilitace', color: '#10b981', category: 'focus' },
  { id: 'demo-tag-004', name: 'koleno_friendly', color: '#f59e0b', category: 'health' },
];

// Store instances (reset on page reload automatically)
let demoClient: DemoClient | null = null;
let demoTraining: DemoTraining | null = null;
let demoDashboardStats: DemoDashboardStats | null = null;
let demoExercises: DemoExercise[] = [];
let demoTags: DemoTag[] = [];

// Getters (lazily initialize)
export function getDemoClient(): DemoClient {
  if (!demoClient) {
    demoClient = createDemoClient();
  }
  return demoClient;
}

export function getDemoTraining(): DemoTraining {
  if (!demoTraining) {
    demoTraining = createDemoTraining();
  }
  return demoTraining;
}

export function getDemoDashboardStats(): DemoDashboardStats {
  if (!demoDashboardStats) {
    demoDashboardStats = createDemoDashboardStats();
  }
  return demoDashboardStats;
}

export function getDemoExercises(): DemoExercise[] {
  if (demoExercises.length === 0) {
    demoExercises = createDemoExercises();
  }
  return demoExercises;
}

export function getDemoTags(): DemoTag[] {
  if (demoTags.length === 0) {
    demoTags = createDemoTags();
  }
  return demoTags;
}

// Reset all demo data
export function resetDemoData(): void {
  demoClient = createDemoClient();
  demoTraining = createDemoTraining();
  demoDashboardStats = createDemoDashboardStats();
  demoExercises = createDemoExercises();
  demoTags = createDemoTags();
}

// Update demo client
export function updateDemoClientData(updates: Partial<DemoClient>): DemoClient {
  demoClient = { ...getDemoClient(), ...updates, updated_at: new Date().toISOString() };
  return demoClient;
}

// Update demo training
export function updateDemoTrainingData(updates: Partial<DemoTraining>): DemoTraining {
  demoTraining = { ...getDemoTraining(), ...updates, updated_at: new Date().toISOString() };
  return demoTraining;
}
