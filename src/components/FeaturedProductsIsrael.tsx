import { trackProductClick } from "@/lib/analytics";
import { trackFBInitiateCheckout } from "./FacebookPixel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAliExpressProducts, AliExpressProduct } from "@/hooks/useAliExpressProducts";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback static products for when database is empty
const fallbackProducts = [
  {
    id: "fallback-1",
    aliexpress_product_id: "fallback-1",
    product_name: "Xiaomi Redmi Buds 4 Lite",
    product_name_hebrew: "אוזניות Xiaomi Redmi Buds 4 Lite",
    image_url: null,
    price_usd: 25,
    original_price_usd: 45,
    discount_percentage: 44,
    sales_30d: 1500,
    rating: 4.7,
    tracking_link: "https://s.click.aliexpress.com/e/_ooGLfQN",
    is_featured: true,
    out_of_stock: false,
  },
  {
    id: "fallback-2",
    aliexpress_product_id: "fallback-2",
    product_name: "Anker 65W Fast Charger",
    product_name_hebrew: "מטען מהיר Anker 65W",
    image_url: null,
    price_usd: 35,
    original_price_usd: 55,
    discount_percentage: 36,
    sales_30d: 2000,
    rating: 4.8,
    tracking_link: "https://s.click.aliexpress.com/e/_ooGLfQN",
    is_featured: true,
    out_of_stock: false,
  },
  {
    id: "fallback-3",
    aliexpress_product_id: "fallback-3",
    product_name: "Waterproof Backpack 30L",
    product_name_hebrew: "תיק גב עמיד למים – 30L",
    image_url: null,
    price_usd: 40,
    original_price_usd: 70,
    discount_percentage: 43,
    sales_30d: 800,
    rating: 4.6,
    tracking_link: "https://s.click.aliexpress.com/e/_ooGLfQN",
    is_featured: true,
    out_of_stock: false,
  },
  {
    id: "fallback-4",
    aliexpress_product_id: "fallback-4",
    product_name: "RGB Smart Night Light",
    product_name_hebrew: "מנורת לילה חכמה RGB",
    image_url: null,
    price_usd: 20,
    original_price_usd: 40,
    discount_percentage: 50,
    sales_30d: 1200,
    rating: 4.7,
    tracking_link: "https://s.click.aliexpress.com/e/_ooGLfQN",
    is_featured: true,
    out_of_stock: false,
  }
];

const formatPrice = (price: number | null, currency: string = '$'): string => {
  if (!price) return '';
  return `${currency}${price.toFixed(0)}`;
};

const convertToILS = (usdPrice: number | null): string => {
  if (!usdPrice) return '';
  const ilsPrice = usdPrice * 3.7; // Approximate USD to ILS
  return `~₪${ilsPrice.toFixed(0)}`;
};

const ProductCard = ({ 
  product, 
  onProductClick 
}: { 
  product: AliExpressProduct | typeof fallbackProducts[0]; 
  onProductClick: (product: AliExpressProduct | typeof fallbackProducts[0]) => void;
}) => {
  const displayName = product.product_name_hebrew || product.product_name;
  const hasImage = product.image_url && product.image_url.length > 0;

  return (
    <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-500 flex flex-col h-full">
      {/* Product Image or Emoji */}
      <div className="w-full h-32 mb-4 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {hasImage ? (
          <img 
            src={product.image_url!} 
            alt={displayName}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl">📦</span>
        )}
      </div>

      {/* Product Name */}
      <h3 className="text-base font-semibold text-card-foreground text-center mb-3 leading-tight min-h-[2.5rem] line-clamp-2">
        {displayName}
      </h3>

      {/* Price Info */}
      <div className="flex flex-col gap-1 mb-4 text-sm">
        <div className="flex items-center justify-center gap-2">
          <span className="font-bold text-lg text-foreground">
            {formatPrice(product.price_usd)}
          </span>
          {product.original_price_usd && product.original_price_usd > (product.price_usd || 0) && (
            <span className="text-muted-foreground line-through text-sm">
              {formatPrice(product.original_price_usd)}
            </span>
          )}
        </div>
        <span className="text-center text-muted-foreground text-xs">
          {convertToILS(product.price_usd)}
        </span>
        {product.discount_percentage && product.discount_percentage > 0 && (
          <span className="text-center font-semibold text-green-600 text-sm">
            -{product.discount_percentage}% הנחה
          </span>
        )}
      </div>

      {/* Rating & Sales */}
      <div className="flex justify-center gap-3 mb-4 text-xs text-muted-foreground">
        {product.rating && (
          <span>⭐ {product.rating.toFixed(1)}</span>
        )}
        {product.sales_30d && product.sales_30d > 0 && (
          <span>🔥 {product.sales_30d.toLocaleString()} מכירות</span>
        )}
      </div>

      {/* CTA Button */}
      <a
        href={product.tracking_link || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onProductClick(product)}
        className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-auto"
      >
        לדיל באלי
      </a>
    </div>
  );
};

const ProductCardSkeleton = () => (
  <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm flex flex-col h-full">
    <Skeleton className="w-full h-32 mb-4 rounded-lg" />
    <Skeleton className="h-5 w-3/4 mx-auto mb-3" />
    <Skeleton className="h-6 w-1/2 mx-auto mb-2" />
    <Skeleton className="h-4 w-1/3 mx-auto mb-4" />
    <Skeleton className="h-10 w-full rounded-lg mt-auto" />
  </div>
);

export const FeaturedProductsIsrael = () => {
  const isMobile = useIsMobile();
  const { data: products, isLoading, error } = useAliExpressProducts({ 
    featured: true, 
    limit: 8 
  });

  const handleProductClick = (product: AliExpressProduct | typeof fallbackProducts[0]) => {
    const name = product.product_name_hebrew || product.product_name;
    trackProductClick(name, product.tracking_link || '');
    trackFBInitiateCheckout(name, "israel");
  };

  // Use database products if available, otherwise fallback to static
  // Only use fallback if no products from DB
  const displayProducts = products && products.length > 0 ? products : fallbackProducts;

  if (error) {
    console.error('Error loading featured products:', error);
  }

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
                    {displayProducts.map((product, index) => (
                      <CarouselItem key={product.id || index} className="pr-4 basis-[85%]">
                        <ProductCard product={product as AliExpressProduct} onProductClick={handleProductClick} />
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
              /* Desktop: Grid - 4 products like Thailand */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayProducts.slice(0, 4).map((product, index) => (
                  <ProductCard key={product.id || index} product={product as AliExpressProduct} onProductClick={handleProductClick} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};
