import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Wallet, Scale, TrendingUp, MessageSquare, Dumbbell } from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Client } from '@/hooks/useClients';

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
          onClick={() => navigate(`/trainings?new=true&client=${client.id}`)}
          className="gap-2"
        >
          <Dumbbell className="w-4 h-4" />
          Přidat trénink
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddCredit} className="gap-2">
          <Wallet className="w-4 h-4" />
          Dobít kredit
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => navigate(`/clients/${client.id}?tab=measurements&action=new`)}
          className="gap-2"
        >
          <Scale className="w-4 h-4" />
          Přidat měření
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => navigate(`/clients/${client.id}?tab=progress&action=new`)}
          className="gap-2"
        >
          <TrendingUp className="w-4 h-4" />
          Přidat progres
        </ContextMenuItem>
        <ContextMenuItem onClick={onAddNote} className="gap-2">
          <MessageSquare className="w-4 h-4" />
          Přidat poznámku
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
