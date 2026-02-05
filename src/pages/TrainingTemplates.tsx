import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, Dumbbell, FileText, Timer, Repeat, Weight, Loader2, Plus } from "lucide-react";
import { TemplatesList } from "@/components/training/TemplatesList";
import { TemplateEditor } from "@/components/training/TemplateEditor";
import { TrainingTemplate } from "@/hooks/useTrainingTemplates";
import { useRxWorkouts, RxScoringMode } from "@/hooks/useRxWorkouts";
import { RxWorkoutCard } from "@/components/rx/RxWorkoutCard";
import { RxImportDialog } from "@/components/rx/RxImportDialog";

export default function TrainingTemplates() {
  const [editingTemplate, setEditingTemplate] = useState<TrainingTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("templates");
  const [rxScoringFilter, setRxScoringFilter] = useState<string>("all");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const scoringFilter = rxScoringFilter === "all" ? undefined : (rxScoringFilter as RxScoringMode);
  const { data: rxWorkouts = [], isLoading: rxLoading } = useRxWorkouts(scoringFilter);

  const handleEdit = (template: TrainingTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
  };

  const handleCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
  };

  const handleBack = () => {
    setEditingTemplate(null);
    setIsCreating(false);
  };

  const handleSaved = () => {
    handleBack();
  };

  if (editingTemplate || isCreating) {
    return (
      <TemplateEditor
        template={editingTemplate}
        onBack={handleBack}
        onSaved={handleSaved}
      />
    );
  }

  const rxTabConfig = [
    { value: "all", label: "Vše", icon: Dumbbell },
    { value: "for_time", label: "For Time", icon: Timer },
    { value: "amrap", label: "AMRAP", icon: Repeat },
    { value: "max_load", label: "Max Load", icon: Weight },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6" />
            Šablony & RX Workouty
          </h1>
          <p className="text-muted-foreground">
            Tréninkové šablony a standardizované benchmarky
          </p>
        </div>
        {activeTab === "rx" && (
          <Button onClick={() => setImportDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Import z textu
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates" className="gap-2">
            <LayoutTemplate className="h-4 w-4" />
            <span>Šablony</span>
          </TabsTrigger>
          <TabsTrigger value="rx" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            <span>RX Workouty</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-6">
          <TemplatesList onCreateNew={handleCreate} onEdit={handleEdit} />
        </TabsContent>

        <TabsContent value="rx" className="mt-6 space-y-4">
          {/* RX Scoring Filter */}
          <div className="flex gap-2 flex-wrap">
            {rxTabConfig.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                variant={rxScoringFilter === value ? "default" : "outline"}
                size="sm"
                onClick={() => setRxScoringFilter(value)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            ))}
          </div>

          {/* RX Workouts Grid */}
          {rxLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rxWorkouts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-muted/30">
              <Dumbbell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Zatím žádné RX workouty</h3>
              <p className="text-muted-foreground mb-4">
                Importujte svůj první workout pomocí textového formátu
              </p>
              <Button onClick={() => setImportDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Importovat workout
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rxWorkouts.map((workout) => (
                <RxWorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* RX Import Dialog */}
      <RxImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
      />
    </div>
  );
}
