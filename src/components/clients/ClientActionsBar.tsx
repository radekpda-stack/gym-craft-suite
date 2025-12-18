import { useState } from 'react';
import { 
  Plus,
  Link2,
  Utensils,
  StickyNote,
  FileText,
  Check,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface ClientActionsBarProps {
  client: Client;
  lastCompletedTrainingId?: string;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  onAddTraining: () => void;
  onAddNote?: (note: string) => void;
}

export function ClientActionsBar({
  client,
  lastCompletedTrainingId,
  isSharedBudget,
  budgetGroupId,
  onAddTraining,
  onAddNote,
}: ClientActionsBarProps) {
  const { trackFeature } = useFeatureTracking();
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [feedbackLink, setFeedbackLink] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateFeedbackLink = async () => {
    if (!lastCompletedTrainingId) {
      toast({ title: 'Není dostupný trénink pro feedback', variant: 'destructive' });
      return;
    }
    
    setIsGenerating(true);
    try {
      // Create feedback request
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
      setFeedbackLink(link);
      await navigator.clipboard.writeText(link);
      toast({ title: 'Odkaz zkopírován do schránky' });
      trackFeature('feedback_link_generated', 'feedback');
    } catch (error) {
      toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateNutritionLink = () => {
    // Navigate to nutrition tab
    const nutritionTab = document.querySelector('[value="history"]') as HTMLButtonElement;
    if (nutritionTab) nutritionTab.click();
    trackFeature('nutrition_link_nav', 'nutrition');
    toast({ title: 'Přejděte na záložku Historie > Strava pro vygenerování odkazu' });
  };

  const handleCopyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({ title: 'Odkaz zkopírován' });
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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {/* Add Training */}
        <Button 
          onClick={onAddTraining}
          className="gap-2 col-span-2 sm:col-span-1"
        >
          <Plus className="w-4 h-4" />
          <span>Trénink</span>
        </Button>
        
        {/* Feedback Link */}
        <Button 
          variant="outline"
          onClick={handleGenerateFeedbackLink}
          disabled={isGenerating || !lastCompletedTrainingId}
          className="gap-2"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Feedback</span>
          <span className="sm:hidden">FB link</span>
        </Button>
        
        {/* Nutrition Link */}
        <Button 
          variant="outline"
          onClick={handleGenerateNutritionLink}
          className="gap-2"
        >
          <Utensils className="w-4 h-4" />
          <span className="hidden sm:inline">Strava</span>
          <span className="sm:hidden">Strava</span>
        </Button>
        
        {/* Quick Note */}
        <Button 
          variant="outline"
          onClick={() => setShowNoteDialog(true)}
          className="gap-2"
        >
          <StickyNote className="w-4 h-4" />
          <span className="hidden sm:inline">Poznámka</span>
          <span className="sm:hidden">Pozn.</span>
        </Button>
        
        {/* Statement/PDF */}
        <CreditStatementDialog
          clientId={client.id}
          clientName={client.name}
          clientEmail={client.email || undefined}
          clientPhone={client.phone || undefined}
          isSharedBudget={isSharedBudget}
          budgetGroupId={budgetGroupId}
          trigger={
            <Button variant="outline" className="gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Vyúčtování</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          }
        />
      </div>
      
      {/* Generated Link Display */}
      {feedbackLink && (
        <div className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <Check className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Feedback odkaz (zkopírován)</p>
            <p className="text-sm font-mono truncate">{feedbackLink}</p>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleCopyLink(feedbackLink)}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      )}
      
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
