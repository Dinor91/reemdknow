import { Laptop, Headphones, Home, Shirt, Dumbbell, Search, X, ExternalLink, Package } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CallToActionBanner } from "./CallToActionBanner";

interface Category {
  icon: any;
  emoji: string;
  title: string;
}

interface ProductData {
  id: string;
  product_name: string;
  product_name_hebrew: string | null;
  image_url: string | null;
  price_usd: number | null;
  original_price_usd: number | null;
  discount_percentage: number | null;
  rating: number | null;
  sales_30d: number | null;
  tracking_link: string | null;
  category_name_hebrew: string | null;
  out_of_stock: boolean | null;
}

const categories: Category[] = [
  {
    icon: Laptop,
    emoji: "💻",
    title: "טכנולוגיה",
  },
  {
    icon: Headphones,
    emoji: "🎧",
    title: "אלקטרוניקה",
  },
  {
    icon: Home,
    emoji: "🏠",
    title: "לבית",
  },
  {
    icon: Shirt,
    emoji: "👕",
    title: "אופנה ואקססוריז",
  },
  {
    icon: Dumbbell,
    emoji: "🏃‍♂️",
    title: "ספורט וטיולים",
  },
  {
    icon: Package,
    emoji: "📦",
    title: "כללי",
  }
];

export const IsraelCategories = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const hasShownRef = useRef(false);

  // Fetch featured products from aliexpress_feed_products
  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('aliexpress_feed_products')
        .select('*')
        .eq('is_featured', true)
        .order('sales_30d', { ascending: false });
      
      if (!error && data) {
        setProducts(data);
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, ProductData[]> = {};
    products.forEach(p => {
      const cat = p.category_name_hebrew || "כללי";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(p);
    });
    return grouped;
  }, [products]);

  const handleProductClick = () => {
    if (!hasShownRef.current) {
      setTimeout(() => {
        setDialogOpen(true);
        hasShownRef.current = true;
      }, 1500);
    }
  };

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    
    const term = searchTerm.trim().toLowerCase();
    return categories.filter(category => {
      // Check if category title matches
      if (category.title.toLowerCase().includes(term)) return true;
      // Check if any product in this category matches
      const categoryProducts = productsByCategory[category.title] || [];
      return categoryProducts.some(p => 
        (p.product_name_hebrew?.toLowerCase().includes(term)) ||
        (p.product_name?.toLowerCase().includes(term))
      );
    });
  }, [searchTerm, productsByCategory]);

  // Get products for a specific category, filtered by search
  const getFilteredProducts = (categoryTitle: string) => {
    const categoryProducts = productsByCategory[categoryTitle] || [];
    if (!searchTerm.trim()) return categoryProducts;
    
    const term = searchTerm.trim().toLowerCase();
    // If category matches, show all products
    if (categoryTitle.toLowerCase().includes(term)) return categoryProducts;
    // Otherwise filter products
    return categoryProducts.filter(p => 
      (p.product_name_hebrew?.toLowerCase().includes(term)) ||
      (p.product_name?.toLowerCase().includes(term))
    );
  };

  const convertToILS = (usd: number) => Math.round(usd * 3.7);

  return (
    <section className="bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Section Title */}
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              ההמלצות של <span dir="ltr">(D)Know</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              לחצו על קטגוריה לראות את כל המוצרים
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-md mx-auto mb-8">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="חיפוש קטגוריה או מוצר..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 pl-10 py-6 text-base rounded-xl border-2 border-border focus:border-blue-400"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {searchTerm && (
              <p className="text-sm text-muted-foreground text-center mt-2">
                נמצאו {filteredCategories.length} קטגוריות
              </p>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">טוען מוצרים...</p>
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                לא נמצאו קטגוריות עבור "{searchTerm}"
              </p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setSearchTerm("")}
              >
                נקה חיפוש
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCategories.map((category, index) => {
                const categoryId = `israel-item-${index}`;
                const categoryProducts = getFilteredProducts(category.title);
                const hasProducts = categoryProducts.length > 0;
                
                return (
                  <Accordion
                    key={index}
                    type="single"
                    collapsible
                    value={openCategory === categoryId ? categoryId : ""}
                    onValueChange={(value) => setOpenCategory(value || null)}
                  >
                    <AccordionItem
                      value={categoryId}
                      className="rounded-xl bg-card shadow-sm border-2 border-border overflow-hidden transition-all hover:border-blue-500 hover:bg-blue-50/50"
                    >
                      <AccordionTrigger className="px-5 py-4 hover:no-underline transition-colors">
                        <div className="flex items-center gap-3 flex-row-reverse w-full">
                          <span className="text-2xl">{category.emoji}</span>
                          <div className="text-right flex-1">
                            <h3 className="text-lg font-semibold text-card-foreground">
                              {category.title}
                            </h3>
                            {hasProducts ? (
                              <span className="text-sm text-muted-foreground">({categoryProducts.length} מוצרים)</span>
                            ) : (
                              <span className="text-sm text-muted-foreground">(בקרוב)</span>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6 bg-muted/30">
                        {hasProducts ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {categoryProducts.map((product) => (
                              <a
                                key={product.id}
                                href={product.tracking_link || "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={handleProductClick}
                                className={`block p-3 rounded-lg border bg-white hover:shadow-md transition-all ${
                                  product.out_of_stock ? 'opacity-60 border-red-200' : 'border-border hover:border-blue-300'
                                }`}
                              >
                                <div className="flex gap-3">
                                  {product.image_url ? (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.product_name_hebrew || product.product_name}
                                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                                      📦
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm line-clamp-2 mb-1">
                                      {product.product_name_hebrew || product.product_name}
                                    </div>
                                    {product.out_of_stock && (
                                      <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mb-1">
                                        אזל במלאי
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2 text-sm">
                                      {product.price_usd && (
                                        <>
                                          <span className="font-bold text-blue-600">${product.price_usd.toFixed(2)}</span>
                                          <span className="text-muted-foreground text-xs">
                                            (~₪{convertToILS(product.price_usd)})
                                          </span>
                                        </>
                                      )}
                                      {product.discount_percentage && product.discount_percentage > 0 && (
                                        <span className="text-xs text-green-600 font-medium">
                                          -{product.discount_percentage}%
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                      {product.rating && <span>⭐ {product.rating.toFixed(1)}</span>}
                                      {product.sales_30d && product.sales_30d > 0 && (
                                        <span>🔥 {product.sales_30d.toLocaleString()} נמכרו</span>
                                      )}
                                    </div>
                                  </div>
                                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                </div>
                              </a>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground text-lg">
                              מוצרים יתווספו בקרוב...
                            </p>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA Banner Dialog */}
      <CallToActionBanner open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
};
