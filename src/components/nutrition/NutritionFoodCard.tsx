import React, { useState } from 'react';
import { Clock, Pencil, MessageCircle, ChevronDown, ChevronUp, Star, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { MEAL_LABELS, PORTION_LABELS, QUALITY_LABELS, SATIATION_LABELS } from '@/components/client-portal/nutrition/constants';

interface NutritionFoodCardProps {
  time: string;
  mealType: string;
  description: string;
  portionSize?: string;
  quality?: 'good' | 'normal' | 'poor' | null;
  satiation?: string | null;
  clientNote?: string | null;
  trainerNote?: string | null;
  trainerRating?: number | null;
  clientReply?: string | null;
  trainerEdited?: boolean;
  // Nutrition data from AI
  calories?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  aiEnriched?: boolean;
  onEdit?: () => void;
  onComment?: () => void;
  className?: string;
}

const QUALITY_STYLES: Record<string, { border: string; bg: string; icon: string }> = {
  good: { border: 'border-l-emerald-500', bg: 'bg-emerald-500/5', icon: '💚' },
  normal: { border: 'border-l-amber-500', bg: 'bg-amber-500/5', icon: '🟡' },
  poor: { border: 'border-l-red-500', bg: 'bg-red-500/5', icon: '🔴' },
};

const MEAL_ICONS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

// Rating color helper
const getRatingColor = (rating: number): string => {
  if (rating <= 3) return 'text-destructive';
  if (rating <= 6) return 'text-warning';
  if (rating <= 8) return 'text-success';
  return 'text-emerald-500';
};


export function NutritionFoodCard({
  time,
  mealType,
  description,
  portionSize,
  quality,
  satiation,
  clientNote,
  trainerNote,
  trainerRating,
  clientReply,
  trainerEdited,
  calories,
  proteinG,
  carbsG,
  fatG,
  aiEnriched,
  onEdit,
  onComment,
  className,
}: NutritionFoodCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const qualityStyle = quality ? QUALITY_STYLES[quality] : null;
  const mealLabel = MEAL_LABELS[mealType] || mealType;
  const mealIcon = MEAL_ICONS[mealType] || '🍽️';
  const portionLabel = portionSize ? PORTION_LABELS[portionSize] || portionSize : null;
  const satiationLabel = satiation ? SATIATION_LABELS[satiation] || satiation : null;
  const isLongDescription = description.length > 80;
  const shouldShowExpand = isLongDescription || clientNote || trainerNote || clientReply;

  return (
    <div 
      className={cn(
        "rounded-lg border border-border overflow-hidden transition-all duration-150",
        qualityStyle?.bg || "bg-card",
        qualityStyle ? `border-l-4 ${qualityStyle.border}` : "border-l-4 border-l-warning",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium">{time}</span>
          <span className="text-muted-foreground">•</span>
          <span className="text-sm">
            {mealIcon} {mealLabel}
          </span>
          {quality && (
            <span className="text-xs" title={QUALITY_LABELS[quality] || quality}>
              {qualityStyle?.icon}
            </span>
          )}
          {trainerRating && (
            <span className={cn("flex items-center gap-0.5 text-xs font-medium", getRatingColor(trainerRating))}>
              <Star className="w-3 h-3 fill-current" />
              {trainerRating}/10
            </span>
          )}
          {trainerEdited && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
              Upraveno
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={onEdit}
              className="h-7 w-7"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          {onComment && (
            <Button 
              variant="ghost" 
              size="icon-sm" 
              onClick={onComment}
              className={cn("h-7 w-7", trainerNote && "text-primary")}
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="px-3 py-2 space-y-2">
        {/* Description */}
        <p className={cn(
          "text-sm leading-relaxed",
          !isExpanded && isLongDescription && "line-clamp-2"
        )}>
          {description}
        </p>
        
        {/* Nutrition data from AI */}
        {calories && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">~{calories} kcal</span>
            {proteinG && <span>{proteinG}g B</span>}
            {carbsG && <span>{carbsG}g S</span>}
            {fatG && <span>{fatG}g T</span>}
            {aiEnriched && (
              <span title="AI odhad">
                <Sparkles className="w-3 h-3 text-primary" />
              </span>
            )}
          </div>
        )}
        
        {/* Metadata row */}
        {(portionLabel || satiationLabel) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {portionLabel && (
              <span className="flex items-center gap-1">
                📏 {portionLabel} porce
              </span>
            )}
            {satiationLabel && (
              <span className="flex items-center gap-1">
                {satiation === 'still_hungry' && '😕'}
                {satiation === 'just_right' && '😊'}
                {satiation === 'overate' && '😫'}
                {satiationLabel}
              </span>
            )}
          </div>
        )}
        
        {/* Expanded content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-2 overflow-hidden"
            >
              {clientNote && (
                <div className="rounded bg-muted/50 px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground">Poznámka klienta: </span>
                  {clientNote}
                </div>
              )}
              {trainerNote && (
                <div className="rounded bg-primary/10 border border-primary/20 px-2 py-1.5 text-xs">
                  <span className="text-primary font-medium">💬 Trenér: </span>
                  {trainerNote}
                </div>
              )}
              {clientReply && (
                <div className="rounded bg-muted/50 border px-2 py-1.5 text-xs">
                  <span className="text-muted-foreground font-medium">↳ Odpověď: </span>
                  {clientReply}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Expand button */}
        {shouldShowExpand && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Méně
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Více {(clientNote || trainerNote) && '(+ poznámky)'}
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
