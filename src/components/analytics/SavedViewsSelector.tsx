import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Folder, ChevronDown, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import type { SavedView, AnalyticsFilters } from '@/hooks/useExerciseAnalytics';

interface SavedViewsSelectorProps {
  views: SavedView[];
  selectedViewId: string | null;
  currentFilters: AnalyticsFilters;
  filterSummary: string[];
  onSelectView: (view: SavedView) => void;
  onSaveView: (name: string) => Promise<void>;
  onDeleteView: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function SavedViewsSelector({
  views,
  selectedViewId,
  currentFilters,
  filterSummary,
  onSelectView,
  onSaveView,
  onDeleteView,
  isLoading = false,
}: SavedViewsSelectorProps) {
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!newViewName.trim()) return;
    
    setIsSaving(true);
    try {
      await onSaveView(newViewName);
      setNewViewName('');
      setSaveDialogOpen(false);
      toast.success('Pohled uložen');
    } catch (err) {
      toast.error('Nepodařilo se uložit pohled');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteView(id);
      toast.success('Pohled smazán');
    } catch (err) {
      toast.error('Nepodařilo se smazat pohled');
    }
  };

  const selectedView = views.find(v => v.id === selectedViewId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isLoading}>
          <Folder className="w-4 h-4 mr-2" />
          {selectedView?.name || 'Uložené pohledy'}
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {views.length === 0 ? (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            Žádné uložené pohledy
          </div>
        ) : (
          views.map(view => (
            <DropdownMenuItem
              key={view.id}
              className="flex items-center justify-between"
            >
              <span 
                onClick={() => onSelectView(view)}
                className="flex-1 cursor-pointer"
              >
                {view.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(view.id);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <Save className="w-4 h-4 mr-2" />
              Uložit aktuální pohled
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Uložit pohled</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Název pohledu</Label>
                <Input
                  value={newViewName}
                  onChange={(e) => setNewViewName(e.target.value)}
                  placeholder="např. Top klienti - 90 dní"
                />
              </div>
              {filterSummary.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  <p>Uloží se:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {filterSummary.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button 
                onClick={handleSave} 
                className="w-full"
                disabled={isSaving || !newViewName.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Ukládám...' : 'Uložit'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
