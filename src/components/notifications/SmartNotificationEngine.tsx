import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInDays, differenceInHours, addDays, subDays, startOfDay } from 'date-fns';

/**
 * SmartNotificationEngine
 * 
 * Runs periodically to check for notification-worthy events:
 * - PR achievements (on training completion)
 * - Package low balance (<20%)
 * - Package expiring soon (7 days)
 * - Client inactivity (14+ days)
 * - Training streaks (5, 10, 20, 50, 100)
 * - Pending feedback (grouped daily notification)
 * 
 * This component doesn't render anything visible.
 */
export function SmartNotificationEngine() {
  const queryClient = useQueryClient();
  const lastCheckRef = useRef<Date | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    const checkNotifications = async () => {
      // Prevent concurrent runs
      if (isRunningRef.current) return;
      
      // Rate limit: check at most every 5 minutes
      if (lastCheckRef.current && differenceInDays(new Date(), lastCheckRef.current) < 1 / 288) {
        return;
      }

      isRunningRef.current = true;
      lastCheckRef.current = new Date();

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Run all checks in parallel
        await Promise.all([
          checkPackageLowBalance(user.id),
          checkPackageExpiring(user.id),
          checkInactiveClients(user.id),
          checkPendingFeedback(user.id),
        ]);

        // Invalidate notifications to show new ones
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['unread-notifications-count'] });
      } catch (error) {
        console.error('Smart notification check error:', error);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Initial check after 10 seconds (let app load first)
    const initialTimeout = setTimeout(checkNotifications, 10000);

    // Periodic checks every 30 minutes
    const interval = setInterval(checkNotifications, 30 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [queryClient]);

  return null;
}

async function checkPackageLowBalance(userId: string) {
  try {
    const { data: packages } = await supabase
      .from('client_packages')
      .select('id, client_id, package_name, trainings_total, trainings_used')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!packages) return;

    for (const pkg of packages) {
      const remaining = pkg.trainings_total - pkg.trainings_used;
      const threshold = Math.ceil(pkg.trainings_total * 0.2);

      if (remaining <= threshold && remaining > 0) {
        // Check if notification already exists for this package
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .eq('type', 'package_low')
          .eq('entity_id', pkg.id)
          .eq('is_read', false)
          .maybeSingle();

        if (!existing) {
          // Get client name
          const { data: client } = await supabase
            .from('clients')
            .select('name')
            .eq('id', pkg.client_id)
            .single();

          await supabase.from('notifications').insert({
            user_id: userId,
            type: 'package_low',
            title: 'Nízký zůstatek balíčku',
            message: `${client?.name || 'Klient'} má zbývající pouze ${remaining} tréninků v balíčku "${pkg.package_name}".`,
            entity_type: 'package',
            entity_id: pkg.id,
            client_id: pkg.client_id,
          });
        }
      }
    }
  } catch (error) {
    console.error('Package low balance check error:', error);
  }
}

async function checkPackageExpiring(userId: string) {
  try {
    const sevenDaysFromNow = addDays(new Date(), 7).toISOString();
    
    const { data: packages } = await supabase
      .from('client_packages')
      .select('id, client_id, package_name, expires_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .not('expires_at', 'is', null)
      .lte('expires_at', sevenDaysFromNow)
      .gte('expires_at', new Date().toISOString());

    if (!packages) return;

    for (const pkg of packages) {
      const daysLeft = differenceInDays(new Date(pkg.expires_at!), new Date());

      // Check if notification already exists
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('type', 'package_expiring')
        .eq('entity_id', pkg.id)
        .eq('is_read', false)
        .maybeSingle();

      if (!existing) {
        const { data: client } = await supabase
          .from('clients')
          .select('name')
          .eq('id', pkg.client_id)
          .single();

        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'package_expiring',
          title: 'Balíček brzy vyprší',
          message: `Balíček "${pkg.package_name}" klienta ${client?.name || 'Neznámý'} vyprší za ${daysLeft} dní.`,
          entity_type: 'package',
          entity_id: pkg.id,
          client_id: pkg.client_id,
        });
      }
    }
  } catch (error) {
    console.error('Package expiring check error:', error);
  }
}

