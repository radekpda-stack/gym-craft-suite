import { useState, useCallback, useMemo } from 'react';
import { Product, ProductKind } from './useProducts';
import { useUndo } from '@/contexts/UndoContext';
import { toast } from 'sonner';

export interface CartDiscount {
  type: 'percent' | 'fixed';
  value: number;
}

export interface CartItemWithDiscount {
  product: Product;
  quantity: number;
  lineDiscount?: CartDiscount;
}

export interface CartTotals {
  productsSubtotal: number;
  servicesSubtotal: number;
  orderDiscountAmount: number;
  lineDiscountsTotal: number;
  totalDiscount: number;
  totalAfterDiscount: number;
  itemCount: number;
}

export interface CartValidationError {
  productId: string;
  productName: string;
  message: string;
  type: 'stock' | 'quantity' | 'credit_topup';
}

export interface CartValidation {
  isValid: boolean;
  errors: CartValidationError[];
  hasStockIssues: boolean;
  hasCreditTopupWithoutClient: boolean;
}

interface UseSalesCartOptions {
  clientId?: string | null;
}

export function useSalesCartWithDiscount(options: UseSalesCartOptions = {}) {
  const { clientId } = options;
  const [items, setItems] = useState<CartItemWithDiscount[]>([]);
  const [orderDiscount, setOrderDiscount] = useState<CartDiscount | null>(null);
  const { registerUndo } = useUndo();

  // Add item to cart
  const addItem = useCallback((product: Product, quantity: number = 1) => {
    setItems(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  // Remove item with UNDO support
  const removeItem = useCallback((productId: string) => {
    const itemToRemove = items.find(item => item.product.id === productId);
    if (!itemToRemove) return;

    // Remove immediately
    setItems(prev => prev.filter(item => item.product.id !== productId));

    // Register undo action
    registerUndo({
      label: 'Položka odstraněna',
      description: itemToRemove.product.name,
      undoFn: async () => {
        setItems(prev => {
          // Check if already re-added
          if (prev.find(item => item.product.id === productId)) {
            return prev;
          }
          return [...prev, itemToRemove];
        });
        toast.success('Položka vrácena do košíku');
      },
      category: 'other',
    });
  }, [items, registerUndo]);

  // Remove item without UNDO (for direct removal)
  const removeItemDirect = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  // Update quantity
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  // Set quantity directly (for inline edit)
  const setQuantityDirect = useCallback((productId: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  // Increment/decrement quantity
  const incrementQuantity = useCallback((productId: string, amount: number = 1) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + amount }
          : item
      )
    );
  }, []);

  const decrementQuantity = useCallback((productId: string) => {
    const item = items.find(i => i.product.id === productId);
    if (item && item.quantity <= 1) {
      removeItem(productId);
    } else {
      setItems(prev =>
        prev.map(i =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
        )
      );
    }
  }, [items, removeItem]);

  // Set line discount (only for inventory products)
  const setLineDiscount = useCallback((productId: string, discount: CartDiscount | null) => {
    setItems(prev =>
      prev.map(item => {
        if (item.product.id !== productId) return item;
        // Only allow discount on inventory products
        if (item.product.kind !== 'inventory') return item;
        return { ...item, lineDiscount: discount || undefined };
      })
    );
  }, []);

  // Clear cart
  const clear = useCallback(() => {
    setItems([]);
    setOrderDiscount(null);
  }, []);

  // Get item
  const getItem = useCallback((productId: string) => {
    return items.find(item => item.product.id === productId);
  }, [items]);

  const hasItem = useCallback((productId: string) => {
    return items.some(item => item.product.id === productId);
  }, [items]);

  // Calculate totals
  const totals = useMemo<CartTotals>(() => {
    let productsSubtotal = 0;
    let servicesSubtotal = 0;
    let lineDiscountsTotal = 0;
    let itemCount = 0;

    items.forEach(item => {
      const lineTotal = item.product.price * item.quantity;
      itemCount += item.quantity;

      if (item.product.kind === 'inventory') {
        productsSubtotal += lineTotal;

        // Calculate line discount for inventory items
        if (item.lineDiscount) {
          if (item.lineDiscount.type === 'percent') {
            lineDiscountsTotal += Math.round(lineTotal * (item.lineDiscount.value / 100) * 100) / 100;
          } else {
            lineDiscountsTotal += Math.min(item.lineDiscount.value, lineTotal);
          }
        }
      } else {
        // Services and credit_topup
        servicesSubtotal += lineTotal;
      }
    });

    // Calculate order discount (only on products subtotal)
    let orderDiscountAmount = 0;
    if (orderDiscount && productsSubtotal > 0) {
      if (orderDiscount.type === 'percent') {
        orderDiscountAmount = Math.round(productsSubtotal * (orderDiscount.value / 100) * 100) / 100;
      } else {
        orderDiscountAmount = Math.min(orderDiscount.value, productsSubtotal);
      }
    }

    // Total discount cannot exceed products subtotal
    const totalDiscount = Math.min(orderDiscountAmount + lineDiscountsTotal, productsSubtotal);
    const totalAfterDiscount = (productsSubtotal - totalDiscount) + servicesSubtotal;

    return {
      productsSubtotal,
      servicesSubtotal,
      orderDiscountAmount,
      lineDiscountsTotal,
      totalDiscount,
      totalAfterDiscount,
      itemCount,
    };
  }, [items, orderDiscount]);

  // Validation
  const validation = useMemo<CartValidation>(() => {
    const errors: CartValidationError[] = [];
    let hasStockIssues = false;
    let hasCreditTopupWithoutClient = false;

    items.forEach(item => {
      // Check stock for inventory products
      if (item.product.kind === 'inventory') {
        if (item.quantity > item.product.stock_quantity) {
          hasStockIssues = true;
          errors.push({
            productId: item.product.id,
            productName: item.product.name,
            message: `Nedostatek na skladě (${item.product.stock_quantity} ks)`,
            type: 'stock',
          });
        }
      }

      // Check credit topup requires client
      if (item.product.kind === 'credit_topup' && !clientId) {
        hasCreditTopupWithoutClient = true;
        errors.push({
          productId: item.product.id,
          productName: item.product.name,
          message: 'Dobití kreditu vyžaduje výběr klienta',
          type: 'credit_topup',
        });
      }

      // Check for invalid quantities
      if (item.quantity < 1) {
        errors.push({
          productId: item.product.id,
          productName: item.product.name,
          message: 'Neplatné množství',
          type: 'quantity',
        });
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      hasStockIssues,
      hasCreditTopupWithoutClient,
    };
  }, [items, clientId]);

  // Get items with calculated line totals
  const itemsWithTotals = useMemo(() => {
    return items.map(item => {
      const lineTotal = item.product.price * item.quantity;
      let lineDiscountAmount = 0;

      if (item.product.kind === 'inventory' && item.lineDiscount) {
        if (item.lineDiscount.type === 'percent') {
          lineDiscountAmount = Math.round(lineTotal * (item.lineDiscount.value / 100) * 100) / 100;
        } else {
          lineDiscountAmount = Math.min(item.lineDiscount.value, lineTotal);
        }
      }

      return {
        ...item,
        lineTotal,
        lineDiscountAmount,
        lineTotalAfterDiscount: lineTotal - lineDiscountAmount,
      };
    });
  }, [items]);

  return {
    items,
    itemsWithTotals,
    orderDiscount,
    setOrderDiscount,
    addItem,
    removeItem,
    removeItemDirect,
    updateQuantity,
    setQuantityDirect,
    incrementQuantity,
    decrementQuantity,
    setLineDiscount,
    clear,
    getItem,
    hasItem,
    totals,
    validation,
    isEmpty: items.length === 0,
  };
}
