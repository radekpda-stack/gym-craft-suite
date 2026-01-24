import { useState } from "react";
import { useClientMedia, ClientMedia, CATEGORY_OPTIONS, DOCUMENT_CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { useDiagnostics } from "@/hooks/useDiagnostics";
import { PhotoUpload } from "./PhotoUpload";
import { PhotoGallery } from "./PhotoGallery";
import { PhotoCompare } from "./PhotoCompare";
import { VoiceRecorder } from "./VoiceRecorder";
import { VoiceNotesList } from "./VoiceNotesList";
import { VideoUpload } from "./VideoUpload";
import { VideoGallery } from "./VideoGallery";
import { DocumentUpload } from "./DocumentUpload";
import { DocumentList } from "./DocumentList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Mic, Search, Filter, Video, FileText } from "lucide-react";
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
  const { data: videos, isLoading: videosLoading } = useClientMedia(clientId, 'video');
  const { data: documents, isLoading: documentsLoading } = useClientMedia(clientId, 'document');
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
  const filteredVideos = filterMedia(videos);
  const filteredDocuments = filterMedia(documents);

  const handleCompare = (selectedPhotos: ClientMedia[]) => {
    setComparePhotos(selectedPhotos);
    setShowCompare(true);
  };

  // Get category options based on active tab
  const getCategoryOptions = () => {
    if (activeTab === "documents") {
      return DOCUMENT_CATEGORY_OPTIONS;
    }
    return CATEGORY_OPTIONS;
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="photos" className="gap-2">
                <Camera className="h-4 w-4" />
                <span className="hidden sm:inline">Fotografie</span>
                <span className="sm:hidden">Foto</span>
                ({photos?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="videos" className="gap-2">
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Videa</span>
                <span className="sm:hidden">Vid</span>
                ({videos?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="documents" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Dokumenty</span>
                <span className="sm:hidden">Dok</span>
                ({documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="audio" className="gap-2">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Nahrávky</span>
                <span className="sm:hidden">Audio</span>
                ({audioNotes?.length || 0})
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex gap-2 shrink-0">
            {activeTab === "photos" && <PhotoUpload clientId={clientId} diagnostics={diagnostics} />}
            {activeTab === "videos" && <VideoUpload clientId={clientId} />}
            {activeTab === "documents" && <DocumentUpload clientId={clientId} />}
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
              {getCategoryOptions().map(opt => (
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

        <TabsContent value="videos" className="mt-0">
          {videosLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <VideoGallery videos={filteredVideos} />
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-0">
          {documentsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <DocumentList documents={filteredDocuments} />
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
