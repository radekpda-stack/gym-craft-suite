import { useState, useCallback, useMemo } from 'react';
import { Product } from '@/hooks/useProducts';

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface UseSalesCartReturn {
  items: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  incrementQuantity: (productId: string) => void;
  decrementQuantity: (productId: string) => void;
  clear: () => void;
  totalAmount: number;
  totalItems: number;
  getItem: (productId: string) => CartItem | undefined;
  hasItem: (productId: string) => boolean;
  validation: CartValidation;
}

export interface CartValidation {
  isValid: boolean;
  errors: CartValidationError[];
  hasStockIssues: boolean;
  hasCreditTopupWithoutClient: boolean;
}

export interface CartValidationError {
  productId: string;
  productName: string;
  type: 'insufficient_stock' | 'invalid_quantity' | 'credit_topup_requires_client';
  message: string;
  available?: number;
  requested?: number;
}

interface UseSalesCartOptions {
  clientId?: string | null;
}

export function useSalesCart(options: UseSalesCartOptions = {}): UseSalesCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);
  const { clientId } = options;

  const addItem = useCallback((product: Product, quantity = 1) => {
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

  const removeItem = useCallback((productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  }, [removeItem]);

  const incrementQuantity = useCallback((productId: string) => {
    setItems(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }, []);

  const decrementQuantity = useCallback((productId: string) => {
    setItems(prev =>
      prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity - 1;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [items]);

  const totalItems = useMemo(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getItem = useCallback((productId: string) => {
    return items.find(item => item.product.id === productId);
  }, [items]);

  const hasItem = useCallback((productId: string) => {
    return items.some(item => item.product.id === productId);
  }, [items]);

  // Validation
  const validation = useMemo((): CartValidation => {
    const errors: CartValidationError[] = [];

    for (const item of items) {
      const product = item.product;
      const kind = (product as any).kind || 'inventory';

      // Stock validation for inventory items
      if (kind === 'inventory') {
        const available = product.stock_quantity || 0;
        if (available < item.quantity) {
          errors.push({
            productId: product.id,
            productName: product.name,
            type: 'insufficient_stock',
            message: `Nedostatek zásob: ${product.name} (k dispozici: ${available}, požadováno: ${item.quantity})`,
            available,
            requested: item.quantity,
          });
        }
      }

      // Credit topup validation
      if (kind === 'credit_topup' && !clientId) {
        errors.push({
          productId: product.id,
          productName: product.name,
          type: 'credit_topup_requires_client',
          message: `Dobití kreditu vyžaduje výběr klienta: ${product.name}`,
        });
      }

      // Quantity validation
      if (item.quantity <= 0) {
        errors.push({
          productId: product.id,
          productName: product.name,
          type: 'invalid_quantity',
          message: `Neplatné množství pro ${product.name}`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      hasStockIssues: errors.some(e => e.type === 'insufficient_stock'),
      hasCreditTopupWithoutClient: errors.some(e => e.type === 'credit_topup_requires_client'),
    };
  }, [items, clientId]);

  return {
    items,
    addItem,
    removeItem,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    clear,
    totalAmount,
    totalItems,
    getItem,
    hasItem,
    validation,
  };
}
