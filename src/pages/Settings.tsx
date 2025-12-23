import { useState } from 'react';
import {
  CreditCard,
  Package,
  Tag,
  Dumbbell,
  Globe,
  MessageSquare,
  Building2,
  BarChart2,
  Gauge,
  FileBarChart2,
  User,
  Wallet,
  BookOpen,
  Wrench,
  Users,
  Calendar,
  Download,
  Shield,
  RefreshCw,
  KeyRound,
  ClipboardList,
  UtensilsCrossed,
  Stethoscope,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PackagesManagement } from '@/components/settings/PackagesManagement';
import { TrainingPricesSettings } from '@/components/settings/TrainingPricesSettings';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { ExercisesManagement } from '@/components/settings/ExercisesManagement';
import { FeedbackSettings } from '@/components/settings/FeedbackSettings';
import { CompanyProfileSettings } from '@/components/settings/CompanyProfileSettings';
import { FeatureUsageStats } from '@/components/settings/FeatureUsageStats';
import { CapacitySettingsPanel } from '@/components/settings/CapacitySettings';
import { AnnualStatsExport } from '@/components/settings/AnnualStatsExport';
import { CreditThresholdSettings } from '@/components/settings/CreditThresholdSettings';
import { CalendarSharingSettings } from '@/components/settings/CalendarSharingSettings';
import { DataExport } from '@/components/settings/DataExport';
import { AdminAnalyticsExport } from '@/components/settings/AdminAnalyticsExport';
import { AppRefreshSettings } from '@/components/settings/AppRefreshSettings';
import { PasswordChangeSettings } from '@/components/settings/PasswordChangeSettings';
import { NutritionQuestionnaireSettings } from '@/components/settings/NutritionQuestionnaireSettings';
import { DiagnosticQuestionnaireSettings } from '@/components/settings/DiagnosticQuestionnaireSettings';
import { useLanguage } from '@/lib/i18n';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface SettingsCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  sections: SettingsSection[];
}

