import { useEffect } from 'react';
import { useClients } from './useClients';
import { useCreateNotification, useNotifications } from './useNotifications';
import { differenceInYears, isSameDay, addDays, parseISO } from 'date-fns';

export function useClientAnniversaryNotifier() {
  const { data: clients = [] } = useClients();
  const { data: notifications = [] } = useNotifications();
  const createNotification = useCreateNotification();

  useEffect(() => {
    if (clients.length === 0) return;

    const today = new Date();
    const activeClients = clients.filter(c => !c.is_archived);

    activeClients.forEach(client => {
      // Use training_start_date if available, otherwise fallback to created_at
      const startDateStr = client.training_start_date || client.created_at;
      if (!startDateStr) return;

      const startDate = parseISO(startDateStr);
      const years = differenceInYears(today, startDate);
      
      // Only check for anniversaries 1+ years
      if (years < 1) return;

      // Check if today is the anniversary (same month and day)
      const isAnniversaryToday = 
        startDate.getMonth() === today.getMonth() && 
        startDate.getDate() === today.getDate();

      if (!isAnniversaryToday) return;

      // Check if we already sent a notification for this anniversary this year
      const existingNotification = notifications.find(n => 
        n.type === 'client_anniversary' && 
        n.client_id === client.id &&
        parseISO(n.created_at).getFullYear() === today.getFullYear()
      );

      if (existingNotification) return;

      // Create anniversary notification
      createNotification.mutate({
        client_id: client.id,
        type: 'client_anniversary',
        title: `🎉 ${years}. výročí`,
        message: `Klient ${client.name} je s vámi již ${years} ${years === 1 ? 'rok' : years < 5 ? 'roky' : 'let'}!`,
      });
    });
  }, [clients, notifications, createNotification]);
}

export function useUpcomingAnniversaries(daysAhead: number = 7) {
  const { data: clients = [] } = useClients();
  
  const today = new Date();
  const activeClients = clients.filter(c => !c.is_archived);

  const upcoming = activeClients
    .map(client => {
      // Use training_start_date if available, otherwise fallback to created_at
      const startDateStr = client.training_start_date || client.created_at;
      if (!startDateStr) return null;

      const startDate = parseISO(startDateStr);
      const years = differenceInYears(today, startDate);
      
      // Create this year's anniversary date
      const anniversaryThisYear = new Date(
        today.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );

      // If anniversary already passed this year, use next year
      if (anniversaryThisYear < today) {
        anniversaryThisYear.setFullYear(anniversaryThisYear.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((anniversaryThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const upcomingYears = anniversaryThisYear.getFullYear() - startDate.getFullYear();

      if (daysUntil > daysAhead || upcomingYears < 1) return null;

      return {
        client,
        anniversaryDate: anniversaryThisYear,
        years: upcomingYears,
        daysUntil,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil);

  return upcoming as Array<{
    client: typeof clients[0];
    anniversaryDate: Date;
    years: number;
    daysUntil: number;
  }>;
}
