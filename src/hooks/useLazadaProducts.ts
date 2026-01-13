import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LazadaProduct {
  id: string;
  lazada_item_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  price_thb: number | null;
  price_original_thb: number | null;
  discount_percentage: number | null;
  rating: number | null;
  reviews_count: number | null;
  affiliate_link: string | null;
  category: string | null;
  is_featured: boolean;
  icon: string;
  savings_ils: string | null;
  price_ils: string | null;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useLazadaProducts = (options?: { featured?: boolean; category?: string }) => {
  return useQuery({
    queryKey: ['lazada-products', options],
    queryFn: async () => {
      let query = supabase
        .from('lazada_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.featured) {
        query = query.eq('is_featured', true);
      }

      if (options?.category) {
        query = query.eq('category', options.category);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Lazada products:', error);
        throw error;
      }

      return data as LazadaProduct[];
    },
  });
};

export const useLazadaSearch = (keyword: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['lazada-search', keyword],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('lazada-api', {
        body: { action: 'search', keyword, limit: 20 }
      });

      if (error) {
        console.error('Error searching Lazada:', error);
        throw error;
      }

      return data;
    },
    enabled: enabled && keyword.length > 0,
  });
};

export const useLazadaApiTest = () => {
  return useQuery({
    queryKey: ['lazada-api-test'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('lazada-api', {
        body: { action: 'test' }
      });

      if (error) {
        console.error('Error testing Lazada API:', error);
        throw error;
      }

      return data;
    },
    retry: false,
  });
};