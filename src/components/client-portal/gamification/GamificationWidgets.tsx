import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dumbbell, Flame, Zap, Trophy, Award, ChevronRight, Plus, Check } from 'lucide-react';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { 
  useClientGamificationStats, 
  useNextBadge, 
  useCanConfirmToday,
  useConfirmWorkout 
} from '@/hooks/useClientGamification';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useCelebrations } from '@/contexts/CelebrationContext';
import { supabase } from '@/integrations/supabase/client';

// Workout types for client-confirmed
const workoutTypes = [
  { value: 'strength', label: 'Silový' },
  { value: 'cardio', label: 'Kardio' },
  { value: 'flexibility', label: 'Mobilita / Strečink' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'sport', label: 'Sport' },
  { value: 'other', label: 'Jiný' },
];

interface ConfirmWorkoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ConfirmWorkoutDialog({ open, onOpenChange }: ConfirmWorkoutDialogProps) {
  const [workoutType, setWorkoutType] = useState('');
  const [notes, setNotes] = useState('');
  const { mutate: confirmWorkout, isPending } = useConfirmWorkout();
  const { toast } = useToast();
  const { clientId } = useClientPortal();
  const { showLevelUp, showBadge, showPR } = useCelebrations();
  
  const handleSubmit = () => {
    confirmWorkout(
      { 
        workoutType: workoutType || undefined, 
        performedAt: new Date(),
        notes: notes || undefined,
      },
      {
        onSuccess: async (data) => {
          toast({
            title: 'Trénink potvrzen! 💪',
            description: '+6 XP',
          });
          onOpenChange(false);
          setWorkoutType('');
          setNotes('');

          // Call calculate-xp edge function for celebrations
          if (clientId && data?.id) {
            try {
              const { data: xpResult } = await supabase.functions.invoke('calculate-xp', {
                body: { workout_id: data.id, client_id: clientId },
              });

              if (xpResult?.celebrations) {
                // Show level up celebration
                if (xpResult.celebrations.level_up && xpResult.total_xp > 0) {
                  // Only show if level actually changed (check against previous)
                  // For now, we'll skip this as it's complex to track old level
                }

                // Show badge celebrations
                for (const badge of xpResult.celebrations.new_badges || []) {
                  setTimeout(() => {
                    showBadge(badge.name, badge.icon, badge.rarity, badge.xp_bonus);
                  }, 500);
                  break; // Only show first badge
                }

                // Show PR celebrations
                for (const pr of xpResult.celebrations.new_prs || []) {
                  setTimeout(() => {
                    showPR(pr.name, pr.value, 25);
                  }, 1000);
                  break; // Only show first PR
                }
              }
            } catch (err) {
              console.error('Error calculating XP:', err);
            }
          }
        },
        onError: (error) => {
          toast({
            title: 'Chyba',
            description: error.message,
            variant: 'destructive',
          });
        },
      }
    );
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Potvrdit trénink
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Typ tréninku (volitelné)</Label>
            <Select value={workoutType} onValueChange={setWorkoutType}>
              <SelectTrigger>
                <SelectValue placeholder="Vyber typ..." />
              </SelectTrigger>
              <SelectContent>
                {workoutTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Poznámka (volitelné)</Label>
            <Input 
              placeholder="Co jsi dnes trénoval/a?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          
          <div className="p-3 rounded-lg bg-primary/10 text-sm">
            <p className="font-medium text-primary">+6 XP za vlastní trénink</p>
            <p className="text-muted-foreground text-xs mt-1">
              Trénink s trenérem = 10 XP
            </p>
          </div>
          
          <Button 
            onClick={handleSubmit} 
            disabled={isPending}
            className="w-full"
          >
            {isPending ? 'Ukládám...' : 'Potvrdit trénink'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function GamificationProgressCard() {
  const { clientId } = useClientPortal();
  const { stats, isLoading } = useClientGamificationStats(clientId ?? undefined);
  const nextBadge = useNextBadge(clientId ?? undefined);
  const { canConfirm, isLoading: canConfirmLoading } = useCanConfirmToday(clientId ?? undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="space-y-4">
            <div className="h-6 bg-muted animate-pulse rounded w-1/3" />
            <div className="grid grid-cols-4 gap-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              Můj progres
            </CardTitle>
            <Link to="/zona/badges">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                Odznaky
                <ChevronRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-3 rounded-xl bg-primary/10">
              <Dumbbell className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.totalWorkouts}</p>
              <p className="text-[10px] text-muted-foreground">Celkem</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-blue-500/10">
              <Trophy className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.monthlyWorkouts}</p>
              <p className="text-[10px] text-muted-foreground">Tento měsíc</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-amber-500/10">
              <Zap className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.monthlyXP}</p>
              <p className="text-[10px] text-muted-foreground">XP</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-orange-500/10">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
          </div>
          
          {/* Next Badge */}
          {nextBadge && (
            <div className="p-3 rounded-xl bg-muted/50 border border-muted">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Další odznak: {nextBadge.definition.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Chybí ti {nextBadge.remaining} {nextBadge.remaining === 1 ? 'trénink' : nextBadge.remaining < 5 ? 'tréninky' : 'tréninků'}
                  </p>
                </div>
              </div>
              <Progress 
                value={nextBadge.progressPercent} 
                className="mt-2 h-2" 
              />
            </div>
          )}
          
          {/* Confirm Workout Button */}
          <Button 
            onClick={() => setDialogOpen(true)}
            disabled={!canConfirm || canConfirmLoading}
            className="w-full gap-2"
            variant={canConfirm ? 'default' : 'secondary'}
          >
            {canConfirm ? (
              <>
                <Plus className="w-4 h-4" />
                Potvrdit dokončený trénink
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Dnes již potvrzeno
              </>
            )}
          </Button>
          
          {canConfirm && (
            <p className="text-[10px] text-muted-foreground text-center">
              Max 1 potvrzení za den • +6 XP
            </p>
          )}
        </CardContent>
      </Card>
      
      <ConfirmWorkoutDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

// Compact version for overview
export function GamificationCompactWidget() {
  const { clientId } = useClientPortal();
  const { stats, isLoading } = useClientGamificationStats(clientId ?? undefined);
  
  if (isLoading) {
    return (
      <div className="h-24 bg-muted animate-pulse rounded-xl" />
    );
  }
  
  return (
    <Link to="/zona/leaderboard">
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.monthlyXP} XP</p>
              <p className="text-xs text-muted-foreground">tento měsíc</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <p className="font-bold">{stats.monthlyWorkouts}</p>
              <p className="text-[10px] text-muted-foreground">Tréninků</p>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="font-bold">{stats.currentStreak}</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
