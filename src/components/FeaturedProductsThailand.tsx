import { trackFBInitiateCheckout } from "./FacebookPixel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface FeedProduct {
  id: string;
  lazada_product_id: string;
  product_name: string;
  image_url: string | null;
  price_thb: number | null;
  currency: string | null;
  sales_7d?: number | null;
  category_l1: number | null;
  category_name_hebrew: string | null;
  brand_name: string | null;
  tracking_link: string | null;
  is_featured: boolean | null;
  out_of_stock: boolean | null;
}

const useFeaturedProducts = () => {
  return useQuery({
    queryKey: ['featured-feed-products'],
    queryFn: async () => {
      // Use the secure RPC function that hides sensitive data
      const { data: cachedProducts, error: cacheError } = await supabase
        .rpc('get_public_feed_products');

      // Filter and limit the results client-side
      if (!cacheError && cachedProducts && cachedProducts.length >= 4) {
        // Sort: featured products first, then by sales
        const sorted = [...cachedProducts]
          .filter((p: FeedProduct) => !p.out_of_stock)
          .sort((a: FeedProduct, b: FeedProduct) => {
            // Featured products come first
            if (a.is_featured && !b.is_featured) return -1;
            if (!a.is_featured && b.is_featured) return 1;
            // Then sort by sales
            return (b.sales_7d || 0) - (a.sales_7d || 0);
          })
          .slice(0, 8);
        return sorted as FeedProduct[];
      }

      // Fallback to live API call if cache is empty
      const { data: feedResponse, error: feedError } = await supabase.functions.invoke('lazada-api', {
        body: { action: 'product-feed', offerType: 1, page: 1, limit: 20 }
      });

      if (feedError) throw feedError;

      let products = feedResponse?.data?.result?.data || [];
      
      products = products
        .filter((p: any) => !p.outOfStock && p.discountPrice > 0)
        .sort((a: any, b: any) => (b.sales7d || 0) - (a.sales7d || 0))
        .slice(0, 8);
      
      if (products.length === 0) return [];

      // Get tracking links for all products
      const productIds = products.map((p: any) => p.productId).join(',');
      const { data: linksResponse } = await supabase.functions.invoke('lazada-api', {
        body: { 
          action: 'batch-links', 
          inputType: 'productId', 
          inputValue: productIds 
        }
      });

      const links = linksResponse?.data?.result?.productBatchGetLinkInfoList || [];
      
      // Transform to FeedProduct format
      return products.map((product: any): FeedProduct => {
        const linkInfo = links.find((l: { productId: string }) => 
          String(l.productId) === String(product.productId)
        );
        return {
          id: String(product.productId),
          lazada_product_id: String(product.productId),
          product_name: product.productName,
          image_url: product.pictures?.[0] || null,
          price_thb: product.discountPrice,
          currency: product.currency || '฿',
          sales_7d: product.sales7d || 0,
          category_l1: product.categoryL1,
          category_name_hebrew: null,
          brand_name: product.brandName,
          tracking_link: linkInfo?.regularPromotionLink || `https://www.lazada.co.th/products/-i${product.productId}.html`,
          is_featured: false,
          out_of_stock: false
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
  const rate = 0.11;
  return `₪${Math.round(thbPrice * rate).toLocaleString()}`;
};

const ProductCard = ({ product, onProductClick }: { product: FeedProduct; onProductClick: (product: FeedProduct) => void }) => {
  // Use Hebrew translation if available, otherwise use original product name
  const displayName = product.category_name_hebrew || product.product_name;
  
  return (
    <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 transition-all duration-300 flex flex-col h-full">
      <div className="aspect-square mb-4 overflow-hidden rounded-lg bg-muted">
        <img 
          src={product.image_url || '/placeholder.svg'} 
          alt={displayName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      <h3 className="text-sm font-semibold text-foreground text-right mb-2 leading-tight line-clamp-2 min-h-[2.5rem]">
        {displayName}
      </h3>
    <div className="flex flex-col gap-1.5 mb-4 text-sm mt-auto">
      {product.price_thb && (
        <>
          <span className="font-bold text-lg text-foreground">
            {formatPrice(product.price_thb, product.currency || '฿')}
          </span>
          <span className="text-muted-foreground text-xs">
            ≈ {convertToILS(product.price_thb)}
          </span>
        </>
      )}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {product.sales_7d && product.sales_7d > 0 && (
          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            {product.sales_7d} נמכרו השבוע
          </span>
        )}
      </div>
    </div>
    <a
      href={product.tracking_link || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onProductClick(product)}
      className="block w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white text-base font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      לדיל בלאזדה
    </a>
  </div>
);};

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

  const handleProductClick = (product: FeedProduct) => {
    trackFBInitiateCheckout(product.product_name, product.tracking_link || '');
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
            הכי שווה השבוע
          </h2>
          <p className="text-lg text-muted-foreground">
            המוצרים הכי פופולריים ב-Lazada
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
                    <CarouselItem key={product.lazada_product_id} className="pr-4 basis-[85%]">
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
              החליקו לעוד מוצרים
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
              products?.slice(0, 4).map((product) => (
                <ProductCard key={product.lazada_product_id} product={product} onProductClick={handleProductClick} />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
};
