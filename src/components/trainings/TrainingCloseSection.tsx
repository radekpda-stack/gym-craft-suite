/**
 * TrainingCloseSection - Merged closure section for completed trainings
 * Combines: Payment, Notes, Followups, Feedback
 */
import { useState } from 'react';
import { CreditCard, StickyNote, Bell, MessageCircle, Plus, ExternalLink, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrainingStatusBadge } from '@/components/ui/training-status-badge';
import { InlineTextarea } from '@/components/trainings/InlineTextarea';
import { FollowupInput } from '@/components/trainings/FollowupInput';
import { ChangePaymentMethodDialog, PaymentMethod } from '@/components/trainings/ChangePaymentMethodDialog';
import { TrainingFeedbackSection } from '@/components/feedback/TrainingFeedbackSection';
import { MultiParticipantFeedbackSection } from '@/components/feedback/MultiParticipantFeedbackSection';
import { TrainingSession } from '@/hooks/useTrainingSessions';
import { Client } from '@/hooks/useClients';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface Participant {
  client_id: string;
  name: string;
  email?: string;
  feedback_enabled?: boolean;
}

interface FeedbackRequestData {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  sent_at: string | null;
  opened_at: string | null;
  reminder_count: number;
}

interface TrainingCloseSectionProps {
  training: TrainingSession;
  client: Client | null;
  trainingPrice: number;
  participants: Participant[];
  feedbackRequest?: FeedbackRequestData;
  onChangePaymentMethod: (method: PaymentMethod) => Promise<void>;
  isChangingPayment: boolean;
  onFieldUpdate?: (field: string, value: string) => Promise<void>;
  showNote: boolean;
  onShowNoteChange: (show: boolean) => void;
}

export function TrainingCloseSection({
  training,
  client,
  trainingPrice,
  participants,
  feedbackRequest,
  onChangePaymentMethod,
  isChangingPayment,
  onFieldUpdate,
  showNote,
  onShowNoteChange,
}: TrainingCloseSectionProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-md border border-border/50 shadow-sm p-4 space-y-4">
      {/* Subtle success gradient for completed */}
      <div className="absolute inset-0 bg-gradient-to-br from-success/5 via-transparent to-transparent pointer-events-none" />
      
      {/* Section Header */}
      <h3 className="relative training-section-title">Uzavření tréninku</h3>

      {/* Payment */}
      <div className="relative flex items-center justify-between py-3 px-3 -mx-3 rounded-xl bg-secondary/30 border border-border/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <TrainingStatusBadge 
                status={training.status} 
                paymentStatus={training.payment_status} 
              />
              {training.final_price && (
                <span className="text-sm font-bold tabular-nums">
                  {formatCurrency(training.final_price)}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChangePaymentMethodDialog
          currentPaymentStatus={training.payment_status}
          onChangePaymentMethod={onChangePaymentMethod}
          isLoading={isChangingPayment}
        />
      </div>

      {/* Note */}
      <div className="py-2 border-b border-border/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <StickyNote className="w-4 h-4" />
            <Label className="text-sm font-medium cursor-pointer" htmlFor="show-note-toggle">
              Poznámka k tréninku
            </Label>
          </div>
          <Switch 
            id="show-note-toggle"
            checked={showNote} 
            onCheckedChange={(checked) => {
              onShowNoteChange(checked);
              if (!checked && training.notes && onFieldUpdate) {
                onFieldUpdate('notes', '');
              }
            }}
          />
        </div>
        
        {showNote && onFieldUpdate && (
          <InlineTextarea
            initialValue={training.notes || ''}
            onSave={(value) => onFieldUpdate('notes', value)}
            placeholder="Libovolná poznámka k tréninku..."
            minHeight="60px"
          />
        )}
      </div>

      {/* Followups */}
      <div className="py-2 border-b border-border/30">
        <FollowupInput 
          trainingSessionId={training.id} 
          clientId={training.client_id}
          showTemplates={true}
        />
      </div>

      {/* Feedback Section */}
      {participants.length > 0 && (
        <div className="pt-2">
          {participants.length > 1 ? (
            <MultiParticipantFeedbackSection
              trainingId={training.id}
              trainingDate={training.date}
              trainingStatus={training.status}
              participants={participants}
              feedbackEnabled={true}
            />
          ) : client && (
            <TrainingFeedbackSection
              trainingId={training.id}
              trainingDate={training.date}
              trainingStatus={training.status}
              clientId={client.id}
              clientName={client.name}
              feedbackEnabled={client.feedback_enabled !== false}
              existingFeedback={feedbackRequest?.status === 'completed'}
              feedbackRequest={feedbackRequest}
            />
          )}
        </div>
      )}
    </div>
  );
}
