import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductKind } from "./useProducts";

interface ProductWithSalesCount extends Product {
  total_sold: number;
}

interface DbProduct {
  id: string;
  name: string;
  price: number;
  purchase_price: number;
  category: string;
  kind: string;
  credit_delta: number;
  is_active: boolean;
  stock_quantity: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  xp_bonus: number;
}

export function useProductsSortedBySales(activeOnly = false) {
  return useQuery({
    queryKey: ["products_sorted_by_sales", activeOnly],
    queryFn: async () => {
      // Fetch products
      let productsQuery = supabase
        .from("products")
        .select("*");

      if (activeOnly) {
        productsQuery = productsQuery.eq("is_active", true);
      }

      const { data: products, error: productsError } = await productsQuery;
      if (productsError) throw productsError;

      // Fetch sales counts from sales_order_items
      const { data: salesData, error: salesError } = await supabase
        .from("sales_order_items")
        .select("product_id, quantity");

      // Fallback to credit_transactions if sales_order_items is empty
      let salesCounts: Record<string, number> = {};

      if (!salesError && salesData && salesData.length > 0) {
        // Group by product_id and sum quantities
        salesData.forEach((item) => {
          if (item.product_id) {
            salesCounts[item.product_id] = (salesCounts[item.product_id] || 0) + (item.quantity || 1);
          }
        });
      } else {
        // Fallback: use credit_transactions
        const { data: txData } = await supabase
          .from("credit_transactions")
          .select("product_id")
          .eq("type", "product")
          .not("product_id", "is", null);

        if (txData) {
          txData.forEach((tx) => {
            if (tx.product_id) {
              salesCounts[tx.product_id] = (salesCounts[tx.product_id] || 0) + 1;
            }
          });
        }
      }

      // Merge and sort
      const productsWithSales: ProductWithSalesCount[] = (products || []).map((p) => ({
        ...p,
        kind: p.kind as ProductKind,
        total_sold: salesCounts[p.id] || 0,
      }));

      // Sort by total_sold descending, then by name ascending
      productsWithSales.sort((a, b) => {
        if (b.total_sold !== a.total_sold) {
          return b.total_sold - a.total_sold;
        }
        return a.name.localeCompare(b.name);
      });

      return productsWithSales as Product[];
    },
  });
}
