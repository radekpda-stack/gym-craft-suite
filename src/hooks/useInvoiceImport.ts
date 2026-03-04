import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProducts, useUpdateProduct, Product } from '@/hooks/useProducts';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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
  id: string;
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
  matchSuggestions: MatchSuggestion[];
  extractedDetails: ExtractedDetails;
  editedQuantity: number;
  editedPurchasePrice: number;
  editedSellPrice: number;
  editedCategory: string;
  // Error state for partial failure UI
  importError?: string | null;
}

export interface ParsedInvoice {
  supplier: string | null;
  invoiceNumber: string | null;
  date: string | null;
  totalAmount: number | null;
}

export interface InvoiceImportState {
  status: 'idle' | 'uploading' | 'parsing' | 'ready' | 'importing' | 'partial_success' | 'error';
  error: string | null;
  invoice: ParsedInvoice | null;
  items: ParsedInvoiceItem[];
  fileName: string | null;
  saveSkuCodes: boolean;
  failedItems: { itemId: string; name: string; error: string }[];
}

export function useInvoiceImport() {
  const { data: products = [] } = useProducts();
  const updateProduct = useUpdateProduct();
  const queryClient = useQueryClient();

  const [state, setState] = useState<InvoiceImportState>({
    status: 'idle',
    error: null,
    invoice: null,
    items: [],
    fileName: null,
    saveSkuCodes: true,
    failedItems: [],
  });

  const reset = () => {
    setState({
      status: 'idle',
      error: null,
      invoice: null,
      items: [],
      fileName: null,
      saveSkuCodes: true,
      failedItems: [],
    });
  };

  const setSaveSkuCodes = (save: boolean) => {
    setState(prev => ({ ...prev, saveSkuCodes: save }));
  };

  const parseInvoice = async (file: File) => {
    // P3: File size validation
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'Soubor je příliš velký',
        description: `Maximální velikost souboru je 5 MB. Váš soubor má ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
        variant: 'destructive',
      });
      return;
    }

    setState(prev => ({ ...prev, status: 'uploading', error: null, fileName: file.name, failedItems: [] }));

    try {
      const base64 = await fileToBase64(file);
      
      setState(prev => ({ ...prev, status: 'parsing' }));

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

      const enhancedItems: ParsedInvoiceItem[] = (data.items || []).map((item: any, index: number) => {
        const matchedProduct = item.matchedProductId 
          ? products.find(p => p.id === item.matchedProductId)
          : null;

        const purchasePrice = item.purchasePrice || 0;

        const matchSuggestions: MatchSuggestion[] = (item.matchSuggestions || []).map((s: any) => ({
          productId: s.productId,
          productName: s.productName,
          confidence: s.confidence || 0,
          matchReason: s.matchReason || '',
        }));

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
          editedQuantity: item.quantity,
          editedPurchasePrice: purchasePrice,
          editedSellPrice: matchedProduct ? existingSellPrice : suggestedSellPrice,
          editedCategory: item.suggestedCategory || 'other',
          importError: null,
        };
      });

      setState({
        status: 'ready',
        error: null,
        invoice: data.invoice || null,
        items: enhancedItems,
        fileName: file.name,
        saveSkuCodes: true,
        failedItems: [],
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
          confidence: productId ? 1.0 : 0,
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

    setState(prev => ({ ...prev, status: 'importing', failedItems: [] }));

    // Clear previous errors on items
    setState(prev => ({
      ...prev,
      items: prev.items.map(item => ({ ...item, importError: null })),
    }));

    let newProductsCount = 0;
    let updatedProductsCount = 0;
    let totalCost = 0;
    const failedItems: { itemId: string; name: string; error: string }[] = [];
    const invoiceNumber = state.invoice?.invoiceNumber || null;

    for (const item of selectedItems) {
      try {
        const itemTotalCost = item.editedPurchasePrice * item.editedQuantity;
        totalCost += itemTotalCost;

        if (item.matchedProductId && item.matchedProduct) {
          // P2: Use atomic RPC increment instead of absolute stock_quantity set
          await supabase.rpc('rpc_increment_stock', {
            p_product_id: item.matchedProductId,
            p_delta: item.editedQuantity,
          });

          // Update purchase_price and optionally sell price / SKU
          const updateData: Partial<Product> & { id: string; sku_code?: string } = {
            id: item.matchedProductId,
            purchase_price: item.editedPurchasePrice,
          };

          if (item.editedSellPrice && item.editedSellPrice !== item.matchedProduct.price) {
            updateData.price = item.editedSellPrice;
          }

          if (state.saveSkuCodes && item.skuCode && !(item.matchedProduct as any).sku_code) {
            updateData.sku_code = item.skuCode;
          }

          await updateProduct.mutateAsync(updateData);

          // P1: Record stock movement for audit trail
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const { error: mvErr } = await supabase.from('stock_movements').insert({
              product_id: item.matchedProductId,
              user_id: currentUser.id,
              movement_type: 'invoice_import',
              quantity: item.editedQuantity,
              unit_price: item.editedPurchasePrice,
              source_ref: invoiceNumber,
            });
            if (mvErr) console.error('Stock movement error:', mvErr);
          }

          updatedProductsCount++;
        } else {
          // Create new product
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) throw new Error('Not authenticated');

          const { data: newProduct, error: createErr } = await supabase
            .from('products')
            .insert({
              name: item.name,
              price: item.editedSellPrice,
              purchase_price: item.editedPurchasePrice,
              category: item.editedCategory || 'supplement',
              kind: 'inventory',
              stock_quantity: item.editedQuantity,
              low_stock_threshold: 5,
              sku_code: (state.saveSkuCodes && item.skuCode) ? item.skuCode : null,
              user_id: currentUser.id,
            })
            .select()
            .single();

          if (createErr) throw createErr;

          // P1: Record stock movement for new product too
          if (newProduct?.id) {
            const { error: mvErr } = await supabase.from('stock_movements').insert({
              product_id: newProduct.id,
              user_id: currentUser.id,
              movement_type: 'invoice_import',
              quantity: item.editedQuantity,
              unit_price: item.editedPurchasePrice,
              source_ref: invoiceNumber,
            });
            if (mvErr) console.error('Stock movement error:', mvErr);
          }

          newProductsCount++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Neznámá chyba';
        failedItems.push({ itemId: item.id, name: item.name, error: errorMsg });
        console.error(`Failed to import item "${item.name}":`, err);
      }
    }

    // Create expense record even if some items failed
    if (createExpenseRecord && totalCost > 0) {
      try {
        const { data: { user: expUser } } = await supabase.auth.getUser();
        if (!expUser) throw new Error('Not authenticated');

        const itemDescriptions = selectedItems
          .map(i => `${i.name} (${i.editedQuantity}x)`)
          .join(', ');

        let expenseDate = format(new Date(), 'yyyy-MM-dd');
        if (state.invoice?.date) {
          const parsed = parseDateSafe(state.invoice.date);
          if (parsed) {
            expenseDate = parsed;
          }
        }

        const { error: expErr } = await supabase
          .from('business_expenses')
          .insert({
            user_id: expUser.id,
            name: invoiceNumber 
              ? `Import faktury: ${invoiceNumber}`
              : `Import faktury: ${selectedItems.length} položek`,
            description: itemDescriptions,
            amount: totalCost,
            date: expenseDate,
            category: 'inventory',
          });

        if (expErr) throw expErr;
      } catch (err) {
        console.error('Failed to create expense:', err);
        toast({
          title: 'Varování',
          description: 'Produkty byly naskladněny, ale nepodařilo se vytvořit záznam nákladu.',
          variant: 'destructive',
        });
      }
    }

    // Invalidate all related queries after import
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products_sorted_by_sales'] });
    queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
    queryClient.invalidateQueries({ queryKey: ['business-expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expense-stats'] });
    queryClient.invalidateQueries({ queryKey: ['profit-by-period'] });

    const successCount = newProductsCount + updatedProductsCount;

    if (failedItems.length === 0) {
      toast({
        title: 'Import dokončen',
        description: `Naskladněno: ${newProductsCount} nových, ${updatedProductsCount} aktualizovaných produktů${createExpenseRecord ? `. Náklad: ${totalCost} Kč` : ''}`,
      });
      reset();
      return true;
    } else if (successCount > 0) {
      // P6: Partial failure - keep dialog open, mark failed items
      toast({
        title: 'Import částečně dokončen',
        description: `${successCount} úspěšně, ${failedItems.length} selhalo`,
        variant: 'destructive',
      });

      // Update items with error state and deselect successful ones
      const failedIds = new Set(failedItems.map(f => f.itemId));
      setState(prev => ({
        ...prev,
        status: 'partial_success',
        failedItems,
        items: prev.items.map(item => {
          const failure = failedItems.find(f => f.itemId === item.id);
          if (failure) {
            return { ...item, importError: failure.error, selected: true };
          }
          // Deselect successfully imported items
          if (item.selected) {
            return { ...item, selected: false, importError: null };
          }
          return item;
        }),
      }));
      return false;
    } else {
      toast({
        title: 'Import selhal',
        description: `Žádný produkt nebyl naskladněn.`,
        variant: 'destructive',
      });
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Všechny položky selhaly',
        failedItems,
        items: prev.items.map(item => {
          const failure = failedItems.find(f => f.itemId === item.id);
          return failure ? { ...item, importError: failure.error } : item;
        }),
      }));
      return false;
    }
  };

  // Retry only failed items
  const retryFailedItems = async (createExpenseRecord: boolean) => {
    return importItems(createExpenseRecord);
  };

  const selectedItems = state.items.filter(item => item.selected);
  const totalSelectedQuantity = selectedItems.reduce((sum, item) => sum + item.editedQuantity, 0);
  const totalPurchaseCost = selectedItems.reduce((sum, item) => sum + (item.editedPurchasePrice * item.editedQuantity), 0);
  const newProductsCount = selectedItems.filter(item => !item.matchedProductId).length;
  const existingProductsCount = selectedItems.filter(item => item.matchedProductId).length;

  return {
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
  };
}

function parseDateSafe(dateStr: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  const czMatch = dateStr.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (czMatch) {
    const day = czMatch[1].padStart(2, '0');
    const month = czMatch[2].padStart(2, '0');
    const year = czMatch[3];
    return `${year}-${month}-${day}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return null;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
}
