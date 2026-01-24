import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, CalendarIcon, X, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { useCreateMedia, DOCUMENT_CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { cn } from "@/lib/utils";

interface DocumentUploadProps {
  clientId: string;
  onSuccess?: () => void;
}

const MAX_DOC_SIZE_MB = 25;
const MAX_DOC_SIZE_BYTES = MAX_DOC_SIZE_MB * 1024 * 1024;

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
];

const ACCEPTED_EXTENSIONS = '.pdf,.doc,.docx,.xls,.xlsx,.txt';

export function DocumentUpload({ clientId, onSuccess }: DocumentUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMedia = useCreateMedia();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setError(null);

    if (selected.size > MAX_DOC_SIZE_BYTES) {
      setError(`Dokument je příliš velký. Maximální velikost je ${MAX_DOC_SIZE_MB} MB.`);
      return;
    }

    // Check by extension if MIME type check fails
    const extension = selected.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'];
    
    if (!ACCEPTED_TYPES.includes(selected.type) && !validExtensions.includes(extension || '')) {
      setError("Nepodporovaný formát. Podporované: PDF, DOC, DOCX, XLS, XLSX, TXT");
      return;
    }

    setFile(selected);
  };

  const handleSubmit = async () => {
    if (!file) return;

    await createMedia.mutateAsync({
      client_id: clientId,
      type: 'document',
      file,
      description,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      date: format(date, 'yyyy-MM-dd'),
    });

    resetForm();
    setOpen(false);
    onSuccess?.();
  };

  const resetForm = () => {
    setFile(null);
    setDescription("");
    setCategory("other");
    setTags("");
    setDate(new Date());
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return <FileText className="h-8 w-8 text-primary" />;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Přidat dokument
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nahrát dokument</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File preview or upload area */}
          {file ? (
            <div className="relative border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                error && "border-destructive"
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Klikněte pro nahrání dokumentu
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX, XLS, XLSX (max {MAX_DOC_SIZE_MB} MB)
              </p>
              {error && (
                <p className="text-xs text-destructive mt-2">{error}</p>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Date */}
          <div className="space-y-1.5">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, "d. MMMM yyyy", { locale: cs })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  locale={cs}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Kategorie</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Popis</Label>
            <Textarea
              placeholder="Popis dokumentu..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label>Tagy</Label>
            <Input
              placeholder="Oddělené čárkou, např: smlouva, 2024"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Zrušit
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!file || createMedia.isPending}
            >
              {createMedia.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Nahrávám...
                </>
              ) : (
                "Nahrát"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
