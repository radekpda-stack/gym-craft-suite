import { useState } from "react";
import { Client } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet, File } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { format as formatDate } from "date-fns";
import { cs } from "date-fns/locale";
import * as XLSX from "xlsx";
import { featureTracker } from "@/hooks/useFeatureTracking";

interface ClientExportDialogProps {
  clients: Client[];
  genderFilter: 'all' | 'male' | 'female';
}

type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export function ClientExportDialog({ clients, genderFilter }: ClientExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<ExportFormat>('csv');

  const getFilteredClients = () => {
    if (genderFilter === 'all') return clients;
    return clients.filter(c => c.gender === genderFilter);
  };

  const formatGender = (gender: string | null) => {
    if (gender === 'male') return 'Muž';
    if (gender === 'female') return 'Žena';
    return 'Neuvedeno';
  };

  const prepareExportData = () => {
    const filtered = getFilteredClients();
    return filtered.map(client => ({
      'Jméno': client.name,
      'Pohlaví': formatGender(client.gender),
      'Email': client.email || '',
      'Telefon': client.phone || '',
      'Datum založení': formatDate(new Date(client.created_at), 'd.M.yyyy', { locale: cs }),
    }));
  };

  const exportCSV = () => {
    const data = prepareExportData();
    if (data.length === 0) {
      toast({ title: "Žádní klienti k exportu", variant: "destructive" });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(';'),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `klienti_${genderFilter}_${formatDate(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    featureTracker.track('client_export', 'export', { format: 'csv', count: data.length });
    toast({ title: "Export dokončen", description: `${data.length} klientů exportováno` });
    setOpen(false);
  };

  const exportXLSX = () => {
    const data = prepareExportData();
    if (data.length === 0) {
      toast({ title: "Žádní klienti k exportu", variant: "destructive" });
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Klienti');
    XLSX.writeFile(workbook, `klienti_${genderFilter}_${formatDate(new Date(), 'yyyy-MM-dd')}.xlsx`);

    featureTracker.track('client_export', 'export', { format: 'xlsx', count: data.length });
    toast({ title: "Export dokončen", description: `${data.length} klientů exportováno` });
    setOpen(false);
  };

  const handleExport = () => {
    switch (format) {
      case 'csv':
        exportCSV();
        break;
      case 'xlsx':
        exportXLSX();
        break;
      case 'pdf':
        toast({ title: "PDF export", description: "PDF export není momentálně podporován" });
        break;
    }
  };

  const filteredCount = getFilteredClients().length;
  const filterLabel = genderFilter === 'all' ? 'všichni' : genderFilter === 'male' ? 'muži' : 'ženy';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export klientů
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export klientů</DialogTitle>
          <DialogDescription>
            {filteredCount} klientů ({filterLabel}) bude exportováno
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer">
              <RadioGroupItem value="csv" id="format-csv" />
              <Label htmlFor="format-csv" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileText className="w-4 h-4 text-muted-foreground" />
                CSV
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer">
              <RadioGroupItem value="xlsx" id="format-xlsx" />
              <Label htmlFor="format-xlsx" className="flex items-center gap-2 cursor-pointer flex-1">
                <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                Excel (XLSX)
              </Label>
            </div>
            <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-secondary/50 cursor-pointer opacity-50">
              <RadioGroupItem value="pdf" id="format-pdf" disabled />
              <Label htmlFor="format-pdf" className="flex items-center gap-2 cursor-pointer flex-1">
                <File className="w-4 h-4 text-muted-foreground" />
                PDF (připravujeme)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={handleExport} className="w-full gap-2">
          <Download className="w-4 h-4" />
          Exportovat
        </Button>
      </DialogContent>
    </Dialog>
  );
}