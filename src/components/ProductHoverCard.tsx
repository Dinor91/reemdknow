import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, useState } from "react";

interface ProductInfo {
  productId: number;
  productName: string;
  pictures: string[];
  discountPrice: number;
  currency: string;
  totalCommissionRate: number;
  trackingLink?: string;
}

interface ProductHoverCardProps {
  productUrl: string;
  children: ReactNode;
}

// Extract product ID from Lazada URL
const extractProductId = (url: string): string | null => {
  // Match patterns like i5340164561 or -i5340164561.html
  const match = url.match(/[-_]i(\d+)(?:\.html|[-_]|$)/i);
  if (match) return match[1];
  
  // Match c.lazada URLs - these are affiliate links, try to extract from path
  const cMatch = url.match(/c\.lazada\.[^/]+\/t\/c\.([A-Za-z0-9]+)/);
  if (cMatch) return null; // These are short links, can't extract ID
  
  // Match s.lazada URLs
  const sMatch = url.match(/s\.lazada\.[^/]+\/s\.([A-Za-z0-9]+)/);
  if (sMatch) return null;
  
  return null;
};

export const ProductHoverCard = ({ productUrl, children }: ProductHoverCardProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const productId = extractProductId(productUrl);

  const { data: productInfo, isLoading } = useQuery({
    queryKey: ['product-hover', productUrl],
    queryFn: async (): Promise<ProductInfo | null> => {
      // If we have a product ID, use batch-links to get info
      if (productId) {
        const { data } = await supabase.functions.invoke('lazada-api', {
          body: { 
            action: 'batch-links', 
            inputType: 'productId', 
            inputValue: productId 
          }
        });
        
        const linkInfo = data?.data?.result?.productBatchGetLinkInfoList?.[0];
        if (linkInfo) {
          return {
            productId: parseInt(linkInfo.productId),
            productName: linkInfo.productName || '',
            pictures: [],
            discountPrice: 0,
            currency: '฿',
            totalCommissionRate: parseFloat(linkInfo.regularCommission?.replace('%', '') || '0') / 100,
            trackingLink: linkInfo.regularPromotionLink
          };
        }
      }
      
      // Otherwise, try using the URL directly
      const { data } = await supabase.functions.invoke('lazada-api', {
        body: { 
          action: 'batch-links', 
          inputType: 'url', 
          inputValue: productUrl 
        }
      });
      
      const linkInfo = data?.data?.result?.urlBatchGetLinkInfoList?.[0];
      if (linkInfo) {
        return {
          productId: parseInt(linkInfo.productId || '0'),
          productName: linkInfo.productName || '',
          pictures: [],
          discountPrice: 0,
          currency: '฿',
          totalCommissionRate: parseFloat(linkInfo.regularCommission?.replace('%', '') || '0') / 100,
          trackingLink: linkInfo.regularPromotionLink
        };
      }
      
      return null;
    },
    enabled: isOpen, // Only fetch when hover card is open
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    retry: false,
  });

  return (
    <HoverCard openDelay={300} closeDelay={100} open={isOpen} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent 
        side="top" 
        align="center" 
        className="w-64 p-3 bg-card border-2 border-border shadow-lg z-50"
        dir="rtl"
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        ) : productInfo ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground line-clamp-2">
              {productInfo.productName || 'מוצר מ-Lazada'}
            </p>
            {productInfo.totalCommissionRate > 0 && (
              <p className="text-xs text-green-600">
                עמלה: {(productInfo.totalCommissionRate * 100).toFixed(1)}%
              </p>
            )}
            {productInfo.trackingLink && (
              <p className="text-xs text-muted-foreground">
                ✓ קישור אפיליאט זמין
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            לחצו למעבר לדיל ב-Lazada
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
