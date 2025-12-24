import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  MessageSquare,
  StickyNote,
  CreditCard,
  ChevronRight,
  Play,
  AlertTriangle,
  Send,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Client } from '@/hooks/useClients';
import { useTrainingSessions } from '@/hooks/useTrainingSessions';
import { useClientFeedback } from '@/hooks/useTrainingFeedback';
import { isToday, isFuture, differenceInDays, differenceInMinutes } from 'date-fns';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ClientActionHubProps {
  client: Client;
  creditBalance: number;
  onAddNote?: (note: string) => void;
  onAddTraining?: () => void;
  onAddCredit?: () => void;
}

interface DominantAction {
  type: 'training-now' | 'training-today' | 'feedback' | 'note' | 'credit' | 'schedule';
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  variant: 'primary' | 'warning' | 'urgent';
  trainingId?: string;
}

export function ClientActionHub({ 
  client, 
  creditBalance,
  onAddNote,
  onAddTraining,
  onAddCredit,
}: ClientActionHubProps) {
  const navigate = useNavigate();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  const { data: sessions = [] } = useTrainingSessions(client.id);
  const { data: feedbackData = [] } = useClientFeedback(client.id);
  
  // Determine the dominant action based on context
  const dominantAction = useMemo((): DominantAction => {
    const now = new Date();
    
    // 1. Training happening RIGHT NOW (within 30 mins)?
    const currentTraining = sessions.find((s: any) => {
      if (s.status !== 'scheduled') return false;
      const trainingDate = new Date(s.date);
      const minsDiff = differenceInMinutes(trainingDate, now);
      return minsDiff >= -60 && minsDiff <= 30; // Started up to 1h ago or starts in 30min
    });
    
    if (currentTraining) {
      return {
        type: 'training-now',
        label: 'Otevřít trénink',
        sublabel: 'Probíhá právě teď',
        icon: <Play className="w-6 h-6" />,
        variant: 'urgent',
        trainingId: currentTraining.id,
      };
    }
    
    // 2. Training scheduled for today?
    const todayTraining = sessions.find((s: any) => 
      isToday(new Date(s.date)) && s.status === 'scheduled'
    );
    
    if (todayTraining) {
      const time = new Date(todayTraining.date).toLocaleTimeString('cs-CZ', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return {
        type: 'training-today',
        label: 'Dnešní trénink',
        sublabel: `Naplánováno na ${time}`,
        icon: <Calendar className="w-6 h-6" />,
        variant: 'primary',
        trainingId: todayTraining.id,
      };
    }
    
    // 3. Missing feedback from recent completed training?
    const recentCompleted = sessions.find((s: any) => 
      s.status === 'completed' && 
      differenceInDays(now, new Date(s.date)) <= 3
    );
    
    const hasFeedbackForRecent = recentCompleted && feedbackData.some(
      (f: any) => differenceInDays(new Date(f.training_date), new Date(recentCompleted.date)) === 0
    );
    
    if (recentCompleted && !hasFeedbackForRecent && client.feedback_enabled !== false) {
      return {
        type: 'feedback',
        label: 'Vyžádat feedback',
        sublabel: 'Chybí zpětná vazba z tréninku',
        icon: <Send className="w-6 h-6" />,
        variant: 'warning',
        trainingId: recentCompleted.id,
      };
    }
    
    // 4. Health issue detected (high pain/RPE in recent feedback)?
    const recentFeedback = feedbackData[0];
    if (recentFeedback && differenceInDays(now, new Date(recentFeedback.training_date)) <= 7) {
      if (recentFeedback.is_red_flag || recentFeedback.pain >= 7) {
        return {
          type: 'note',
          label: 'Zapsat poznámku',
          sublabel: 'Klient hlásí zdravotní problém',
          icon: <AlertTriangle className="w-6 h-6" />,
          variant: 'warning',
        };
      }
    }
    
    // 5. Low credit?
    if (creditBalance < 800 && client.payment_mode !== 'cash_only') {
      return {
        type: 'credit',
        label: 'Dobít kredit',
        sublabel: `Zbývá pouze ${creditBalance.toLocaleString('cs-CZ')} Kč`,
        icon: <CreditCard className="w-6 h-6" />,
        variant: 'warning',
      };
    }
    
    // 6. Default: schedule next training
    const nextScheduled = sessions.find((s: any) => 
      isFuture(new Date(s.date)) && s.status === 'scheduled'
    );
    
    if (nextScheduled) {
      const date = new Date(nextScheduled.date);
      return {
        type: 'training-today',
        label: 'Příští trénink',
        sublabel: date.toLocaleDateString('cs-CZ', { weekday: 'short', day: 'numeric', month: 'numeric' }),
        icon: <Clock className="w-6 h-6" />,
        variant: 'primary',
        trainingId: nextScheduled.id,
      };
    }
    
    return {
      type: 'schedule',
      label: 'Naplánovat trénink',
      sublabel: 'Žádný nadcházející trénink',
      icon: <Calendar className="w-6 h-6" />,
      variant: 'primary',
    };
  }, [sessions, feedbackData, creditBalance, client]);
  
  const handleDominantAction = async () => {
    switch (dominantAction.type) {
      case 'training-now':
      case 'training-today':
        if (dominantAction.trainingId) {
          navigate(`/trainings/${dominantAction.trainingId}`);
        }
        break;
        
      case 'feedback':
        if (dominantAction.trainingId) {
          setIsGeneratingLink(true);
          try {
            const { data, error } = await supabase
              .from('feedback_requests')
              .insert({
                client_id: client.id,
                training_session_id: dominantAction.trainingId,
                user_id: (await supabase.auth.getUser()).data.user?.id,
              })
              .select('token')
              .single();
            
            if (error) throw error;
            
            const link = `${window.location.origin}/feedback/${data.token}`;
            await navigator.clipboard.writeText(link);
            toast({ title: 'Odkaz zkopírován do schránky' });
          } catch (error) {
            toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
          } finally {
            setIsGeneratingLink(false);
          }
        }
        break;
        
      case 'note':
        setShowNoteDialog(true);
        break;
        
      case 'credit':
        onAddCredit?.();
        break;
        
      case 'schedule':
        onAddTraining?.();
        break;
    }
  };
  
  const handleSaveNote = () => {
    if (noteText.trim() && onAddNote) {
      onAddNote(noteText.trim());
      setNoteText('');
      setShowNoteDialog(false);
    }
  };
  
  const getVariantStyles = () => {
    switch (dominantAction.variant) {
      case 'urgent':
        return 'bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25';
      case 'warning':
        return 'bg-gradient-to-r from-warning to-warning/80 text-warning-foreground';
      default:
        return 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground';
    }
  };

  return (
    <>
      {/* Section 2: Dominant CTA */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Co teď?
        </p>
        
        <button
          onClick={handleDominantAction}
          disabled={isGeneratingLink}
          className={cn(
            'w-full flex items-center gap-4 p-5 rounded-2xl transition-all',
            'active:scale-[0.98] hover:shadow-xl',
            getVariantStyles()
          )}
        >
          <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
            {dominantAction.icon}
          </div>
          
          <div className="flex-1 text-left">
            <p className="font-bold text-lg">
              {dominantAction.label}
            </p>
            <p className="text-sm opacity-80">
              {dominantAction.sublabel}
            </p>
          </div>
          
          <ChevronRight className="w-6 h-6 opacity-70" />
        </button>
      </div>
      
      {/* Section 3: Quick Actions */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
          Rychlé akce
        </p>
        
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            onClick={onAddTraining}
            className="flex flex-col items-center gap-1.5 h-auto py-3 px-2"
          >
            <Calendar className="w-5 h-5 text-primary" />
            <span className="text-[11px]">Trénink</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowNoteDialog(true)}
            className="flex flex-col items-center gap-1.5 h-auto py-3 px-2"
          >
            <StickyNote className="w-5 h-5 text-primary" />
            <span className="text-[11px]">Poznámka</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              const completed = sessions.find((s: any) => s.status === 'completed');
              if (completed) {
                // Generate feedback link for last completed
                handleDominantAction();
              }
            }}
            className="flex flex-col items-center gap-1.5 h-auto py-3 px-2"
          >
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="text-[11px]">Feedback</span>
          </Button>
          
          {client.payment_mode !== 'cash_only' && (
            <Button
              variant="outline"
              onClick={onAddCredit}
              className="flex flex-col items-center gap-1.5 h-auto py-3 px-2"
            >
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-[11px]">Kredit</span>
            </Button>
          )}
        </div>
      </div>
      
      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-primary" />
              Poznámka k {client.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Napište poznámku..."
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSaveNote} disabled={!noteText.trim()}>
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
