import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AliExpressProduct {
  id: string;
  aliexpress_product_id: string;
  product_name: string;
  product_name_hebrew: string | null;
  image_url: string | null;
  price_usd: number | null;
  original_price_usd: number | null;
  discount_percentage: number | null;
  commission_rate: number | null;
  sales_30d: number | null;
  rating: number | null;
  reviews_count: number | null;
  tracking_link: string | null;
  category_id: string | null;
  category_name_hebrew: string | null;
  is_featured: boolean;
  out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export const useAliExpressProducts = (options?: { 
  featured?: boolean; 
  category?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['aliexpress-products', options],
    queryFn: async () => {
      let query = supabase
        .from('aliexpress_feed_products')
        .select('*')
        .eq('out_of_stock', false)
        .order('sales_30d', { ascending: false, nullsFirst: false });

      // If featured is requested, first try to get featured products
      // If none exist, fall back to all products sorted by sales
      if (options?.featured) {
        const featuredQuery = supabase
          .from('aliexpress_feed_products')
          .select('*')
          .eq('out_of_stock', false)
          .eq('is_featured', true)
        .order('updated_at', { ascending: false })
        .order('sales_30d', { ascending: false, nullsFirst: false });

      if (options?.limit) {
        featuredQuery.limit(options.limit);
        }

        const { data: featuredData, error: featuredError } = await featuredQuery;

        if (!featuredError && featuredData && featuredData.length > 0) {
          return featuredData as AliExpressProduct[];
        }
        // If no featured products, continue with all products query
      }

      if (options?.category) {
        query = query.eq('category_id', options.category);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching AliExpress products:', error);
        throw error;
      }

      return data as AliExpressProduct[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useAliExpressCategories = () => {
  return useQuery({
    queryKey: ['aliexpress-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aliexpress_feed_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Error fetching AliExpress categories:', error);
        throw error;
      }

      return data;
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
};
