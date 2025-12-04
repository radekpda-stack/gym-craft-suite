// ERD Entity Types

export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  settings: TrainerSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainerSettings {
  googleCalendarConnected: boolean;
  appleCalendarConnected: boolean;
  defaultSessionDuration: number;
  workingHours: { start: string; end: string };
  exportFormat: 'pdf' | 'excel';
}

export interface Client {
  id: string;
  trainerId: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  trainingGoals: string[];
  notes: string;
  healthRestrictions: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingSession {
  id: string;
  clientId: string;
  templateId?: string;
  date: Date;
  duration: number; // minutes
  notes: string;
  subjectiveRating: number; // 1-10
  status: 'scheduled' | 'completed' | 'canceled';
  canceledAt?: Date;
  isLateCancellation?: boolean;
  exercises: TrainingExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingExercise {
  id: string;
  sessionId: string;
  exerciseId: string;
  exercise?: Exercise;
  sets: number;
  reps: number;
  weight: number;
  notes: string;
  subjectiveRating: number; // 1-10
  order: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  description: string;
  muscleGroups: string[];
  equipment?: string[];
  videoUrl?: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface Measurement {
  id: string;
  clientId: string;
  date: Date;
  weight?: number;
  bodyFatPercentage?: number;
  muscleMass?: number;
  basalMetabolism?: number;
  circumferences?: Circumferences;
  notes: string;
  createdAt: Date;
}

export interface Circumferences {
  chest?: number;
  waist?: number;
  hips?: number;
  bicepLeft?: number;
  bicepRight?: number;
  thighLeft?: number;
  thighRight?: number;
  calfLeft?: number;
  calfRight?: number;
}

export interface MentalState {
  id: string;
  clientId: string;
  date: Date;
  rating: number; // 1-10
  notes: string;
  createdAt: Date;
}

export interface DiagnosticsEntry {
  id: string;
  clientId: string;
  date: Date;
  jointId?: string;
  muscleGroupId?: string;
  findings: string;
  notes: string;
  createdAt: Date;
}

export interface Joint {
  id: string;
  name: string;
  nameCs: string; // Czech name
  bodyPart: 'lower' | 'upper' | 'spine';
}

export interface MuscleGroup {
  id: string;
  name: string;
  nameCs: string;
  category: string;
}

export interface CalendarEvent {
  id: string;
  trainerId: string;
  clientId?: string;
  sessionId?: string;
  title: string;
  start: Date;
  end: Date;
  type: 'training' | 'personal' | 'other';
  color?: string;
  externalId?: string; // Google/Apple Calendar ID
  createdAt: Date;
  updatedAt: Date;
}

// Stats & Analytics
export interface TrainerStats {
  totalClients: number;
  totalSessions: number;
  sessionsThisWeek: number;
  sessionsThisMonth: number;
  canceledSessions: number;
  lateCancellations: number;
  averageSessionRating: number;
  upcomingToday: TrainingSession[];
}

export interface ClientStats {
  totalSessions: number;
  completedSessions: number;
  canceledSessions: number;
  lateCancellations: number;
  averageRating: number;
  lastSession?: Date;
  nextSession?: Date;
}

// API Response types
export type ApiResponse<T> = {
  data: T;
  success: boolean;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<T> & {
  total: number;
  page: number;
  pageSize: number;
};
