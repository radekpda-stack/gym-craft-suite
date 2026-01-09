import { supabase } from '@/integrations/supabase/client';

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
 * Creates in-app notification and sends web push for PR events
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
  entryId,
  entryDate
}: PRNotificationParams): Promise<void> {
  const isUpdate = oldValue !== undefined && oldValue !== null;
  const notificationType = isUpdate ? 'pr_updated' : 'pr_created';
  
  // Format value display
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

  const deeplink = `/clients/${clientId}?tab=progress&highlight=${entryId}`;

  try {
    // 1. Create in-app notification
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

    // 2. Send web push notification (fire and forget)
    supabase.functions.invoke('send-push-notification', {
      body: {
        user_id: trainerId,
        title,
        body: message,
        url: deeplink,
        tag: `pr-${entryId}`,
        data: {
          type: notificationType,
          clientId,
          entryId,
          exerciseName,
          value,
          oldValue,
          metricType
        }
      }
    }).catch(err => {
      console.error('Failed to send push notification:', err);
    });
  } catch (error) {
    console.error('Error creating PR notification:', error);
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')} min`;
  }
  return `${secs} s`;
}
