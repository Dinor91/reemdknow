import { trackFBInitiateCheckout } from "./FacebookPixel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Product {
  icon: string;
  name: string;
  reason: string;
  priceTHB: string;
  priceILS: string;
  savings: string;
  rating: string;
  link: string;
}

const products: Product[] = [
  {
    icon: "🚁",
    name: "DJI Mini 3 Pro",
    reason: "₪3,200 פחות מישראל. מגיע למלון תוך יומיים.",
    priceTHB: "฿18,900",
    priceILS: "₪2,100",
    savings: "₪3,200",
    rating: "4.8/5",
    link: "https://s.lazada.co.th/s.0Zzb0"
  },
  {
    icon: "💻",
    name: "MacBook Air M2 – 256GB",
    reason: "אותו מוצר, ₪1,800 פחות. משלמים רק כשמגיע.",
    priceTHB: "฿38,900",
    priceILS: "₪4,300",
    savings: "₪1,800",
    rating: "4.9/5",
    link: "https://s.lazada.co.th/s.0Zzb0"
  },
  {
    icon: "🎧",
    name: "Sony WH-1000XM5",
    reason: "₪600 פחות. מוצר מקורי עם אחריות בינלאומית.",
    priceTHB: "฿9,900",
    priceILS: "₪1,100",
    savings: "₪600",
    rating: "4.7/5",
    link: "https://s.lazada.co.th/s.0Zzb0"
  },
  {
    icon: "📹",
    name: "GoPro Hero 12 Black",
    reason: "₪900 פחות. מושלם לטיול בתאילנד.",
    priceTHB: "฿14,900",
    priceILS: "₪1,650",
    savings: "₪900",
    rating: "4.8/5",
    link: "https://s.lazada.co.th/s.0Zzb0"
  }
];

const ProductCard = ({ product, onProductClick }: { product: Product; onProductClick: (product: Product) => void }) => (
  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-orange-400 transition-all duration-300 flex flex-col h-full">
    <div className="text-5xl text-center mb-4">{product.icon}</div>
    <h3 className="text-xl font-semibold text-foreground text-center mb-4 leading-tight">
      {product.name}
    </h3>
    <p className="text-sm text-muted-foreground mb-4 flex-grow">
      <span className="font-semibold text-foreground">למה כדאי:</span>{" "}
      {product.reason}
    </p>
    <div className="flex flex-col gap-1.5 mb-5 text-sm">
      <span className="font-semibold text-foreground">
        💰 {product.priceTHB} ({product.priceILS})
      </span>
      <span className="font-semibold text-green-600">
        חוסכים: {product.savings}
      </span>
      <span className="text-muted-foreground">
        ⭐ {product.rating}
      </span>
    </div>
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onProductClick(product)}
      className="block w-full py-3.5 px-6 bg-orange-500 hover:bg-orange-600 text-white text-lg font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      לדיל בלאזדה 🛒
    </a>
  </div>
);

export const FeaturedProductsThailand = () => {
  const isMobile = useIsMobile();

  const handleProductClick = (product: Product) => {
    trackFBInitiateCheckout(product.name, product.link);
  };

  return (
    <section dir="rtl" className="py-12 px-4 md:px-5 bg-background mb-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            🔥 הכי שווה השבוע
          </h2>
          <p className="text-lg text-muted-foreground">
            המוצרים עם הכי הרבה חיסכון
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
                {products.map((product, index) => (
                  <CarouselItem key={index} className="pr-4 basis-[85%]">
                    <ProductCard product={product} onProductClick={handleProductClick} />
                  </CarouselItem>
                ))}
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
            {products.map((product, index) => (
              <ProductCard key={index} product={product} onProductClick={handleProductClick} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
