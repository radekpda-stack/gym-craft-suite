import { useState } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { 
  Utensils, 
  MessageSquare,
  Star,
  Reply,
  Pencil,
  Trash2,
  MoreVertical,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptic } from '@/lib/haptics';
import { MEAL_LABELS, PORTION_LABELS, SATIATION_LABELS } from './constants';

// Meal type configuration with gradients
const MEAL_CONFIG: Record<string, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  emoji: string;
}> = {
  breakfast: {
    gradient: 'from-amber-500/10 via-background to-orange-500/5',
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-600',
    emoji: '🌅',
  },
  lunch: {
    gradient: 'from-yellow-500/10 via-background to-amber-500/5',
    iconBg: 'bg-yellow-500/15',
    iconColor: 'text-yellow-600',
    emoji: '☀️',
  },
  dinner: {
    gradient: 'from-indigo-500/10 via-background to-violet-500/5',
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-600',
    emoji: '🌙',
  },
  snack: {
    gradient: 'from-emerald-500/10 via-background to-green-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
    emoji: '🍎',
  },
};

const QUALITY_CONFIG: Record<string, { icon: string; color: string }> = {
  good: { icon: '💚', color: 'text-emerald-500' },
  normal: { icon: '🟡', color: 'text-amber-500' },
  poor: { icon: '🔴', color: 'text-destructive' },
};

const getRatingColor = (rating: number): string => {
  if (rating <= 3) return 'text-destructive';
  if (rating <= 6) return 'text-warning';
  if (rating <= 8) return 'text-success';
  return 'text-emerald-500';
};

const getRatingLabel = (rating: number): string => {
  if (rating <= 3) return 'Potřebuje zlepšit';
  if (rating <= 6) return 'Průměrné';
  if (rating <= 8) return 'Dobré';
  return 'Výborné!';
};

interface FoodEntry {
  id: string;
  meal_type: string;
  description: string;
  portion_size?: string | null;
  quality?: 'good' | 'normal' | 'poor' | null;
  satiation?: string | null;
  note?: string | null;
  trainer_rating?: number | null;
  trainer_comment?: string | null;
  trainer_commented_at?: string | null;
  client_reply?: string | null;
  occurred_at?: string | null;
  created_at?: string;
  // AI nutrition data
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  ai_enriched?: boolean;
}

interface EnhancedFoodCardProps {
  entry: FoodEntry;
  time: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: (reply: string) => Promise<void>;
}

export function EnhancedFoodCard({ 
  entry, 
  time, 
  onEdit, 
  onDelete, 
  onReply 
}: EnhancedFoodCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const config = MEAL_CONFIG[entry.meal_type] || MEAL_CONFIG.snack;
  const hasTrainerFeedback = entry.trainer_rating || entry.trainer_comment;
  const qualityConfig = entry.quality ? QUALITY_CONFIG[entry.quality] : null;
  const portionLabel = entry.portion_size ? PORTION_LABELS[entry.portion_size] : null;
  const satiationLabel = entry.satiation ? SATIATION_LABELS[entry.satiation] : null;

  const handleReplySubmit = async () => {
    if (!replyText.trim() || !onReply) return;
    
    setIsSubmitting(true);
    haptic('medium');
    try {
      await onReply(replyText.trim());
      setReplyText('');
      setIsReplying(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div 
        className={cn(
          "rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200",
          "bg-gradient-to-br border border-border/50",
          config.gradient
        )}
      >
        {/* Main Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Time + Icon */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">{time}</span>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                config.iconBg
              )}>
                <span className="text-2xl">{config.emoji}</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm text-muted-foreground">
                  {MEAL_LABELS[entry.meal_type] || entry.meal_type}
                </span>
                {qualityConfig && (
                  <span className="text-base">{qualityConfig.icon}</span>
                )}
                {entry.trainer_rating && (
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs gap-1", getRatingColor(entry.trainer_rating))}
                  >
                    <Star className="w-3 h-3 fill-current" />
                    {entry.trainer_rating}/10
                  </Badge>
                )}
              </div>
              
              <p className="text-sm mt-1 leading-relaxed">{entry.description}</p>
              
              {/* AI Nutrition Data */}
              {entry.calories ? (
                <div className="flex items-center gap-2 mt-2 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-semibold text-foreground">~{entry.calories} kcal</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">
                    {entry.protein_g || 0}g B • {entry.carbs_g || 0}g S • {entry.fat_g || 0}g T
                  </span>
                </div>
              ) : entry.ai_enriched === false ? (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Počítám nutrienty...</span>
                </div>
              ) : null}
              
              {/* Metadata */}
              {(portionLabel || satiationLabel) && (
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {portionLabel && (
                    <span className="flex items-center gap-1">
                      📏 {portionLabel}
                    </span>
                  )}
                  {satiationLabel && (
                    <span className="flex items-center gap-1">
                      {entry.satiation === 'still_hungry' && '😕'}
                      {entry.satiation === 'just_right' && '😊'}
                      {entry.satiation === 'overate' && '😫'}
                      {satiationLabel}
                    </span>
                  )}
                </div>
              )}

              {/* Client note */}
              {entry.note && (
                <p className="text-xs text-muted-foreground italic mt-2">
                  📝 {entry.note}
                </p>
              )}
            </div>

            {/* Actions */}
            {(onEdit || onDelete) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={onEdit}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Upravit
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      onClick={onDelete}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Smazat
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Trainer Feedback - ALWAYS VISIBLE */}
        {hasTrainerFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mb-4"
          >
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Trenér
                </span>
                {entry.trainer_rating && (
                  <Badge 
                    variant="secondary"
                    className={cn("text-xs ml-auto", getRatingColor(entry.trainer_rating))}
                  >
                    {getRatingLabel(entry.trainer_rating)}
                  </Badge>
                )}
              </div>
              
              {entry.trainer_comment && (
                <p className="text-sm leading-relaxed">{entry.trainer_comment}</p>
              )}
              
              {/* Existing reply */}
              {entry.client_reply && (
                <div className="mt-2 pl-3 border-l-2 border-muted text-xs text-muted-foreground">
                  <span className="font-medium">Vaše odpověď:</span> {entry.client_reply}
                </div>
              )}
              
              {/* Reply section */}
              {onReply && entry.trainer_comment && !entry.client_reply && !isReplying && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="mt-2 text-primary hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    haptic('light');
                    setIsReplying(true);
                  }}
                >
                  <Reply className="w-3.5 h-3.5 mr-1.5" />
                  Odpovědět
                </Button>
              )}

              {isReplying && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Napište odpověď..."
                    className="min-h-[60px] text-sm bg-background/50"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsReplying(false);
                        setReplyText('');
                      }}
                    >
                      Zrušit
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReplySubmit}
                      disabled={!replyText.trim() || isSubmitting}
                    >
                      Odeslat
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
