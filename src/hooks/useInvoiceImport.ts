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
  // New fields for enhanced invoice support
  skuCode: string | null;
  unitPriceNet: number | null;
  unitPriceGross: number | null;
  vatRate: number | null;
  isShipping: boolean;
  // User-editable fields
  editedQuantity: number;
  editedPurchasePrice: number;
  editedSellPrice: number;
  editedCategory: string;
}

export interface ParsedInvoice {
  supplier: string | null;
  supplierIco: string | null;
  invoiceNumber: string | null;
  variableSymbol: string | null;
  date: string | null;
  totalAmount: number | null;
  totalAmountNet: number | null;
}

export interface InvoiceImportState {
  status: 'idle' | 'uploading' | 'parsing' | 'ready' | 'importing' | 'error';
  error: string | null;
  invoice: ParsedInvoice | null;
  items: ParsedInvoiceItem[];
  fileName: string | null;
  useBruttoPrices: boolean; // true = use gross prices, false = use net prices
  saveSkuCodes: boolean; // whether to save SKU codes to new products
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
    useBruttoPrices: true,
    saveSkuCodes: true,
  });

  const reset = () => {
    setState({
      status: 'idle',
      error: null,
      invoice: null,
      items: [],
      fileName: null,
      useBruttoPrices: true,
      saveSkuCodes: true,
    });
  };

  const setUseBruttoPrices = (useBrutto: boolean) => {
    setState(prev => {
      // Recalculate purchase prices for all items based on the new setting
      const updatedItems = prev.items.map(item => {
        const newPurchasePrice = useBrutto 
          ? (item.unitPriceGross || item.purchasePrice || 0)
          : (item.unitPriceNet || item.purchasePrice || 0);
        return {
          ...item,
          editedPurchasePrice: newPurchasePrice,
        };
      });
      return {
        ...prev,
        useBruttoPrices: useBrutto,
        items: updatedItems,
      };
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

        // Use brutto price by default
        const purchasePrice = item.unitPriceGross || item.purchasePrice || 0;

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
          // New fields
          skuCode: item.skuCode || null,
          unitPriceNet: item.unitPriceNet || null,
          unitPriceGross: item.unitPriceGross || null,
          vatRate: item.vatRate || null,
          isShipping: item.isShipping || false,
          // Shipping items are NOT selected by default
          selected: !item.isShipping,
          // Editable fields
          editedQuantity: item.quantity,
          editedPurchasePrice: purchasePrice,
          editedSellPrice: item.suggestedSellPrice || (purchasePrice ? Math.round(purchasePrice * 2) : 0),
          editedCategory: item.suggestedCategory || 'other',
        };
      });

      // Count product items vs shipping
      const productCount = enhancedItems.filter(i => !i.isShipping).length;
      const shippingCount = enhancedItems.filter(i => i.isShipping).length;

      setState({
        status: 'ready',
        error: null,
        invoice: data.invoice || null,
        items: enhancedItems,
        fileName: file.name,
        useBruttoPrices: true,
        saveSkuCodes: true,
      });

      toast({
        title: 'Faktura zpracována',
        description: `Rozpoznáno ${productCount} produktů${shippingCount > 0 ? ` a ${shippingCount} položek dopravy` : ''}`,
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
      // When selecting all, still exclude shipping items
      items: prev.items.map(item => ({ 
        ...item, 
        selected: selected && !item.isShipping 
      })),
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

  // Computed values - exclude shipping from calculations
  const productItems = state.items.filter(item => !item.isShipping);
  const shippingItems = state.items.filter(item => item.isShipping);
  const selectedItems = productItems.filter(item => item.selected);
  const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.editedQuantity, 0);
  const totalPurchaseCost = selectedItems.reduce((sum, item) => sum + (item.editedPurchasePrice * item.editedQuantity), 0);
  const newProductsCount = selectedItems.filter(item => !item.matchedProductId).length;
  const existingProductsCount = selectedItems.filter(item => item.matchedProductId).length;
  
  // VAT breakdown
  const vatBreakdown = selectedItems.reduce((acc, item) => {
    const rate = item.vatRate || 0;
    if (rate > 0) {
      const netAmount = item.unitPriceNet ? item.unitPriceNet * item.editedQuantity : 0;
      const vatAmount = item.unitPriceGross && item.unitPriceNet 
        ? (item.unitPriceGross - item.unitPriceNet) * item.editedQuantity 
        : 0;
      if (!acc[rate]) {
        acc[rate] = { net: 0, vat: 0 };
      }
      acc[rate].net += netAmount;
      acc[rate].vat += vatAmount;
    }
    return acc;
  }, {} as Record<number, { net: number; vat: number }>);

  return {
    state,
    parseInvoice,
    toggleItemSelection,
    toggleAllItems,
    updateItem,
    importItems,
    reset,
    setUseBruttoPrices,
    setSaveSkuCodes,
    // Computed
    productItems,
    shippingItems,
    selectedItems,
    totalSelectedQuantity,
    totalPurchaseCost,
    newProductsCount,
    existingProductsCount,
    vatBreakdown,
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
