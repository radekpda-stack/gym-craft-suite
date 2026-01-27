import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useCreateProduct, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useCreateExpense } from '@/hooks/useBusinessExpenses';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface ParsedInvoiceItem {
  id: string; // local ID for UI
  name: string;
  quantity: number;
  purchasePrice: number | null;
  suggestedSellPrice: number | null;
  suggestedCategory: string;
  matchedProductId: string | null;
  matchedProductName: string | null;
  matchedProduct?: Product;
  confidence: number;
  selected: boolean;
  skuCode: string | null;
  // User-editable fields
  editedQuantity: number;
  editedPurchasePrice: number;
  editedSellPrice: number;
  editedCategory: string;
}

export interface ParsedInvoice {
  supplier: string | null;
  invoiceNumber: string | null;
  date: string | null;
  totalAmount: number | null;
}

export interface InvoiceImportState {
  status: 'idle' | 'uploading' | 'parsing' | 'ready' | 'importing' | 'error';
  error: string | null;
  invoice: ParsedInvoice | null;
  items: ParsedInvoiceItem[];
  fileName: string | null;
  saveSkuCodes: boolean;
}

export function useInvoiceImport() {
  const { data: products = [] } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const createExpense = useCreateExpense();

  const [state, setState] = useState<InvoiceImportState>({
    status: 'idle',
    error: null,
    invoice: null,
    items: [],
    fileName: null,
    saveSkuCodes: true,
  });

  const reset = () => {
    setState({
      status: 'idle',
      error: null,
      invoice: null,
      items: [],
      fileName: null,
      saveSkuCodes: true,
    });
  };

  const setSaveSkuCodes = (save: boolean) => {
    setState(prev => ({ ...prev, saveSkuCodes: save }));
  };

  const parseInvoice = async (file: File) => {
    setState(prev => ({ ...prev, status: 'uploading', error: null, fileName: file.name }));

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      
      setState(prev => ({ ...prev, status: 'parsing' }));

      // Prepare existing products for matching - include SKU codes
      const existingProducts = products
        .filter(p => p.is_active && p.kind === 'inventory')
        .map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          purchase_price: p.purchase_price,
          price: p.price,
          sku_code: (p as any).sku_code || null,
        }));

      // Call edge function
      const { data, error } = await supabase.functions.invoke('parse-invoice', {
        body: {
          fileBase64: base64,
          mimeType: file.type,
          existingProducts,
        },
      });

      if (error) {
        throw new Error(error.message || 'Chyba při volání AI služby');
      }

      if (!data.success) {
        throw new Error(data.error || 'Nepodařilo se zpracovat fakturu');
      }

      // Enhance items with local IDs and product references
      const enhancedItems: ParsedInvoiceItem[] = (data.items || []).map((item: any, index: number) => {
        const matchedProduct = item.matchedProductId 
          ? products.find(p => p.id === item.matchedProductId)
          : null;

        const purchasePrice = item.purchasePrice || 0;

        return {
          id: `item-${index}-${Date.now()}`,
          name: item.name,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          suggestedSellPrice: item.suggestedSellPrice,
          suggestedCategory: item.suggestedCategory || 'other',
          matchedProductId: item.matchedProductId,
          matchedProductName: item.matchedProductName,
          matchedProduct,
          confidence: item.confidence,
          skuCode: item.skuCode || null,
          selected: true,
          // Editable fields
          editedQuantity: item.quantity,
          editedPurchasePrice: purchasePrice,
          editedSellPrice: item.suggestedSellPrice || (purchasePrice ? Math.round(purchasePrice * 2) : 0),
          editedCategory: item.suggestedCategory || 'other',
        };
      });

      setState({
        status: 'ready',
        error: null,
        invoice: data.invoice || null,
        items: enhancedItems,
        fileName: file.name,
        saveSkuCodes: true,
      });

      toast({
        title: 'Faktura zpracována',
        description: `Rozpoznáno ${enhancedItems.length} produktů`,
      });

    } catch (error) {
      console.error('Invoice parse error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepodařilo se zpracovat fakturu';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      toast({
        title: 'Chyba zpracování',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, selected: !item.selected } : item
      ),
    }));
  };

  const toggleAllItems = (selected: boolean) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, selected })),
    }));
  };

  const updateItem = (itemId: string, updates: Partial<ParsedInvoiceItem>) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId ? { ...item, ...updates } : item
      ),
    }));
  };

  const importItems = async (createExpenseRecord: boolean) => {
    const selectedItems = state.items.filter(item => item.selected);
    if (selectedItems.length === 0) {
      toast({
        title: 'Žádné položky',
        description: 'Vyberte alespoň jednu položku k naskladnění',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, status: 'importing' }));

    try {
      let newProductsCount = 0;
      let updatedProductsCount = 0;
      let totalCost = 0;

      for (const item of selectedItems) {
        const itemTotalCost = item.editedPurchasePrice * item.editedQuantity;
        totalCost += itemTotalCost;

        if (item.matchedProductId && item.matchedProduct) {
          // Update existing product stock
          const updateData: any = {
            id: item.matchedProductId,
            stock_quantity: (item.matchedProduct.stock_quantity || 0) + item.editedQuantity,
            purchase_price: item.editedPurchasePrice,
          };

          // Optionally update SKU code if it's new and we have one
          if (state.saveSkuCodes && item.skuCode && !(item.matchedProduct as any).sku_code) {
            updateData.sku_code = item.skuCode;
          }

          await updateProduct.mutateAsync(updateData);
          updatedProductsCount++;
        } else {
          // Create new product
          const createData: any = {
            name: item.name,
            price: item.editedSellPrice,
            purchase_price: item.editedPurchasePrice,
            category: item.editedCategory,
            kind: 'inventory',
            stock_quantity: item.editedQuantity,
            low_stock_threshold: 5,
          };

          // Add SKU code if saving is enabled and we have one
          if (state.saveSkuCodes && item.skuCode) {
            createData.sku_code = item.skuCode;
          }

          await createProduct.mutateAsync(createData);
          newProductsCount++;
        }
      }

      // Create expense record if requested
      if (createExpenseRecord && totalCost > 0) {
        const itemDescriptions = selectedItems
          .map(i => `${i.name} (${i.editedQuantity}x)`)
          .join(', ');

        await createExpense.mutateAsync({
          name: state.invoice?.invoiceNumber 
            ? `Import faktury: ${state.invoice.invoiceNumber}`
            : `Import faktury: ${selectedItems.length} položek`,
          description: itemDescriptions,
          amount: totalCost,
          date: state.invoice?.date || format(new Date(), 'yyyy-MM-dd'),
          category: 'inventory',
        });
      }

      toast({
        title: 'Import dokončen',
        description: `Naskladněno: ${newProductsCount} nových, ${updatedProductsCount} aktualizovaných produktů${createExpenseRecord ? `. Náklad: ${totalCost} Kč` : ''}`,
      });

      reset();
      return true;

    } catch (error) {
      console.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Nepodařilo se importovat položky';
      setState(prev => ({ ...prev, status: 'error', error: errorMessage }));
      toast({
        title: 'Chyba importu',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    }
  };

  // Computed values
  const selectedItems = state.items.filter(item => item.selected);
  const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.editedQuantity, 0);
  const totalPurchaseCost = selectedItems.reduce((sum, item) => sum + (item.editedPurchasePrice * item.editedQuantity), 0);
  const newProductsCount = selectedItems.filter(item => !item.matchedProductId).length;
  const existingProductsCount = selectedItems.filter(item => item.matchedProductId).length;

  return {
    state,
    parseInvoice,
    toggleItemSelection,
    toggleAllItems,
    updateItem,
    importItems,
    reset,
    setSaveSkuCodes,
    // Computed
    selectedItems,
    totalSelectedQuantity,
    totalPurchaseCost,
    newProductsCount,
    existingProductsCount,
  };
}

// Helper to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
