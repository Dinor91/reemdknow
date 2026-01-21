import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAliExpressProducts, AliExpressProduct } from "@/hooks/useAliExpressProducts";
import { ProductCard, ProductCardSkeleton, UnifiedProduct } from "./ProductCard";

// Transform AliExpress product to unified format
const toUnifiedProduct = (product: AliExpressProduct): UnifiedProduct => ({
  id: product.id,
  productId: product.aliexpress_product_id,
  productName: product.product_name,
  productNameHebrew: product.product_name_hebrew,
  imageUrl: product.image_url,
  priceUsd: product.price_usd,
  originalPriceUsd: product.original_price_usd,
  discountPercentage: product.discount_percentage,
  rating: product.rating,
  salesCount: product.sales_30d,
  trackingLink: product.tracking_link,
  platform: 'aliexpress'
});

export const FeaturedProductsIsrael = () => {
  const isMobile = useIsMobile();
  const { data: products, isLoading, error } = useAliExpressProducts({ 
    featured: true, 
    limit: 8 
  });

  if (error) {
    console.error('Error loading featured products:', error);
  }

  const displayProducts = products?.map(toUnifiedProduct) || [];

  return (
    <section dir="rtl" className="py-12 px-4 md:px-5 bg-background mb-12">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            הכי שווה השבוע
          </h2>
          <p className="text-lg text-muted-foreground">
            המוצרים הכי פופולריים ב-AliExpress
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
          <>
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
                    {displayProducts.map((product) => (
                      <CarouselItem key={product.id} className="pr-4 basis-[85%]">
                        <ProductCard 
                          product={product} 
                          accentColor="blue"
                          ctaText="לדיל באלי"
                        />
                      </CarouselItem>
                    ))}
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
              /* Desktop: Grid - 4 products */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayProducts.slice(0, 4).map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    accentColor="blue"
                    ctaText="לדיל באלי"
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};