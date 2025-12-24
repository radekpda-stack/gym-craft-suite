import { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface AnalyticsCardProps {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  className?: string;
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
}: AnalyticsCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 text-primary" />}
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {actions}
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
