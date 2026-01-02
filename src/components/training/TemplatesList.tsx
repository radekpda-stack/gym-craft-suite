import { useState } from 'react';
import { 
  useTrainingTemplates, 
  useDeleteTrainingTemplate, 
  useDuplicateTrainingTemplate,
  TrainingTemplate 
} from '@/hooks/useTrainingTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Copy, 
  Trash2, 
  Clock, 
  Dumbbell,
  Edit,
  Loader2,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssignTemplateToClientDialog } from './AssignTemplateToClientDialog';

interface TemplatesListProps {
  onCreateNew: () => void;
  onEdit: (template: TrainingTemplate) => void;
  onApply?: (template: TrainingTemplate) => void;
  selectable?: boolean;
}

const CATEGORIES = [
  { value: '', label: 'Vše' },
  { value: 'strength', label: 'Síla' },
  { value: 'hypertrophy', label: 'Hypertrofie' },
  { value: 'conditioning', label: 'Kondice' },
  { value: 'rehab', label: 'Rehabilitace' },
  { value: 'mobility', label: 'Mobilita' },
];

export function TemplatesList({ 
  onCreateNew, 
  onEdit, 
  onApply,
  selectable = false 
}: TemplatesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [assignTemplate, setAssignTemplate] = useState<TrainingTemplate | null>(null);
  
  const { data: templates = [], isLoading } = useTrainingTemplates(category || undefined);
  const deleteTemplate = useDeleteTrainingTemplate();
  const duplicateTemplate = useDuplicateTrainingTemplate();

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteTemplate.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const handleDuplicate = async (templateId: string) => {
    await duplicateTemplate.mutateAsync(templateId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Hledat šablony..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {CATEGORIES.map(cat => (
              <Button
                key={cat.value}
                variant={category === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nová šablona
        </Button>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-medium">Žádné šablony</p>
            <p className="text-sm">Vytvořte první šablonu tréninku</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map(template => (
            <Card 
              key={template.id}
              className={cn(
                "cursor-pointer hover:border-primary/50 transition-colors",
                selectable && "hover:ring-2 hover:ring-primary/20"
              )}
              onClick={() => selectable && onApply?.(template)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base line-clamp-1">
                    {template.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        onEdit(template);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Upravit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        setAssignTemplate(template);
                      }}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Přiřadit klientovi
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(template.id);
                      }}>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplikovat
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(template.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Smazat
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {template.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                    {template.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {template.category && (
                    <Badge variant="secondary">
                      {CATEGORIES.find(c => c.value === template.category)?.label || template.category}
                    </Badge>
                  )}
                  {template.estimated_duration && (
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      {template.estimated_duration} min
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Dumbbell className="w-4 h-4" />
                  <span>{template.exercises?.length || 0} cviků</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat šablonu?</AlertDialogTitle>
            <AlertDialogDescription>
              Tato akce je nevratná. Šablona bude trvale odstraněna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Zrušit</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Template Dialog */}
      {assignTemplate && (
        <AssignTemplateToClientDialog
          open={!!assignTemplate}
          onOpenChange={(open) => !open && setAssignTemplate(null)}
          template={assignTemplate}
        />
      )}
    </div>
  );
}
