import { Home, Baby, Search, X, ExternalLink, Package, Car, Smartphone, Heart, Wrench, Shirt } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CallToActionBanner } from "./CallToActionBanner";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface Category {
  icon: any;
  emoji: string;
  title: string;
}

// Unified product for display
interface DisplayProduct {
  id: string;
  name: string;
  image_url: string | null;
  price_thb: number | null;
  rating: number | null;
  sales_count: number | null;
  tracking_link: string;
  category: string;
  out_of_stock: boolean;
}

const categories: Category[] = [
  { icon: Smartphone, emoji: "📱", title: "גאדג׳טים ובית חכם" },
  { icon: Car, emoji: "🚗", title: "רכב ותחבורה" },
  { icon: Home, emoji: "🏠", title: "בית ומטבח" },
  { icon: Shirt, emoji: "👕", title: "אופנה וסטייל" },
  { icon: Baby, emoji: "👶", title: "ילדים ומשחקים" },
  { icon: Heart, emoji: "💪", title: "בריאות וספורט" },
  { icon: Wrench, emoji: "🔧", title: "כלי עבודה וציוד" },
  { icon: Package, emoji: "📦", title: "כללי" },
];

const CTA_STORAGE_KEY = 'thailand_cta_last_shown';
const WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

const shouldShowCTA = (): boolean => {
  const lastShown = localStorage.getItem(CTA_STORAGE_KEY);
  if (!lastShown) return true;
  const timeSince = Date.now() - parseInt(lastShown, 10);
  return timeSince > WEEK_IN_MS;
};

const markCTAShown = () => {
  localStorage.setItem(CTA_STORAGE_KEY, Date.now().toString());
};

export const ThailandCategories = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch products from category_products table
  const { data: dbProducts = [], isLoading: loading } = useQuery({
    queryKey: ['thailand-category-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('category_products')
        .select('*')
        .eq('is_active', true)
        .order('sales_count', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Transform DB products to unified format
  const products: DisplayProduct[] = useMemo(() => {
    return dbProducts.map(p => ({
      id: p.id,
      name: p.name_hebrew,
      image_url: p.image_url,
      price_thb: p.price_thb,
      rating: p.rating,
      sales_count: p.sales_count,
      tracking_link: p.affiliate_link,
      category: p.category,
      out_of_stock: p.out_of_stock || false,
    }));
  }, [dbProducts]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const grouped: Record<string, DisplayProduct[]> = {};
    products.forEach(p => {
      const cat = p.category || "כללי";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(p);
    });
    return grouped;
  }, [products]);

  const handleProductClick = () => {
    if (shouldShowCTA()) {
      setTimeout(() => {
        setDialogOpen(true);
        markCTAShown();
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
        p.name.toLowerCase().includes(term)
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
      p.name.toLowerCase().includes(term)
    );
  };

  const convertThbToILS = (thb: number) => Math.round(thb * 0.10);

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
                className="pr-10 pl-10 py-6 text-base rounded-xl border-2 border-border focus:border-orange-400"
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCategories.map((category, index) => {
                const categoryId = `thailand-item-${index}`;
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
                      className="rounded-xl bg-card shadow-sm border-2 border-border overflow-hidden transition-all hover:border-orange-500 hover:bg-orange-50/50"
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
                                  product.out_of_stock ? 'opacity-60 border-red-200' : 'border-border hover:border-orange-300'
                                }`}
                              >
                                <div className="flex gap-3">
                                  {product.image_url ? (
                                    <img 
                                      src={product.image_url} 
                                      alt={product.name}
                                      className="w-16 h-16 rounded object-cover flex-shrink-0"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl flex-shrink-0">
                                      📦
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm line-clamp-2 mb-1">
                                      {product.name}
                                    </div>
                                    {product.out_of_stock && (
                                      <span className="inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded mb-1">
                                        אזל במלאי
                                      </span>
                                    )}
                                    {product.price_thb && product.price_thb > 0 && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="font-bold text-orange-600">฿{product.price_thb.toFixed(0)}</span>
                                        <span className="text-muted-foreground text-xs">
                                          (~₪{convertThbToILS(product.price_thb)})
                                        </span>
                                      </div>
                                    )}
                                    {((product.rating != null && product.rating > 0) || (product.sales_count != null && product.sales_count > 0)) && (
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                        {product.rating != null && product.rating > 0 && <span>⭐ {product.rating.toFixed(1)}</span>}
                                        {product.sales_count != null && product.sales_count > 0 && (
                                          <span>🔥 {product.sales_count.toLocaleString()} נמכרו</span>
                                        )}
                                      </div>
                                    )}
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
      <CallToActionBanner open={dialogOpen} onOpenChange={setDialogOpen} country="thailand" />
    </section>
  );
};
