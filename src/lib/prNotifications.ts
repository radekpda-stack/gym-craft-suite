import { supabase } from '@/integrations/supabase/client';
import { formatTimeWithUnit } from '@/lib/timeUtils';

interface PRNotificationParams {
  trainerId: string;
  clientId: string;
  clientName: string;
  exerciseName: string;
  value: number;
  unit: string;
  metricType: 'weight' | 'time' | 'reps' | 'e1rm';
  oldValue?: number;
  entryId: string;
  entryDate: string;
}

/**
 * Creates in-app notification for PR events
 */
export async function notifyAboutPR({
  trainerId,
  clientId,
  clientName,
  exerciseName,
  value,
  unit,
  metricType,
  oldValue,
  entryId
}: PRNotificationParams): Promise<void> {
  const isUpdate = oldValue !== undefined && oldValue !== null;
  const notificationType = isUpdate ? 'pr_updated' : 'pr_created';
  
  const valueDisplay = metricType === 'time' 
    ? formatTime(value) 
    : `${value} ${unit}`;
  
  const oldValueDisplay = oldValue !== undefined 
    ? (metricType === 'time' ? formatTime(oldValue) : `${oldValue} ${unit}`)
    : null;

  const title = isUpdate 
    ? `🏆 PR přepsáno: ${clientName}`
    : `🏆 Nové PR: ${clientName}`;
  
  const message = isUpdate
    ? `${exerciseName}: ${valueDisplay} (předchozí: ${oldValueDisplay})`
    : `${exerciseName}: ${valueDisplay}`;

  try {
    await supabase.from('notifications').insert({
      user_id: trainerId,
      type: notificationType,
      title,
      message,
      entity_type: 'exercise_entry',
      entity_id: entryId,
      severity: 'info',
      client_id: clientId
    });
  } catch (error) {
    console.error('Error creating PR notification:', error);
  }
}

// Alias for backwards compatibility
const formatTime = formatTimeWithUnit;
