import { useMemo } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { RecordItem, MeasurementRecordItem, DiagnosticRecordItem } from '@/hooks/useRecordsFeed';
import { MeasurementCard } from './MeasurementCard';
import { DiagnosticCard } from './DiagnosticCard';
import { Client } from '@/hooks/useClients';
import { Measurement } from '@/hooks/useMeasurements';
import { Skeleton } from '@/components/ui/skeleton';
import { FileX2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RecordsFeedProps {
  groupedRecords: Record<string, RecordItem[]>;
  sortedDays: string[];
  clients: Client[];
  measurements: Measurement[];
  isLoading: boolean;
  onCreateRecord?: () => void;
}

function formatDayHeader(dateStr: string): string {
  const date = parseISO(dateStr);
  
  if (isToday(date)) {
    return 'Dnes';
  }
  if (isYesterday(date)) {
    return 'Včera';
  }
  
  return format(date, 'EEEE, d. MMMM', { locale: cs });
}

function EmptyState({ onCreateRecord }: { onCreateRecord?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <FileX2 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Žádné záznamy
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Pro vybrané období a filtry nebyly nalezeny žádné záznamy. 
        Zkuste změnit období nebo typ záznamu.
      </p>
      {onCreateRecord && (
        <Button onClick={onCreateRecord} className="gap-2">
          <Plus className="w-4 h-4" />
          Přidat záznam
        </Button>
      )}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((i) => (
        <div key={i}>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecordsFeed({
  groupedRecords,
  sortedDays,
  clients,
  measurements,
  isLoading,
  onCreateRecord,
}: RecordsFeedProps) {
  // Create client lookup map
  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);
  
  // Create measurement lookup for previous measurement calculation
  const measurementsByClient = useMemo(() => {
    const map = new Map<string, Measurement[]>();
    measurements.forEach(m => {
      const list = map.get(m.client_id) || [];
      list.push(m);
      map.set(m.client_id, list);
    });
    // Sort each list by date
    map.forEach((list) => {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
    return map;
  }, [measurements]);
  
  const getPreviousMeasurement = (measurement: Measurement): Measurement | null => {
    const clientMeasurements = measurementsByClient.get(measurement.client_id) || [];
    const currentIndex = clientMeasurements.findIndex(m => m.id === measurement.id);
    if (currentIndex >= 0 && currentIndex < clientMeasurements.length - 1) {
      return clientMeasurements[currentIndex + 1];
    }
    return null;
  };
  
  if (isLoading) {
    return <FeedSkeleton />;
  }
  
  if (sortedDays.length === 0) {
    return <EmptyState onCreateRecord={onCreateRecord} />;
  }
  
  return (
    <div className="space-y-6">
      {sortedDays.map((dayKey) => (
        <div key={dayKey}>
          {/* Day header */}
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 first-letter:capitalize">
            {formatDayHeader(dayKey)}
          </h3>
          
          {/* Records for this day */}
          <div className="space-y-3">
            {groupedRecords[dayKey].map((record) => {
              const client = clientMap.get(record.clientId) || null;
              
              switch (record.type) {
                case 'measurement':
                  return (
                    <MeasurementCard
                      key={record.id}
                      measurement={(record as MeasurementRecordItem).data}
                      client={client}
                      previousMeasurement={getPreviousMeasurement((record as MeasurementRecordItem).data)}
                    />
                  );
                
                case 'diagnostic':
                  return (
                    <DiagnosticCard
                      key={record.id}
                      diagnostic={(record as DiagnosticRecordItem).data}
                      client={client}
                      hasAIAnalysis={false}
                    />
                  );
                
                default:
                  return null;
              }
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
