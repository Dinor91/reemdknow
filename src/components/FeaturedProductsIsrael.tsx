import { Button } from "@/components/ui/button";
import { trackProductClick } from "@/lib/analytics";
import { trackFBInitiateCheckout } from "./FacebookPixel";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";

interface Product {
  icon: string;
  name: string;
  reason: string;
  price: string;
  savings: string;
  rating: string;
  link: string;
}

const featuredProducts: Product[] = [
  {
    icon: "🎧",
    name: "אוזניות Xiaomi Redmi Buds 4 Lite",
    reason: "סאונד מעולה, נוח לריצות. ₪120 פחות מבארץ.",
    price: "₪89",
    savings: "₪120",
    rating: "4.7/5",
    link: "https://s.click.aliexpress.com/e/_ooGLfQN"
  },
  {
    icon: "🔌",
    name: "מטען מהיר Anker 65W",
    reason: "טוען מחשב + טלפון + אוזניות ביחד. ₪80 פחות.",
    price: "₪120",
    savings: "₪80",
    rating: "4.8/5",
    link: "https://s.click.aliexpress.com/e/_ooGLfQN"
  },
  {
    icon: "🎒",
    name: "תיק גב עמיד למים – 30L",
    reason: "מרווח, נוח, עמיד. מושלם לעבודה וטיולים. ₪100 פחות.",
    price: "₪150",
    savings: "₪100",
    rating: "4.6/5",
    link: "https://s.click.aliexpress.com/e/_ooGLfQN"
  },
  {
    icon: "💡",
    name: "מנורת לילה חכמה RGB",
    reason: "16 צבעים, שלט רחוק. הילדים מתים על זה. ₪70 פחות.",
    price: "₪80",
    savings: "₪70",
    rating: "4.7/5",
    link: "https://s.click.aliexpress.com/e/_ooGLfQN"
  }
];

const ProductCard = ({ product, onProductClick }: { product: Product; onProductClick: (product: Product) => void }) => (
  <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-blue-500 flex flex-col h-full">
    {/* Icon */}
    <div className="text-5xl text-center mb-4">{product.icon}</div>

    {/* Product Name */}
    <h3 className="text-lg font-semibold text-card-foreground text-center mb-4 leading-tight min-h-[3rem]">
      {product.name}
    </h3>

    {/* Reason */}
    <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-grow">
      <span className="font-semibold text-foreground">למה כדאי: </span>
      {product.reason}
    </p>

    {/* Details */}
    <div className="flex flex-col gap-1 mb-5 text-sm">
      <span className="font-semibold text-foreground">💰 {product.price}</span>
      <span className="font-semibold text-green-600">חוסכים: {product.savings}</span>
      <span className="text-muted-foreground">⭐ {product.rating}</span>
    </div>

    {/* CTA Button */}
    <a
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onProductClick(product)}
      className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
    >
      לדיל באלי 🛒
    </a>
  </div>
);

export const FeaturedProductsIsrael = () => {
  const isMobile = useIsMobile();

  const handleProductClick = (product: Product) => {
    trackProductClick(product.name, product.link);
    trackFBInitiateCheckout(product.name, "israel");
  };

  return (
    <section dir="rtl" className="py-12 px-4 md:px-5 bg-background mb-12">
      <div className="max-w-6xl mx-auto">
        {/* Section Title */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            🔥 הכי שווה מאלי השבוע
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
                {featuredProducts.map((product, index) => (
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
            {featuredProducts.map((product, index) => (
              <ProductCard key={index} product={product} onProductClick={handleProductClick} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
