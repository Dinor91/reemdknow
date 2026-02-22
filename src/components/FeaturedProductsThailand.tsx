import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductCard, ProductCardSkeleton, UnifiedProduct, convertThbToUsd } from "./ProductCard";

interface FeedProduct {
  id: string;
  lazada_product_id: string;
  product_name: string;
  image_url: string | null;
  price_thb: number | null;
  original_price_thb: number | null;
  discount_percentage: number | null;
  rating: number | null;
  currency: string | null;
  sales_7d: number | null;
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
      const { data: products, error } = await supabase
        .from('feed_products')
        .select('*')
        .eq('out_of_stock', false)
        .order('sales_7d', { ascending: false, nullsFirst: false })
        .limit(6);

      if (error) throw error;

      // Sort: featured products first, then by sales
      const sorted = [...(products || [])]
        .sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return (b.sales_7d || 0) - (a.sales_7d || 0);
        });

      return sorted as FeedProduct[];
    },
    staleTime: 1000 * 60 * 10,
  });
};

// Transform Lazada product to unified format
const toUnifiedProduct = (product: FeedProduct): UnifiedProduct => ({
  id: product.id,
  productId: product.lazada_product_id,
  productName: product.product_name,
  productNameHebrew: product.category_name_hebrew,
  imageUrl: product.image_url,
  priceUsd: convertThbToUsd(product.price_thb),
  originalPriceUsd: convertThbToUsd(product.original_price_thb),
  priceThb: product.price_thb,
  originalPriceThb: product.original_price_thb,
  discountPercentage: product.discount_percentage,
  rating: product.rating,
  salesCount: product.sales_7d,
  trackingLink: product.tracking_link,
  platform: 'lazada'
});

export const FeaturedProductsThailand = () => {
  const isMobile = useIsMobile();
  const { data: products, isLoading, error } = useFeaturedProducts();

  if (error) {
    console.error('Error loading featured products:', error);
    return null;
  }

  const displayProducts = products?.map(toUnifiedProduct) || [];

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

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="px-2">
            <Carousel
              opts={{
                align: "start",
                loop: true,
                direction: "rtl",
              }}
              className="w-full"
            >
              <CarouselContent className="-mr-4">
                {displayProducts.map((product) => (
                  <CarouselItem key={product.id} className={`pr-4 ${isMobile ? 'basis-[85%]' : 'basis-[25%]'}`}>
                    <ProductCard 
                      product={product} 
                      accentColor="orange"
                      ctaText="לדיל בלאזדה"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-4 mt-6">
                <CarouselNext className="relative inset-0 translate-x-0 translate-y-0 h-10 w-10" />
                <CarouselPrevious className="relative inset-0 translate-x-0 translate-y-0 h-10 w-10" />
              </div>
            </Carousel>
            {isMobile && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                החליקו לעוד מוצרים
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
};