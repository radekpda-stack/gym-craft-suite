import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

interface ModuleConversionData {
  module: string;
  label: string;
  views: number;
  actions: number;
  conversionRate: number;
}

interface ModuleConversionTableProps {
  data: ModuleConversionData[];
}

function getConversionBadge(rate: number) {
  if (rate >= 50) {
    return (
      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        {rate}%
      </Badge>
    );
  }
  if (rate >= 30) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-800">
        {rate}%
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-800">
      <AlertTriangle className="w-3 h-3 mr-1" />
      {rate}%
    </Badge>
  );
}

export function ModuleConversionTable({ data }: ModuleConversionTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Efektivita modulů</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground">
          Žádná data k zobrazení
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          Efektivita modulů
          <span className="text-xs font-normal text-muted-foreground">
            (otevření → akce)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Modul</TableHead>
              <TableHead className="text-right">Otevření</TableHead>
              <TableHead className="text-center w-10"></TableHead>
              <TableHead className="text-right">Akce</TableHead>
              <TableHead className="text-right">Konverze</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.module}>
                <TableCell className="font-medium">{row.label}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.views.toLocaleString('cs-CZ')}
                </TableCell>
                <TableCell className="text-center">
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50" />
                </TableCell>
                <TableCell className="text-right">
                  {row.actions.toLocaleString('cs-CZ')}
                </TableCell>
                <TableCell className="text-right">
                  {getConversionBadge(row.conversionRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="text-xs text-muted-foreground mt-4">
          Konverze = poměr akcí (vytvoření/úprava/mazání) k zobrazením modulu
        </p>
      </CardContent>
    </Card>
  );
}
