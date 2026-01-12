import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product, ProductKind } from "./useProducts";

interface ProductWithSalesCount extends Product {
  total_sold: number;
}

export function useProductsSortedBySales(activeOnly = false) {
  return useQuery({
    queryKey: ["products_sorted_by_sales", activeOnly],
    staleTime: 1000 * 60 * 2, // 2 minutes cache
    queryFn: async () => {
      // Fetch products and sales data in parallel for better performance
      const salesPromise = supabase
        .from("sales_order_items")
        .select("product_id, quantity");

      const productsPromise = activeOnly 
        ? supabase.from("products").select("*").eq("is_active", true)
        : supabase.from("products").select("*");

      const [productsResult, salesResult] = await Promise.all([
        productsPromise,
        salesPromise
      ]);

      if (productsResult.error) throw productsResult.error;
      const products = productsResult.data;

      // Process sales counts
      let salesCounts: Record<string, number> = {};
      const salesData = salesResult.data;
      const salesError = salesResult.error;

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
