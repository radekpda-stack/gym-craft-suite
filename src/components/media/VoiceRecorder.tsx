import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mic, Square, Pause, Play, Trash2 } from "lucide-react";
import { useCreateMedia, CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Diagnostic } from "@/hooks/useDiagnostics";

interface VoiceRecorderProps {
  clientId: string;
  diagnosticId?: string;
  diagnostics?: Diagnostic[];
  onSuccess?: () => void;
}

export function VoiceRecorder({ clientId, diagnosticId, diagnostics = [], onSuccess }: VoiceRecorderProps) {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("diagnostic");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [selectedDiagnosticId, setSelectedDiagnosticId] = useState<string>(diagnosticId || "");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const createMedia = useCreateMedia();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);
      
      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = setInterval(() => {
          setDuration(d => d + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const resetRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    const file = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });

    await createMedia.mutateAsync({
      client_id: clientId,
      type: 'audio',
      file,
      description,
      category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      date: date.toISOString().split('T')[0],
      duration_seconds: duration,
      diagnostic_id: selectedDiagnosticId || undefined,
    });

    setOpen(false);
    resetForm();
    onSuccess?.();
  };

  const resetForm = () => {
    resetRecording();
    setDescription("");
    setCategory("diagnostic");
    setTags("");
    setDate(new Date());
    setSelectedDiagnosticId(diagnosticId || "");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mic className="h-4 w-4 mr-2" />
          Nahrát poznámku
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Hlasová poznámka</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Recording controls */}
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="text-4xl font-mono">{formatTime(duration)}</div>
            
            {!audioBlob ? (
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button size="lg" onClick={startRecording} className="rounded-full w-16 h-16">
                    <Mic className="h-6 w-6" />
                  </Button>
                ) : (
                  <>
                    <Button size="lg" variant="outline" onClick={pauseRecording} className="rounded-full w-16 h-16">
                      {isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
                    </Button>
                    <Button size="lg" variant="destructive" onClick={stopRecording} className="rounded-full w-16 h-16">
                      <Square className="h-6 w-6" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 w-full">
                <audio controls src={audioUrl || undefined} className="w-full" />
                <Button variant="ghost" size="sm" onClick={resetRecording}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Nahrát znovu
                </Button>
              </div>
            )}
            
            {isRecording && (
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isPaused ? 'bg-yellow-500' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-sm text-muted-foreground">
                  {isPaused ? 'Pozastaveno' : 'Nahrávám...'}
                </span>
              </div>
            )}
          </div>

          {audioBlob && (
            <>
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
                <Label>Popisek</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="O čem je tato poznámka..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tagy (oddělené čárkou)</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="např. diagnostika, koleno, důležité"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setOpen(false)}>Zrušit</Button>
                <Button onClick={handleSubmit} disabled={createMedia.isPending}>
                  {createMedia.isPending ? "Ukládám..." : "Uložit"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
