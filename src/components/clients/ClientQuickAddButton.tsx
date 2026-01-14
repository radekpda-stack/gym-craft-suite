/**
 * ClientQuickAddButton Component
 * 
 * Quick-add dropdown button for adding notes, health restrictions, or goals
 * directly from the client header.
 */
import { useState } from 'react';
import { Plus, FileText, AlertTriangle, Target, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ClientFormValues } from '@/lib/validations/client';

interface ClientQuickAddButtonProps {
  clientId: string;
  clientNotes?: string;
  clientHealthRestrictions?: string;
  clientGoals?: string[];
  onUpdateClient: (data: Partial<ClientFormValues>) => Promise<void>;
}

type QuickAddType = 'note' | 'health' | 'goal';

export function ClientQuickAddButton({
  clientNotes = '',
  clientHealthRestrictions = '',
  clientGoals = [],
  onUpdateClient,
}: ClientQuickAddButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addType, setAddType] = useState<QuickAddType>('note');
  const [inputValue, setInputValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleOpenDialog = (type: QuickAddType) => {
    setAddType(type);
    setInputValue('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!inputValue.trim()) return;
    
    setIsSaving(true);
    try {
      const timestamp = new Date().toLocaleDateString('cs-CZ');
      
      switch (addType) {
        case 'note': {
          const newNote = clientNotes 
            ? `${clientNotes}\n\n[${timestamp}] ${inputValue.trim()}`
            : `[${timestamp}] ${inputValue.trim()}`;
          await onUpdateClient({ notes: newNote });
          toast.success('Poznámka přidána');
          break;
        }
        case 'health': {
          const newHealth = clientHealthRestrictions
            ? `${clientHealthRestrictions}\n[${timestamp}] ${inputValue.trim()}`
            : `[${timestamp}] ${inputValue.trim()}`;
          await onUpdateClient({ healthRestrictions: newHealth });
          toast.success('Zdravotní omezení přidáno');
          break;
        }
        case 'goal': {
          const newGoals = [...clientGoals, inputValue.trim()];
          await onUpdateClient({ trainingGoals: newGoals });
          toast.success('Cíl přidán');
          break;
        }
      }
      
      setDialogOpen(false);
      setInputValue('');
    } catch (error) {
      toast.error('Nepodařilo se uložit');
    } finally {
      setIsSaving(false);
    }
  };

  const dialogConfig = {
    note: {
      title: 'Přidat poznámku',
      icon: <FileText className="w-5 h-5" />,
      placeholder: 'Rychlá poznámka...',
      isTextarea: true,
    },
    health: {
      title: 'Přidat zdravotní omezení',
      icon: <AlertTriangle className="w-5 h-5 text-warning" />,
      placeholder: 'Nové zdravotní omezení...',
      isTextarea: true,
    },
    goal: {
      title: 'Přidat tréninkový cíl',
      icon: <Target className="w-5 h-5 text-primary" />,
      placeholder: 'Nový cíl...',
      isTextarea: false,
    },
  };

  const config = dialogConfig[addType];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full hover:bg-primary/10"
            title="Rychle přidat"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => handleOpenDialog('note')}>
            <FileText className="w-4 h-4 mr-2" />
            Poznámka
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('health')}>
            <AlertTriangle className="w-4 h-4 mr-2 text-warning" />
            Zdravotní omezení
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleOpenDialog('goal')}>
            <Target className="w-4 h-4 mr-2 text-primary" />
            Tréninkový cíl
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {config.icon}
              {config.title}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="quick-add-input" className="sr-only">
              {config.title}
            </Label>
            {config.isTextarea ? (
              <Textarea
                id="quick-add-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={config.placeholder}
                className="min-h-[100px]"
                autoFocus
              />
            ) : (
              <Input
                id="quick-add-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={config.placeholder}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Zrušit
            </Button>
            <Button onClick={handleSave} disabled={!inputValue.trim() || isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Přidat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
