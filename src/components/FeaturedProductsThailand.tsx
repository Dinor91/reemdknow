import { trackFBInitiateCheckout } from "./FacebookPixel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface LazadaProduct {
  productId: number;
  productName: string;
  pictures: string[];
  discountPrice: number;
  currency: string;
  totalCommissionRate: number;
  brandName: string;
  sales7d: number;
  outOfStock: boolean;
}

interface ProductWithLink extends LazadaProduct {
  trackingLink?: string;
}

const useFeaturedProducts = () => {
  return useQuery({
    queryKey: ['featured-lazada-products'],
    queryFn: async () => {
      // Get product feed
      const { data: feedResponse, error: feedError } = await supabase.functions.invoke('lazada-api', {
        body: { action: 'product-feed', offerType: 1, page: 1, limit: 4 }
      });

      if (feedError) throw feedError;

      const products: LazadaProduct[] = feedResponse?.data?.result?.data || [];
      
      if (products.length === 0) return [];

      // Get tracking links for all products
      const productIds = products.map(p => p.productId).join(',');
      const { data: linksResponse } = await supabase.functions.invoke('lazada-api', {
        body: { 
          action: 'batch-links', 
          inputType: 'productId', 
          inputValue: productIds 
        }
      });

      const links = linksResponse?.data?.result?.productBatchGetLinkInfoList || [];
      
      // Merge products with their tracking links
      return products.map((product): ProductWithLink => {
        const linkInfo = links.find((l: { productId: string }) => 
          String(l.productId) === String(product.productId)
        );
        return {
          ...product,
          trackingLink: linkInfo?.regularPromotionLink || `https://www.lazada.co.th/products/-i${product.productId}.html`
        };
      });
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });
};

const formatPrice = (price: number, currency: string) => {
  return `${currency}${price.toLocaleString()}`;
};

const convertToILS = (thbPrice: number) => {
  // Approximate conversion rate THB to ILS
  const rate = 0.11;
  return `₪${Math.round(thbPrice * rate).toLocaleString()}`;
};

const ProductCard = ({ product, onProductClick }: { product: ProductWithLink; onProductClick: (product: ProductWithLink) => void }) => (
  <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 transition-all duration-300 flex flex-col h-full">
    <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-muted">
      <img 
        src={product.pictures?.[0] || '/placeholder.svg'} 
        alt={product.productName}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    </div>
    <h3 className="text-sm font-semibold text-foreground text-right mb-2 leading-tight line-clamp-2 min-h-[2.5rem]">
      {product.productName}
    </h3>
    <div className="flex flex-col gap-1.5 mb-4 text-sm mt-auto">
      <span className="font-bold text-lg text-foreground">
        {formatPrice(product.discountPrice, product.currency)}
      </span>
      <span className="text-muted-foreground text-xs">
        ≈ {convertToILS(product.discountPrice)}
      </span>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
          עמלה: {(product.totalCommissionRate * 100).toFixed(1)}%
        </span>
        {product.sales7d > 0 && (
          <span>🔥 {product.sales7d} נמכרו השבוע</span>
        )}
      </div>
    </div>
    <a
      href={product.trackingLink}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onProductClick(product)}
      className="block w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      לדיל בלאזדה 🛒
    </a>
  </div>
);

const ProductCardSkeleton = () => (
  <div className="bg-card border-2 border-border rounded-2xl p-4 flex flex-col h-full">
    <Skeleton className="aspect-square mb-4 rounded-lg" />
    <Skeleton className="h-10 mb-2" />
    <Skeleton className="h-6 w-24 mb-1" />
    <Skeleton className="h-4 w-16 mb-2" />
    <Skeleton className="h-4 w-32 mb-4" />
    <Skeleton className="h-12 rounded-lg" />
  </div>
);

export const FeaturedProductsThailand = () => {
  const isMobile = useIsMobile();
  const { data: products, isLoading, error } = useFeaturedProducts();

  const handleProductClick = (product: ProductWithLink) => {
    trackFBInitiateCheckout(product.productName, product.trackingLink || '');
  };

  if (error) {
    console.error('Error loading featured products:', error);
    return null;
  }

  return (
    <section dir="rtl" className="py-12 px-4 md:px-5 bg-background mb-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            🔥 הכי שווה השבוע
          </h2>
          <p className="text-lg text-muted-foreground">
            המוצרים עם הכי הרבה עמלה ב-Lazada
          </p>
        </div>

        {/* Mobile: Carousel */}
        {isMobile ? (
          <div className="px-2">
            <Carousel
              opts={{
                align: "center",
                loop: true,
                direction: "rtl",
              }}
              className="w-full"
            >
              <CarouselContent className="-mr-4">
                {isLoading ? (
                  [...Array(4)].map((_, index) => (
                    <CarouselItem key={index} className="pr-4 basis-[85%]">
                      <ProductCardSkeleton />
                    </CarouselItem>
                  ))
                ) : (
                  products?.map((product) => (
                    <CarouselItem key={product.productId} className="pr-4 basis-[85%]">
                      <ProductCard product={product} onProductClick={handleProductClick} />
                    </CarouselItem>
                  ))
                )}
              </CarouselContent>
              <div className="flex justify-center gap-4 mt-6">
                <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 h-10 w-10" />
                <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 h-10 w-10" />
              </div>
            </Carousel>
            <p className="text-center text-sm text-muted-foreground mt-4">
              👈 החליקו לעוד מוצרים
            </p>
          </div>
        ) : (
          /* Desktop: Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoading ? (
              [...Array(4)].map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))
            ) : (
              products?.map((product) => (
                <ProductCard key={product.productId} product={product} onProductClick={handleProductClick} />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
