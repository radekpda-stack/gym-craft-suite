import { useState } from 'react';
import { ClipboardList, UserPlus, UserCheck, ChevronDown, ChevronUp, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { useUnassignedPreDiagnostics, useDeletePreDiagnostic, PreDiagnosticForm } from '@/hooks/usePreDiagnosticForms';
import { CreateClientFromPreDiagnosticDialog } from './CreateClientFromPreDiagnosticDialog';
import { AssignPreDiagnosticDialog } from './AssignPreDiagnosticDialog';
import { PreDiagnosticAnswersDialog } from './PreDiagnosticAnswersDialog';
import { Client } from '@/hooks/useClients';
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

interface UnassignedPreDiagnosticListProps {
  clients: Client[];
}

export function UnassignedPreDiagnosticList({ clients }: UnassignedPreDiagnosticListProps) {
  const { data: unassignedForms = [], isLoading } = useUnassignedPreDiagnostics();
  const deletePreDiagnostic = useDeletePreDiagnostic();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedForm, setSelectedForm] = useState<PreDiagnosticForm | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [answersDialogOpen, setAnswersDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isLoading || unassignedForms.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">
              Nepřiřazené pre-diagnostiky
            </h3>
            <p className="text-sm text-muted-foreground">
              Formuláře od nových klientů čekající na zpracování
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {unassignedForms.length}
          </Badge>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t divide-y">
          {unassignedForms.map((form) => (
            <div
              key={form.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground truncate">
                    {form.client_name || 'Neznámé jméno'}
                  </span>
                  <Badge variant="outline" className="shrink-0">
                    Nový klient
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  {form.client_email && (
                    <span className="truncate">{form.client_email}</span>
                  )}
                  {form.completed_at && (
                    <span>
                      Vyplněno: {format(new Date(form.completed_at), 'd.M.yyyy', { locale: cs })}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedForm(form);
                    setAnswersDialogOpen(true);
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Zobrazit</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedForm(form);
                    setAssignDialogOpen(true);
                  }}
                >
                  <UserCheck className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Přiřadit</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedForm(form);
                    setCreateDialogOpen(true);
                  }}
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Vytvořit klienta</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setSelectedForm(form);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialogs */}
      {selectedForm && (
        <>
          <CreateClientFromPreDiagnosticDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            form={selectedForm}
          />
          <AssignPreDiagnosticDialog
            open={assignDialogOpen}
            onOpenChange={setAssignDialogOpen}
            form={selectedForm}
            clients={clients}
          />
          <PreDiagnosticAnswersDialog
            open={answersDialogOpen}
            onOpenChange={setAnswersDialogOpen}
            formId={selectedForm.id}
            clientName={selectedForm.client_name}
          />
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Smazat pre-diagnostiku?</AlertDialogTitle>
                <AlertDialogDescription>
                  Opravdu chcete smazat pre-diagnostiku od "{selectedForm.client_name || 'Neznámé jméno'}"? 
                  Tato akce je nevratná a všechny odpovědi budou ztraceny.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    deletePreDiagnostic.mutate(selectedForm.id);
                    setDeleteDialogOpen(false);
                  }}
                >
                  Smazat
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
