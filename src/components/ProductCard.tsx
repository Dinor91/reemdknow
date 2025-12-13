import { Product, appendAffiliateSubId, AffiliateSource } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Star, ShoppingCart } from "lucide-react";
import { trackProductClick } from "@/lib/analytics";
import { trackFBInitiateCheckout } from "@/components/FacebookPixel";

interface ProductCardProps {
  product: Product;
  affiliateSource?: AffiliateSource;
}

export const ProductCard = ({ product, affiliateSource = "website" }: ProductCardProps) => {
  const handleClick = () => {
    trackProductClick(product.product_title, product.product_link);
    trackFBInitiateCheckout(product.product_title, product.product_price.toString());
    
    const link = appendAffiliateSubId(product.product_link, affiliateSource);
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const currencySymbol = product.platform === "AliExpress" ? "₪" : "฿";

  return (
    <div className="bg-card rounded-xl shadow-lg overflow-hidden border border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Product Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        <img
          src={product.product_image}
          alt={product.product_title}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        {product.product_discount && (
          <div className="absolute top-2 right-2 bg-[#f28433] text-white text-sm font-bold px-2 py-1 rounded-lg">
            -{product.product_discount}%
          </div>
        )}
        <div className="absolute bottom-2 left-2 bg-background/90 text-foreground text-xs font-medium px-2 py-1 rounded">
          {product.platform}
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-foreground text-sm md:text-base line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.product_title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-medium text-foreground">{product.product_rating}</span>
          <span className="text-xs text-muted-foreground">({product.product_reviews.toLocaleString()})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg font-bold text-[#f28433]">
            {currencySymbol}{product.product_price.toLocaleString()}
          </span>
          {product.product_original_price && (
            <span className="text-sm text-muted-foreground line-through">
              {currencySymbol}{product.product_original_price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Buy Button */}
        <Button
          onClick={handleClick}
          className="w-full mt-auto bg-[#f28433] hover:bg-[#e07328] text-white font-bold gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          לקנייה
        </Button>
      </div>
    </div>
  );
};
