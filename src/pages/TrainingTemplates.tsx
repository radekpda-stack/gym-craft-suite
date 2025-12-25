import { useState } from "react";
import { TemplatesList } from "@/components/training/TemplatesList";
import { TemplateEditor } from "@/components/training/TemplateEditor";
import { TrainingTemplate } from "@/hooks/useTrainingTemplates";

export default function TrainingTemplates() {
  const [editingTemplate, setEditingTemplate] = useState<TrainingTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tréninkové šablony</h1>
        <p className="text-muted-foreground">
          Vytvořte a spravujte šablony pro rychlé plánování tréninků
        </p>
      </div>

      <TemplatesList onCreateNew={handleCreate} onEdit={handleEdit} />
    </div>
  );
}
