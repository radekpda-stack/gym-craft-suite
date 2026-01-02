import { useState } from 'react';
import { Star, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMealTemplates, useCreateMealTemplate, useDeleteMealTemplate, MealTemplate, CreateMealTemplateInput } from '@/hooks/useNutritionMealTemplates';

interface MealTemplatesProps {
  clientId: string;
  onUseTemplate: (template: MealTemplate) => void;
}

const MEAL_TYPES = [
  { value: 'breakfast', label: 'Snídaně', icon: '🌅' },
  { value: 'lunch', label: 'Oběd', icon: '☀️' },
  { value: 'dinner', label: 'Večeře', icon: '🌙' },
  { value: 'snack', label: 'Svačina', icon: '🍎' },
] as const;

const PORTION_SIZES = [
  { value: 'small', label: 'Malá' },
  { value: 'medium', label: 'Střední' },
  { value: 'large', label: 'Velká' },
] as const;

export function MealTemplates({ clientId, onUseTemplate }: MealTemplatesProps) {
  const { data: templates = [], isLoading } = useMealTemplates(clientId);
  const createTemplate = useCreateMealTemplate();
  const deleteTemplate = useDeleteMealTemplate();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState<CreateMealTemplateInput>({
    name: '',
    description: '',
    meal_type: undefined,
    portion_size: 'medium',
  });

  const handleCreate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.description.trim()) {
      toast.error('Vyplňte název a popis');
      return;
    }

    try {
      await createTemplate.mutateAsync({
        clientId,
        template: newTemplate,
      });
      toast.success('Šablona uložena');
      setDialogOpen(false);
      setNewTemplate({ name: '', description: '', meal_type: undefined, portion_size: 'medium' });
    } catch (error) {
      toast.error('Nepodařilo se uložit šablonu');
    }
  };

  const handleDelete = async (templateId: string) => {
    try {
      await deleteTemplate.mutateAsync({ templateId, clientId });
      toast.success('Šablona smazána');
    } catch (error) {
      toast.error('Nepodařilo se smazat šablonu');
    }
  };

  const getMealTypeInfo = (type: string | null) => {
    return MEAL_TYPES.find(m => m.value === type) || { icon: '🍽️', label: 'Jídlo' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-500" />
            Moje šablony
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-3 w-3 mr-1" />
                Nová
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nová šablona jídla</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Název šablony</Label>
                  <Input
                    placeholder="např. Ranní ovesná kaše"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Popis jídla</Label>
                  <Input
                    placeholder="např. Ovesná kaše s banánem a medem"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Typ jídla</Label>
                    <Select
                      value={newTemplate.meal_type || ''}
                      onValueChange={(v) => setNewTemplate(prev => ({ 
                        ...prev, 
                        meal_type: v as 'breakfast' | 'lunch' | 'dinner' | 'snack' 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Vybrat" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Porce</Label>
                    <Select
                      value={newTemplate.portion_size || 'medium'}
                      onValueChange={(v) => setNewTemplate(prev => ({ 
                        ...prev, 
                        portion_size: v as 'small' | 'medium' | 'large' 
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PORTION_SIZES.map(size => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Zrušit
                </Button>
                <Button onClick={handleCreate} disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Uložit
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím nemáte žádné šablony
          </p>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-2">
              {templates.map((template) => {
                const typeInfo = getMealTypeInfo(template.meal_type);
                return (
                  <div 
                    key={template.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => onUseTemplate(template)}
                    >
                      <div className="flex items-center gap-2">
                        <span>{typeInfo.icon}</span>
                        <span className="font-medium text-sm">{template.name}</span>
                        {template.use_count > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {template.use_count}×
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate ml-6">
                        {template.description}
                      </p>
                    </button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat šablonu?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Šablona "{template.name}" bude trvale smazána.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(template.id)}>
                            Smazat
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
