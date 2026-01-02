import { supabase } from '@/integrations/supabase/client';
import { CartItem } from '@/hooks/useSalesCart';
import { CartItemWithDiscount, CartDiscount } from '@/hooks/useSalesCartWithDiscount';
import { toast } from 'sonner';

export type PaymentMethod = 'cash' | 'card' | 'bank' | 'credit';

export interface ProcessSaleInput {
  clientId?: string | null;
  groupId?: string | null;
  paymentMethod: PaymentMethod;
  items: CartItem[];
  note?: string;
}

export interface ProcessSaleWithDiscountInput {
  clientId?: string | null;
  groupId?: string | null;
  paymentMethod: PaymentMethod;
  items: CartItemWithDiscount[];
  orderDiscount?: CartDiscount | null;
  itemDiscounts?: Array<{
    productId: string;
    type: 'percent' | 'fixed';
    value: number;
  }>;
  note?: string;
}

export interface ProcessSaleResult {
  success: boolean;
  orderId?: string;
  totalAmount?: number;
  productsSubtotal?: number;
  servicesSubtotal?: number;
  totalDiscount?: number;
  creditDelta?: number;
  xpEarned?: number;
  idempotent?: boolean;
  error?: string;
}

export interface RefundSaleResult {
  success: boolean;
  orderId?: string;
  refundedAmount?: number;
  error?: string;
}

/**
 * Generate idempotency key for sale
 * Uses crypto.randomUUID for uniqueness
 */
function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}

/**
 * Process a sale with discount support atomically via RPC
 * All-or-nothing: either entire sale succeeds or nothing changes
 */
export async function processSaleWithDiscount(input: ProcessSaleWithDiscountInput): Promise<ProcessSaleResult> {
  const { clientId, groupId, paymentMethod, items, orderDiscount, itemDiscounts, note } = input;

  // Validate input
  if (items.length === 0) {
    return { success: false, error: 'Košík je prázdný' };
  }

  if (paymentMethod === 'credit' && !clientId && !groupId) {
    return { success: false, error: 'Platba kreditem vyžaduje výběr klienta' };
  }

  // Check for credit topup without client
  const hasCreditTopup = items.some(item => item.product.kind === 'credit_topup');
  if (hasCreditTopup && !clientId) {
    return { success: false, error: 'Dobití kreditu vyžaduje výběr klienta' };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Uživatel není přihlášen' };
  }

  // Prepare payload with discount support
  const payload = {
    user_id: user.id,
    client_id: clientId || null,
    group_id: groupId || null,
    payment_method: paymentMethod,
    idempotency_key: generateIdempotencyKey(),
    items: items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
    order_discount: orderDiscount ? {
      type: orderDiscount.type,
      value: orderDiscount.value,
    } : null,
    item_discounts: itemDiscounts || [],
    note: note || null,
  };

  try {
    const { data, error } = await supabase.rpc('rpc_process_sale', { 
      payload: payload as any 
    });

    if (error) {
      console.error('Sale processing error:', error);
      return { success: false, error: error.message };
    }

    const result = data as any;
    
    if (!result.success) {
      return { success: false, error: result.error || 'Neznámá chyba při zpracování prodeje' };
    }

    return {
      success: true,
      orderId: result.order_id,
      totalAmount: result.total_amount,
      productsSubtotal: result.products_subtotal,
      servicesSubtotal: result.services_subtotal,
      totalDiscount: result.total_discount,
      creditDelta: result.credit_delta,
      xpEarned: result.xp_earned,
      idempotent: result.idempotent,
    };
  } catch (err) {
    console.error('Sale processing exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Chyba při zpracování prodeje' 
    };
  }
}

/**
 * Process a sale atomically via RPC (legacy without discount)
 * All-or-nothing: either entire sale succeeds or nothing changes
 */
