import { useState } from 'react';
import {
  Calendar,
  Download,
  Upload,
  Link2,
  Bell,
  Check,
  CreditCard,
  Package,
  Tag,
  Dumbbell,
  Globe,
  BarChart3,
  MessageSquare,
  Calculator,
  Building2,
  Gauge,
  FileBarChart2,
  Zap,
  User,
  Wallet,
  BookOpen,
  Settings2,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ProductsManagement } from '@/components/settings/ProductsManagement';
import { TrainingPricesSettings } from '@/components/settings/TrainingPricesSettings';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { ExercisesManagement } from '@/components/settings/ExercisesManagement';
import { FeatureUsageStats } from '@/components/settings/FeatureUsageStats';
import { FeedbackSettings } from '@/components/settings/FeedbackSettings';
import { CreditRecalculationTool } from '@/components/settings/CreditRecalculationTool';
import { CompanyProfileSettings } from '@/components/settings/CompanyProfileSettings';
import { CapacitySettingsPanel } from '@/components/settings/CapacitySettings';
import { AnnualStatsExport } from '@/components/settings/AnnualStatsExport';
import { QuickActionSettings } from '@/components/settings/QuickActionSettings';
import { CreditThresholdSettings } from '@/components/settings/CreditThresholdSettings';
import { useLanguage } from '@/lib/i18n';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const [googleConnected, setGoogleConnected] = useState(false);
  const [appleConnected, setAppleConnected] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const { language, setLanguage, t } = useLanguage();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('profile');

  const categories: SettingsCategory[] = [
    {
      id: 'profile',
      title: language === 'cs' ? 'Profil a Vzhled' : 'Profile & Appearance',
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
          id: 'quick-actions',
          title: language === 'cs' ? 'Rychlá nabídka' : 'Quick Actions',
          description: language === 'cs' ? 'Upravte pořadí a viditelnost akcí v plovoucím tlačítku' : 'Customize order and visibility of floating action button',
          icon: Zap,
          content: <QuickActionSettings />,
        },
      ],
    },
    {
      id: 'training',
      title: language === 'cs' ? 'Tréninky a Finance' : 'Training & Finance',
      icon: Wallet,
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
          id: 'credit-thresholds',
          title: language === 'cs' ? 'Prahy kreditu' : 'Credit Thresholds',
          description: language === 'cs' ? 'Nastavení prahů pro upozornění' : 'Configure alert thresholds',
          icon: Wallet,
          content: <CreditThresholdSettings />,
        },
        {
          id: 'capacity',
          title: language === 'cs' ? 'Kapacita a pracovní doba' : 'Capacity & Working Hours',
          description: language === 'cs' ? 'Pracovní dny, hodiny a délka slotů' : 'Working days, hours and slot duration',
          icon: Gauge,
          content: <CapacitySettingsPanel />,
        },
      ],
    },
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
          id: 'products',
          title: t.settings.products,
          description: t.settings.productsDesc,
          icon: Package,
          content: <ProductsManagement />,
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
    {
      id: 'notifications',
      title: language === 'cs' ? 'Notifikace' : 'Notifications',
      icon: Bell,
      iconColor: 'text-amber-500',
      sections: [
        {
          id: 'push-notifications',
          title: t.settings.notifications,
          description: t.settings.notificationsDesc,
          icon: Bell,
          content: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">{t.settings.pushNotifications}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.pushNotificationsDesc}
                  </p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">{t.settings.emailReminders}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.emailRemindersDesc}
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">{t.settings.lowCreditAlert}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.lowCreditAlertDesc}
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          ),
        },
        {
          id: 'feedback-settings',
          title: language === 'cs' ? 'Nastavení feedbacku' : 'Feedback Settings',
          description: language === 'cs' ? 'Automatické odesílání a konfigurace dotazníků' : 'Auto-send and questionnaire configuration',
          icon: MessageSquare,
          content: <FeedbackSettings />,
        },
      ],
    },
    {
      id: 'integrations',
      title: language === 'cs' ? 'Integrace' : 'Integrations',
      icon: Settings2,
      iconColor: 'text-cyan-500',
      sections: [
        {
          id: 'calendar',
          title: t.settings.calendar,
          description: t.settings.calendarDesc,
          icon: Calendar,
          content: (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl glass-subtle">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#4285F4]/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#4285F4]">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t.settings.googleCalendar}</p>
                    <p className="text-sm text-muted-foreground">
                      {googleConnected ? t.settings.connected : t.settings.notConnected}
                    </p>
                  </div>
                </div>
                <Button
                  variant={googleConnected ? 'outline' : 'default'}
                  onClick={() => setGoogleConnected(!googleConnected)}
                  className="gap-2"
                >
                  {googleConnected ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t.settings.disconnect}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      {t.settings.connect}
                    </>
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl glass-subtle">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-foreground/10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 text-foreground">
                      <path fill="currentColor" d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{t.settings.appleCalendar}</p>
                    <p className="text-sm text-muted-foreground">
                      {appleConnected ? t.settings.connected : t.settings.notConnected}
                    </p>
                  </div>
                </div>
                <Button
                  variant={appleConnected ? 'outline' : 'default'}
                  onClick={() => setAppleConnected(!appleConnected)}
                  className="gap-2"
                >
                  {appleConnected ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t.settings.disconnect}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4" />
                      {t.settings.connect}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ),
        },
        {
          id: 'backup',
          title: t.settings.backup,
          description: t.settings.backupDesc,
          icon: Download,
          content: (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">{t.settings.autoBackup}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t.settings.autoBackupDesc}
                  </p>
                </div>
                <Switch checked={autoBackup} onCheckedChange={setAutoBackup} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="gap-2 flex-1 glass-subtle border-0">
                  <Download className="w-4 h-4" />
                  {t.settings.exportAll}
                </Button>
                <Button variant="outline" className="gap-2 flex-1 glass-subtle border-0">
                  <Upload className="w-4 h-4" />
                  {t.settings.importData}
                </Button>
              </div>
            </div>
          ),
        },
      ],
    },
    {
      id: 'tools',
      title: language === 'cs' ? 'Nástroje' : 'Tools',
      icon: Wrench,
      iconColor: 'text-rose-500',
      sections: [
        {
          id: 'credit-recalc',
          title: language === 'cs' ? 'Přepočet kreditů' : 'Credit Recalculation',
          description: language === 'cs' ? 'Kontrola a oprava nesrovnalostí' : 'Check and fix discrepancies',
          icon: Calculator,
          content: <CreditRecalculationTool />,
        },
        {
          id: 'annual-stats',
          title: language === 'cs' ? 'Roční statistiky' : 'Annual Statistics',
          description: language === 'cs' ? 'Export PDF reportu' : 'Export PDF report',
          icon: FileBarChart2,
          content: <AnnualStatsExport />,
        },
        {
          id: 'feature-usage',
          title: language === 'cs' ? 'Statistiky využívání' : 'Usage Statistics',
          description: language === 'cs' ? 'Přehled využívaných funkcí' : 'Overview of used features',
          icon: BarChart3,
          content: <FeatureUsageStats />,
        },
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
