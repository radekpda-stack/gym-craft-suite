import { useAppSettings, useUpdateSetting } from "./useAppSettings";

/**
 * Simplified Module Settings - 5 Main Groups
 * 
 * Previous 13 modules consolidated into:
 * 1. client_portal - Klientský portál
 * 2. performance - Data & Výkonnost (exercises, templates, pr_history, tests, challenges, diagnostics)
 * 3. nutrition_feedback - Strava & Zpětná vazba (nutrition, feedback)
 * 4. finance - Finance (sales, statistics)
 * 5. system - Systém (calendar, rewards_system)
 */

// New simplified module groups
export interface ModuleGroups {
  client_portal: boolean;
  performance: boolean;
  nutrition_feedback: boolean;
  finance: boolean;
  system: boolean;
}

// Legacy individual modules for backwards compatibility
export interface ModuleSettings {
  client_portal: boolean;
  nutrition: boolean;
  feedback: boolean;
  diagnostics: boolean;
  training_templates: boolean;
  pr_history: boolean;
  tests: boolean;
  sales: boolean;
  calendar: boolean;
  statistics: boolean;
  challenges: boolean;
  exercises: boolean;
  rewards_system: boolean;
}

// Mapping from groups to individual modules
export const MODULE_GROUP_MAPPING: Record<keyof ModuleGroups, (keyof ModuleSettings)[]> = {
  client_portal: ['client_portal'],
  performance: ['exercises', 'training_templates', 'pr_history', 'tests', 'challenges', 'diagnostics'],
  nutrition_feedback: ['nutrition', 'feedback'],
  finance: ['sales', 'statistics'],
  system: ['calendar', 'rewards_system'],
};

const DEFAULT_MODULES: ModuleSettings = {
  client_portal: true,
  nutrition: true,
  feedback: true,
  diagnostics: true,
  training_templates: true,
  pr_history: true,
  tests: true,
  sales: true,
  calendar: true,
  statistics: true,
  challenges: true,
  exercises: true,
  rewards_system: false,
};

const DEFAULT_GROUPS: ModuleGroups = {
  client_portal: true,
  performance: true,
  nutrition_feedback: true,
  finance: true,
  system: true,
};

export function useModuleSettings() {
  const { data: settings, isLoading } = useAppSettings();
  
  const modules: ModuleSettings = settings?.module_settings || DEFAULT_MODULES;
  
  // Derive group states from individual modules
  const groups: ModuleGroups = {
    client_portal: modules.client_portal,
    performance: modules.exercises || modules.training_templates || modules.pr_history || 
                 modules.tests || modules.challenges || modules.diagnostics,
    nutrition_feedback: modules.nutrition || modules.feedback,
    finance: modules.sales || modules.statistics,
    system: modules.calendar || modules.rewards_system,
  };
  
  return {
    modules,
    groups,
    isLoading,
    isModuleEnabled: (moduleName: keyof ModuleSettings) => modules[moduleName] ?? true,
    isGroupEnabled: (groupName: keyof ModuleGroups) => groups[groupName] ?? true,
  };
}

export function useUpdateModuleSettings() {
  const { data: settings } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const currentModules: ModuleSettings = settings?.module_settings || DEFAULT_MODULES;
  
  // Toggle individual module (legacy)
  const toggleModule = async (moduleName: keyof ModuleSettings) => {
    const newModules = {
      ...currentModules,
      [moduleName]: !currentModules[moduleName],
    };
    
    await updateSetting.mutateAsync({
      key: 'module_settings',
      value: newModules,
    });
  };
  
  // Set individual module (legacy)
  const setModule = async (moduleName: keyof ModuleSettings, enabled: boolean) => {
    const newModules = {
      ...currentModules,
      [moduleName]: enabled,
    };
    
    await updateSetting.mutateAsync({
      key: 'module_settings',
      value: newModules,
    });
  };
  
  // Toggle entire group - enables/disables all modules in the group
  const toggleGroup = async (groupName: keyof ModuleGroups) => {
    const modulesInGroup = MODULE_GROUP_MAPPING[groupName];
    const currentlyEnabled = modulesInGroup.some(m => currentModules[m]);
    
    const newModules = { ...currentModules };
    for (const moduleName of modulesInGroup) {
      newModules[moduleName] = !currentlyEnabled;
    }
    
    await updateSetting.mutateAsync({
      key: 'module_settings',
      value: newModules,
    });
  };
  
  // Set entire group
  const setGroup = async (groupName: keyof ModuleGroups, enabled: boolean) => {
    const modulesInGroup = MODULE_GROUP_MAPPING[groupName];
    
    const newModules = { ...currentModules };
    for (const moduleName of modulesInGroup) {
      newModules[moduleName] = enabled;
    }
    
    await updateSetting.mutateAsync({
      key: 'module_settings',
      value: newModules,
    });
  };
  
  return {
    toggleModule,
    setModule,
    toggleGroup,
    setGroup,
    isUpdating: updateSetting.isPending,
  };
}
