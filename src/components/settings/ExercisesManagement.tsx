import { useState } from 'react';
import { Plus, Pencil, Trash2, Search, Dumbbell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExercises, Exercise } from '@/hooks/useExercises';
import { cn } from '@/lib/utils';

const CATEGORIES = ['Nohy', 'Hrudník', 'Záda', 'Ramena', 'Paže', 'Core'];

export function ExercisesManagement() {
  const { exercises, isLoading, createExercise, updateExercise, deleteExercise } = useExercises();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Nohy',
    subcategory: '',
    description: '',
    muscle_groups: '',
    equipment: '',
  });

  const filteredExercises = exercises.filter((exercise) => {
    const matchesSearch =
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exercise.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || exercise.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const groupedExercises = filteredExercises.reduce(
    (acc, exercise) => {
      if (!acc[exercise.category]) acc[exercise.category] = [];
      acc[exercise.category].push(exercise);
      return acc;
    },
    {} as Record<string, Exercise[]>
  );

  const openCreateDialog = () => {
    setEditingExercise(null);
    setFormData({
      name: '',
      category: 'Nohy',
      subcategory: '',
      description: '',
      muscle_groups: '',
      equipment: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      category: exercise.category,
      subcategory: exercise.subcategory || '',
      description: exercise.description || '',
      muscle_groups: exercise.muscle_groups.join(', '),
      equipment: exercise.equipment.join(', '),
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      name: formData.name,
      category: formData.category,
      subcategory: formData.subcategory || null,
      description: formData.description || null,
      muscle_groups: formData.muscle_groups
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      equipment: formData.equipment
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    if (editingExercise) {
      updateExercise.mutate({ id: editingExercise.id, ...data });
    } else {
      createExercise.mutate(data);
    }
    setIsDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Načítání cviků...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search and Add */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Hledat cviky..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass-input"
          />
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="w-4 h-4" />
              Přidat cvik
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>{editingExercise ? 'Upravit cvik' : 'Nový cvik'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Název</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategorie</Label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl glass-input border border-border/50"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Podkategorie</Label>
                  <Input
                    value={formData.subcategory}
                    onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                    className="glass-input"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Popis</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Svalové skupiny (oddělené čárkou)</Label>
                <Input
                  value={formData.muscle_groups}
                  onChange={(e) => setFormData({ ...formData, muscle_groups: e.target.value })}
                  placeholder="např. Quadriceps, Gluteus"
                  className="glass-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Vybavení (oddělené čárkou)</Label>
                <Input
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  placeholder="např. Činka, Lavice"
                  className="glass-input"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Zrušit
              </Button>
              <Button onClick={handleSubmit} disabled={!formData.name}>
                {editingExercise ? 'Uložit' : 'Vytvořit'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            !selectedCategory
              ? 'bg-primary text-primary-foreground'
              : 'glass-subtle hover:bg-secondary/80 text-muted-foreground'
          )}
        >
          Vše ({exercises.length})
        </button>
        {CATEGORIES.map((category) => {
          const count = exercises.filter((e) => e.category === category).length;
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'glass-subtle hover:bg-secondary/80 text-muted-foreground'
              )}
            >
              {category} ({count})
            </button>
          );
        })}
      </div>

      {/* Exercises List */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
        {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">{category}</h4>
            <div className="space-y-2">
              {categoryExercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="glass-subtle rounded-xl p-4 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{exercise.name}</p>
                      {exercise.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {exercise.description}
                        </p>
                      )}
                      <div className="flex gap-1 mt-1">
                        {exercise.muscle_groups.slice(0, 3).map((group) => (
                          <Badge key={group} variant="secondary" className="text-xs">
                            {group}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(exercise)}
                      className="h-8 w-8"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="glass-strong">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Smazat cvik?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Opravdu chcete smazat cvik "{exercise.name}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Zrušit</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteExercise.mutate(exercise.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Smazat
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredExercises.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Žádné cviky nenalezeny</p>
          </div>
        )}
      </div>
    </div>
  );
}
