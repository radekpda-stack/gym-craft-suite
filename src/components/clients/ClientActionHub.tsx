import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar,
  StickyNote,
  CreditCard,
  ChevronRight,
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
import { isToday, isFuture } from 'date-fns';
import { toast } from '@/hooks/use-toast';

interface ClientActionHubProps {
  client: Client;
  creditBalance: number;
  onAddNote?: (note: string) => void;
  onAddTraining?: () => void;
  onAddCredit?: () => void;
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
  
  const { data: sessions = [] } = useTrainingSessions(client.id);
  
  // Determine the dominant action based on context
  const { action, todayTraining, nextScheduled } = useMemo(() => {
    const todayT = sessions.find((s: any) => 
      isToday(new Date(s.date)) && s.status === 'scheduled'
    );
    
    const nextS = sessions.find((s: any) => 
      isFuture(new Date(s.date)) && s.status === 'scheduled'
    );
    
    if (todayT) {
      return {
        action: 'training-today',
        label: 'Upravit dnešní trénink',
        sublabel: `Trénink v ${new Date(todayT.date).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`,
        todayTraining: todayT,
        nextScheduled: nextS,
      };
    }
    
    if (creditBalance < 800 && client.payment_mode !== 'cash_only') {
      return {
        action: 'credit',
        label: 'Dobít kredit',
        sublabel: `Zbývá ${creditBalance.toLocaleString('cs-CZ')} Kč`,
        todayTraining: null,
        nextScheduled: nextS,
      };
    }
    
    return {
      action: 'schedule',
      label: nextS ? 'Zobrazit příští trénink' : 'Naplánovat trénink',
      sublabel: nextS ? new Date(nextS.date).toLocaleDateString('cs-CZ') : 'Žádný nadcházející',
      todayTraining: null,
      nextScheduled: nextS,
    };
  }, [sessions, creditBalance, client]);
  
  const handleDominantAction = () => {
    if (action === 'training-today' && todayTraining) {
      navigate(`/trainings/${todayTraining.id}`);
    } else if (action === 'credit') {
      onAddCredit?.();
    } else if (nextScheduled) {
      navigate(`/trainings/${nextScheduled.id}`);
    } else {
      onAddTraining?.();
    }
  };
  
  const handleSaveNote = () => {
    if (noteText.trim() && onAddNote) {
      onAddNote(noteText.trim());
      setNoteText('');
      setShowNoteDialog(false);
      toast({ title: 'Poznámka uložena' });
    }
  };

  return (
    <>
      <div className="glass rounded-2xl p-4">
        <button
          onClick={handleDominantAction}
          className={cn(
            'w-full flex items-center gap-4 p-4 rounded-xl transition-all',
            'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground',
            'hover:from-primary/90 hover:to-primary/70 active:scale-[0.98]'
          )}
        >
          <div className="p-3 rounded-xl bg-white/20">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-lg">{action === 'training-today' ? 'Upravit dnešní trénink' : action === 'credit' ? 'Dobít kredit' : nextScheduled ? 'Zobrazit příští trénink' : 'Naplánovat trénink'}</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-70" />
        </button>
        
        <div className="flex gap-2 mt-3">
          <Button variant="ghost" size="sm" onClick={onAddTraining} className="flex-1 gap-2">
            <Calendar className="w-4 h-4" />
            Trénink
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowNoteDialog(true)} className="flex-1 gap-2">
            <StickyNote className="w-4 h-4" />
            Poznámka
          </Button>
          {client.payment_mode !== 'cash_only' && (
            <Button variant="ghost" size="sm" onClick={onAddCredit} className="flex-1 gap-2">
              <CreditCard className="w-4 h-4" />
              Kredit
            </Button>
          )}
        </div>
      </div>
      
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rychlá poznámka</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Napište poznámku..." rows={4} autoFocus />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Zrušit</Button>
              <Button onClick={handleSaveNote} disabled={!noteText.trim()}>Uložit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
