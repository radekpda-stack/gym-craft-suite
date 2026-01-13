import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { History, ChevronRight, Star, Tag } from 'lucide-react';
import { PreviousTrainingData } from '@/hooks/usePreviousTraining';
import { cn } from '@/lib/utils';

interface PreviousTrainingCardProps {
  training: PreviousTrainingData;
}

export function PreviousTrainingCard({ training }: PreviousTrainingCardProps) {
  return (
    <div className="glass rounded-xl sm:rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-muted-foreground">
          <History className="w-4 h-4" />
          <span className="text-sm font-medium">Předchozí trénink</span>
        </div>
        <Link
          to={`/trainings/${training.id}`}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Detail
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {/* Date */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Datum</span>
          <span className="text-sm font-medium text-foreground">
            {format(new Date(training.date), "d. MMMM yyyy", { locale: cs })}
          </span>
        </div>

        {/* Rating */}
        {training.subjective_rating && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hodnocení</span>
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-warning fill-warning" />
              <span className="text-sm font-medium text-foreground">
                {training.subjective_rating}/10
              </span>
            </div>
          </div>
        )}

        {/* Tags */}
        {training.tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Tag className="w-3.5 h-3.5" />
              <span className="text-xs">Co se dělalo</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {training.tags.map((tag) => (
                <span
                  key={tag.id}
                  className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    "bg-secondary text-secondary-foreground"
                  )}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Notes preview */}
        {training.notes && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground line-clamp-2">
              {training.notes}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
