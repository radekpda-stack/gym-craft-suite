import { useState } from "react";
import { ClientMedia, useDeleteMedia, useUpdateMedia, DOCUMENT_CATEGORY_OPTIONS } from "@/hooks/useClientMedia";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { FileText, Trash2, Edit, Calendar, Tag, Download, ExternalLink, File, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface DocumentListProps {
  documents: ClientMedia[];
}

export function DocumentList({ documents }: DocumentListProps) {
  const [editingDocument, setEditingDocument] = useState<ClientMedia | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");

  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handleEdit = (doc: ClientMedia) => {
    setEditingDocument(doc);
    setEditDescription(doc.description);
    setEditTags(doc.tags.join(", "));
  };

  const handleSaveEdit = async () => {
    if (!editingDocument) return;

    await updateMedia.mutateAsync({
      id: editingDocument.id,
      description: editDescription,
      tags: editTags.split(',').map(t => t.trim()).filter(Boolean),
    });

    setEditingDocument(null);
  };

  const handleDelete = async (doc: ClientMedia) => {
    const filePath = doc.file_url.includes('/storage/v1/')
      ? doc.file_url.split('/storage/v1/object/public/client-documents/')[1] || doc.file_url
      : doc.file_url;

    await deleteMedia.mutateAsync({
      id: doc.id,
      fileUrl: filePath,
      type: 'document',
    });
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      default:
        return <File className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getCategoryLabel = (value: string) => {
    return DOCUMENT_CATEGORY_OPTIONS.find(opt => opt.value === value)?.label || value;
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Žádné dokumenty</p>
        <p className="text-sm">Nahrajte první dokument pomocí tlačítka výše</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
          >
            {getFileIcon(doc.file_name)}
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{doc.file_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(doc.date), "d. M. yyyy", { locale: cs })}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {getCategoryLabel(doc.category)}
                </Badge>
              </div>
              {doc.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                  {doc.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a href={doc.file_url} download={doc.file_name}>
                  <Download className="h-4 w-4" />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEdit(doc)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Smazat dokument?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tato akce je nevratná. Dokument "{doc.file_name}" bude trvale odstraněn.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Zrušit</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(doc)}>
                      Smazat
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingDocument} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upravit dokument</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Popis</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tagy</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Oddělené čárkou"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingDocument(null)}>
                Zrušit
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateMedia.isPending}>
                Uložit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
