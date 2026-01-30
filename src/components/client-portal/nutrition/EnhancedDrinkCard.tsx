import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Droplets, 
  Coffee,
  MessageSquare,
  Reply,
  Pencil,
  Trash2,
  MoreVertical,
  Ban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { haptic } from '@/lib/haptics';
import { DRINK_LABELS, COFFEE_LABELS } from './constants';

// Drink type configuration
const DRINK_CONFIG: Record<string, {
  gradient: string;
  iconBg: string;
  iconColor: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  water: {
    gradient: 'from-sky-500/10 via-background to-blue-500/5',
    iconBg: 'bg-sky-500/15',
    iconColor: 'text-sky-500',
    icon: Droplets,
  },
  tea: {
    gradient: 'from-emerald-500/10 via-background to-green-500/5',
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-600',
    icon: Coffee,
  },
  juice: {
    gradient: 'from-orange-500/10 via-background to-amber-500/5',
    iconBg: 'bg-orange-500/15',
    iconColor: 'text-orange-500',
    icon: Droplets,
  },
  soda: {
    gradient: 'from-pink-500/10 via-background to-rose-500/5',
    iconBg: 'bg-pink-500/15',
    iconColor: 'text-pink-500',
    icon: Droplets,
  },
  other: {
    gradient: 'from-accent/10 via-background to-accent/5',
    iconBg: 'bg-accent/15',
    iconColor: 'text-accent',
    icon: Droplets,
  },
};

interface DrinkEntry {
  id: string;
  drink_type: string;
  drink_name?: string | null;
  amount_ml?: number | null;
  trainer_comment?: string | null;
  occurred_at?: string | null;
}

interface CoffeeEntry {
  id: string;
  coffee_type: string;
  coffee_name?: string | null;
  coffee_amount_ml?: number | null;
  count?: number;
  is_caffeinated?: boolean;
  trainer_comment?: string | null;
  occurred_at?: string | null;
}

interface EnhancedDrinkCardProps {
  entry: DrinkEntry | CoffeeEntry;
  type: 'drink' | 'coffee';
  time: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onReply?: (reply: string) => Promise<void>;
}

export function EnhancedDrinkCard({ 
  entry, 
  type,
  time, 
  onEdit, 
  onDelete, 
  onReply 
}: EnhancedDrinkCardProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCoffee = type === 'coffee';
  const coffeeEntry = entry as CoffeeEntry;
  const drinkEntry = entry as DrinkEntry;
  
  const isCaffeinated = isCoffee ? coffeeEntry.is_caffeinated !== false : true;
  
  const drinkType = isCoffee ? 'coffee' : drinkEntry.drink_type;
  const config = isCoffee 
    ? {
        gradient: isCaffeinated 
          ? 'from-amber-500/10 via-background to-orange-500/5' 
          : 'from-muted/30 via-background to-muted/10',
        iconBg: isCaffeinated ? 'bg-amber-500/15' : 'bg-muted/50',
        iconColor: isCaffeinated ? 'text-amber-600' : 'text-muted-foreground',
        icon: Coffee,
      }
    : DRINK_CONFIG[drinkType] || DRINK_CONFIG.other;
  
  const Icon = config.icon;
  
  const name = isCoffee
    ? coffeeEntry.coffee_name || (coffeeEntry.coffee_type === 'other' 
        ? 'Jiný nápoj' 
        : COFFEE_LABELS[coffeeEntry.coffee_type] || coffeeEntry.coffee_type)
    : drinkEntry.drink_name || (drinkEntry.drink_type === 'other' 
        ? 'Jiný nápoj' 
        : DRINK_LABELS[drinkEntry.drink_type] || drinkEntry.drink_type);
  
  const amount = isCoffee ? coffeeEntry.coffee_amount_ml : drinkEntry.amount_ml;
  const count = isCoffee && coffeeEntry.count && coffeeEntry.count > 1 ? coffeeEntry.count : null;
  const trainerComment = entry.trainer_comment;

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
          <div className="flex items-center gap-3">
            {/* Time + Icon */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground">{time}</span>
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center relative",
                config.iconBg
              )}>
                <Icon className={cn("w-5 h-5", config.iconColor)} />
                {isCoffee && !isCaffeinated && (
                  <Ban className="w-3 h-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{name}</span>
                {count && (
                  <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    ×{count}
                  </span>
                )}
                {isCoffee && !isCaffeinated && (
                  <span className="text-xs text-muted-foreground">(bez kofeinu)</span>
                )}
                {amount && (
                  <span className="text-xs text-muted-foreground">
                    {amount} ml
                  </span>
                )}
              </div>
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

        {/* Trainer Comment - ALWAYS VISIBLE */}
        {trainerComment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mb-4"
          >
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Trenér
                </span>
              </div>
              <p className="text-sm">{trainerComment}</p>
              
              {/* Reply section */}
              {onReply && !isReplying && (
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
