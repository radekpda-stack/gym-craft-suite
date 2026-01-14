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
import { useCreateNutritionLogSession } from '@/hooks/useNutritionLog';
import { cn } from '@/lib/utils';
import { STATUS_CONFIG } from '@/lib/statusUtils';

interface ClientActionsBarProps {
  client: Client;
  lastCompletedTrainingId?: string;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  onAddTraining: () => void;
  onAddNote?: (note: string) => void;
}

interface GeneratedLink {
  type: 'feedback' | 'nutrition';
  url: string;
  label: string;
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
  const [generatedLink, setGeneratedLink] = useState<GeneratedLink | null>(null);
  const [isGenerating, setIsGenerating] = useState<'feedback' | 'nutrition' | null>(null);
  
  const createNutritionSession = useCreateNutritionLogSession();

  // Always use production URL for public feedback links
  const PRODUCTION_BASE_URL = 'https://justmoveasistent.lovable.app';

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
      
      // Always use production URL for public-facing links
      const link = `${PRODUCTION_BASE_URL}/feedback/${data.token}`;
      setGeneratedLink({ type: 'feedback', url: link, label: 'Odkaz na zpětnou vazbu' });
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
      setGeneratedLink({ type: 'nutrition', url: link, label: 'Strava odkaz (7 dní)' });
      await navigator.clipboard.writeText(link);
      toast({ title: 'Odkaz zkopírován do schránky' });
      trackFeature('nutrition_link_generated', 'nutrition');
    } catch (error) {
      toast({ title: 'Chyba při generování odkazu', variant: 'destructive' });
    } finally {
      setIsGenerating(null);
    }
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

  const statusConfig = STATUS_CONFIG.ok;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {/* Add Training */}
        <Button 
          onClick={onAddTraining}
          className="gap-2 col-span-2 sm:col-span-1 touch-target"
        >
          <Plus className="w-4 h-4" />
          <span>Trénink</span>
        </Button>
        
        {/* Feedback Link */}
        <Button 
          variant="outline"
          onClick={handleGenerateFeedbackLink}
          disabled={isGenerating === 'feedback' || !lastCompletedTrainingId}
          className="gap-2 touch-target"
        >
          <Link2 className="w-4 h-4" />
          <span className="hidden sm:inline">Zpětná vazba</span>
          <span className="sm:hidden">ZV</span>
        </Button>
        
        {/* Nutrition Link */}
        <Button 
          variant="outline"
          onClick={handleGenerateNutritionLink}
          disabled={isGenerating === 'nutrition'}
          className="gap-2 touch-target"
        >
          <Utensils className="w-4 h-4" />
          <span>Strava</span>
        </Button>
        
        {/* Quick Note */}
        <Button 
          variant="outline"
          onClick={() => setShowNoteDialog(true)}
          className="gap-2 touch-target"
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
            <Button variant="outline" className="gap-2 touch-target">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Vyúčtování</span>
              <span className="sm:hidden">PDF</span>
            </Button>
          }
        />
      </div>
      
      {/* Generated Link Display */}
      {generatedLink && (
        <div className={cn(
          'mt-3 p-3 rounded-xl flex items-center gap-3 border',
          statusConfig.bgClass, statusConfig.borderClass
        )}>
          <Check className={cn('w-5 h-5 shrink-0', statusConfig.textClass)} />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{generatedLink.label} (zkopírován)</p>
            <p className="text-sm font-mono truncate">{generatedLink.url}</p>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={() => handleCopyLink(generatedLink.url)}
            className="touch-target"
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
