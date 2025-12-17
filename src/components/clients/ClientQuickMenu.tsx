import { useNavigate } from 'react-router-dom';
import { Wallet, Scale, TrendingUp, MessageSquare, Dumbbell } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Client } from '@/hooks/useClients';
import { featureTracker } from '@/hooks/useFeatureTracking';

interface ClientQuickMenuProps {
  client: Client;
  children: React.ReactNode;
  onAddCredit?: () => void;
  onAddMeasurement?: () => void;
  onAddProgress?: () => void;
  onAddNote?: () => void;
}

export function ClientQuickMenu({
  client,
  children,
  onAddCredit,
  onAddMeasurement,
  onAddProgress,
  onAddNote,
}: ClientQuickMenuProps) {
  const navigate = useNavigate();

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={() => {
            featureTracker.track('context_menu_add_training', 'clients');
            navigate(`/trainings?new=true&client=${client.id}`);
          }}
          className="gap-2"
        >
          <Dumbbell className="w-4 h-4" />
          Přidat trénink
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => {
            featureTracker.track('context_menu_add_credit', 'clients');
            onAddCredit?.();
          }} 
          className="gap-2"
        >
          <Wallet className="w-4 h-4" />
          Dobít kredit
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            featureTracker.track('context_menu_add_measurement', 'clients');
            navigate(`/clients/${client.id}?tab=measurements&action=new`);
          }}
          className="gap-2"
        >
          <Scale className="w-4 h-4" />
          Přidat měření
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            featureTracker.track('context_menu_add_progress', 'clients');
            navigate(`/clients/${client.id}?tab=progress&action=new`);
          }}
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Přidat progres
        </ContextMenuItem>
        <ContextMenuItem 
          onClick={() => {
            featureTracker.track('context_menu_add_note', 'clients');
            onAddNote?.();
          }} 
          className="gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          Přidat poznámku
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
