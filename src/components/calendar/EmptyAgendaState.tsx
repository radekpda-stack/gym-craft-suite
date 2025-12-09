import { Calendar, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface EmptyAgendaStateProps {
  date: Date;
  onAddTraining: () => void;
}

export function EmptyAgendaState({ date, onAddTraining }: EmptyAgendaStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <Calendar className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        Žádné tréninky
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        {format(date, 'd. MMMM yyyy', { locale: cs })} nemáte naplánované žádné tréninky
      </p>
      <Button onClick={onAddTraining} className="gap-2">
        <Plus className="w-4 h-4" />
        Přidat trénink
      </Button>
    </div>
  );
}
