import { useRef } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Printer, Download, Receipt } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import jsPDF from 'jspdf';

export interface ReceiptData {
  id: string;
  createdAt: string;
  clientName?: string | null;
  paymentMethod: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  totalAmount: number;
  totalDiscount?: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Hotově',
  card: 'Kartou',
  credit: 'Kredit',
  bank: 'Převodem',
};

interface ReceiptDialogProps {
  data: ReceiptData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ data, open, onOpenChange }: ReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;
    const win = window.open('', '_blank', 'width=380,height=600');
    if (!win) return;
    win.document.write(`
      <html><head><title>Paragon</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 12px; padding: 10px; max-width: 300px; margin: 0 auto; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .line { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; }
        .total { font-size: 16px; font-weight: bold; }
        @media print { body { padding: 0; } }
      </style></head><body>
        ${printContent.innerHTML}
      </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  const handlePDF = () => {
    const doc = new jsPDF({ unit: 'mm', format: [80, 150] });
    const x = 5;
    let y = 10;
    const lineH = 4.5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('POTVRZENÍ O NÁKUPU', 40, y, { align: 'center' });
    y += lineH * 2;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(format(new Date(data.createdAt), "d. M. yyyy HH:mm"), 40, y, { align: 'center' });
    y += lineH;
    if (data.clientName) {
      doc.text(`Klient: ${data.clientName}`, 40, y, { align: 'center' });
      y += lineH;
    }
    doc.text(`Platba: ${PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}`, 40, y, { align: 'center' });
    y += lineH * 1.5;

    doc.setDrawColor(0);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(x, y, 75, y);
    y += lineH;

    data.items.forEach(item => {
      doc.text(`${item.quantity}x ${item.name}`, x, y);
      doc.text(formatCurrency(item.lineTotal, true, 0), 75, y, { align: 'right' });
      y += lineH;
    });

    y += lineH * 0.5;
    doc.line(x, y, 75, y);
    y += lineH;

    if (data.totalDiscount && data.totalDiscount > 0) {
      doc.text('Sleva:', x, y);
      doc.text(`-${formatCurrency(data.totalDiscount)}`, 75, y, { align: 'right' });
      y += lineH;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CELKEM:', x, y);
    doc.text(formatCurrency(data.totalAmount), 75, y, { align: 'right' });

    doc.save(`paragon-${data.id.slice(0, 8)}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Paragon
          </DialogTitle>
        </DialogHeader>

        {/* Receipt preview */}
        <div
          ref={receiptRef}
          className="bg-card rounded-lg p-4 border border-border/50 font-mono text-sm space-y-3"
        >
          <div className="center text-center">
            <p className="bold font-bold text-base">POTVRZENÍ O NÁKUPU</p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(data.createdAt), "d. MMMM yyyy 'v' HH:mm", { locale: cs })}
            </p>
            {data.clientName && (
              <p className="text-xs mt-0.5">Klient: {data.clientName}</p>
            )}
            <p className="text-xs">Platba: {PAYMENT_LABELS[data.paymentMethod] || data.paymentMethod}</p>
          </div>

          <Separator className="border-dashed" />

          <div className="space-y-1">
            {data.items.map((item, i) => (
              <div key={i} className="row flex justify-between text-xs">
                <span>{item.quantity}× {item.name}</span>
                <span className="tabular-nums">{formatCurrency(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          <Separator className="border-dashed" />

          {data.totalDiscount && data.totalDiscount > 0 && (
            <div className="row flex justify-between text-xs text-destructive">
              <span>Sleva</span>
              <span>-{formatCurrency(data.totalDiscount)}</span>
            </div>
          )}

          <div className="row flex justify-between total text-base font-bold">
            <span>CELKEM</span>
            <span className="tabular-nums">{formatCurrency(data.totalAmount)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            Tisknout
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={handlePDF}>
            <Download className="w-4 h-4" />
            PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
