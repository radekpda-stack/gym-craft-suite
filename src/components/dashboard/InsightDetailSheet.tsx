import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription 
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';
import { TrendingUp, TrendingDown, Minus, ArrowRight, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InsightWithDetail } from './insights/insightTypes';

interface InsightDetailSheetProps {
  insight: InsightWithDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsightDetailSheet({ insight, open, onOpenChange }: InsightDetailSheetProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();

  if (!insight) return null;

  const handleAction = () => {
    if (insight.detail?.actionUrl) {
      navigate(insight.detail.actionUrl);
      onOpenChange(false);
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-5 h-5 text-success" />;
      case 'down':
        return <TrendingDown className="w-5 h-5 text-destructive" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTypeConfig = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return {
          gradient: 'from-success/20 via-success/10 to-transparent',
          iconBg: 'bg-success/20',
          iconRing: 'ring-success/30',
          badge: { variant: 'default' as const, label: language === 'cs' ? 'Pozitivní' : 'Positive' },
          accentColor: 'success'
        };
      case 'warning':
        return {
          gradient: 'from-warning/20 via-warning/10 to-transparent',
          iconBg: 'bg-warning/20',
          iconRing: 'ring-warning/30',
          badge: { variant: 'destructive' as const, label: language === 'cs' ? 'Upozornění' : 'Warning' },
          accentColor: 'warning'
        };
      default:
        return {
          gradient: 'from-primary/20 via-primary/10 to-transparent',
          iconBg: 'bg-primary/20',
          iconRing: 'ring-primary/30',
          badge: { variant: 'secondary' as const, label: language === 'cs' ? 'Info' : 'Info' },
          accentColor: 'primary'
        };
    }
  };

  const config = getTypeConfig(insight.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl border-t-0 overflow-hidden">
        {/* Hero Header with Gradient */}
        <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-br ${config.gradient} pointer-events-none`} />
        
        {/* Decorative blur elements */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-${config.accentColor}/10 blur-3xl pointer-events-none`} />
        
        <SheetHeader className="relative text-left pb-6 pt-2">
          <div className="flex items-start gap-4">
            {/* Animated Icon */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`w-14 h-14 rounded-2xl ${config.iconBg} ring-2 ${config.iconRing} flex items-center justify-center shrink-0 backdrop-blur-sm`}
            >
              <span className="text-2xl">{insight.icon}</span>
            </motion.div>
            
            <div className="flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SheetTitle className="text-lg font-semibold leading-tight mb-2">
                  {insight.detail?.title || insight.text}
                </SheetTitle>
                <Badge variant={config.badge.variant} className="font-medium">
                  {config.badge.label}
                </Badge>
              </motion.div>
            </div>
          </div>
          
          {insight.detail?.description && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <SheetDescription className="text-sm mt-4 leading-relaxed">
                {insight.detail.description}
              </SheetDescription>
            </motion.div>
          )}
        </SheetHeader>

        <div className="relative space-y-5 pb-6">
          {/* Main Metric Card */}
          {insight.detail?.metric && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-muted/60 to-muted/30 p-5 border border-border/40 backdrop-blur-sm"
            >
              {/* Decorative blur */}
              <div className={`absolute -top-8 -right-8 w-24 h-24 rounded-full bg-${config.accentColor}/15 blur-2xl`} />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {insight.detail.metric.label}
                  </span>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 400 }}
                  >
                    {getTrendIcon(insight.detail.metric.trend)}
                  </motion.div>
                </div>
                <motion.div 
                  className="text-3xl font-bold tracking-tight"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: "spring" }}
                >
                  {insight.detail.metric.value}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* Breakdown Section */}
          {insight.detail?.breakdown && insight.detail.breakdown.items.length > 0 && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <h4 className="text-sm font-semibold text-muted-foreground px-1">
                {language === 'cs' ? 'Rozdělení' : 'Breakdown'}
              </h4>
              <div className="space-y-2">
                {insight.detail.breakdown.items.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + idx * 0.08 }}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors border border-border/20"
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-sm font-semibold text-foreground">{item.value}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tip Section with Glow */}
          {insight.detail?.tip && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative p-4 rounded-xl bg-primary/5 border border-primary/20 overflow-hidden"
            >
              {/* Glow effect */}
              <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-20 h-20 bg-primary/15 blur-2xl rounded-full" />
              
              <div className="relative flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <p className="text-sm text-primary leading-relaxed pt-1">
                  {insight.detail.tip}
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* Action Button */}
        {insight.detail?.actionLabel && insight.detail?.actionUrl && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="pt-2 pb-2 border-t border-border/40"
          >
            <Button 
              onClick={handleAction}
              className="w-full h-12 text-base font-medium group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/20"
            >
              {insight.detail.actionLabel}
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
