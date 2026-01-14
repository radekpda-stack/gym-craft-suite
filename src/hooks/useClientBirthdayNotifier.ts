import { useEffect, useRef } from 'react';
import { useClients } from './useClients';
import { useCreateNotification, useNotifications } from './useNotifications';
import { differenceInYears, parseISO, format } from 'date-fns';

// Track which birthday notifications have been created this session to prevent duplicates
const createdBirthdayNotifications = new Set<string>();

export function useClientBirthdayNotifier() {
  const { data: clients = [] } = useClients();
  const { data: notifications = [], isLoading: isLoadingNotifications } = useNotifications();
  const createNotification = useCreateNotification();
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    // Wait for both clients and notifications to load
    if (clients.length === 0 || isLoadingNotifications) return;
    
    // Only run once per component mount
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;

    const today = new Date();
    const todayKey = format(today, 'yyyy-MM-dd');
    const activeClients = clients.filter(c => !c.is_archived);

    activeClients.forEach(client => {
      if (!client.birth_date) return;

      const birthDate = parseISO(client.birth_date);
      const age = differenceInYears(today, birthDate);
      
      // Check if today is the birthday (same month and day)
      const isBirthdayToday = 
        birthDate.getMonth() === today.getMonth() && 
        birthDate.getDate() === today.getDate();

      if (!isBirthdayToday) return;

      // Create unique key for this client's birthday notification
      const notificationKey = `birthday-${client.id}-${todayKey}`;
      
      // Skip if already created in this session
      if (createdBirthdayNotifications.has(notificationKey)) return;

      // Check if we already have a notification in the database for this birthday this year
      const existingNotification = notifications.find(n => 
        n.type === 'birthday' && 
        n.client_id === client.id &&
        parseISO(n.created_at).getFullYear() === today.getFullYear() &&
        parseISO(n.created_at).getMonth() === today.getMonth() &&
        parseISO(n.created_at).getDate() === today.getDate()
      );

      if (existingNotification) {
        // Mark as already created so we don't check again
        createdBirthdayNotifications.add(notificationKey);
        return;
      }

      // Mark as created before actually creating to prevent race conditions
      createdBirthdayNotifications.add(notificationKey);

      // Create birthday notification
      createNotification.mutate({
        client_id: client.id,
        type: 'birthday',
        title: `🎂 Narozeniny`,
        message: `${client.name} má dnes narozeniny! (${age} let)`,
      });
    });
  }, [clients, notifications, isLoadingNotifications, createNotification]);
}

export function useUpcomingBirthdays(daysAhead: number = 7) {
  const { data: clients = [] } = useClients();
  
  const today = new Date();
  const activeClients = clients.filter(c => !c.is_archived);

  const upcoming = activeClients
    .map(client => {
      if (!client.birth_date) return null;

      const birthDate = parseISO(client.birth_date);
      const currentAge = differenceInYears(today, birthDate);
      
      // Create this year's birthday date
      const birthdayThisYear = new Date(
        today.getFullYear(),
        birthDate.getMonth(),
        birthDate.getDate()
      );

      // If birthday already passed this year, use next year
      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(birthdayThisYear.getFullYear() + 1);
      }

      const daysUntil = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const upcomingAge = birthdayThisYear.getFullYear() - birthDate.getFullYear();

      if (daysUntil > daysAhead) return null;

      return {
        client,
        birthdayDate: birthdayThisYear,
        age: upcomingAge,
        daysUntil,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysUntil - b!.daysUntil);

  return upcoming as Array<{
    client: typeof clients[0];
    birthdayDate: Date;
    age: number;
    daysUntil: number;
  }>;
}
