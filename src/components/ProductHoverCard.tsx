import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ReactNode, useState } from "react";

interface ProductInfo {
  productId: string;
  productName: string;
}

interface ProductHoverCardProps {
  productUrl: string;
  productNameHebrew: string; // The Hebrew name we already have
  children: ReactNode;
}

// Shorten and clean product name
const shortenProductName = (name: string, maxLength: number = 40): string => {
  if (!name) return '';
  
  // Remove common filler words and emojis
  let cleaned = name
    .replace(/[⚡💯®™]/g, '')
    .replace(/Authentic|Delivery Within.*?Hours?|from America|Many Colors.*?From/gi, '')
    .trim();
  
  if (cleaned.length <= maxLength) return cleaned;
  
  // Truncate and add ellipsis
  return cleaned.substring(0, maxLength).trim() + '...';
};

export const ProductHoverCard = ({ productUrl, productNameHebrew, children }: ProductHoverCardProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: productInfo, isLoading } = useQuery({
    queryKey: ['product-hover', productUrl],
    queryFn: async (): Promise<ProductInfo | null> => {
      const { data, error } = await supabase.functions.invoke('lazada-api', {
        body: { 
          action: 'batch-links', 
          inputType: 'url', 
          inputValue: productUrl.split('?')[0]
        }
      });
      
      if (error) {
        console.error('Error fetching product info:', error);
        return null;
      }
      
      const urlInfo = data?.data?.result?.data?.urlBatchGetLinkInfoList?.[0];
      if (urlInfo) {
        return {
          productId: urlInfo.productId,
          productName: urlInfo.productName || ''
        };
      }
      
      return null;
    },
    enabled: isOpen,
    staleTime: 1000 * 60 * 30,
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
        className="w-64 p-3 bg-card border border-border shadow-lg z-50"
        dir="rtl"
      >
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-24" />
          </div>
        ) : productInfo && productInfo.productName ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {productNameHebrew}
            </p>
            <p className="text-xs text-muted-foreground">
              {shortenProductName(productInfo.productName)}
            </p>
          </div>
        ) : (
          <p className="text-sm font-medium text-foreground">
            {productNameHebrew}
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  );
};
