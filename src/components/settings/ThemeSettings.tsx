import { useTheme, themes, ThemeId } from '@/hooks/useTheme';
import { useLanguage } from '@/lib/i18n';
import { Check, RotateCcw, Loader2, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ThemeSettings() {
  const { currentTheme, setTheme, resetTheme, isSyncing } = useTheme();
  const { language } = useLanguage();

  const isLightTheme = (id: ThemeId) => id === 'light-minimal' || id === 'frost-minimal';

  return (
    <div className="space-y-6">
      <div className="text-xs text-muted-foreground">
        Aktivní téma: <span className="text-foreground font-medium">{currentTheme}</span>
        <span className="ml-2 text-muted-foreground/70">(html: {typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : '—'})</span>
      </div>
      {/* Theme Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {themes.map((theme) => {
          const isSelected = currentTheme === theme.id;
          const isLight = isLightTheme(theme.id);
          
          return (
            <motion.button
              key={theme.id}
              onClick={() => setTheme(theme.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                'relative flex flex-col rounded-xl overflow-hidden transition-all duration-200',
                'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isSelected
                  ? 'border-primary shadow-lg shadow-primary/20'
                  : 'border-border hover:border-primary/50'
              )}
            >
              {/* Theme Preview - Larger and more detailed */}
              <div 
                className="relative h-28 sm:h-32 p-3 flex flex-col justify-between"
                style={{ backgroundColor: theme.preview.background }}
              >
                {/* Light/Dark indicator */}
                <div className="absolute top-2 right-2">
                  {isLight ? (
                    <Sun className="w-3.5 h-3.5" style={{ color: theme.preview.primary }} />
                  ) : (
                    <Moon className="w-3.5 h-3.5" style={{ color: theme.preview.primary }} />
                  )}
                </div>

                {/* Mini header */}
                <div className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: theme.preview.primary }}
                  >
                    <div 
                      className="w-3.5 h-3.5 rounded"
                      style={{ 
                        backgroundColor: isLight ? '#fff' : theme.preview.background,
                        opacity: 0.9 
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div 
                      className="h-2 w-12 rounded-full"
                      style={{ backgroundColor: theme.preview.card }}
                    />
                    <div 
                      className="h-1.5 w-8 rounded-full opacity-50"
                      style={{ backgroundColor: theme.preview.card }}
                    />
                  </div>
                </div>
                
                {/* Mini cards grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div 
                    className="h-10 rounded-lg p-2"
                    style={{ backgroundColor: theme.preview.card }}
                  >
                    <div 
                      className="h-1.5 w-6 rounded-full mb-1"
                      style={{ backgroundColor: theme.preview.primary, opacity: 0.7 }}
                    />
                    <div 
                      className="h-3 w-8 rounded"
                      style={{ 
                        backgroundColor: isLight ? theme.preview.background : '#fff',
                        opacity: isLight ? 0.5 : 0.15
                      }}
                    />
                  </div>
                  <div 
                    className="h-10 rounded-lg p-2"
                    style={{ backgroundColor: theme.preview.card }}
                  >
                    <div 
                      className="h-1.5 w-5 rounded-full mb-1"
                      style={{ backgroundColor: theme.preview.primary, opacity: 0.7 }}
                    />
                    <div 
                      className="h-3 w-6 rounded"
                      style={{ 
                        backgroundColor: isLight ? theme.preview.background : '#fff',
                        opacity: isLight ? 0.5 : 0.15
                      }}
                    />
                  </div>
                </div>

                {/* Selected indicator overlay */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/30"
                    >
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.preview.primary }}
                      >
                        <Check className="w-5 h-5" style={{ color: theme.preview.background }} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Theme Info */}
              <div className="p-3 bg-card text-left border-t border-border">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm text-foreground truncate">
                    {language === 'cs' ? theme.nameCs : theme.name}
                  </span>
                  {isSelected && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                      Aktivní
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {language === 'cs' ? theme.descriptionCs : theme.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Footer with sync status and reset */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSyncing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Ukládám...</span>
            </>
          ) : (
            <span>Téma se synchronizuje mezi zařízeními</span>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={resetTheme}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {language === 'cs' ? 'Resetovat' : 'Reset'}
        </Button>
      </div>
    </div>
  );
}
