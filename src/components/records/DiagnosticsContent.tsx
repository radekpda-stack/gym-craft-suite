import { useState } from 'react';
import { Plus, Stethoscope, FileText, Calendar, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ClientAvatar } from '@/components/ui/client-avatar';
import { useClients } from '@/hooks/useClients';
import { useDiagnostics } from '@/hooks/useDiagnostics';
import { CreateDiagnosticSheet } from '@/components/diagnostics/CreateDiagnosticSheet';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';

export default function DiagnosticsContent() {
  const { data: clients = [] } = useClients();
  const { data: diagnostics = [] } = useDiagnostics();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Get recent diagnostics with client info
  const recentDiagnostics = diagnostics
    .slice(0, 10)
    .map(d => ({
      ...d,
      client: clients.find(c => c.id === d.client_id)
    }));

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Diagnostika klientů</h2>
          <p className="text-sm text-muted-foreground">
            Komplexní anamnéza, posturální analýza a AI vyhodnocení
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Nová diagnostika
        </Button>
      </div>

      <CreateDiagnosticSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        clients={clients}
      />

      {/* Recent Diagnostics */}
      {recentDiagnostics.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Poslední diagnostiky
          </h3>
          <div className="grid gap-3">
            {recentDiagnostics.map((diagnostic) => (
              <div
                key={diagnostic.id}
                className="glass rounded-xl p-4 hover:bg-secondary/50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <ClientAvatar 
                    name={diagnostic.client?.name || 'Neznámý'} 
                    size="md" 
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground truncate">
                        {diagnostic.client?.name || 'Neznámý klient'}
                      </p>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        "bg-primary/10 text-primary"
                      )}>
                        {diagnostic.area_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(diagnostic.date), 'd. MMMM yyyy', { locale: cs })}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        {diagnostic.area_type}
                      </span>
                    </div>
                    {diagnostic.findings && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {diagnostic.findings}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <Stethoscope className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">
            Žádné diagnostiky
          </h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Vytvořte první diagnostiku pro nového nebo existujícího klienta
          </p>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nová diagnostika
          </Button>
        </div>
      )}

      {/* Quick Stats */}
      {diagnostics.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{diagnostics.length}</p>
            <p className="text-sm text-muted-foreground">Celkem diagnostik</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {new Set(diagnostics.map(d => d.client_id)).size}
            </p>
            <p className="text-sm text-muted-foreground">Klientů s diagnostikou</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">
              {diagnostics.filter(d => {
                const date = new Date(d.date);
                const now = new Date();
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">Tento měsíc</p>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground flex items-center justify-center gap-1">
              <User className="w-5 h-5" />
              {clients.length}
            </p>
            <p className="text-sm text-muted-foreground">Aktivních klientů</p>
          </div>
        </div>
      )}
    </div>
  );
}
