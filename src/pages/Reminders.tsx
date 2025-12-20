import { useState, useMemo } from 'react';
import { Bell, Search, MoreHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useReminders } from '@/hooks/useReminders';
import { SmartListsGrid } from '@/components/reminders/SmartListsGrid';
import { ReminderRow } from '@/components/reminders/ReminderRow';
import { FloatingAddButton } from '@/components/reminders/FloatingAddButton';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';
import { EditReminderDialog } from '@/components/reminders/EditReminderDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Reminder, useCompleteReminder, useDeleteReminder } from '@/hooks/useReminders';
import { isToday, isPast, isFuture } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const Reminders = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const [activeList, setActiveList] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editReminder, setEditReminder] = useState<Reminder | null>(null);
  
  const { data: reminders, isLoading } = useReminders();
  const completeReminder = useCompleteReminder();
  const deleteReminder = useDeleteReminder();

  const filteredReminders = useMemo(() => {
    if (!reminders) return [];
    
    let filtered = reminders;
    
    // Filter by active list
    switch (activeList) {
      case 'today':
        filtered = reminders.filter(r => !r.is_completed && isToday(new Date(r.remind_at)));
        break;
      case 'scheduled':
        filtered = reminders.filter(r => !r.is_completed && isFuture(new Date(r.remind_at)));
        break;
      case 'overdue':
        filtered = reminders.filter(r => !r.is_completed && isPast(new Date(r.remind_at)));
        break;
      case 'completed':
        filtered = reminders.filter(r => r.is_completed);
        break;
      case 'all':
      default:
        filtered = reminders.filter(r => !r.is_completed);
        break;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.title.toLowerCase().includes(query) ||
        r.description?.toLowerCase().includes(query)
      );
    }
    
    // Sort: incomplete first, then by date
    return filtered.sort((a, b) => {
      if (a.is_completed !== b.is_completed) {
        return a.is_completed ? 1 : -1;
      }
      return new Date(a.remind_at).getTime() - new Date(b.remind_at).getTime();
    });
  }, [reminders, activeList, searchQuery]);

  const handleComplete = async (id: string) => {
    await completeReminder.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteReminder.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getListTitle = () => {
    switch (activeList) {
      case 'today': return 'Dnes';
      case 'scheduled': return 'Naplánované';
      case 'overdue': return 'Zmeškané';
      case 'completed': return 'Hotovo';
      default: return 'Všechny';
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl pb-24">
      {/* iOS-style Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Připomínky</h1>
            <p className="text-sm text-muted-foreground">
              {filteredReminders.length} položek
            </p>
          </div>
        </div>
        
        {/* Liquid Glass toolbar */}
        <div className="flex items-center gap-2 liquid-glass px-3 py-2 rounded-2xl">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Search bar with Liquid Glass effect */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Hledat připomínky..."
          className="pl-11 h-12 rounded-2xl liquid-glass border-0 bg-white/5"
        />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-16 rounded-2xl" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          {/* Smart Lists Grid */}
          <SmartListsGrid 
            reminders={reminders || []} 
            activeList={activeList}
            onListChange={setActiveList}
          />

          {/* Current list title */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-muted-foreground">{getListTitle()}</h2>
            <span className="text-sm text-muted-foreground">{filteredReminders.length} položek</span>
          </div>

          {/* Reminders List */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredReminders.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12 liquid-glass rounded-2xl"
                >
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Žádné připomínky</p>
                </motion.div>
              ) : (
                filteredReminders.map((reminder) => (
                  <ReminderRow
                    key={reminder.id}
                    reminder={reminder}
                    onComplete={handleComplete}
                    onEdit={setEditReminder}
                    onDelete={setDeleteId}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* Floating Action Button */}
      <FloatingAddButton onClick={() => setCreateOpen(true)} />

      {/* Create Dialog */}
      <CreateReminderDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit Dialog */}
      {editReminder && (
        <EditReminderDialog
          reminder={editReminder}
          open={!!editReminder}
          onOpenChange={(open) => !open && setEditReminder(null)}
        />
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat připomínku?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Připomínka bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Zrušit</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="rounded-xl">Smazat</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reminders;
