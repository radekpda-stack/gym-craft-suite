import { useState } from 'react';
import { 
  Plus,
  Link2,
  Utensils,
  StickyNote,
  FileText,
  Check,
  Copy,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useFeatureTracking } from '@/hooks/useFeatureTracking';
import { CreditStatementDialog } from '@/components/credit/CreditStatementDialog';
import { Client } from '@/hooks/useClients';
import { supabase } from '@/integrations/supabase/client';
import { useCreateNutritionLogSession } from '@/hooks/useNutritionLog';
import { cn } from '@/lib/utils';

interface ClientActionsSheetProps {
  client: Client;
  lastCompletedTrainingId?: string;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  onAddTraining: () => void;
  onAddNote?: (note: string) => void;
}

interface ActionButtonProps {
  icon: typeof Plus;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'primary';
}

function ActionButton({ icon: Icon, label, onClick, disabled, variant = 'default' }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all active:scale-95',
        variant === 'primary' 
          ? 'bg-primary text-primary-foreground' 
          : 'bg-secondary/80 hover:bg-secondary text-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <Icon className="w-6 h-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export function ClientActionsSheet({
  client,
  lastCompletedTrainingId,
  isSharedBudget,
  budgetGroupId,
  onAddTraining,
  onAddNote,
}: ClientActionsSheetProps) {
  const { trackFeature } = useFeatureTracking();
  const [isOpen, setIsOpen] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showStatementDialog, setShowStatementDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState<'feedback' | 'nutrition' | null>(null);
  const [generatedLink, setGeneratedLink] = useState<{type: string; url: string} | null>(null);
  
  const createNutritionSession = useCreateNutritionLogSession();

  const handleGenerateFeedbackLink = async () => {
    if (!lastCompletedTrainingId) {
      toast({ title: 'Není dostupný trénink pro feedback', variant: 'destructive' });
      return;
    }
    
    setIsGenerating('feedback');
    try {
      const { data, error } = await supabase
        .from('feedback_requests')
        .insert({
          client_id: client.id,
          training_session_id: lastCompletedTrainingId,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('token')
        .single();
      
      if (error) throw error;
      
      const link = `${window.location.origin}/feedback/${data.token}`;
      setGeneratedLink({ type: 'Feedback', url: link });
      await navigator.clipboard.writeText(link);
      toast({ title: 'Odkaz zkopírován do schránky' });
      trackFeature('feedback_link_generated', 'feedback');
    } catch (error) {
      toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleGenerateNutritionLink = async () => {
    setIsGenerating('nutrition');
    try {
      const session = await createNutritionSession.mutateAsync({
        clientId: client.id,
        startDate: new Date(),
      });
      
      const link = `${window.location.origin}/nutrition-log/${session.token}`;
      setGeneratedLink({ type: 'Strava', url: link });
      await navigator.clipboard.writeText(link);
      toast({ title: 'Odkaz zkopírován do schránky' });
      trackFeature('nutrition_link_generated', 'nutrition');
    } catch (error) {
      toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
    } finally {
      setIsGenerating(null);
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim() && onAddNote) {
      onAddNote(noteText.trim());
      setNoteText('');
      setShowNoteDialog(false);
      setIsOpen(false);
      toast({ title: 'Poznámka uložena' });
    }
  };

  const handleAddTraining = () => {
    setIsOpen(false);
    onAddTraining();
  };

  return (
    <>
      {/* Floating Action Button - Mobile only */}
      <button
        onClick={() => setIsOpen(true)}
        className="sm:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-7 h-7" />
      </button>
      
      {/* Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl px-6 pb-8">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-center">Akce pro {client.name}</SheetTitle>
          </SheetHeader>
          
          {/* Generated link display */}
          {generatedLink && (
            <div className="mb-4 p-3 rounded-2xl bg-status-ok/10 border border-status-ok/30 flex items-center gap-3">
              <Check className="w-5 h-5 text-[hsl(142_76%_36%)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{generatedLink.type} odkaz zkopírován</p>
                <p className="text-sm font-mono truncate">{generatedLink.url}</p>
              </div>
              <Button 
                size="icon" 
                variant="ghost"
                onClick={async () => {
                  await navigator.clipboard.writeText(generatedLink.url);
                  toast({ title: 'Zkopírováno' });
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          {/* Action buttons grid */}
          <div className="grid grid-cols-4 gap-3">
            <ActionButton 
              icon={Plus} 
              label="Trénink" 
              onClick={handleAddTraining}
              variant="primary"
            />
            <ActionButton 
              icon={Link2} 
              label="Feedback" 
              onClick={handleGenerateFeedbackLink}
              disabled={isGenerating === 'feedback' || !lastCompletedTrainingId}
            />
            <ActionButton 
              icon={Utensils} 
              label="Strava" 
              onClick={handleGenerateNutritionLink}
              disabled={isGenerating === 'nutrition'}
            />
            <ActionButton 
              icon={StickyNote} 
              label="Poznámka" 
              onClick={() => setShowNoteDialog(true)}
            />
          </div>
          
          {/* Secondary action - Statement */}
          <div className="mt-4 pt-4 border-t border-border/50">
            <CreditStatementDialog
              clientId={client.id}
              clientName={client.name}
              clientEmail={client.email || undefined}
              clientPhone={client.phone || undefined}
              isSharedBudget={isSharedBudget}
              budgetGroupId={budgetGroupId}
              trigger={
                <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors text-sm font-medium">
                  <FileText className="w-4 h-4" />
                  Vyúčtování / PDF
                </button>
              }
            />
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rychlá poznámka</DialogTitle>
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
