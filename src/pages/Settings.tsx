import { useState } from 'react';
import {
  User,
  Globe,
  Building2,
  KeyRound,
  Calendar,
  Clock,
  CreditCard,
  AlertTriangle,
  Package,
  Tag,
  Wrench,
  RefreshCw,
  BarChart2,
  Shield,
  UserCog,
  Bell,
  Settings2,
  Zap,
  LayoutDashboard,
  Boxes,
  Dumbbell,
  Paintbrush,
  Share2,
  Sparkles,
  Calculator,
} from 'lucide-react';
import { SettingsLayout, SettingsCategory } from '@/components/settings/SettingsLayout';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { PackagesManagement } from '@/components/settings/PackagesManagement';
import { PriceListSettings } from '@/components/settings/PriceListSettings';
import { CreditThresholdSettings } from '@/components/settings/CreditThresholdSettings';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { CompanyProfileSettings } from '@/components/settings/CompanyProfileSettings';
import { PriceTransitionSettings } from '@/components/settings/PriceTransitionSettings';

import { FeatureUsageStats } from '@/components/settings/FeatureUsageStats';
import { CapacitySettingsPanel } from '@/components/settings/CapacitySettings';
// DataExport removed - functionality moved to AdminAnalyticsExport
import { AdminAnalyticsExport } from '@/components/settings/AdminAnalyticsExport';
import { FinancialReportSettings } from '@/components/settings/FinancialReportSettings';
import { AppRefreshSettings } from '@/components/settings/AppRefreshSettings';
import { PasswordChangeSettings } from '@/components/settings/PasswordChangeSettings';
import { UserManagementSettings } from '@/components/settings/UserManagementSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { DefaultValuesSettings } from '@/components/settings/DefaultValuesSettings';
import { DashboardPersonalizationSettings } from '@/components/settings/DashboardPersonalizationSettings';
import { QuickActionSettings } from '@/components/settings/QuickActionSettings';
import { ModuleSettings } from '@/components/settings/ModuleSettings';
import { ExercisesManagementSection } from '@/components/settings/exercises/ExercisesManagementSection';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { SocialMediaExport } from '@/components/settings/SocialMediaExport';
import { AIAssistantSettings } from '@/components/settings/AIAssistantSettings';
// CalendarSyncSettings moved to SchedulePage
import { CreditAuditPanel } from '@/components/settings/CreditAuditPanel';
import { useLanguage } from '@/lib/i18n';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

