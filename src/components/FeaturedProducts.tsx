import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { trackProductClick } from "@/lib/analytics";
import { trackFBInitiateCheckout } from "./FacebookPixel";

interface Product {
  name: string;
  description: string;
  link: string;
  image?: string;
}

interface FeaturedProductsProps {
  products: Product[];
  country: "israel" | "thailand";
}

export const FeaturedProducts = ({ products, country }: FeaturedProductsProps) => {
  const handleProductClick = (product: Product) => {
    trackProductClick(product.name, product.link);
    trackFBInitiateCheckout(product.name, product.link);
  };

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-foreground">
            מוצרים מומלצים
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
                {product.image && (
                  <div className="aspect-square overflow-hidden bg-muted">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold mb-3 text-foreground">
                    {product.name}
                  </h3>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {product.description}
                  </p>
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => handleProductClick(product)}
                  >
                    <Button className="w-full group-hover:scale-105 transition-transform">
                      <ExternalLink className="ml-2 h-4 w-4" />
                      {country === "israel" ? "קנה ב-AliExpress" : "קנה ב-Lazada"}
                    </Button>
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
