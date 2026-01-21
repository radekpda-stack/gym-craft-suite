/**
 * Social Media Export types
 * For generating shareable statistics cards
 */

export type ExportFormat = 'instagram-post' | 'instagram-story' | 'facebook' | 'twitter';
export type ExportTheme = 'dark' | 'light' | 'gradient';
export type ExportPeriod = 'month' | 'year' | 'all' | 'custom';

export interface ExportDimensions {
  width: number;
  height: number;
  label: string;
}

export const EXPORT_FORMATS: Record<ExportFormat, ExportDimensions> = {
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Stories' },
  'facebook': { width: 1200, height: 630, label: 'Facebook' },
  'twitter': { width: 1600, height: 900, label: 'Twitter / X' },
};

export type MetricCategory = 
  | 'community'
  | 'trainings'
  | 'performance'
  | 'exercises'
  | 'challenges';

export interface MetricOption {
  id: string;
  category: MetricCategory;
  label: string;
  labelEn: string;
  icon: string;
  getValue: (data: SocialExportData) => string | number | null;
  getSubtext?: (data: SocialExportData) => string | null;
}

export interface SocialExportData {
  // Community
  activeClients: number;
  newClientsThisMonth: number;
  maleClients: number;
  femaleClients: number;
  leftHandedClients: number;
  rightHandedClients: number;
  avgClientAge: number | null;
  avgClientLifetimeMonths: number;
  longestClientMonths: number;
  
  // Trainings
  trainingsThisMonth: number;
  trainingsThisYear: number;
  trainingsTotal: number;
  hoursThisMonth: number;
  hoursThisYear: number;
  hoursTotal: number;
  avgTrainingsPerWeek: number;
  mostActiveDay: string;
  recordTrainingsInDay: number;
  
  // Performance / PRs
  prsThisMonth: number;
  prsThisYear: number;
  prsTotal: number;
  maxWeightLifted: number | null;
  maxWeightExercise: string | null;
  maxWeightClient: string | null;
  totalVolumeTons: number;
  prVelocity: number; // PRs per week
  
  // Gender stats for PRs
  malePRs: number;
  femalePRs: number;
  
  // Exercises
  uniqueExercises: number;
  topExercises: Array<{ name: string; count: number }>;
  topMovementPattern: string | null;
  
  // Challenges
  activeChallenges: number;
  totalChallengeParticipants: number;
  challengeCompletionRate: number | null;
}

export interface ExportSettings {
  period: ExportPeriod;
  customStart?: Date;
  customEnd?: Date;
  format: ExportFormat;
  theme: ExportTheme;
  showLogo: boolean;
  showTrainerName: boolean;
  showSocialHandle: boolean;
  trainerName?: string;
  socialHandle?: string;
}

export interface ExportTemplate {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  metrics: string[];
  icon: string;
}

export const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'monthly-summary',
    name: 'Měsíční shrnutí',
    nameEn: 'Monthly Summary',
    description: 'Tréninky, klienti a výkony',
    descriptionEn: 'Trainings, clients and performance',
    metrics: ['activeClients', 'trainingsThisMonth', 'hoursThisMonth', 'prsThisMonth'],
    icon: 'Calendar',
  },
  {
    id: 'annual-balance',
    name: 'Roční bilance',
    nameEn: 'Annual Balance',
    description: 'Celková čísla za rok',
    descriptionEn: 'Total numbers for the year',
    metrics: ['trainingsThisYear', 'hoursThisYear', 'prsThisYear', 'totalVolumeTons'],
    icon: 'TrendingUp',
  },
  {
    id: 'pr-highlights',
    name: 'PR Highlights',
    nameEn: 'PR Highlights',
    description: 'Osobní rekordy a maximální váhy',
    descriptionEn: 'Personal records and max weights',
    metrics: ['prsThisMonth', 'maxWeightLifted', 'prVelocity', 'totalVolumeTons'],
    icon: 'Trophy',
  },
  {
    id: 'career-milestone',
    name: 'Kariérní milník',
    nameEn: 'Career Milestone',
    description: 'Celková čísla za kariéru',
    descriptionEn: 'Total career numbers',
    metrics: ['trainingsTotal', 'hoursTotal', 'activeClients', 'prsTotal'],
    icon: 'Award',
  },
  {
    id: 'fun-facts',
    name: 'Zajímavosti',
    nameEn: 'Fun Facts',
    description: 'Leváci vs praváci, muži vs ženy',
    descriptionEn: 'Left vs right handed, men vs women',
    metrics: ['maleVsFemale', 'leftVsRight', 'avgClientAge', 'longestClientMonths'],
    icon: 'Sparkles',
  },
  {
    id: 'community',
    name: 'Komunita',
    nameEn: 'Community',
    description: 'Přehled klientů a jejich loajality',
    descriptionEn: 'Client overview and loyalty',
    metrics: ['activeClients', 'newClientsThisMonth', 'avgClientLifetimeMonths', 'longestClientMonths'],
    icon: 'Users',
  },
];
