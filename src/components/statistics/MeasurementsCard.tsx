import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ruler, Camera, Mic, ClipboardCheck } from 'lucide-react';
import { AnnualStatsData } from '@/hooks/useAnnualStats';

interface MeasurementsCardProps {
  stats?: AnnualStatsData | null;
}

export function MeasurementsCard({ stats }: MeasurementsCardProps) {
  const measurements = stats?.totalMeasurements || 0;
  const diagnostics = stats?.totalDiagnostics || 0;
  const photos = stats?.totalPhotos || 0;
  const voiceNotes = stats?.totalVoiceNotes || 0;

  const total = measurements + diagnostics + photos + voiceNotes;

  const items = [
    { label: 'Měření', value: measurements, icon: Ruler, color: 'text-accent' },
    { label: 'Diagnostiky', value: diagnostics, icon: ClipboardCheck, color: 'text-success' },
    { label: 'Fotografie', value: photos, icon: Camera, color: 'text-primary' },
    { label: 'Hlasové záznamy', value: voiceNotes, icon: Mic, color: 'text-warning' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Ruler className="h-4 w-4 text-primary" />
          Měření a diagnostika
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádná data
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${item.color}`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
