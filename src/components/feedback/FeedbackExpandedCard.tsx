/**
 * FeedbackExpandedCard - Rich feedback card with inline metrics and quick actions
 * Part of the Feedbacky module redesign for trainer workflow
 */

import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Brain,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare,
  Zap,
  FileText,
  Smile,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrainingFeedback } from '@/hooks/useTrainingFeedback';
import { MetricMiniBar } from './MetricMiniBar';
import { FeedbackTrainerNote } from './FeedbackTrainerNote';

interface FeedbackExpandedCardProps {
  feedback: TrainingFeedback;
  clientName: string;
  trainingDate?: string;
  trainingType?: string;
  onOpenDetail: () => void;
  onOpenChat?: () => void;
}

// Get severity color based on overall feedback state
function getSeverityColor(feedback: TrainingFeedback): 'green' | 'yellow' | 'red' {
  if (feedback.is_red_flag) return 'red';
  if (feedback.pain && feedback.pain >= 6) return 'red';
  if (feedback.pain && feedback.pain >= 4) return 'yellow';
  if (feedback.body_feel && feedback.body_feel <= 4) return 'yellow';
  if (feedback.energy_rating && feedback.energy_rating <= 4) return 'yellow';
  return 'green';
}

const SEVERITY_STYLES = {
  green: 'border-l-success bg-success/5',
  yellow: 'border-l-warning bg-warning/5',
  red: 'border-l-destructive bg-destructive/5',
} as const;

const SEVERITY_DOT = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
} as const;

export function FeedbackExpandedCard({
  feedback,
  clientName,
  trainingDate,
  trainingType,
  onOpenDetail,
  onOpenChat,
}: FeedbackExpandedCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showNote, setShowNote] = useState(false);
  
  const severity = getSeverityColor(feedback);
  const hasComment = !!feedback.comment;
  
  // Format truncated comment
  const truncatedComment = feedback.comment 
    ? feedback.comment.length > 100 
      ? feedback.comment.substring(0, 100) + '...'
      : feedback.comment
    : null;

  return (
    <div 
      className={cn(
        'rounded-xl border-l-4 p-4 transition-all',
        SEVERITY_STYLES[severity],
        'hover:shadow-md'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Severity indicator */}
          <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', SEVERITY_DOT[severity])} />
          
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link 
                to={`/clients/${feedback.client_id}`}
                className="font-semibold hover:underline truncate"
              >
                {clientName}
              </Link>
              
              {feedback.is_red_flag && (
                <Badge className="bg-destructive/20 text-destructive text-xs gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Red Flag
                </Badge>
              )}
              
              {(feedback as any).trainer_note && (
                <Badge variant="outline" className="text-xs gap-1">
                  <FileText className="w-3 h-3" />
                  Poznámka
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {trainingDate && (
                <span>{format(new Date(trainingDate), 'd.M.yyyy', { locale: cs })}</span>
              )}
              {trainingType && (
                <>
                  <span>•</span>
                  <span>{trainingType}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => setShowNote(!showNote)}
          >
            <FileText className="w-4 h-4" />
          </Button>
          
          {onOpenChat && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={onOpenChat}
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={onOpenDetail}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Inline Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <MetricMiniBar 
          value={feedback.body_feel} 
          label="Pocit" 
          size="sm"
        />
        <MetricMiniBar 
          value={feedback.energy_rating} 
          label="Energie" 
          size="sm"
        />
        <MetricMiniBar 
          value={feedback.soreness} 
          label="Svalovka" 
          size="sm"
        />
        <MetricMiniBar 
          value={feedback.pain} 
          label="Bolest" 
          size="sm"
        />
      </div>

      {/* Additional metrics row (collapsed by default) */}
      {isExpanded && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3 pt-3 border-t border-border/50">
          <MetricMiniBar 
            value={feedback.difficulty} 
            label="Obtížnost" 
            size="sm"
          />
          <MetricMiniBar 
            value={feedback.fun} 
            label="Zábava" 
            size="sm"
          />
          <MetricMiniBar 
            value={feedback.session_fit} 
            label="Sedl trénink" 
            size="sm"
          />
        </div>
      )}

      {/* Comment preview */}
      {hasComment && (
        <div 
          className={cn(
            'text-sm text-muted-foreground bg-background/50 rounded-lg p-2.5 mb-3',
            'border border-border/50'
          )}
        >
          <div className="flex items-start gap-2">
            <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <p className={cn(!isExpanded && 'line-clamp-2')}>
              "{isExpanded ? feedback.comment : truncatedComment}"
            </p>
          </div>
        </div>
      )}

      {/* Trainer Note Editor (conditionally shown) */}
      {showNote && (
        <div className="mb-3">
          <FeedbackTrainerNote 
            feedbackId={feedback.id}
            initialNote={(feedback as any).trainer_note}
            onClose={() => setShowNote(false)}
          />
        </div>
      )}

      {/* Red Flag Reasons */}
      {feedback.is_red_flag && feedback.red_flag_reasons && feedback.red_flag_reasons.length > 0 && isExpanded && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 mb-3">
          <p className="text-xs font-medium text-destructive mb-1">Důvody upozornění:</p>
          <ul className="text-xs text-destructive list-disc list-inside">
            {feedback.red_flag_reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expand/Collapse Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center pt-2 border-t border-border/30"
      >
        {isExpanded ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            Méně detailů
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            Více detailů
          </>
        )}
      </button>
    </div>
  );
}
