import { useState, useCallback } from 'react';
import { FileText, Upload, Loader2, CheckCircle, AlertTriangle, Package, Receipt, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useInvoiceImport } from '@/hooks/useInvoiceImport';
import { InvoiceItemRow } from './InvoiceItemRow';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface InvoiceImportDialogProps {
  trigger?: React.ReactNode;
}

export function InvoiceImportDialog({ trigger }: InvoiceImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [createExpense, setCreateExpense] = useState(true);
  const [dragActive, setDragActive] = useState(false);

  const {
    state,
    parseInvoice,
    toggleItemSelection,
    toggleAllItems,
    updateItem,
    importItems,
    reset,
    setSaveSkuCodes,
    selectedItems,
    totalSelectedQuantity,
    totalPurchaseCost,
    newProductsCount,
    existingProductsCount,
  } = useInvoiceImport();

  const handleClose = () => {
    setOpen(false);
    // Reset after animation
    setTimeout(reset, 300);
  };

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseInvoice(file);
    }
  }, [parseInvoice]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      parseInvoice(file);
    }
  }, [parseInvoice]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  }, []);

  const handleImport = async () => {
    const success = await importItems(createExpense);
    if (success) {
      handleClose();
    }
  };

  const allItemsSelected = state.items.length > 0 && state.items.every(i => i.selected);
  const someItemsSelected = state.items.some(i => i.selected);

  // Check if any items have SKU codes
  const hasSkuCodes = state.items.some(i => i.skuCode);

  return (
    <Dialog open={open} onOpenChange={(o) => o ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Import faktury</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import faktury
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Upload area - shown when idle or error */}
          {(state.status === 'idle' || state.status === 'error') && (
            <div 
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center transition-colors",
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50 hover:bg-secondary/30",
                state.status === 'error' && "border-destructive/50"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
                id="invoice-upload"
              />
              <label htmlFor="invoice-upload" className="cursor-pointer block">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm font-medium mb-1">
                  Přetáhněte fakturu sem nebo klikněte pro výběr
                </p>
                <p className="text-xs text-muted-foreground">
                  Podporované formáty: PDF, JPG, PNG
                </p>
              </label>
              
              {state.status === 'error' && state.error && (
                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{state.error}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state */}
          {(state.status === 'uploading' || state.status === 'parsing') && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-sm font-medium">
                {state.status === 'uploading' ? 'Nahrávám soubor...' : 'AI analyzuje fakturu...'}
              </p>
              {state.fileName && (
                <p className="text-xs text-muted-foreground mt-1">{state.fileName}</p>
              )}
            </div>
          )}

          {/* Results */}
          {(state.status === 'ready' || state.status === 'importing') && (
            <>
              {/* Invoice info */}
              {state.invoice && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">
                      Rozpoznáno {state.items.length} produktů
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                    {state.invoice.supplier && (
                      <div>
                        <span className="block font-medium text-foreground">Dodavatel</span>
                        {state.invoice.supplier}
                      </div>
                    )}
                    {state.invoice.invoiceNumber && (
                      <div>
                        <span className="block font-medium text-foreground">Č. faktury</span>
                        {state.invoice.invoiceNumber}
                      </div>
                    )}
                    {state.invoice.date && (
                      <div>
                        <span className="block font-medium text-foreground">Datum</span>
                        {state.invoice.date}
                      </div>
                    )}
                    {state.invoice.totalAmount && (
                      <div>
                        <span className="block font-medium text-foreground">Celkem</span>
                        {formatCurrency(state.invoice.totalAmount)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Select all */}
              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  checked={allItemsSelected}
                  onCheckedChange={(checked) => toggleAllItems(!!checked)}
                  className="data-[state=indeterminate]:bg-primary/50"
                  {...(someItemsSelected && !allItemsSelected ? { "data-state": "indeterminate" } : {})}
                />
                <Label className="text-sm cursor-pointer" onClick={() => toggleAllItems(!allItemsSelected)}>
                  Vybrat vše ({state.items.length} produktů)
                </Label>
              </div>

              {/* Items list */}
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-2 pb-4">
                  {state.items.map((item) => (
                    <InvoiceItemRow
                      key={item.id}
                      item={item}
                      onToggleSelection={() => toggleItemSelection(item.id)}
                      onUpdate={(updates) => updateItem(item.id, updates)}
                    />
                  ))}
                </div>
              </ScrollArea>

              {/* Summary */}
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    K naskladnění: <span className="font-medium text-foreground">{totalSelectedQuantity} ks</span>
                    {' '}({newProductsCount} nových, {existingProductsCount} existujících)
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(totalPurchaseCost)}
                  </span>
                </div>

                {/* Create expense option */}
                <div 
                  className={cn(
                    "p-3 rounded-lg border transition-colors cursor-pointer",
                    createExpense 
                      ? "bg-primary/10 border-primary/30" 
                      : "bg-secondary/30 border-border/50"
                  )}
                  onClick={() => setCreateExpense(!createExpense)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={createExpense}
                      onCheckedChange={(checked) => setCreateExpense(!!checked)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Přidat jako náklad</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Náklad {formatCurrency(totalPurchaseCost)} bude zaznamenán do kategorie "Nákup zboží"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Save SKU codes option - only show if items have SKU codes */}
                {hasSkuCodes && newProductsCount > 0 && (
                  <div 
                    className={cn(
                      "p-3 rounded-lg border transition-colors cursor-pointer",
                      state.saveSkuCodes 
                        ? "bg-primary/10 border-primary/30" 
                        : "bg-secondary/30 border-border/50"
                    )}
                    onClick={() => setSaveSkuCodes(!state.saveSkuCodes)}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={state.saveSkuCodes}
                        onCheckedChange={(checked) => setSaveSkuCodes(!!checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Uložit SKU kódy</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          SKU kódy budou uloženy k produktům pro automatické mapování v budoucnu
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <Button variant="outline" onClick={handleClose} disabled={state.status === 'importing'}>
                    Zrušit
                  </Button>
                  <Button 
                    onClick={handleImport}
                    disabled={selectedItems.length === 0 || state.status === 'importing'}
                    className="gap-2"
                  >
                    {state.status === 'importing' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Importuji...
                      </>
                    ) : (
                      <>
                        <Package className="w-4 h-4" />
                        Naskladnit {selectedItems.length} položek
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
