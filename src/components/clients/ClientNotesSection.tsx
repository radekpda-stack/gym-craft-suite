import { useState } from 'react';
import { 
  StickyNote, 
  ChevronRight, 
  Plus,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface ClientNotesSectionProps {
  notes: string | null | undefined;
  onAddNote: (note: string) => Promise<void>;
  defaultOpen?: boolean;
}

interface ParsedNote {
  date: string;
  content: string;
}

function parseNotes(notes: string | null | undefined): ParsedNote[] {
  if (!notes) return [];
  
  return notes
    .split('\n\n')
    .filter(n => n.startsWith('['))
    .map(note => {
      const [datePart, ...contentParts] = note.split('\n');
      const dateMatch = datePart.match(/\[(.*?)\]/);
      return {
        date: dateMatch?.[1] || '',
        content: contentParts.join(' ').trim(),
      };
    })
    .filter(n => n.content);
}

export function ClientNotesSection({ notes, onAddNote, defaultOpen = false }: ClientNotesSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [newNote, setNewNote] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const parsedNotes = parseNotes(notes);
  const totalNotes = parsedNotes.length;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setIsAdding(true);
    try {
      await onAddNote(newNote.trim());
      setNewNote('');
      setShowInput(false);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className={cn(
          "w-full rounded-2xl p-4 flex items-center justify-between",
          "bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm",
          "hover:bg-secondary/30 hover:shadow-md transition-all duration-200"
        )}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning/10 shadow-sm shadow-warning/10">
              <StickyNote className="w-5 h-5 text-warning" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Poznámky trenéra</p>
              <p className="text-sm text-muted-foreground">
                {totalNotes > 0 ? `${totalNotes} poznámek` : 'Žádné poznámky'}
              </p>
            </div>
          </div>
          <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform duration-200', isOpen && 'rotate-90')} />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 p-4 bg-card/60 backdrop-blur-sm border border-border/30 rounded-2xl space-y-4 shadow-sm">
          {/* Add note input */}
          {showInput ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Napište poznámku..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                className="resize-none"
                autoFocus
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowInput(false);
                    setNewNote('');
                  }}
                >
                  Zrušit
                </Button>
                <Button
                  size="sm"
                  className="gap-1"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || isAdding}
                >
                  <Send className="w-4 h-4" />
                  {isAdding ? 'Ukládám...' : 'Uložit'}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setShowInput(true)}
            >
              <Plus className="w-4 h-4" />
              Přidat poznámku
            </Button>
          )}

          {/* Notes list */}
          {parsedNotes.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Historie poznámek</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {parsedNotes.map((note, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-secondary/30 border border-border/20 hover:bg-secondary/50 transition-colors"
                  >
                    <p className="text-xs text-muted-foreground mb-1 font-medium">{note.date}</p>
                    <p className="text-sm text-foreground">{note.content}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : !showInput && (
            <div className="text-center py-4">
              <StickyNote className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Zatím žádné poznámky</p>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