export default function Settings() {
  usePageTracking('settings');
  const { language, setLanguage, t } = useLanguage();
  const isMobile = useIsMobile();
  const { data: isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  // Check if current user is the owner (radek.pda@gmail.com)
  const isOwner = user?.email === 'radek.pda@gmail.com';

  const categories: SettingsCategory[] = [
    // 1. PROFIL
    {
      id: 'profile',
      title: language === 'cs' ? 'Profil' : 'Profile',
      icon: User,
      iconColor: 'text-blue-500',
      sections: [
        {
          id: 'language',
          title: t.settings.language,
          description: t.settings.languageDesc,
          icon: Globe,
          content: (
            <div className="flex gap-3">
              <button
                onClick={() => setLanguage('cs')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all',
                  language === 'cs'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-subtle hover:bg-secondary/50 text-foreground'
                )}
              >
                <span className="text-lg">🇨🇿</span>
                <span className="font-medium">{t.settings.languageCzech}</span>
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all',
                  language === 'en'
                    ? 'bg-primary text-primary-foreground'
                    : 'glass-subtle hover:bg-secondary/50 text-foreground'
                )}
              >
                <span className="text-lg">🇬🇧</span>
                <span className="font-medium">{t.settings.languageEnglish}</span>
              </button>
            </div>
          ),
        },
        {
          id: 'company',
          title: language === 'cs' ? 'Firemní profil' : 'Company Profile',
          description: language === 'cs' ? 'Údaje pro hlavičku PDF výpisů' : 'Details for PDF statement headers',
          icon: Building2,
          content: <CompanyProfileSettings />,
        },
        {
          id: 'password',
          title: language === 'cs' ? 'Změna hesla' : 'Change Password',
          description: language === 'cs' ? 'Změňte si přístupové heslo k účtu' : 'Change your account password',
          icon: KeyRound,
          content: <PasswordChangeSettings />,
        },
      ],
    },
    // 2. TRÉNINKY
    {
      id: 'training',
      title: language === 'cs' ? 'Tréninky' : 'Trainings',
      icon: Dumbbell,
      iconColor: 'text-green-500',
      sections: [
        {
          id: 'prices',
          title: t.settings.prices,
          description: t.settings.pricesDesc,
          icon: CreditCard,
          content: <TrainingPricesSettings />,
        },
        {
          id: 'capacity',
          title: language === 'cs' ? 'Pracovní doba (pro přehled)' : 'Working Hours (for overview)',
          description: language === 'cs' ? 'Používá se pro přehled v kalendáři' : 'Used for calendar overview',
          icon: Gauge,
          content: <CapacitySettingsPanel />,
        },
        {
          id: 'calendar-sharing',
          title: language === 'cs' ? 'Sdílení kalendáře' : 'Calendar Sharing',
          description: language === 'cs' ? 'Pozvěte jiné trenéry k zobrazení vašeho kalendáře' : 'Invite other trainers to view your calendar',
          icon: Calendar,
          content: <CalendarSharingSettings />,
        },
      ],
    },
    // 3. KLIENTI A FINANCE
    {
      id: 'clients',
      title: language === 'cs' ? 'Klienti a Finance' : 'Clients & Finance',
      icon: Users,
      iconColor: 'text-amber-500',
      sections: [
        {
          id: 'packages',
          title: language === 'cs' ? 'Tréninkové balíčky' : 'Training Packages',
          description: language === 'cs' ? 'Definice předplacených balíčků tréninků' : 'Define prepaid training packages',
          icon: Package,
          content: <PackagesManagement />,
        },
        {
          id: 'credit-thresholds',
          title: language === 'cs' ? 'Prahy kreditu' : 'Credit Thresholds',
          description: language === 'cs' ? 'Nastavení prahů pro upozornění na nízký kredit' : 'Configure low credit alert thresholds',
          icon: Wallet,
          content: <CreditThresholdSettings />,
        },
      ],
    },
    // 4. DOTAZNÍKY
    {
      id: 'questionnaires',
      title: language === 'cs' ? 'Dotazníky' : 'Questionnaires',
      icon: ClipboardList,
      iconColor: 'text-cyan-500',
      sections: [
        {
          id: 'feedback-settings',
          title: language === 'cs' ? 'Feedbackový dotazník' : 'Feedback Questionnaire',
          description: language === 'cs' ? 'Otázky a nastavení po-tréninkového feedbacku' : 'Post-training feedback questions and settings',
          icon: MessageSquare,
          content: <FeedbackSettings />,
        },
        {
          id: 'nutrition-questionnaire',
          title: language === 'cs' ? 'Jídelní deník' : 'Food Diary',
          description: language === 'cs' ? 'Nastavení a texty nutričního dotazníku' : 'Nutrition questionnaire settings and texts',
          icon: UtensilsCrossed,
          content: <NutritionQuestionnaireSettings />,
        },
        {
          id: 'diagnostic-questionnaire',
          title: language === 'cs' ? 'Vstupní diagnostika' : 'Intake Diagnostic',
          description: language === 'cs' ? 'Sekce a otázky vstupního dotazníku' : 'Intake questionnaire sections and questions',
          icon: Stethoscope,
          content: <DiagnosticQuestionnaireSettings />,
        },
      ],
    },
    // 5. KNIHOVNY
    {
      id: 'libraries',
      title: language === 'cs' ? 'Knihovny' : 'Libraries',
      icon: BookOpen,
      iconColor: 'text-purple-500',
      sections: [
        {
          id: 'exercises',
          title: t.settings.exercises,
          description: t.settings.exercisesDesc,
          icon: Dumbbell,
          content: <ExercisesManagement />,
        },
        {
          id: 'tags',
          title: t.settings.tags,
          description: t.settings.tagsDesc,
          icon: Tag,
          content: <TagsManagement />,
        },
      ],
    },
    // 6. POKROČILÉ
    {
      id: 'advanced',
      title: language === 'cs' ? 'Pokročilé' : 'Advanced',
      icon: Wrench,
      iconColor: 'text-rose-500',
      sections: [
        {
          id: 'app-refresh',
          title: language === 'cs' ? 'Obnovení aplikace' : 'App Refresh',
          description: language === 'cs' ? 'Vynutit obnovení dat a vyčištění cache' : 'Force data refresh and cache clearing',
          icon: RefreshCw,
          content: <AppRefreshSettings />,
        },
        {
          id: 'data-export',
          title: language === 'cs' ? 'Export dat' : 'Data Export',
          description: language === 'cs' ? 'Export všech dat pro analýzu nebo zálohu' : 'Export all data for analysis or backup',
          icon: Download,
          content: <DataExport />,
        },
        // Feature usage stats - only visible for admin
        ...(isAdmin ? [{
          id: 'feature-usage',
          title: language === 'cs' ? 'Statistiky využívání' : 'Usage Statistics',
          description: language === 'cs' ? 'Analýza využívání funkcí aplikace od všech uživatelů' : 'App feature usage analytics from all users',
          icon: BarChart2,
          content: <FeatureUsageStats />,
        }] : []),
        // Admin analytics export - only visible for owner
        ...(isOwner ? [{
          id: 'admin-analytics',
          title: language === 'cs' ? 'Analytický export (Admin)' : 'Analytics Export (Admin)',
          description: language === 'cs' ? 'Anonymizovaný export využití aplikace pro AI analýzu' : 'Anonymized app usage export for AI analysis',
          icon: Shield,
          content: <AdminAnalyticsExport />,
        }] : []),
      ],
    },
  ];

  const renderSection = (section: SettingsSection) => (
    <div key={section.id} className="glass rounded-xl p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
          <section.icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground">{section.title}</h3>
          <p className="text-sm text-muted-foreground">{section.description}</p>
        </div>
      </div>
      {section.content}
    </div>
  );

  // Mobile: Accordion layout
  if (isMobile) {
    return (
      <div className="space-y-4 animate-fade-in pb-24">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {t.settings.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {t.settings.subtitle}
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          {categories.map((category) => (
            <AccordionItem
              key={category.id}
              value={category.id}
              className="glass rounded-xl border-0 overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg bg-secondary/50', category.iconColor)}>
                    <category.icon className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{category.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.sections.length} {language === 'cs' ? 'položek' : 'items'}
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-2">
                  {category.sections.map(renderSection)}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  }

  // Desktop: Tab layout
  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">
          {t.settings.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full h-auto flex-wrap gap-1 p-1 bg-secondary/30 rounded-xl mb-6">
          {categories.map((category) => (
            <TabsTrigger
              key={category.id}
              value={category.id}
              className="flex-1 min-w-[120px] gap-2 py-2.5 px-4 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <category.icon className={cn('w-4 h-4', category.iconColor)} />
              <span className="hidden lg:inline">{category.title}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.id} value={category.id} className="mt-0">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <div className={cn('p-3 rounded-xl bg-secondary/50', category.iconColor)}>
                  <category.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{category.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {category.sections.length} {language === 'cs' ? 'nastavení v této kategorii' : 'settings in this category'}
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                {category.sections.map(renderSection)}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
