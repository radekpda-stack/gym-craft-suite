import { useState } from 'react';
import {
  User,
  Globe,
  Building2,
  KeyRound,
  Calendar,
  Clock,
  CreditCard,
  Package,
  Tag,
  Wrench,
  RefreshCw,
  Download,
  BarChart2,
  Shield,
  UserCog,
  Palette,
  Bell,
  Settings2,
  Zap,
  LayoutDashboard,
  Boxes,
  Dumbbell,
  Paintbrush,
  UserCircle,
} from 'lucide-react';
import { SettingsLayout, SettingsCategory } from '@/components/settings/SettingsLayout';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { PackagesManagement } from '@/components/settings/PackagesManagement';
import { TrainingPricesSettings } from '@/components/settings/TrainingPricesSettings';
import { TagsManagement } from '@/components/settings/TagsManagement';
import { CompanyProfileSettings } from '@/components/settings/CompanyProfileSettings';
import { TrainerProfileSettings } from '@/components/settings/TrainerProfileSettings';
import { FeatureUsageStats } from '@/components/settings/FeatureUsageStats';
import { CapacitySettingsPanel } from '@/components/settings/CapacitySettings';
import { DataExport } from '@/components/settings/DataExport';
import { AdminAnalyticsExport } from '@/components/settings/AdminAnalyticsExport';
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
      title: language === 'cs' ? 'Účet & Identita' : 'Account & Identity',
      description: language === 'cs' 
        ? 'Osobní nastavení, přihlášení a firemní údaje' 
        : 'Personal settings, login and company details',
      icon: User,
      iconColor: 'text-blue-500',
    },
    {
      id: 'operations',
      title: language === 'cs' ? 'Provoz' : 'Operations',
      description: language === 'cs' 
        ? 'Pracovní doba a kapacita' 
        : 'Working hours and capacity',
      icon: Calendar,
      iconColor: 'text-green-500',
    },
    {
      id: 'services',
      title: language === 'cs' ? 'Služby & Ceny' : 'Services & Pricing',
      description: language === 'cs' 
        ? 'Ceník, balíčky a štítky' 
        : 'Pricing, packages and tags',
      icon: CreditCard,
      iconColor: 'text-amber-500',
    },
    {
      id: 'personalization',
      title: language === 'cs' ? 'Personalizace' : 'Personalization',
      description: language === 'cs' 
        ? 'Vzhled, dashboard a výchozí hodnoty' 
        : 'Appearance, dashboard and default values',
      icon: Palette,
      iconColor: 'text-purple-500',
    },
    {
      id: 'modules',
      title: language === 'cs' ? 'Moduly & Funkce' : 'Modules & Features',
      description: language === 'cs' 
        ? 'Zapnutí/vypnutí funkcí aplikace' 
        : 'Enable/disable app features',
      icon: Boxes,
      iconColor: 'text-cyan-500',
    },
    {
      id: 'system',
      title: language === 'cs' ? 'Systém' : 'System',
      description: language === 'cs' 
        ? 'Export dat a technické funkce' 
        : 'Data export and technical functions',
      icon: Wrench,
      iconColor: 'text-rose-500',
    },
    {
      id: 'admin',
      title: language === 'cs' ? 'Administrace' : 'Administration',
      description: language === 'cs' 
        ? 'Správa uživatelů a cviků' 
        : 'User and exercise management',
      icon: Shield,
      iconColor: 'text-red-500',
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
              title={language === 'cs' ? 'Můj profil trenéra' : 'My Trainer Profile'}
              description={language === 'cs' 
                ? 'Vaše osobní údaje, fotka a odbornost' 
                : 'Your personal details, photo and expertise'}
              icon={UserCircle}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Tyto údaje mohou vidět klienti ve vašem profilu' 
                  : 'These details can be seen by clients on your profile'
              }}
            >
              <TrainerProfileSettings />
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
              title={language === 'cs' ? 'Notifikace' : 'Notifications'}
              description={language === 'cs' 
                ? 'Upozornění a připomínky' 
                : 'Alerts and reminders'}
              icon={Bell}
            >
              <NotificationSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Změna hesla' : 'Change Password'}
              description={language === 'cs' 
                ? 'Aktualizujte přístupové heslo k účtu' 
                : 'Update your account password'}
              icon={KeyRound}
            >
              <PasswordChangeSettings />
            </SettingsSection>
          </>
        );

      case 'operations':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Pracovní doba' : 'Working Hours'}
              description={language === 'cs' 
                ? 'Používá se pro přehled vytíženosti v kalendáři' 
                : 'Used for capacity overview in calendar'}
              icon={Clock}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Ovlivňuje pouze vizualizaci, ne skutečné plánování' 
                  : 'Affects visualization only, not actual scheduling'
              }}
            >
              <CapacitySettingsPanel />
            </SettingsSection>
          </>
        );

      case 'services':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Ceny tréninků' : 'Training Prices'}
              description={language === 'cs' 
                ? 'Základní ceny podle počtu účastníků' 
                : 'Base prices by participant count'}
              icon={CreditCard}
              impact={{
                type: 'warning',
                message: language === 'cs' 
                  ? 'Změny cen ovlivní pouze NOVÉ tréninky. Existující záznamy zůstanou beze změny.' 
                  : 'Price changes affect only NEW trainings. Existing records remain unchanged.'
              }}
            >
              <TrainingPricesSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Tréninkové balíčky' : 'Training Packages'}
              description={language === 'cs' 
                ? 'Předplacené balíčky pro klienty' 
                : 'Prepaid packages for clients'}
              icon={Package}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Změny se projeví při nákupu nových balíčků' 
                  : 'Changes apply when purchasing new packages'
              }}
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
          </>
        );

      case 'personalization':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Vzhled aplikace' : 'App Appearance'}
              description={language === 'cs' 
                ? 'Zvolte barevné schéma, které vám vyhovuje' 
                : 'Choose a color scheme that suits you'}
              icon={Paintbrush}
            >
              <ThemeSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Nastavení dashboardu' : 'Dashboard Settings'}
              description={language === 'cs' 
                ? 'Zobrazované sekce na hlavním přehledu' 
                : 'Sections displayed on main overview'}
              icon={LayoutDashboard}
            >
              <DashboardPersonalizationSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Rychlé akce' : 'Quick Actions'}
              description={language === 'cs' 
                ? 'Pořadí a viditelnost rychlých akcí' 
                : 'Order and visibility of quick actions'}
              icon={Zap}
            >
              <QuickActionSettings />
            </SettingsSection>

            <SettingsSection
              title={language === 'cs' ? 'Výchozí hodnoty' : 'Default Values'}
              description={language === 'cs' 
                ? 'Přednastavené hodnoty při vytváření tréninků' 
                : 'Preset values when creating trainings'}
              icon={Settings2}
            >
              <DefaultValuesSettings />
            </SettingsSection>
          </>
        );

      case 'modules':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Správa modulů' : 'Module Management'}
              description={language === 'cs' 
                ? 'Zapněte nebo vypněte funkce aplikace podle potřeby' 
                : 'Enable or disable app features as needed'}
              icon={Boxes}
              impact={{
                type: 'info',
                message: language === 'cs' 
                  ? 'Vypnuté moduly jsou skryté z navigace, data zůstávají zachována' 
                  : 'Disabled modules are hidden from navigation, data is preserved'
              }}
            >
              <ModuleSettings />
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
              title={language === 'cs' ? 'Export dat' : 'Data Export'}
              description={language === 'cs' 
                ? 'Stáhněte všechna data pro zálohu nebo analýzu' 
                : 'Download all data for backup or analysis'}
              icon={Download}
            >
              <DataExport />
            </SettingsSection>

            {isAdmin && (
              <SettingsSection
                title={language === 'cs' ? 'Statistiky využívání' : 'Usage Statistics'}
                description={language === 'cs' 
                  ? 'Analýza využívání funkcí všemi uživateli' 
                  : 'Feature usage analytics from all users'}
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

      case 'admin':
        return (
          <>
            <SettingsSection
              title={language === 'cs' ? 'Správa uživatelů' : 'User Management'}
              description={language === 'cs' 
                ? 'Schvalování nových uživatelů a správa přístupů' 
                : 'Approve new users and manage access'}
              icon={UserCog}
              impact={{
                type: 'warning',
                message: language === 'cs' 
                  ? 'Pozor: Změny přístupů se projeví okamžitě' 
                  : 'Caution: Access changes take effect immediately'
              }}
            >
              <UserManagementSettings />
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
