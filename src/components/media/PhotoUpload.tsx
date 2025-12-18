import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, Upload, X } from "lucide-react";
import { useCreateMedia, BODY_AREA_OPTIONS, CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Diagnostic } from "@/hooks/useDiagnostics";

interface PhotoUploadProps {
  clientId: string;
  diagnosticId?: string;
  diagnostics?: Diagnostic[];
  onSuccess?: () => void;
}

export function PhotoUpload({ clientId, diagnosticId, diagnostics = [], onSuccess }: PhotoUploadProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("diagnostic");
  const [bodyArea, setBodyArea] = useState("");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string>(diagnosticId || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const createMedia = useCreateMedia();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    await createMedia.mutateAsync({
      client_id: clientId,
      type: 'photo',
      file,
      description,
      category,
      body_area: bodyArea || undefined,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      date: date.toISOString().split('T')[0],
      diagnostic_id: selectedDiagnosticId || undefined,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setDescription("");
    setCategory("diagnostic");
    setBodyArea("");
    setTags("");
    setDate(new Date());
    setSelectedDiagnosticId(diagnosticId || "");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Camera className="h-4 w-4 mr-2" />
          Přidat fotku
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nahrát fotografii</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={() => { setFile(null); setPreview(null); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Klikněte pro výběr fotografie</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />

          <div className="space-y-2">
            <Label>Datum</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "d. M. yyyy") : "Vyberte datum"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {diagnostics.length > 0 && (
            <div className="space-y-2">
              <Label>Propojit s diagnostikou (volitelné)</Label>
              <Select value={selectedDiagnosticId || "__none__"} onValueChange={(val) => setSelectedDiagnosticId(val === "__none__" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Vyberte diagnostiku" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Bez propojení</SelectItem>
                  {diagnostics.map(diag => (
                    <SelectItem key={diag.id} value={diag.id}>
                      {format(new Date(diag.date), "d. M. yyyy")} - {diag.area_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <Label>Oblast těla</Label>
            <Select value={bodyArea} onValueChange={setBodyArea}>
              <SelectTrigger>
                <SelectValue placeholder="Vyberte oblast" />
              </SelectTrigger>
              <SelectContent>
                {BODY_AREA_OPTIONS.map(opt => (
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
              placeholder="Poznámka k fotografii..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Tagy (oddělené čárkou)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="např. postura, rameno, před"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
            <Button onClick={handleSubmit} disabled={!file || createMedia.isPending}>
              {createMedia.isPending ? "Nahrávám..." : "Nahrát"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
