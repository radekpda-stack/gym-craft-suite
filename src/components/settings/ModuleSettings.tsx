import { useLanguage } from "@/lib/i18n";
import { useModuleSettings, useUpdateModuleSettings, type ModuleSettings as ModuleSettingsType } from "@/hooks/useModuleSettings";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Users,
  Utensils,
  MessageSquare,
  Activity,
  LayoutTemplate,
  Trophy,
  AlertTriangle,
  LucideIcon,
  Calendar,
  ShoppingBag,
  BarChart3,
  Dumbbell,
  Gift,
} from "lucide-react";

interface ModuleConfig {
  key: keyof ModuleSettingsType;
  icon: LucideIcon;
  labelCs: string;
  labelEn: string;
  descriptionCs: string;
  descriptionEn: string;
  warningCs?: string;
  warningEn?: string;
}

const MODULES: ModuleConfig[] = [
  {
    key: "client_portal",
    icon: Users,
    labelCs: "Klientský portál",
    labelEn: "Client Portal",
    descriptionCs: "Umožňuje klientům přihlásit se a sledovat své tréninky, kredit a pokrok",
    descriptionEn: "Allows clients to log in and track their trainings, credit and progress",
    warningCs: "Klienti ztratí přístup ke svým účtům",
    warningEn: "Clients will lose access to their accounts",
  },
  {
    key: "calendar",
    icon: Calendar,
    labelCs: "Kalendář",
    labelEn: "Calendar",
    descriptionCs: "Kalendářní zobrazení tréninků a plánování",
    descriptionEn: "Calendar view for trainings and scheduling",
    warningCs: "Skryje sekci Kalendář z navigace",
    warningEn: "Hides Calendar section from navigation",
  },
  {
    key: "sales",
    icon: ShoppingBag,
    labelCs: "Prodej",
    labelEn: "Sales",
    descriptionCs: "Pokladna, sklad a prodej produktů klientům",
    descriptionEn: "Register, inventory and product sales to clients",
    warningCs: "Skryje sekci Prodej z navigace",
    warningEn: "Hides Sales section from navigation",
  },
  {
    key: "statistics",
    icon: BarChart3,
    labelCs: "Statistiky",
    labelEn: "Statistics",
    descriptionCs: "Finanční statistiky a přehledy",
    descriptionEn: "Financial statistics and overviews",
    warningCs: "Skryje sekci Statistiky z navigace",
    warningEn: "Hides Statistics section from navigation",
  },
  {
    key: "challenges",
    icon: Trophy,
    labelCs: "Výzvy",
    labelEn: "Challenges",
    descriptionCs: "Soutěže a výzvy pro klienty",
    descriptionEn: "Competitions and challenges for clients",
    warningCs: "Skryje sekci Výzvy z navigace",
    warningEn: "Hides Challenges section from navigation",
  },
  {
    key: "exercises",
    icon: Dumbbell,
    labelCs: "Cviky",
    labelEn: "Exercises",
    descriptionCs: "Knihovna cviků a jejich správa",
    descriptionEn: "Exercise library and management",
    warningCs: "Skryje sekci Cviky z navigace",
    warningEn: "Hides Exercises section from navigation",
  },
  {
    key: "nutrition",
    icon: Utensils,
    labelCs: "Strava & Výživa",
    labelEn: "Nutrition & Diet",
    descriptionCs: "Nutriční dotazníky, kampaně a analýzy stravy klientů",
    descriptionEn: "Nutrition questionnaires, campaigns and diet analysis for clients",
    warningCs: "Skryje celou sekci Strava z navigace",
    warningEn: "Hides entire Nutrition section from navigation",
  },
  {
    key: "feedback",
    icon: MessageSquare,
    labelCs: "Feedbacky",
    labelEn: "Feedback",
    descriptionCs: "Sběr zpětné vazby od klientů po tréninku",
    descriptionEn: "Collect feedback from clients after training",
    warningCs: "Skryje sekci Feedbacky z navigace",
    warningEn: "Hides Feedback section from navigation",
  },
  {
    key: "diagnostics",
    icon: Activity,
    labelCs: "Diagnostika",
    labelEn: "Diagnostics",
    descriptionCs: "Pre-diagnostické dotazníky a záznamy pro klienty",
    descriptionEn: "Pre-diagnostic questionnaires and records for clients",
  },
  {
    key: "training_templates",
    icon: LayoutTemplate,
    labelCs: "Šablony tréninků",
    labelEn: "Training Templates",
    descriptionCs: "Předpřipravené šablony pro rychlé vytváření tréninků",
    descriptionEn: "Pre-made templates for quickly creating trainings",
    warningCs: "Skryje sekci Šablony z navigace",
    warningEn: "Hides Templates section from navigation",
  },
  {
    key: "pr_history",
    icon: Trophy,
    labelCs: "PR Historie",
    labelEn: "PR History",
    descriptionCs: "Sledování osobních rekordů klientů",
    descriptionEn: "Track personal records of clients",
  },
  {
    key: "tests",
    icon: Activity,
    labelCs: "Testy",
    labelEn: "Tests",
    descriptionCs: "Fyzické testy a hodnocení klientů",
    descriptionEn: "Physical tests and client assessments",
    warningCs: "Skryje sekci Testy z navigace",
    warningEn: "Hides Tests section from navigation",
  },
  {
    key: "rewards_system",
    icon: Gift,
    labelCs: "Systém odměn",
    labelEn: "Rewards System",
    descriptionCs: "Věrnostní odměny a výměna bodů za odměny v klientském portálu",
    descriptionEn: "Loyalty rewards and point redemption in client portal",
    warningCs: "Klienti neuvidí sekci Odměny",
    warningEn: "Clients won't see the Rewards section",
  },
];

export function ModuleSettings() {
  const { language } = useLanguage();
  const { modules, isLoading } = useModuleSettings();
  const { toggleModule, isUpdating } = useUpdateModuleSettings();

  const enabledCount = Object.values(modules).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="glass-subtle rounded-xl p-4 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {language === 'cs' ? 'Aktivní moduly' : 'Active modules'}
        </span>
        <span className="text-sm font-medium">
          {enabledCount} / {MODULES.length}
        </span>
      </div>

      {/* Module list */}
      <div className="space-y-2">
        {MODULES.map((module) => {
          const Icon = module.icon;
          const isEnabled = modules[module.key];
          const label = language === 'cs' ? module.labelCs : module.labelEn;
          const description = language === 'cs' ? module.descriptionCs : module.descriptionEn;
          const warning = language === 'cs' ? module.warningCs : module.warningEn;

          return (
            <div
              key={module.key}
              className={cn(
                "rounded-xl p-4 transition-all",
                isEnabled 
                  ? "glass-subtle" 
                  : "bg-muted/20 opacity-60"
              )}
            >
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  isEnabled ? "bg-primary/10" : "bg-muted"
                )}>
                  <Icon className={cn(
                    "w-5 h-5",
                    isEnabled ? "text-primary" : "text-muted-foreground"
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium text-sm">{label}</h4>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={() => toggleModule(module.key)}
                      disabled={isUpdating}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>
                  
                  {/* Warning when disabled */}
                  {!isEnabled && warning && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-500">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{warning}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        {language === 'cs' 
          ? 'Vypnuté moduly jsou skryté z navigace, ale data zůstávají zachována' 
          : 'Disabled modules are hidden from navigation, but data is preserved'}
      </p>
    </div>
  );
}
