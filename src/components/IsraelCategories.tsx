import { Laptop, Headphones, Home, Shirt, Dumbbell, Search, X } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

interface Category {
  icon: any;
  emoji: string;
  title: string;
  comingSoon: boolean;
}

const categories: Category[] = [
  {
    icon: Laptop,
    emoji: "💻",
    title: "טכנולוגיה",
    comingSoon: true
  },
  {
    icon: Headphones,
    emoji: "🎧",
    title: "אלקטרוניקה",
    comingSoon: true
  },
  {
    icon: Home,
    emoji: "🏠",
    title: "לבית",
    comingSoon: true
  },
  {
    icon: Shirt,
    emoji: "👕",
    title: "אופנה ואקססוריז",
    comingSoon: true
  },
  {
    icon: Dumbbell,
    emoji: "🏃‍♂️",
    title: "ספורט וטיולים",
    comingSoon: true
  }
];

export const IsraelCategories = () => {
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter categories based on search term
  const filteredCategories = useMemo(() => {
    if (!searchTerm.trim()) return categories;
    
    const term = searchTerm.trim().toLowerCase();
    return categories.filter(category => 
      category.title.toLowerCase().includes(term)
    );
  }, [searchTerm]);

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
                placeholder="חיפוש קטגוריה..."
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

          {/* Categories */}
          {filteredCategories.length === 0 ? (
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
                            <span className="text-sm text-muted-foreground">(מוצרים בהמשך)</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-6 bg-muted/30">
                        <div className="text-center py-8">
                          <p className="text-muted-foreground text-lg">
                            מוצרים יתווספו בקרוב...
                          </p>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
