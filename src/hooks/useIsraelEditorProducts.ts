import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface IsraelEditorProduct {
  id: string;
  aliexpress_product_id: string | null;
  product_name_hebrew: string;
  product_name_english: string | null;
  image_url: string | null;
  price_usd: number | null;
  original_price_usd: number | null;
  discount_percentage: number | null;
  rating: number | null;
  sales_count: number | null;
  tracking_link: string;
  category_name_hebrew: string;
  is_active: boolean;
  out_of_stock: boolean;
  created_at: string;
  updated_at: string;
}

export const useIsraelEditorProducts = (options?: { 
  category?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: ['israel-editor-products', options],
    queryFn: async () => {
      let query = supabase
        .from('israel_editor_products')
        .select('*')
        .eq('is_active', true)
        .eq('out_of_stock', false)
        .order('sales_count', { ascending: false, nullsFirst: false });

      if (options?.category) {
        query = query.eq('category_name_hebrew', options.category);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Israel editor products:', error);
        throw error;
      }

      return data as IsraelEditorProduct[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Get all products including out of stock for admin
export const useAllIsraelEditorProducts = () => {
  return useQuery({
    queryKey: ['israel-editor-products-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('israel_editor_products')
        .select('*')
        .order('category_name_hebrew', { ascending: true })
        .order('sales_count', { ascending: false, nullsFirst: false });

      if (error) {
        console.error('Error fetching all Israel editor products:', error);
        throw error;
      }

      return data as IsraelEditorProduct[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
