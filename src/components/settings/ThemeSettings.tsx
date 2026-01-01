import { useTheme, themes, ThemeId } from '@/hooks/useTheme';
import { useLanguage } from '@/lib/i18n';
import { Check, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

export function ThemeSettings() {
  const { currentTheme, setTheme, resetTheme } = useTheme();
  const { language } = useLanguage();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {themes.map((theme) => (
          <motion.button
            key={theme.id}
            onClick={() => setTheme(theme.id)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
              'relative flex flex-col rounded-lg overflow-hidden border-2 transition-all',
              currentTheme === theme.id
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border hover:border-primary/50'
            )}
          >
            {/* Theme Preview */}
            <div 
              className="h-24 p-3 flex flex-col justify-between"
              style={{ backgroundColor: theme.preview.background }}
            >
              {/* Mini header */}
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded"
                  style={{ backgroundColor: theme.preview.primary }}
                />
                <div 
                  className="h-2 w-16 rounded"
                  style={{ backgroundColor: theme.preview.card }}
                />
              </div>
              
              {/* Mini cards */}
              <div className="flex gap-2">
                <div 
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.preview.card }}
                />
                <div 
                  className="flex-1 h-8 rounded"
                  style={{ backgroundColor: theme.preview.card }}
                />
              </div>
            </div>

            {/* Theme Info */}
            <div className="p-3 bg-card text-left">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-foreground">
                  {language === 'cs' ? theme.nameCs : theme.name}
                </span>
                {currentTheme === theme.id && (
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'cs' ? theme.descriptionCs : theme.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
      
      <div className="pt-2 border-t border-border">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {language === 'cs' ? 'Resetovat na výchozí' : 'Reset to default'}
        </Button>
      </div>
    </div>
  );
}
