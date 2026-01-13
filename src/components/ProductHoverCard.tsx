import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, useState } from "react";

interface ProductHoverCardProps {
  productUrl: string;
  productNameHebrew: string;
  children: ReactNode;
}

export const ProductHoverCard = ({ productUrl, productNameHebrew, children }: ProductHoverCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: productInfo, isLoading } = useQuery({
    queryKey: ['product-hover-db', productUrl],
    queryFn: async () => {
      // First try to get from database
      const { data, error } = await supabase
        .from('category_products')
        .select('*')
        .eq('affiliate_link', productUrl)
        .maybeSingle();

      if (error) {
        console.error('Error fetching product:', error);
        return null;
      }

      if (data) {
        return data;
      }

      // Try without query params
      const urlWithoutParams = productUrl.split('?')[0];
      const { data: data2 } = await supabase
        .from('category_products')
        .select('*')
        .ilike('affiliate_link', `${urlWithoutParams}%`)
        .maybeSingle();

      return data2;
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
  });

  const formatPrice = (price: number | null) => {
    if (!price) return null;
    return `฿${price.toLocaleString()}`;
  };

  return (
    <HoverCard openDelay={200} closeDelay={100} open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-72 p-0 bg-card border border-border shadow-xl z-50 overflow-hidden"
        dir="rtl"
      >
        {isLoading ? (
          <div className="p-3 space-y-2">
            <Skeleton className="h-32 w-full rounded" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : productInfo ? (
          <div>
            {productInfo.image_url && (
              <div className="w-full h-32 bg-muted">
                <img 
                  src={productInfo.image_url} 
                  alt={productNameHebrew}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                {productNameHebrew}
              </p>
              {productInfo.name_english && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {productInfo.name_english}
                </p>
              )}
              {(productInfo.price_thb || productInfo.rating || (productInfo.sales_count && productInfo.sales_count > 0)) && (
                <div className="flex items-center gap-3">
                  {productInfo.price_thb && productInfo.price_thb > 0 && (
                    <span className="text-base font-bold text-orange-600">
                      {formatPrice(productInfo.price_thb)}
                    </span>
                  )}
                  {productInfo.rating && productInfo.rating > 0 && (
                    <span className="text-xs text-muted-foreground">
                      ⭐ {productInfo.rating}
                    </span>
                  )}
                  {productInfo.sales_count && productInfo.sales_count > 0 && (
                    <span className="text-xs text-muted-foreground">
                      🔥 {productInfo.sales_count} נמכרו
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-3">
            <p className="text-sm font-medium text-foreground">
              {productNameHebrew}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              לחצו לצפייה ב-Lazada
            </p>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