export default function Settings() {
  usePageTracking('settings');
  const { language, setLanguage, t } = useLanguage();
  const { data: isAdmin } = useIsAdmin();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState('account');

  const isOwner = user?.email === 'radek.pda@gmail.com';

  const categories: SettingsCategory[] = [
    {
      id: 'account',
      title: language === 'cs' ? 'Můj účet' : 'My Account',
      description: language === 'cs' 
        ? 'Profil, heslo a jazyk' 
        : 'Profile, password and language',
      icon: User,
      iconColor: 'text-accent',
    },
    {
      id: 'company',
      title: language === 'cs' ? 'Firma & Fakturace' : 'Company & Billing',
      description: language === 'cs' 
        ? 'Firemní údaje, ceny a balíčky' 
        : 'Company details, pricing and packages',
      icon: Building2,
      iconColor: 'text-warning',
    },
    {
      id: 'app',
      title: language === 'cs' ? 'Aplikace' : 'Application',
      description: language === 'cs' 
        ? 'Moduly, vzhled a personalizace' 
        : 'Modules, appearance and personalization',
      icon: Boxes,
      iconColor: 'text-primary',
    },
    {
      id: 'system',
      title: language === 'cs' ? 'Systém' : 'System',
      description: language === 'cs' 
        ? 'Export dat a technické funkce' 
        : 'Data export and technical functions',
      icon: Wrench,
      iconColor: 'text-muted-foreground',
    },
    {
      id: 'social-export',
      title: language === 'cs' ? 'Export pro sítě' : 'Social Media Export',
      description: language === 'cs' 
        ? 'Vizuální přehledy pro sdílení' 
        : 'Visual summaries for sharing',
      icon: Share2,
      iconColor: 'text-pink-500',
    },
    {
      id: 'ai',
      title: language === 'cs' ? 'AI Asistent' : 'AI Assistant',
      description: language === 'cs' 
        ? 'Inteligentní pomocník s přístupem k datům' 
        : 'Smart assistant with data access',
      icon: Sparkles,
      iconColor: 'text-violet-500',
    },
    {
      id: 'admin',
      title: language === 'cs' ? 'Administrace' : 'Administration',
      description: language === 'cs' 
        ? 'Správa uživatelů a cviků' 
        : 'User and exercise management',
      icon: Shield,
      iconColor: 'text-destructive',
      badge: 'Admin',
      hidden: !isAdmin,
    },
  ];

  const renderContent = () => {
    switch (activeCategory) {
      case 'account':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Změna hesla' : 'Change Password'}
              description={language === 'cs' 
                ? 'Aktualizujte přístupové heslo k účtu' 
                : 'Update your account password'}
              icon={KeyRound}
            >
              <PasswordChangeSettings />
            </SettingsSection>

            <SettingsSection
              title={t.settings.language}
              description={language === 'cs' 
                ? 'Jazyk rozhraní aplikace' 
                : 'Application interface language'}
              icon={Globe}
            >
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
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Notifikace' : 'Notifications'}
              description={language === 'cs' 
                ? 'Upozornění a připomínky' 
                : 'Alerts and reminders'}
              icon={Bell}
            >
              <NotificationSettings />
            </SettingsSection>
          </>
        );

      case 'company':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Firemní profil' : 'Company Profile'}
              description={language === 'cs' 
                ? 'Údaje zobrazené na fakturách a výpisech' 
                : 'Details shown on invoices and statements'}
              icon={Building2}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Změny se projeví na všech nově generovaných dokumentech' 
                  : 'Changes will apply to all newly generated documents'
              }}
            >
              <CompanyProfileSettings />
            </SettingsSection>


            <SettingsSection
              title={language === 'cs' ? 'Ceny tréninků' : 'Training Prices'}
              description={language === 'cs' 
                ? 'Aktuální i plánované ceny podle počtu účastníků' 
                : 'Current and scheduled prices by participant count'}
              icon={CreditCard}
              impact={{
                type: 'warning',
                message: language === 'cs' 
                  ? 'Nový ceník se aktivuje automaticky v nastavený den' 
                  : 'New price list activates automatically on the set date'
              }}
            >
              <PriceListSettings />
            </SettingsSection>

            <PriceTransitionSettings />

            <SettingsSection
              title={language === 'cs' ? 'Upozornění na kredit' : 'Credit Alerts'}
              description={language === 'cs' 
                ? 'Prahy pro zvýraznění klientů s nízkým kreditem' 
                : 'Thresholds for highlighting low credit clients'}
              icon={AlertTriangle}
            >
              <CreditThresholdSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Tréninkové balíčky' : 'Training Packages'}
              description={language === 'cs' 
                ? 'Předplacené balíčky pro klienty' 
                : 'Prepaid packages for clients'}
              icon={Package}
            >
              <PackagesManagement />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Štítky' : 'Tags'}
              description={language === 'cs' 
                ? 'Štítky pro kategorizaci klientů a tréninků' 
                : 'Tags for categorizing clients and trainings'}
              icon={Tag}
            >
              <TagsManagement />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Pracovní doba' : 'Working Hours'}
              description={language === 'cs' 
                ? 'Pro přehled vytíženosti v kalendáři' 
                : 'For capacity overview in calendar'}
              icon={Clock}
            >
              <CapacitySettingsPanel />
            </SettingsSection>
          </>
        );

      case 'app':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Moduly' : 'Modules'}
              description={language === 'cs' 
                ? 'Zapněte nebo vypněte funkce aplikace' 
                : 'Enable or disable app features'}
              icon={Boxes}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Vypnuté moduly jsou skryté z navigace, data zůstávají' 
                  : 'Disabled modules are hidden from navigation, data is preserved'
              }}
            >
              <ModuleSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Vzhled aplikace' : 'App Appearance'}
              description={language === 'cs' 
                ? 'Barevné schéma' 
                : 'Color scheme'}
              icon={Paintbrush}
            >
              <ThemeSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Dashboard' : 'Dashboard'}
              description={language === 'cs' 
                ? 'Zobrazované sekce na přehledu' 
                : 'Sections displayed on overview'}
              icon={LayoutDashboard}
            >
              <DashboardPersonalizationSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Rychlé akce' : 'Quick Actions'}
              description={language === 'cs' 
                ? 'Pořadí a viditelnost' 
                : 'Order and visibility'}
              icon={Zap}
            >
              <QuickActionSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Výchozí hodnoty' : 'Default Values'}
              description={language === 'cs' 
                ? 'Přednastavené hodnoty při vytváření' 
                : 'Preset values when creating'}
              icon={Settings2}
            >
              <DefaultValuesSettings />
            </SettingsSection>
          </>
        );

      case 'system':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Obnovení aplikace' : 'App Refresh'}
              description={language === 'cs' 
                ? 'Vynutit obnovení dat a vyčištění cache' 
                : 'Force data refresh and cache clearing'}
              icon={RefreshCw}
            >
              <AppRefreshSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Finanční PDF report' : 'Financial PDF Report'}
              description={language === 'cs' 
                ? 'Komplexní finanční přehled ve formátu PDF' 
                : 'Comprehensive financial overview in PDF format'}
              icon={BarChart2}
            >
              <FinancialReportSettings />
            </SettingsSection>

            {isAdmin && (
              <SettingsSection
                title={language === 'cs' ? 'Statistiky využívání' : 'Usage Statistics'}
                description={language === 'cs' 
                  ? 'Analýza využívání funkcí' 
                  : 'Feature usage analytics'}
                icon={BarChart2}
              >
                <FeatureUsageStats />
              </SettingsSection>
            )}

            {isOwner && (
              <SettingsSection
                title={language === 'cs' ? 'Analytický export' : 'Analytics Export'}
                description={language === 'cs' 
                  ? 'Anonymizovaný export pro AI analýzu' 
                  : 'Anonymized export for AI analysis'}
                icon={Shield}
              >
                <AdminAnalyticsExport />
              </SettingsSection>
            )}
          </>
        );

      case 'social-export':
        return (
          <SettingsSection
            title={language === 'cs' ? 'Export pro sociální sítě' : 'Social Media Export'}
            description={language === 'cs' 
              ? 'Vytvořte vizuální přehledy statistik pro sdílení na sociálních sítích' 
              : 'Create visual statistics summaries for sharing on social media'}
            icon={Share2}
          >
            <SocialMediaExport />
          </SettingsSection>
        );

      case 'ai':
        return (
          <SettingsSection
            title={language === 'cs' ? 'AI Asistent' : 'AI Assistant'}
            description={language === 'cs' 
              ? 'Inteligentní pomocník s plným přístupem k datům aplikace. Může číst a zapisovat data, vytvářet tréninky, spravovat kredit i generovat příspěvky.' 
              : 'Smart assistant with full access to application data. Can read and write data, create trainings, manage credit and generate posts.'}
            icon={Sparkles}
          >
            <AIAssistantSettings />
          </SettingsSection>
        );

      case 'admin':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Správa uživatelů' : 'User Management'}
              description={language === 'cs' 
                ? 'Schvalování nových uživatelů' 
                : 'Approve new users'}
              icon={UserCog}
              impact={{
                type: 'warning',
                message: language === 'cs' 
                  ? 'Změny se projeví okamžitě' 
                  : 'Changes take effect immediately'
              }}
            >
              <UserManagementSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Audit kreditového systému' : 'Credit System Audit'}
              description={language === 'cs' 
                ? 'Kontrola konzistence zůstatků a oprava diskrepancí' 
                : 'Balance consistency check and discrepancy fixing'}
              icon={Calculator}
            >
              <CreditAuditPanel />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Správa cviků' : 'Exercises Management'}
              description={language === 'cs' 
                ? 'Duplicity, aliasy a nepřiřazené záznamy' 
                : 'Duplicates, aliases and unmatched entries'}
              icon={Dumbbell}
            >
              <ExercisesManagementSection />
            </SettingsSection>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SettingsLayout
      categories={categories}
      activeCategory={activeCategory}
      onCategoryChange={setActiveCategory}
      title={t.settings.title}
      subtitle={t.settings.subtitle}
    >
      {renderContent()}
    </SettingsLayout>
  );
}
