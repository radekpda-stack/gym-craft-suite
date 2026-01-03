import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layers, Plus, GripVertical, Trash2 } from 'lucide-react';
import { useTestBatteries, useCreateTestBattery, useDeleteTestBattery } from '@/hooks/useTestBatteries';
import { useTestDefinitions } from '@/hooks/useTestDefinitions';
import type { TestBattery } from '@/types/testExtensions';
import { cn } from '@/lib/utils';

interface TestBatteryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (battery: TestBattery) => void;
}

export function TestBatteryDialog({ open, onOpenChange, onSelect }: TestBatteryDialogProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [nameCz, setNameCz] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [restMinutes, setRestMinutes] = useState(5);
  
  const { data: batteries, isLoading } = useTestBatteries();
  const { data: definitions } = useTestDefinitions();
  const createBattery = useCreateTestBattery();
  const deleteBattery = useDeleteTestBattery();
  
  const handleCreate = async () => {
    if (!name || selectedTests.length === 0) return;
    
    const battery = await createBattery.mutateAsync({
      name,
      name_cs: nameCz || null,
      description: description || null,
      test_definition_ids: selectedTests,
      rest_between_tests_minutes: restMinutes,
    });
    
    setIsCreating(false);
    resetForm();
    
    if (onSelect && battery) {
      onSelect(battery as unknown as TestBattery);
    }
  };
  
  const resetForm = () => {
    setName('');
    setNameCz('');
    setDescription('');
    setSelectedTests([]);
    setRestMinutes(5);
  };
  
  const toggleTest = (testId: string) => {
    setSelectedTests(prev => 
      prev.includes(testId) 
        ? prev.filter(id => id !== testId)
        : [...prev, testId]
    );
  };
  
  const getTestName = (testId: string) => {
    const def = definitions?.find(d => d.id === testId);
    return def?.name_cs || def?.name || testId;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            {isCreating ? 'Nová testovací baterie' : 'Testovací baterie'}
          </DialogTitle>
        </DialogHeader>
        
        {isCreating ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Název (EN)</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="např. Cardio Assessment"
                />
              </div>
              <div className="space-y-2">
                <Label>Název (CZ)</Label>
                <Input
                  value={nameCz}
                  onChange={e => setNameCz(e.target.value)}
                  placeholder="např. Kardio hodnocení"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Popis</Label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Popis účelu baterie..."
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Odpočinek mezi testy (min)</Label>
              <Input
                type="number"
                value={restMinutes}
                onChange={e => setRestMinutes(parseInt(e.target.value) || 5)}
                min={1}
                max={30}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Vyberte testy ({selectedTests.length} vybráno)</Label>
              <ScrollArea className="h-48 border rounded-lg p-2">
                <div className="space-y-2">
                  {definitions?.map(def => (
                    <div
                      key={def.id}
                      className={cn(
                        'flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted/50',
                        selectedTests.includes(def.id) && 'bg-primary/10'
                      )}
                      onClick={() => toggleTest(def.id)}
                    >
                      <Checkbox checked={selectedTests.includes(def.id)} />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{def.name_cs || def.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{def.category}</p>
                      </div>
                      {selectedTests.includes(def.id) && (
                        <Badge variant="secondary" className="text-xs">
                          #{selectedTests.indexOf(def.id) + 1}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {selectedTests.length > 0 && (
              <div className="space-y-2">
                <Label>Pořadí testů</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedTests.map((testId, index) => (
                    <Badge key={testId} variant="outline" className="flex items-center gap-1">
                      <GripVertical className="w-3 h-3" />
                      {index + 1}. {getTestName(testId)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={!name || selectedTests.length === 0 || createBattery.isPending}
                className="flex-1"
              >
                Vytvořit baterii
              </Button>
              <Button variant="outline" onClick={() => { setIsCreating(false); resetForm(); }}>
                Zrušit
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Vytvořit novou baterii
            </Button>
            
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : batteries?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Žádné baterie</p>
                <p className="text-sm">Vytvořte baterii pro seskupení testů</p>
              </div>
            ) : (
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {batteries?.map(battery => (
                    <Card
                      key={battery.id}
                      className="cursor-pointer hover:shadow-md transition-all"
                      onClick={() => onSelect?.(battery)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{battery.name_cs || battery.name}</h4>
                            {battery.description && (
                              <p className="text-sm text-muted-foreground mt-1">{battery.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1 mt-2">
                              {battery.test_definition_ids.map((testId, i) => (
                                <Badge key={testId} variant="outline" className="text-xs">
                                  {i + 1}. {getTestName(testId)}
                                </Badge>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Odpočinek: {battery.rest_between_tests_minutes} min mezi testy
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteBattery.mutate(battery.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
