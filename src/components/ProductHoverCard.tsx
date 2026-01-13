import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, useState } from "react";

interface ProductInfo {
  productId: string;
  productName: string;
  regularCommission: string;
  regularPromotionLink: string;
}

interface ProductHoverCardProps {
  productUrl: string;
  children: ReactNode;
}

export const ProductHoverCard = ({ productUrl, children }: ProductHoverCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: productInfo, isLoading } = useQuery({
    queryKey: ['product-hover', productUrl],
    queryFn: async (): Promise<ProductInfo | null> => {
      const { data, error } = await supabase.functions.invoke('lazada-api', {
        body: { 
          action: 'batch-links', 
          inputType: 'url', 
          inputValue: productUrl.split('?')[0] // Remove query params for cleaner URL
        }
      });
      
      if (error) {
        console.error('Error fetching product info:', error);
        return null;
      }
      
      // Check urlBatchGetLinkInfoList first
      const urlInfo = data?.data?.result?.data?.urlBatchGetLinkInfoList?.[0];
      if (urlInfo) {
        return {
          productId: urlInfo.productId,
          productName: urlInfo.productName || '',
          regularCommission: urlInfo.regularCommission || '',
          regularPromotionLink: urlInfo.regularPromotionLink || ''
        };
      }
      
      // Check productBatchGetLinkInfoList as fallback
      const productInfo = data?.data?.result?.data?.productBatchGetLinkInfoList?.[0];
      if (productInfo) {
        return {
          productId: productInfo.productId,
          productName: productInfo.productName || '',
          regularCommission: productInfo.regularCommission || '',
          regularPromotionLink: productInfo.regularPromotionLink || ''
        };
      }
      
      return null;
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: false,
  });

  return (
    <HoverCard openDelay={200} closeDelay={100} open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-72 p-4 bg-card border-2 border-orange-200 shadow-xl z-50"
        dir="rtl"
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-32" />
          </div>
        ) : productInfo && productInfo.productName ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground line-clamp-2">
              {productInfo.productName}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                ✓ קישור אפיליאט פעיל
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            🔗 לחצו למעבר לדיל ב-Lazada
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
