import { useState } from 'react';
import { Plus, Bell, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReminders } from '@/hooks/useReminders';
import { RemindersList } from '@/components/reminders/RemindersList';
import { CreateReminderDialog } from '@/components/reminders/CreateReminderDialog';
import { Skeleton } from '@/components/ui/skeleton';

const Reminders = () => {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: reminders, isLoading } = useReminders();

  const activeReminders = reminders?.filter(r => !r.is_completed) || [];
  const completedReminders = reminders?.filter(r => r.is_completed) || [];

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Připomínky</h1>
            <p className="text-sm text-muted-foreground">
              {activeReminders.length} aktivních připomínek
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nová
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1 gap-2">
              <Clock className="h-4 w-4" />
              Aktivní ({activeReminders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 gap-2">
              <CheckCircle className="h-4 w-4" />
              Dokončené ({completedReminders.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <RemindersList reminders={activeReminders} />
          </TabsContent>
          
          <TabsContent value="completed">
            <RemindersList reminders={completedReminders} showCompleted />
          </TabsContent>
        </Tabs>
      )}

      <CreateReminderDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default Reminders;
