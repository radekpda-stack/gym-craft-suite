import { useState } from "react";
import { useClientMedia, ClientMedia, CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { PhotoUpload } from "./PhotoUpload";
import { PhotoGallery } from "./PhotoGallery";
import { PhotoCompare } from "./PhotoCompare";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceNotesList } from "./VoiceNotesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mic, Search, Filter } from "lucide-react";
import { Loader2 } from "lucide-react";

interface ClientMediaTabProps {
  clientId: string;
}

export function ClientMediaTab({ clientId }: ClientMediaTabProps) {
  const [activeTab, setActiveTab] = useState("photos");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [comparePhotos, setComparePhotos] = useState<ClientMedia[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  
  const { data: photos, isLoading: photosLoading } = useClientMedia(clientId, 'photo');
  const { data: audioNotes, isLoading: audioLoading } = useClientMedia(clientId, 'audio');
  const { data: diagnostics = [] } = useDiagnostics(clientId);

  const filterMedia = (items: ClientMedia[] | undefined) => {
    if (!items) return [];
    return items.filter(item => {
      const matchesSearch = searchQuery === "" || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  };

  const filteredPhotos = filterMedia(photos);
  const filteredNotes = filterMedia(audioNotes);

  const handleCompare = (selectedPhotos: ClientMedia[]) => {
    setComparePhotos(selectedPhotos);
    setShowCompare(true);
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <TabsList>
            <TabsTrigger value="photos" className="gap-2">
              <Camera className="h-4 w-4" />
              Fotografie ({photos?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="audio" className="gap-2">
              <Mic className="h-4 w-4" />
              Hlasové poznámky ({audioNotes?.length || 0})
            </TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            {activeTab === "photos" && <PhotoUpload clientId={clientId} diagnostics={diagnostics} />}
            {activeTab === "audio" && <VoiceRecorder clientId={clientId} diagnostics={diagnostics} />}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center py-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Hledat podle popisku nebo tagu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny</SelectItem>
              {CATEGORY_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="photos" className="mt-0">
          {photosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PhotoGallery photos={filteredPhotos} onCompare={handleCompare} />
          )}
        </TabsContent>

        <TabsContent value="audio" className="mt-0">
          {audioLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <VoiceNotesList notes={filteredNotes} />
          )}
        </TabsContent>
      </Tabs>

      <PhotoCompare
        photos={comparePhotos}
        open={showCompare}
        onOpenChange={setShowCompare}
      />
    </div>
  );
}
