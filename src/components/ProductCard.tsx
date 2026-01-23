import { trackProductClick } from "@/lib/analytics";
import { trackFBInitiateCheckout } from "./FacebookPixel";

export interface UnifiedProduct {
  id: string;
  productId: string;
  productName: string;
  productNameHebrew: string | null;
  imageUrl: string | null;
  priceUsd: number | null;
  originalPriceUsd: number | null;
  priceThb?: number | null;  // Original THB price for Lazada
  originalPriceThb?: number | null;
  discountPercentage: number | null;
  rating: number | null;
  salesCount: number | null;
  trackingLink: string | null;
  platform: 'aliexpress' | 'lazada';
}

// Convert THB to USD (approximate rate)
const THB_TO_USD_RATE = 0.028;

// Convert USD to ILS (approximate rate)
const USD_TO_ILS_RATE = 3.7;

export const formatPriceUsd = (price: number | null): string => {
  if (!price) return '';
  return `$${price.toFixed(2)}`;
};

export const formatPriceThb = (price: number | null): string => {
  if (!price) return '';
  return `฿${Math.round(price).toLocaleString()}`;
};

export const convertToILS = (usdPrice: number | null): string => {
  if (!usdPrice) return '';
  const ilsPrice = usdPrice * USD_TO_ILS_RATE;
  return `~₪${ilsPrice.toFixed(0)}`;
};

export const convertThbToILS = (thbPrice: number | null): string => {
  if (!thbPrice) return '';
  // THB to ILS (via USD): THB * 0.028 * 3.7 ≈ THB * 0.104
  const ilsPrice = thbPrice * THB_TO_USD_RATE * USD_TO_ILS_RATE;
  return `~₪${Math.round(ilsPrice)}`;
};

export const convertThbToUsd = (thbPrice: number | null): number | null => {
  if (!thbPrice) return null;
  return thbPrice * THB_TO_USD_RATE;
};

interface ProductCardProps {
  product: UnifiedProduct;
  onProductClick?: (product: UnifiedProduct) => void;
  accentColor?: 'blue' | 'orange';
  ctaText?: string;
}

export const ProductCard = ({ 
  product, 
  onProductClick,
  accentColor = 'blue',
  ctaText = 'לדיל'
}: ProductCardProps) => {
  const displayName = product.productNameHebrew || product.productName;
  const hasImage = product.imageUrl && product.imageUrl.length > 0;
  
  const accentClasses = {
    blue: {
      border: 'hover:border-blue-500',
      button: 'bg-blue-600 hover:bg-blue-700',
      discount: 'text-green-600',
      sales: 'bg-blue-100 text-blue-700'
    },
    orange: {
      border: 'hover:border-orange-400',
      button: 'bg-orange-500 hover:bg-orange-600',
      discount: 'text-green-600',
      sales: 'bg-orange-100 text-orange-700'
    }
  };

  const colors = accentClasses[accentColor];

  const handleClick = () => {
    if (onProductClick) {
      onProductClick(product);
    }
    trackProductClick(displayName, product.trackingLink || '');
    trackFBInitiateCheckout(displayName, product.platform === 'aliexpress' ? 'israel' : 'thailand');
  };

  return (
    <div className={`bg-card border-2 border-border rounded-2xl p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${colors.border} flex flex-col h-full`}>
      {/* 1. Product Image */}
      <div className="w-full aspect-square mb-4 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        {hasImage ? (
          <img 
            src={product.imageUrl!} 
            alt={displayName}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl">📦</span>
        )}
      </div>

      {/* Product Name */}
      <h3 className="text-sm font-semibold text-foreground text-center mb-3 leading-tight min-h-[2.5rem] line-clamp-2">
        {displayName}
      </h3>

      {/* 2. Price - THB for Lazada, USD for AliExpress */}
      <div className="flex flex-col items-center gap-1 mb-3">
        <div className="flex items-center gap-2">
          {product.platform === 'lazada' && product.priceThb ? (
            <>
              <span className="font-bold text-xl text-foreground">
                {formatPriceThb(product.priceThb)}
              </span>
              {product.originalPriceThb && product.originalPriceThb > (product.priceThb || 0) && (
                <span className="text-muted-foreground line-through text-sm">
                  {formatPriceThb(product.originalPriceThb)}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="font-bold text-xl text-foreground">
                {formatPriceUsd(product.priceUsd)}
              </span>
              {product.originalPriceUsd && product.originalPriceUsd > (product.priceUsd || 0) && (
                <span className="text-muted-foreground line-through text-sm">
                  {formatPriceUsd(product.originalPriceUsd)}
                </span>
              )}
            </>
          )}
        </div>

        {/* 3. Estimated price in ILS */}
        <span className="text-muted-foreground text-xs">
          {product.platform === 'lazada' && product.priceThb
            ? convertThbToILS(product.priceThb)
            : convertToILS(product.priceUsd)
          }
        </span>

        {/* 4. Discount */}
        {product.discountPercentage && product.discountPercentage > 0 && (
          <span className={`font-semibold text-sm ${colors.discount}`}>
            -{product.discountPercentage}% הנחה
          </span>
        )}
      </div>

      {/* 5. Rating + Sales */}
      <div className="flex justify-center items-center gap-3 mb-4 text-xs">
        {product.rating != null && product.rating > 0 && (
          <span className="text-muted-foreground">⭐ {product.rating.toFixed(1)}</span>
        )}
        {product.salesCount != null && product.salesCount > 0 && (
          <span className={`px-2 py-0.5 rounded-full font-medium ${colors.sales}`}>
            🔥 {product.salesCount.toLocaleString()} נמכרו
          </span>
        )}
      </div>

      {/* CTA Button */}
      <a
        href={product.trackingLink || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`block w-full py-3 px-4 ${colors.button} text-white text-base font-semibold text-center rounded-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] mt-auto`}
      >
        {ctaText}
      </a>
    </div>
  );
};

export const ProductCardSkeleton = () => (
  <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm flex flex-col h-full">
    <div className="w-full aspect-square mb-4 rounded-lg bg-muted animate-pulse" />
    <div className="h-10 bg-muted rounded mb-3 animate-pulse" />
    <div className="h-6 w-20 mx-auto bg-muted rounded mb-1 animate-pulse" />
    <div className="h-4 w-16 mx-auto bg-muted rounded mb-2 animate-pulse" />
    <div className="h-4 w-24 mx-auto bg-muted rounded mb-4 animate-pulse" />
    <div className="h-12 bg-muted rounded-lg mt-auto animate-pulse" />
  </div>
);