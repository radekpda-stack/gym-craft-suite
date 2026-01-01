import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import type { TestSession } from '@/types/tests';
import { formatDuration, cn } from '@/lib/utils';

interface TestHistoryTableProps {
  sessions: TestSession[];
  isLoading?: boolean;
  showInvalid?: boolean;
  onRowClick?: (session: TestSession) => void;
}

export function TestHistoryTable({ sessions, isLoading, showInvalid, onRowClick }: TestHistoryTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Žádné záznamy
      </div>
    );
  }

  // Get primary metric key from first session's definition
  const primaryKey = sessions[0]?.test_definitions?.primary_metric_key;

  const formatValue = (value: unknown, key?: string) => {
    if (value == null) return '-';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    if (key?.includes('time') || key === 'time_s') return formatDuration(num);
    if (key?.includes('pace')) return formatDuration(num);
    if (key?.includes('pct') || key?.includes('drift')) return `${num.toFixed(1)}%`;
    return num.toFixed(2);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>Test</TableHead>
            <TableHead className="text-right">Výsledek</TableHead>
            <TableHead className="text-center">Validita</TableHead>
            <TableHead className="text-center">Comparable</TableHead>
            <TableHead>RPE</TableHead>
            <TableHead className="hidden md:table-cell">Poznámka</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map(session => {
            const key = session.test_definitions?.primary_metric_key || primaryKey;
            const value = session.metrics_json[key as string];
            
            return (
              <TableRow
                key={session.id}
                className={cn(
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  !session.is_valid && 'opacity-60',
                  !session.is_comparable && !session.is_valid && 'bg-muted/30'
                )}
                onClick={() => onRowClick?.(session)}
              >
                <TableCell className="font-medium">
                  {new Date(session.date_time).toLocaleDateString('cs-CZ')}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {session.test_definitions?.name_cs || session.test_definitions?.name || '-'}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatValue(value, key)}
                </TableCell>
                <TableCell className="text-center">
                  {session.is_valid ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive inline" />
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {session.is_comparable ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500 inline" />
                  )}
                </TableCell>
                <TableCell>
                  {session.rpe_1_10 ? (
                    <Badge variant="outline">{session.rpe_1_10}</Badge>
                  ) : '-'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-[200px] truncate">
                  {session.notes || session.non_comparable_reason || '-'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