export async function processSale(input: ProcessSaleInput): Promise<ProcessSaleResult> {
  const { clientId, groupId, paymentMethod, items, note } = input;

  // Validate input
  if (items.length === 0) {
    return { success: false, error: 'Košík je prázdný' };
  }

  if (paymentMethod === 'credit' && !clientId && !groupId) {
    return { success: false, error: 'Platba kreditem vyžaduje výběr klienta' };
  }

  // Check for credit topup without client
  const hasCreditTopup = items.some(item => (item.product as any).kind === 'credit_topup');
  if (hasCreditTopup && !clientId) {
    return { success: false, error: 'Dobití kreditu vyžaduje výběr klienta' };
  }

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Uživatel není přihlášen' };
  }

  // Prepare payload
  const payload = {
    user_id: user.id,
    client_id: clientId || null,
    group_id: groupId || null,
    payment_method: paymentMethod,
    idempotency_key: generateIdempotencyKey(),
    items: items.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
    note: note || null,
  };

  try {
    const { data, error } = await supabase.rpc('rpc_process_sale', { 
      payload: payload as any 
    });

    if (error) {
      console.error('Sale processing error:', error);
      return { success: false, error: error.message };
    }

    const result = data as any;
    
    if (!result.success) {
      return { success: false, error: result.error || 'Neznámá chyba při zpracování prodeje' };
    }

    return {
      success: true,
      orderId: result.order_id,
      totalAmount: result.total_amount,
      creditDelta: result.credit_delta,
      idempotent: result.idempotent,
    };
  } catch (err) {
    console.error('Sale processing exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Chyba při zpracování prodeje' 
    };
  }
}

/**
 * Refund a sale via RPC
 * Restores stock, reverses credit changes
 */
export async function refundSale(orderId: string): Promise<RefundSaleResult> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Uživatel není přihlášen' };
  }

  try {
    const { data, error } = await supabase.rpc('rpc_refund_sale', {
      p_order_id: orderId,
      p_user_id: user.id,
    });

    if (error) {
      console.error('Refund error:', error);
      return { success: false, error: error.message };
    }

    const result = data as any;
    
    if (!result.success) {
      return { success: false, error: result.error || 'Neznámá chyba při stornování' };
    }

    return {
      success: true,
      orderId: result.order_id,
      refundedAmount: result.refunded_amount,
    };
  } catch (err) {
    console.error('Refund exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Chyba při stornování' 
    };
  }
}

/**
 * Get or create anonymous/system client
 */
export async function getSystemClient(systemKey: string = 'anonymous_customer'): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data, error } = await supabase.rpc('rpc_get_or_create_system_client', {
      p_user_id: user.id,
      p_system_key: systemKey,
    });

    if (error) {
      console.error('Get system client error:', error);
      return null;
    }

    return data as string;
  } catch (err) {
    console.error('Get system client exception:', err);
    return null;
  }
}

/**
 * Helper to show appropriate toast for sale result
 */
export function showSaleResultToast(result: ProcessSaleResult, totalAmount: number) {
  if (result.success) {
    let message = result.idempotent 
      ? 'Prodej již byl zaznamenán'
      : `Prodej dokončen: ${totalAmount.toLocaleString('cs-CZ')} Kč`;
    
    const parts: string[] = [];
    if (result.totalDiscount && result.totalDiscount > 0) {
      parts.push(`Sleva: ${result.totalDiscount.toLocaleString('cs-CZ')} Kč`);
    }
    if (result.creditDelta && result.creditDelta > 0) {
      parts.push(`Kredit +${result.creditDelta.toLocaleString('cs-CZ')} Kč`);
    }
    if (result.xpEarned && result.xpEarned > 0) {
      parts.push(`+${result.xpEarned} XP`);
    }
    
    const description = parts.length > 0 ? parts.join(' • ') : undefined;

    toast.success(message, { description });
  } else {
    toast.error('Chyba při zpracování prodeje', {
      description: result.error,
    });
  }
}

/**
 * Helper to show appropriate toast for refund result
 */
export function showRefundResultToast(result: RefundSaleResult) {
  if (result.success) {
    toast.success('Prodej stornován', {
      description: `Vráceno: ${result.refundedAmount?.toLocaleString('cs-CZ')} Kč`,
    });
  } else {
    toast.error('Chyba při stornování', {
      description: result.error,
    });
  }
}
