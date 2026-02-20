import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useCreateProduct, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useCreateExpense } from '@/hooks/useBusinessExpenses';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface MatchSuggestion {
  productId: string;
  productName: string;
  confidence: number;
  matchReason: string;
}

export interface ExtractedDetails {
  brand?: string;
  weight?: string;
  flavor?: string;
  size?: string;
}

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
  // Match suggestions for manual correction
  matchSuggestions: MatchSuggestion[];
  // Extracted details for enrichment
  extractedDetails: ExtractedDetails;
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

        // Enhance match suggestions with full product data
        const matchSuggestions: MatchSuggestion[] = (item.matchSuggestions || []).map((s: any) => ({
          productId: s.productId,
          productName: s.productName,
          confidence: s.confidence || 0,
          matchReason: s.matchReason || '',
        }));

        // Pro existující produkty použij jejich aktuální prodejní cenu, jinak navrhni dvojnásobek nákupní
        const existingSellPrice = matchedProduct?.price || 0;
        const suggestedSellPrice = item.suggestedSellPrice || (purchasePrice ? Math.round(purchasePrice * 2) : 0);

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
          matchSuggestions,
          extractedDetails: item.extractedDetails || {},
          selected: true,
          // Editable fields - pro existující produkty použij jejich cenu
          editedQuantity: item.quantity,
          editedPurchasePrice: purchasePrice,
          editedSellPrice: matchedProduct ? existingSellPrice : suggestedSellPrice,
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

  // Change matched product for an item (manual correction)
  const changeMatchedProduct = (itemId: string, productId: string | null) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== itemId) return item;
        
        const matchedProduct = productId 
          ? products.find(p => p.id === productId)
          : null;

        return {
          ...item,
          matchedProductId: productId,
          matchedProductName: matchedProduct?.name || null,
          matchedProduct,
          confidence: productId ? 1.0 : 0, // Manual selection = 100% confidence
        };
      }),
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

    let newProductsCount = 0;
    let updatedProductsCount = 0;
    let totalCost = 0;
    const failedItems: { name: string; error: string }[] = [];

    for (const item of selectedItems) {
      try {
        const itemTotalCost = item.editedPurchasePrice * item.editedQuantity;
        totalCost += itemTotalCost;

        if (item.matchedProductId && item.matchedProduct) {
          const updateData: Partial<Product> & { id: string; sku_code?: string } = {
            id: item.matchedProductId,
            stock_quantity: (item.matchedProduct.stock_quantity || 0) + item.editedQuantity,
            purchase_price: item.editedPurchasePrice,
          };

          if (item.editedSellPrice && item.editedSellPrice !== item.matchedProduct.price) {
            updateData.price = item.editedSellPrice;
          }

          if (state.saveSkuCodes && item.skuCode && !(item.matchedProduct as any).sku_code) {
            updateData.sku_code = item.skuCode;
          }

          await updateProduct.mutateAsync(updateData);
          updatedProductsCount++;
        } else {
          const createData: any = {
            name: item.name,
            price: item.editedSellPrice,
            purchase_price: item.editedPurchasePrice,
            category: item.editedCategory,
            kind: 'inventory',
            stock_quantity: item.editedQuantity,
            low_stock_threshold: 5,
          };

          if (state.saveSkuCodes && item.skuCode) {
            createData.sku_code = item.skuCode;
          }

          await createProduct.mutateAsync(createData);
          newProductsCount++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Neznámá chyba';
        failedItems.push({ name: item.name, error: errorMsg });
        console.error(`Failed to import item "${item.name}":`, err);
      }
    }

    // Create expense record even if some items failed
    if (createExpenseRecord && totalCost > 0) {
      try {
        const itemDescriptions = selectedItems
          .map(i => `${i.name} (${i.editedQuantity}x)`)
          .join(', ');

        // Normalize date - support DD.MM.YYYY, D.M.YYYY formats
        let expenseDate = format(new Date(), 'yyyy-MM-dd');
        if (state.invoice?.date) {
          const parsed = parseDateSafe(state.invoice.date);
          if (parsed) {
            expenseDate = parsed;
          }
        }

        await createExpense.mutateAsync({
          name: state.invoice?.invoiceNumber 
            ? `Import faktury: ${state.invoice.invoiceNumber}`
            : `Import faktury: ${selectedItems.length} položek`,
          description: itemDescriptions,
          amount: totalCost,
          date: expenseDate,
          category: 'inventory',
        });
      } catch (err) {
        console.error('Failed to create expense:', err);
        toast({
          title: 'Varování',
          description: 'Produkty byly naskladněny, ale nepodařilo se vytvořit záznam nákladu.',
          variant: 'destructive',
        });
      }
    }

    const successCount = newProductsCount + updatedProductsCount;

    if (failedItems.length === 0) {
      toast({
        title: 'Import dokončen',
        description: `Naskladněno: ${newProductsCount} nových, ${updatedProductsCount} aktualizovaných produktů${createExpenseRecord ? `. Náklad: ${totalCost} Kč` : ''}`,
      });
    } else if (successCount > 0) {
      toast({
        title: 'Import částečně dokončen',
        description: `Naskladněno ${successCount} produktů, ${failedItems.length} selhalo: ${failedItems.map(f => f.name).join(', ')}`,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Import selhal',
        description: `Žádný produkt nebyl naskladněn. Chyby: ${failedItems.map(f => `${f.name}: ${f.error}`).join('; ')}`,
        variant: 'destructive',
      });
      setState(prev => ({ ...prev, status: 'error', error: 'Všechny položky selhaly' }));
      return false;
    }

    reset();
    return true;
  };

  // Computed values
  const selectedItems = state.items.filter(item => item.selected);
  const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.editedQuantity, 0);
  const totalPurchaseCost = selectedItems.reduce((sum, item) => sum + (item.editedPurchasePrice * item.editedQuantity), 0);
  const newProductsCount = selectedItems.filter(item => !item.matchedProductId).length;
  const existingProductsCount = selectedItems.filter(item => item.matchedProductId).length;

  return {
    state,
    products, // Expose products for manual selection
    parseInvoice,
    toggleItemSelection,
    toggleAllItems,
    updateItem,
    changeMatchedProduct,
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

/**
 * Parse date string safely, supporting DD.MM.YYYY, D.M.YYYY and YYYY-MM-DD formats.
 * Returns YYYY-MM-DD string or null if unparseable.
 */
function parseDateSafe(dateStr: string): string | null {
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  // Czech format: DD.MM.YYYY or D.M.YYYY (with optional spaces)
  const czMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (czMatch) {
    const day = czMatch[1].padStart(2, '0');
    const month = czMatch[2].padStart(2, '0');
    const year = czMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Try native Date parsing as fallback
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
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
