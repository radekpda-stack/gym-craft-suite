import { useState, useRef, useEffect } from 'react';
import { X, Image, Video, Mic, Loader2, Pin, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ClientSearchSelect } from '@/components/ui/client-search-select';
import { useClients } from '@/hooks/useClients';
import { TrainerNote, TrainerNoteMedia, useUploadNoteMedia, useDeleteNoteMedia } from '@/hooks/useTrainerNotes';
import { cn } from '@/lib/utils';

interface PendingMedia {
  id: string;
  file: File;
  type: 'photo' | 'video' | 'audio';
  preview?: string;
}

interface NoteEditorProps {
  note?: TrainerNote | null;
  defaultClientId?: string;
  onSave: (data: {
    title?: string;
    content: string;
    client_id?: string | null;
    is_pinned: boolean;
  }) => Promise<TrainerNote>;
  onCancel: () => void;
  isSaving?: boolean;
}

export function NoteEditor({
  note,
  defaultClientId,
  onSave,
  onCancel,
  isSaving = false,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [clientId, setClientId] = useState<string>(note?.client_id || defaultClientId || '');
  const [isPinned, setIsPinned] = useState(note?.is_pinned || false);
  const [pendingMedia, setPendingMedia] = useState<PendingMedia[]>([]);
  const [existingMedia, setExistingMedia] = useState<TrainerNoteMedia[]>(note?.media || []);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const { data: clients = [] } = useClients();
  const activeClients = clients.filter((c) => !c.is_archived);

  const uploadMedia = useUploadNoteMedia();
  const deleteMedia = useDeleteNoteMedia();

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      pendingMedia.forEach((m) => {
        if (m.preview) URL.revokeObjectURL(m.preview);
      });
    };
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMedia: PendingMedia[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      type: 'photo' as const,
      preview: URL.createObjectURL(file),
    }));
    setPendingMedia((prev) => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newMedia: PendingMedia[] = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      type: 'video' as const,
      preview: URL.createObjectURL(file),
    }));
    setPendingMedia((prev) => [...prev, ...newMedia]);
    e.target.value = '';
  };

  const removePendingMedia = (id: string) => {
    setPendingMedia((prev) => {
      const item = prev.find((m) => m.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((m) => m.id !== id);
    });
  };

  const removeExistingMedia = async (media: TrainerNoteMedia) => {
    if (!note?.id) return;
    try {
      await deleteMedia.mutateAsync({
        mediaId: media.id,
        filePath: media.file_path,
        noteId: note.id,
      });
      setExistingMedia((prev) => prev.filter((m) => m.id !== media.id));
    } catch (error) {
      console.error('Failed to delete media:', error);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) return;

    try {
      const savedNote = await onSave({
        title: title.trim() || undefined,
        content: content.trim(),
        client_id: clientId || null,
        is_pinned: isPinned,
      });

      // Upload pending media if we have a note ID
      if (pendingMedia.length > 0 && savedNote?.id) {
        setIsUploadingMedia(true);
        for (const media of pendingMedia) {
          await uploadMedia.mutateAsync({
            noteId: savedNote.id,
            file: media.file,
            type: media.type,
          });
        }
        setIsUploadingMedia(false);
      }
    } catch (error) {
      setIsUploadingMedia(false);
      throw error;
    }
  };

  const isEditing = !!note;
  const totalMedia = existingMedia.length + pendingMedia.length;

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="note-title">Název (volitelný)</Label>
        <Input
          id="note-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Název poznámky..."
        />
      </div>

      {/* Client selector */}
      <div className="space-y-2">
        <Label>Klient (volitelný)</Label>
        <ClientSearchSelect
          clients={activeClients}
          value={clientId}
          onValueChange={setClientId}
          placeholder="Vyhledat klienta..."
          filterArchived
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="note-content">Poznámka *</Label>
        <Textarea
          id="note-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Napište poznámku..."
          rows={6}
          className="resize-none"
        />
      </div>

      {/* Media section */}
      <div className="space-y-2">
        <Label>Média</Label>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleVideoSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Image className="w-4 h-4 mr-2" />
            Foto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => videoInputRef.current?.click()}
          >
            <Video className="w-4 h-4 mr-2" />
            Video
          </Button>
        </div>

        {/* Existing media */}
        {existingMedia.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {existingMedia.map((media) => (
              <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                {media.type === 'photo' && media.url && (
                  <img
                    src={media.url}
                    alt={media.file_name}
                    className="w-full h-full object-cover"
                  />
                )}
                {media.type === 'video' && media.url && (
                  <video
                    src={media.url}
                    className="w-full h-full object-cover"
                  />
                )}
                {media.type === 'audio' && (
                  <div className="w-full h-full flex items-center justify-center">
                    <Mic className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeExistingMedia(media)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pending media */}
        {pendingMedia.length > 0 && (
          <div className={cn('grid grid-cols-3 gap-2', existingMedia.length > 0 && 'mt-2')}>
            {pendingMedia.map((media) => (
              <div key={media.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30">
                {media.type === 'photo' && media.preview && (
                  <img
                    src={media.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                )}
                {media.type === 'video' && media.preview && (
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removePendingMedia(media.id)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 text-[10px] bg-primary/80 text-primary-foreground px-1.5 py-0.5 rounded">
                  Nové
                </div>
              </div>
            ))}
          </div>
        )}

        {totalMedia > 0 && (
          <p className="text-xs text-muted-foreground">
            {totalMedia} {totalMedia === 1 ? 'soubor' : totalMedia < 5 ? 'soubory' : 'souborů'}
          </p>
        )}
      </div>

      {/* Pin toggle */}
      <div className="flex items-center gap-2">
        <Switch
          id="note-pinned"
          checked={isPinned}
          onCheckedChange={setIsPinned}
        />
        <Label htmlFor="note-pinned" className="flex items-center gap-2 cursor-pointer">
          <Pin className="w-4 h-4" />
          Připnout poznámku
        </Label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSaving || isUploadingMedia}>
          Zrušit
        </Button>
        <Button
          onClick={handleSave}
          disabled={!content.trim() || isSaving || isUploadingMedia}
        >
          {(isSaving || isUploadingMedia) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {isEditing ? 'Uložit změny' : 'Vytvořit poznámku'}
        </Button>
      </div>
    </div>
  );
}
