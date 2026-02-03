import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { StatInfoTooltip } from '@/components/statistics/StatInfoTooltip';
import { cn } from '@/lib/utils';

interface HelpContent {
  title: string;
  description: string;
  calculation?: string;
}

interface AnalyticsCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
  /** @deprecated Use helpContent for richer help tooltips */
  helpText?: string;
  helpContent?: HelpContent;
}

export function AnalyticsCard({
  title,
  icon: Icon,
  children,
  actions,
  isLoading,
  isEmpty,
  emptyMessage = 'Žádná data pro zvolené období',
  className,
  helpText,
  helpContent,
}: AnalyticsCardProps) {
  // Convert legacy helpText to helpContent format
  const effectiveHelpContent: HelpContent | undefined = helpContent || (helpText ? {
    title,
    description: helpText,
  } : undefined);

  return (
    <Card className={cn(
      'bg-card/80 backdrop-blur-md border-border/50 shadow-sm',
      'transition-all duration-200',
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className="p-1.5 rounded-lg bg-primary/10 shadow-sm">
                <Icon className="w-4 h-4 text-primary shrink-0" />
              </div>
            )}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {effectiveHelpContent && (
              <StatInfoTooltip
                title={effectiveHelpContent.title}
                description={effectiveHelpContent.description}
                calculation={effectiveHelpContent.calculation}
              />
            )}
          </div>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[180px] flex items-center justify-center"
            >
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </motion.div>
          ) : isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-[180px] flex items-center justify-center text-muted-foreground text-sm"
            >
              {emptyMessage}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
