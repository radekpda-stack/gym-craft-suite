import { useAppSettings, useUpdateSetting } from "./useAppSettings";

export interface ModuleSettings {
  client_portal: boolean;
  nutrition: boolean;
  feedback: boolean;
  diagnostics: boolean;
  training_templates: boolean;
  pr_history: boolean;
  tests: boolean;
}

const DEFAULT_MODULES: ModuleSettings = {
  client_portal: true,
  nutrition: true,
  feedback: true,
  diagnostics: true,
  training_templates: true,
  pr_history: true,
  tests: true,
};

export function useModuleSettings() {
  const { data: settings, isLoading } = useAppSettings();
  
  const modules: ModuleSettings = settings?.module_settings || DEFAULT_MODULES;
  
  return {
    modules,
    isLoading,
    isModuleEnabled: (moduleName: keyof ModuleSettings) => modules[moduleName] ?? true,
  };
}

export function useUpdateModuleSettings() {
  const { data: settings } = useAppSettings();
  const updateSetting = useUpdateSetting();
  
  const currentModules: ModuleSettings = settings?.module_settings || DEFAULT_MODULES;
  
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
  
  return {
    toggleModule,
    setModule,
    isUpdating: updateSetting.isPending,
  };
}
