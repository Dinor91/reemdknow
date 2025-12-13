import { Product, AffiliateSource } from "@/types/product";
import { ProductCard } from "./ProductCard";

interface ProductGridProps {
  products: Product[];
  title?: string;
  affiliateSource?: AffiliateSource;
}

export const ProductGrid = ({ products, title, affiliateSource = "website" }: ProductGridProps) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-2xl md:text-3xl font-bold text-[#f28433] text-center mb-8">
            {title}
          </h2>
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              affiliateSource={affiliateSource}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
