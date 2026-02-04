import { useLanguage } from "@/lib/i18n";
import { 
  useModuleSettings, 
  useUpdateModuleSettings, 
  type ModuleGroups,
  MODULE_GROUP_MAPPING,
  type ModuleSettings as ModuleSettingsType 
} from "@/hooks/useModuleSettings";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  Users,
  Utensils,
  Dumbbell,
  Wallet,
  Settings,
  ChevronDown,
  LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface GroupConfig {
  key: keyof ModuleGroups;
  icon: LucideIcon;
  labelCs: string;
  labelEn: string;
  descriptionCs: string;
  descriptionEn: string;
  warningCs?: string;
  warningEn?: string;
  subModules: {
    key: keyof ModuleSettingsType;
    labelCs: string;
    labelEn: string;
  }[];
}

const MODULE_GROUPS: GroupConfig[] = [
  {
    key: "client_portal",
    icon: Users,
    labelCs: "Klientský portál",
    labelEn: "Client Portal",
    descriptionCs: "Přístup klientů k jejich účtům, tréninkům a pokroku",
    descriptionEn: "Client access to their accounts, trainings, and progress",
    warningCs: "Klienti ztratí přístup ke svým účtům",
    warningEn: "Clients will lose access to their accounts",
    subModules: [
      { key: "client_portal", labelCs: "Klientský portál", labelEn: "Client Portal" },
    ],
  },
  {
    key: "performance",
    icon: Dumbbell,
    labelCs: "Data & Výkonnost",
    labelEn: "Data & Performance",
    descriptionCs: "Cviky, šablony, PR, testy, výzvy a diagnostika",
    descriptionEn: "Exercises, templates, PRs, tests, challenges, and diagnostics",
    warningCs: "Skryje sekce Výkonnost a související funkce",
    warningEn: "Hides Performance sections and related features",
    subModules: [
      { key: "exercises", labelCs: "Cviky", labelEn: "Exercises" },
      { key: "training_templates", labelCs: "Šablony tréninků", labelEn: "Training Templates" },
      { key: "pr_history", labelCs: "PR Historie", labelEn: "PR History" },
      { key: "tests", labelCs: "Testy", labelEn: "Tests" },
      { key: "challenges", labelCs: "Výzvy", labelEn: "Challenges" },
      { key: "diagnostics", labelCs: "Diagnostika", labelEn: "Diagnostics" },
    ],
  },
  {
    key: "nutrition_feedback",
    icon: Utensils,
    labelCs: "Strava & Zpětná vazba",
    labelEn: "Nutrition & Feedback",
    descriptionCs: "Nutriční dotazníky, kampaně a sběr feedbacku",
    descriptionEn: "Nutrition questionnaires, campaigns, and feedback collection",
    warningCs: "Skryje sekce Strava a Feedbacky",
    warningEn: "Hides Nutrition and Feedback sections",
    subModules: [
      { key: "nutrition", labelCs: "Strava & Výživa", labelEn: "Nutrition" },
      { key: "feedback", labelCs: "Feedbacky", labelEn: "Feedback" },
    ],
  },
  {
    key: "finance",
    icon: Wallet,
    labelCs: "Finance",
    labelEn: "Finance",
    descriptionCs: "Prodeje, statistiky a finanční přehledy",
    descriptionEn: "Sales, statistics, and financial overviews",
    warningCs: "Skryje sekce Prodej a Statistiky",
    warningEn: "Hides Sales and Statistics sections",
    subModules: [
      { key: "sales", labelCs: "Prodej", labelEn: "Sales" },
      { key: "statistics", labelCs: "Statistiky", labelEn: "Statistics" },
    ],
  },
  {
    key: "system",
    icon: Settings,
    labelCs: "Systém",
    labelEn: "System",
    descriptionCs: "Kalendář a systém odměn",
    descriptionEn: "Calendar and rewards system",
    warningCs: "Skryje systémové funkce",
    warningEn: "Hides system features",
    subModules: [
      { key: "calendar", labelCs: "Kalendář", labelEn: "Calendar" },
      { key: "rewards_system", labelCs: "Systém odměn", labelEn: "Rewards System" },
    ],
  },
];

export function ModuleSettings() {
  const { language } = useLanguage();
  const { modules, groups, isLoading } = useModuleSettings();
  const { toggleModule, toggleGroup, isUpdating } = useUpdateModuleSettings();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const enabledGroupCount = Object.values(groups).filter(Boolean).length;

  const toggleExpanded = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
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
          {language === 'cs' ? 'Aktivní skupiny modulů' : 'Active module groups'}
        </span>
        <span className="text-sm font-medium">
          {enabledGroupCount} / {MODULE_GROUPS.length}
        </span>
      </div>

      {/* Module groups */}
      <div className="space-y-2">
        {MODULE_GROUPS.map((group) => {
          const Icon = group.icon;
          const isGroupEnabled = groups[group.key];
          const label = language === 'cs' ? group.labelCs : group.labelEn;
          const description = language === 'cs' ? group.descriptionCs : group.descriptionEn;
          const warning = language === 'cs' ? group.warningCs : group.warningEn;
          const isExpanded = expandedGroups.has(group.key);
          const hasSubModules = group.subModules.length > 1;

          return (
            <Collapsible
              key={group.key}
              open={isExpanded && hasSubModules}
              onOpenChange={() => hasSubModules && toggleExpanded(group.key)}
            >
              <div
                className={cn(
                  "rounded-xl transition-all",
                  isGroupEnabled 
                    ? "glass-subtle" 
                    : "bg-muted/20 opacity-60"
                )}
              >
                {/* Group header */}
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      isGroupEnabled ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5",
                        isGroupEnabled ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{label}</h4>
                          {hasSubModules && (
                            <CollapsibleTrigger asChild>
                              <button 
                                className="p-1 hover:bg-muted/50 rounded transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ChevronDown className={cn(
                                  "w-4 h-4 text-muted-foreground transition-transform",
                                  isExpanded && "rotate-180"
                                )} />
                              </button>
                            </CollapsibleTrigger>
                          )}
                        </div>
                        <Switch
                          checked={isGroupEnabled}
                          onCheckedChange={() => toggleGroup(group.key)}
                          disabled={isUpdating}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {description}
                      </p>
                      
                      {/* Warning when disabled */}
                      {!isGroupEnabled && warning && (
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                          ⚠ {warning}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-modules (expandable) */}
                {hasSubModules && (
                  <CollapsibleContent>
                    <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === 'cs' ? 'Jednotlivé moduly:' : 'Individual modules:'}
                      </p>
                      {group.subModules.map((sub) => (
                        <div 
                          key={sub.key}
                          className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30"
                        >
                          <span className="text-sm">
                            {language === 'cs' ? sub.labelCs : sub.labelEn}
                          </span>
                          <Switch
                            checked={modules[sub.key]}
                            onCheckedChange={() => toggleModule(sub.key)}
                            disabled={isUpdating}
                            className="scale-90"
                          />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
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