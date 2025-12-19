import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { RecommendationLevel, FeedbackRecommendation } from '@/hooks/useFeedbackRecommendation';

interface FeedbackRecommendationBadgeProps {
  recommendation: FeedbackRecommendation;
  showReasons?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig: Record<RecommendationLevel, {
  icon: typeof CheckCircle;
  bgClass: string;
  textClass: string;
  borderClass: string;
}> = {
  green: {
    icon: CheckCircle,
    bgClass: 'bg-green-500/10',
    textClass: 'text-green-700',
    borderClass: 'border-green-500/30',
  },
  yellow: {
    icon: AlertTriangle,
    bgClass: 'bg-yellow-500/10',
    textClass: 'text-yellow-700',
    borderClass: 'border-yellow-500/30',
  },
  red: {
    icon: XCircle,
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-700',
    borderClass: 'border-red-500/30',
  },
};

export function FeedbackRecommendationBadge({
  recommendation,
  showReasons = false,
  size = 'md',
}: FeedbackRecommendationBadgeProps) {
  const config = levelConfig[recommendation.level];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div
      className={cn(
        'rounded-lg border',
        config.bgClass,
        config.borderClass,
        sizeClasses[size]
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn(iconSizes[size], config.textClass)} />
        <span className={cn('font-medium', config.textClass)}>
          {recommendation.label}
        </span>
      </div>
      
      {showReasons && recommendation.reasons.length > 0 && (
        <ul className={cn('mt-2 space-y-1', config.textClass)}>
          {recommendation.reasons.map((reason, i) => (
            <li key={i} className="text-xs opacity-80">
              • {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
