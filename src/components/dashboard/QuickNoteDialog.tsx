import { useState } from 'react';
import { StickyNote, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { toast } from '@/hooks/use-toast';
import { useClients, useUpdateClient } from '@/hooks/useClients';
import { ClientFormValues } from '@/lib/validations/client';
import { format } from 'date-fns';

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultClientId?: string;
}

export function QuickNoteDialog({ open, onOpenChange, defaultClientId }: QuickNoteDialogProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || '');
  const [noteText, setNoteText] = useState('');
  
  const { data: clients = [] } = useClients();
  const updateClient = useUpdateClient();
  
  const activeClients = clients.filter(c => !c.is_archived);
  
  const handleSave = async () => {
    if (!selectedClientId || !noteText.trim()) return;
    
    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    
    const currentNotes = client.notes || '';
    const newNotes = currentNotes 
      ? `${currentNotes}\n\n[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${noteText.trim()}`
      : `[${format(new Date(), 'd.M.yyyy HH:mm')}]\n${noteText.trim()}`;
    
    try {
      await updateClient.mutateAsync({ 
        id: client.id, 
        values: { notes: newNotes } as ClientFormValues 
      });
      
      toast({ title: 'Poznámka uložena' });
      setNoteText('');
      setSelectedClientId('');
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Chyba při ukládání', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-primary" />
            Rychlá poznámka
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Client selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Klient
            </label>
            <ClientSearchSelect
              clients={activeClients}
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              placeholder="Vyhledat klienta..."
              filterArchived
            />
          </div>
          
          {/* Note text */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Poznámka
            </label>
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Napište poznámku..."
              rows={4}
              autoFocus={!!selectedClientId}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Zrušit
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!selectedClientId || !noteText.trim() || updateClient.isPending}
            >
              Uložit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
