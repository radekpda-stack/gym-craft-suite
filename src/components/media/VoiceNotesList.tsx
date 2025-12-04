import { useState } from "react";
import { ClientMedia, useDeleteMedia, useUpdateMedia, CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Play, Pause, Edit2, Trash2, Mic } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface VoiceNotesListProps {
  notes: ClientMedia[];
}

export function VoiceNotesList({ notes }: VoiceNotesListProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<ClientMedia | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handlePlay = (note: ClientMedia) => {
    if (playingId === note.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    } else {
      audioElement?.pause();
      const audio = new Audio(note.file_url);
      audio.onended = () => {
        setPlayingId(null);
        setAudioElement(null);
      };
      audio.play();
      setAudioElement(audio);
      setPlayingId(note.id);
    }
  };

  const handleDelete = async (note: ClientMedia) => {
    if (playingId === note.id) {
      audioElement?.pause();
      setPlayingId(null);
      setAudioElement(null);
    }
    await deleteMedia.mutateAsync({ id: note.id, fileUrl: note.file_url, type: 'audio' });
  };

  const handleUpdate = async (note: ClientMedia, updates: Partial<ClientMedia>) => {
    await updateMedia.mutateAsync({ id: note.id, ...updates });
    setEditingNote(null);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--:--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryLabel = (value: string) => CATEGORY_OPTIONS.find(o => o.value === value)?.label || value;

  if (notes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Zatím žádné hlasové poznámky
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <Button
            variant={playingId === note.id ? "default" : "outline"}
            size="icon"
            className="shrink-0 rounded-full"
            onClick={() => handlePlay(note)}
          >
            {playingId === note.id ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">
                {format(new Date(note.date), "d. M. yyyy", { locale: cs })}
              </span>
              <Badge variant="secondary" className="text-xs">
                {getCategoryLabel(note.category)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDuration(note.duration_seconds)}
              </span>
            </div>
            
            {note.description && (
              <p className="text-sm text-muted-foreground mb-2">{note.description}</p>
            )}
            
            {note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {note.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={() => setEditingNote(note)}>
              <Edit2 className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Smazat hlasovou poznámku?</AlertDialogTitle>
                  <AlertDialogDescription>Tato akce je nevratná.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(note)}>
                    Smazat
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      ))}

      {/* Edit Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit poznámku</DialogTitle>
          </DialogHeader>
          {editingNote && (
            <EditNoteForm
              note={editingNote}
              onSave={(updates) => handleUpdate(editingNote, updates)}
              onCancel={() => setEditingNote(null)}
              isLoading={updateMedia.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EditNoteFormProps {
  note: ClientMedia;
  onSave: (updates: Partial<ClientMedia>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditNoteForm({ note, onSave, onCancel, isLoading }: EditNoteFormProps) {
  const [description, setDescription] = useState(note.description);
  const [category, setCategory] = useState(note.category);
  const [tags, setTags] = useState(note.tags.join(", "));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Kategorie</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Popisek</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label>Tagy (oddělené čárkou)</Label>
        <Input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>Zrušit</Button>
        <Button
          onClick={() => onSave({
            description,
            category,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          })}
          disabled={isLoading}
        >
          {isLoading ? "Ukládám..." : "Uložit"}
        </Button>
      </div>
    </div>
  );
}
