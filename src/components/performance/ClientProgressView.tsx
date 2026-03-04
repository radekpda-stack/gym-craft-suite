/**
 * ClientProgressView - Training journal orchestrator
 * Delegates to journal/ sub-components
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BarChart2, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MultiClientComparison } from './MultiClientComparison';
import { CohortBenchmarkView } from './CohortBenchmarkView';
import { QuickLogDialog } from '@/components/exercises/QuickLogDialog';
import { useClients } from '@/hooks/useClients';
import { JournalView } from './journal/JournalView';
import { ClientList } from './journal/ClientList';
import { AnimatePresence, motion } from 'framer-motion';

interface ClientProgressViewProps {
  initialClientId?: string;
}

export function ClientProgressView({ initialClientId }: ClientProgressViewProps) {
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();

  const [viewMode, setViewMode] = useState<'single' | 'compare' | 'benchmark'>('single');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClientId || null);
  const [selectedClientName, setSelectedClientName] = useState<string>(() => {
    if (!initialClientId) return '';
    return clients.find(c => c.id === initialClientId)?.name || '';
  });
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [quickLogClientId, setQuickLogClientId] = useState<string | null>(null);

  const handleSelectClient = (id: string, name: string) => {
    setSelectedClientId(id);
    setSelectedClientName(name);
  };

  const handleClientQuickLog = (clientId: string) => {
    setQuickLogClientId(clientId);
    setShowQuickLog(true);
  };

  const handleBack = () => {
    setSelectedClientId(null);
    setSelectedClientName('');
  };

  return (
    <div className="space-y-6">
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid w-full max-w-lg mx-auto grid-cols-3 bg-secondary/30 backdrop-blur-sm">
          <TabsTrigger value="single" className="gap-2 text-xs">
            <Users className="w-3.5 h-3.5" />
            Deník
          </TabsTrigger>
          <TabsTrigger value="compare" className="gap-2 text-xs">
            <BarChart2 className="w-3.5 h-3.5" />
            Porovnání
          </TabsTrigger>
          <TabsTrigger value="benchmark" className="gap-2 text-xs">
            <Trophy className="w-3.5 h-3.5" />
            Benchmark
          </TabsTrigger>
        </TabsList>

        <TabsContent value="single" className="mt-6">
          <AnimatePresence mode="wait">
            {selectedClientId ? (
              <JournalView
                key={selectedClientId}
                clientId={selectedClientId}
                clientName={selectedClientName}
                onBack={handleBack}
                onNavigateToClient={() => navigate(`/clients/${selectedClientId}`)}
                onQuickLog={() => setShowQuickLog(true)}
              />
            ) : (
              <motion.div key="client-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ClientList onSelectClient={handleSelectClient} onQuickLog={handleClientQuickLog} />
              </motion.div>
            )}
          </AnimatePresence>
        </TabsContent>

        <TabsContent value="compare" className="mt-6">
          <MultiClientComparison />
        </TabsContent>

        <TabsContent value="benchmark" className="mt-6">
          <CohortBenchmarkView />
        </TabsContent>
      </Tabs>

      <QuickLogDialog
        open={showQuickLog}
        onOpenChange={(open) => { setShowQuickLog(open); if (!open) setQuickLogClientId(null); }}
        clientId={quickLogClientId || selectedClientId}
      />
    </div>
  );
}
