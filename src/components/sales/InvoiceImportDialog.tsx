import { useState, useCallback, useEffect } from 'react';
import { FileText, Upload, Loader2, CheckCircle, AlertTriangle, Package, Receipt, Hash, RotateCcw, Check, ArrowRight, ArrowLeft } from 'lucide-react';
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

type WizardStep = 1 | 2 | 3;

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 1, label: 'Nahrání' },
  { id: 2, label: 'Mapování' },
  { id: 3, label: 'Náhled' },
];

function StepIndicator({ current }: { current: WizardStep }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0 mb-4" aria-label="Průběh importu faktury">
      {STEPS.map((step, idx) => {
        const isDone = step.id < current;
        const isCurrent = step.id === current;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0 last:flex-none">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors duration-200',
                  isDone
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary/15 text-primary border-2 border-primary'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : step.id}
              </div>
              <span
                className={cn(
                  'text-xs font-medium truncate hidden sm:inline',
                  isCurrent ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 rounded-full transition-colors duration-200',
                  isDone ? 'bg-primary' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function InvoiceImportDialog({ trigger }: InvoiceImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [createExpense, setCreateExpense] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);

  const {
    state,
    products,
    parseInvoice,
    toggleItemSelection,
    toggleAllItems,
    updateItem,
    changeMatchedProduct,
    importItems,
    retryFailedItems,
    reset,
    setSaveSkuCodes,
    selectedItems,
    totalSelectedQuantity,
    totalPurchaseCost,
    newProductsCount,
    existingProductsCount,
  } = useInvoiceImport();

  // Advance to mapping step automatically once parsing succeeds
  useEffect(() => {
    if (state.status === 'ready' && wizardStep === 1) {
      setWizardStep(2);
    }
    if ((state.status === 'idle' || state.status === 'error') && wizardStep !== 1) {
      setWizardStep(1);
    }
    if (state.status === 'partial_success' && wizardStep !== 3) {
      setWizardStep(3);
    }
  }, [state.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      reset();
      setWizardStep(1);
    }, 300);
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
    // If not success, dialog stays open (partial_success state)
  };

  const handleRetry = async () => {
    const success = await retryFailedItems(createExpense);
    if (success) {
      handleClose();
    }
  };

  const allItemsSelected = state.items.length > 0 && state.items.every(i => i.selected);
  const someItemsSelected = state.items.some(i => i.selected);
  const hasSkuCodes = state.items.some(i => i.skuCode);
  const uncertainMatchCount = state.items.filter(i => i.matchedProductId && i.confidence < 0.8).length;
  const isPartialSuccess = state.status === 'partial_success';
  const failedCount = state.failedItems.length;
  const isBusyLoading = state.status === 'uploading' || state.status === 'parsing';

  // Stock diff info for the preview step (only for matched, selected items with known stock)
  const stockDiffs = selectedItems
    .filter(i => i.matchedProduct)
    .map(i => ({
      id: i.id,
      name: i.name,
      before: i.matchedProduct!.stock_quantity,
      after: i.matchedProduct!.stock_quantity + i.editedQuantity,
    }));

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

      <DialogContent className="max-w-2xl max-h-[85vh] !flex !flex-col !overflow-hidden p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Import faktury
          </DialogTitle>
        </DialogHeader>

        <StepIndicator current={wizardStep} />

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* STEP 1: Upload */}
          {wizardStep === 1 && (
            <div className="flex flex-col h-full">
              {!isBusyLoading && (
                <div
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-10 text-center transition-colors duration-200',
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50 hover:bg-secondary/30',
                    state.status === 'error' && 'border-destructive/50'
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
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <p className="text-sm font-medium mb-1">
                      Přetáhněte fakturu sem nebo klikněte pro výběr
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Podporované formáty: PDF, JPG, PNG (max 5 MB)
                    </p>
                  </label>

                  {state.status === 'error' && state.error && (
                    <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-sm">{state.error}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isBusyLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-sm font-medium">
                    {state.status === 'uploading' ? 'Nahrávám soubor...' : 'AI analyzuje fakturu a páruje produkty...'}
                  </p>
                  {state.fileName && (
                    <p className="text-xs text-muted-foreground mt-1 truncate max-w-full">{state.fileName}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Mapping */}
          {wizardStep === 2 && (state.status === 'ready' || state.status === 'importing') && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              {/* Invoice info */}
              {state.invoice && (
                <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2 text-sm min-w-0">
                    <CheckCircle className="w-4 h-4 text-success shrink-0" />
                    <span className="font-medium truncate">
                      Rozpoznáno {state.items.length} produktů
                    </span>
                    {uncertainMatchCount > 0 && (
                      <span className="text-warning text-xs shrink-0">
                        ({uncertainMatchCount} k ověření)
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs text-muted-foreground">
                    {state.invoice.supplier && (
                      <div className="min-w-0">
                        <span className="block font-medium text-foreground">Dodavatel</span>
                        <span className="truncate block">{state.invoice.supplier}</span>
                      </div>
                    )}
                    {state.invoice.invoiceNumber && (
                      <div className="min-w-0">
                        <span className="block font-medium text-foreground">Č. faktury</span>
                        <span className="truncate block">{state.invoice.invoiceNumber}</span>
                      </div>
                    )}
                    {state.invoice.date && (
                      <div className="min-w-0">
                        <span className="block font-medium text-foreground">Datum</span>
                        {state.invoice.date}
                      </div>
                    )}
                    {state.invoice.totalAmount && (
                      <div className="min-w-0">
                        <span className="block font-medium text-foreground">Celkem</span>
                        {formatCurrency(state.invoice.totalAmount)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Select all */}
              <div className="flex items-center gap-2 mb-3 flex-shrink-0">
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
              <div className="flex-1 min-h-0 -mx-4 sm:-mx-6 overflow-hidden">
                <ScrollArea className="h-full px-4 sm:px-6">
                  <div className="space-y-2 pb-4">
                    {state.items.map((item) => (
                      <InvoiceItemRow
                        key={item.id}
                        item={item}
                        products={products}
                        onToggleSelection={() => toggleItemSelection(item.id)}
                        onUpdate={(updates) => updateItem(item.id, updates)}
                        onChangeMatch={(productId) => changeMatchedProduct(item.id, productId)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Step navigation */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border flex-shrink-0">
                <Button variant="outline" onClick={handleClose}>Zrušit</Button>
                <Button
                  onClick={() => setWizardStep(3)}
                  disabled={selectedItems.length === 0}
                  className="gap-2"
                >
                  Pokračovat k náhledu
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview & confirm */}
          {wizardStep === 3 && (state.status === 'ready' || state.status === 'importing' || state.status === 'partial_success') && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <ScrollArea className="flex-1 min-h-0 -mx-4 sm:-mx-6">
                <div className="px-4 sm:px-6 space-y-3 pb-2">
                  {/* Partial success banner */}
                  {isPartialSuccess && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        <span className="text-sm font-medium">
                          {failedCount} {failedCount === 1 ? 'položka selhala' : failedCount < 5 ? 'položky selhaly' : 'položek selhalo'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Neúspěšné položky jsou označeny červeně. Můžete je zkusit importovat znovu.
                      </p>
                    </div>
                  )}

                  {/* Summary strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="section-card p-2.5 min-w-0">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate block">Položek</span>
                      <p className="text-base sm:text-lg font-bold tabular-nums">{selectedItems.length}</p>
                    </div>
                    <div className="section-card p-2.5 min-w-0">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate block">Kusů celkem</span>
                      <p className="text-base sm:text-lg font-bold tabular-nums">{totalSelectedQuantity} ks</p>
                    </div>
                    <div className="section-card p-2.5 min-w-0 col-span-2 sm:col-span-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground truncate block">Celková cena</span>
                      <p className="text-base sm:text-lg font-bold tabular-nums">{formatCurrency(totalPurchaseCost)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {newProductsCount} nových produktů, {existingProductsCount} existujících
                  </p>

                  {/* Stock diff preview */}
                  {stockDiffs.length > 0 && (
                    <div className="section-card p-3">
                      <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        Změna skladových zásob
                      </p>
                      <div className="space-y-1.5">
                        {stockDiffs.map((d) => (
                          <div key={d.id} className="flex items-center justify-between gap-2 text-xs min-w-0">
                            <span className="truncate min-w-0 flex-1">{d.name}</span>
                            <span className="flex items-center gap-1.5 shrink-0 tabular-nums">
                              <span className="text-muted-foreground">{d.before}</span>
                              <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              <span className="font-semibold text-success">{d.after}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Create expense option */}
                  {!isPartialSuccess && (
                    <div
                      className={cn(
                        'p-3 rounded-lg border transition-colors cursor-pointer',
                        createExpense
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-secondary/30 border-border/50'
                      )}
                      onClick={() => setCreateExpense(!createExpense)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={createExpense}
                          onCheckedChange={(checked) => setCreateExpense(!!checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">Přidat jako náklad</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Náklad {formatCurrency(totalPurchaseCost)} bude zaznamenán do kategorie "Nákup zboží"
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save SKU codes option */}
                  {!isPartialSuccess && hasSkuCodes && newProductsCount > 0 && (
                    <div
                      className={cn(
                        'p-3 rounded-lg border transition-colors cursor-pointer',
                        state.saveSkuCodes
                          ? 'bg-primary/10 border-primary/30'
                          : 'bg-secondary/30 border-border/50'
                      )}
                      onClick={() => setSaveSkuCodes(!state.saveSkuCodes)}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={state.saveSkuCodes}
                          onCheckedChange={(checked) => setSaveSkuCodes(!!checked)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="text-sm font-medium">Uložit SKU kódy</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            SKU kódy budou uloženy k produktům pro automatické mapování v budoucnu
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Failed items detail in partial success */}
                  {isPartialSuccess && (
                    <div className="space-y-2">
                      {state.items.filter(i => i.selected).map((item) => (
                        <InvoiceItemRow
                          key={item.id}
                          item={item}
                          products={products}
                          onToggleSelection={() => toggleItemSelection(item.id)}
                          onUpdate={(updates) => updateItem(item.id, updates)}
                          onChangeMatch={(productId) => changeMatchedProduct(item.id, productId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border flex-shrink-0">
                {!isPartialSuccess && (
                  <Button variant="outline" onClick={() => setWizardStep(2)} disabled={state.status === 'importing'} className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Zpět
                  </Button>
                )}
                <Button variant="outline" onClick={handleClose} disabled={state.status === 'importing'}>
                  {isPartialSuccess ? 'Zavřít' : 'Zrušit'}
                </Button>
                {isPartialSuccess ? (
                  <Button
                    onClick={handleRetry}
                    disabled={selectedItems.length === 0}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Zkusit znovu ({selectedItems.length})
                  </Button>
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
