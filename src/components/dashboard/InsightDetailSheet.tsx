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
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';
import type { InsightWithDetail } from './DashboardInsights';

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
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-destructive" />;
      default:
        return <Minus className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeBadge = (type: 'success' | 'warning' | 'info') => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; label: string }> = {
      success: { variant: 'default', label: language === 'cs' ? 'Pozitivní' : 'Positive' },
      warning: { variant: 'destructive', label: language === 'cs' ? 'Upozornění' : 'Warning' },
      info: { variant: 'secondary', label: language === 'cs' ? 'Info' : 'Info' }
    };
    const config = variants[type] || variants.info;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-muted">{insight.icon}</span>
            <div className="flex-1">
              <SheetTitle className="text-base">
                {insight.detail?.title || insight.text}
              </SheetTitle>
              {getTypeBadge(insight.type)}
            </div>
          </div>
          {insight.detail?.description && (
            <SheetDescription className="text-sm mt-2">
              {insight.detail.description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-4 pb-4">
          {/* Main Metric */}
          {insight.detail?.metric && (
            <div className="p-4 rounded-xl bg-muted/50 border">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {insight.detail.metric.label}
                </span>
                {getTrendIcon(insight.detail.metric.trend)}
              </div>
              <div className="text-2xl font-bold mt-1">
                {insight.detail.metric.value}
              </div>
            </div>
          )}

          {/* Breakdown */}
          {insight.detail?.breakdown && insight.detail.breakdown.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {language === 'cs' ? 'Rozdělení' : 'Breakdown'}
              </h4>
              <div className="space-y-1">
                {insight.detail.breakdown.items.map((item, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30"
                  >
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tip */}
          {insight.detail?.tip && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm text-primary">
                💡 {insight.detail.tip}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        {insight.detail?.actionLabel && insight.detail?.actionUrl && (
          <div className="pt-2 border-t">
            <Button 
              onClick={handleAction}
              className="w-full"
              variant="default"
            >
              {insight.detail.actionLabel}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