async function checkInactiveClients(userId: string) {
  try {
    const fourteenDaysAgo = addDays(new Date(), -14).toISOString();

    // Get active clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (!clients) return;

    for (const client of clients) {
      // Get last training
      const { data: lastTraining } = await supabase
        .from('training_sessions')
        .select('date')
        .eq('client_id', client.id)
        .eq('status', 'completed')
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTraining) {
        const daysSince = differenceInDays(new Date(), new Date(lastTraining.date));
        
        if (daysSince >= 14 && daysSince < 30) {
          // Check if notification already exists
          const { data: existing } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('type', 'inactivity_warning')
            .eq('client_id', client.id)
            .eq('is_read', false)
            .maybeSingle();

          if (!existing) {
            await supabase.from('notifications').insert({
              user_id: userId,
              type: 'inactivity_warning',
              title: 'Neaktivní klient',
              message: `${client.name} netrénoval ${daysSince} dní. Zvažte kontaktování.`,
              entity_type: 'client',
              entity_id: client.id,
              client_id: client.id,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Inactive clients check error:', error);
  }
}

// Check for trainings that need feedback to be sent (grouped notification)
async function checkPendingFeedback(userId: string) {
  try {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    // Get completed trainings from last 12-48 hours
    const { data: trainings } = await supabase
      .from('training_sessions')
      .select('id, client_id, date')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .lte('date', twelveHoursAgo.toISOString())
      .gte('date', fortyEightHoursAgo.toISOString());

    if (!trainings || trainings.length === 0) return;

    // Get clients with feedback enabled
    const clientIds = [...new Set(trainings.map(t => t.client_id))];
    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, feedback_enabled')
      .in('id', clientIds)
      .eq('feedback_enabled', true);

    if (!clients || clients.length === 0) return;

    const enabledClientIds = clients.map(c => c.id);
    const relevantTrainings = trainings.filter(t => enabledClientIds.includes(t.client_id));

    if (relevantTrainings.length === 0) return;

    // Check which trainings already have feedback requests sent
    const { data: existingRequests } = await supabase
      .from('feedback_requests')
      .select('training_session_id')
      .in('training_session_id', relevantTrainings.map(t => t.id))
      .not('sent_at', 'is', null);

    const sentTrainingIds = new Set((existingRequests || []).map(r => r.training_session_id));
    const pendingTrainings = relevantTrainings.filter(t => !sentTrainingIds.has(t.id));

    if (pendingTrainings.length === 0) return;

    // Check if we already have an unread feedback_pending notification from today
    const todayStart = startOfDay(now).toISOString();
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'feedback_pending')
      .eq('is_read', false)
      .gte('created_at', todayStart)
      .maybeSingle();

    if (existingNotif) return; // Already notified today

    // Create ONE grouped notification
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'feedback_pending',
      title: pendingTrainings.length === 1 
        ? '1 trénink čeká na odeslání feedbacku' 
        : `${pendingTrainings.length} tréninků čeká na odeslání feedbacku`,
      message: 'Klikněte pro zobrazení přehledu a odeslání.',
      entity_type: 'feedback',
    });
  } catch (error) {
    console.error('Pending feedback check error:', error);
  }
}

// Export helper to manually trigger PR notification (called from training completion)
export async function createPRNotification(
  userId: string,
  clientId: string,
  clientName: string,
  exerciseName: string,
  weight: number,
  reps: number
) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'pr_achieved',
      title: 'Nový osobní rekord! 🏆',
      message: `${clientName} dosáhl PR: ${exerciseName} - ${weight} kg × ${reps}`,
      entity_type: 'client',
      entity_id: clientId,
      client_id: clientId,
    });
  } catch (error) {
    console.error('Create PR notification error:', error);
  }
}

// Export helper for training streak notification
export async function checkTrainingStreak(
  userId: string,
  clientId: string,
  clientName: string
) {
  try {
    const { count } = await supabase
      .from('training_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed');

    const milestones = [5, 10, 20, 50, 100, 200, 500];
    const reached = milestones.find(m => count === m);

    if (reached) {
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'training_streak',
        title: `Milestone dosažen! 🎉`,
        message: `${clientName} dokončil ${reached}. trénink! Gratulujte klientovi.`,
        entity_type: 'client',
        entity_id: clientId,
        client_id: clientId,
      });
    }
  } catch (error) {
    console.error('Training streak check error:', error);
  }
}
