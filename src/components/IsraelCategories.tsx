import { Laptop, Headphones, Home, Shirt, Dumbbell } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";

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

  return (
    <section className="bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          {/* Section Title */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              📦 כל המוצרים לפי קטגוריה
            </h2>
            <p className="text-lg text-muted-foreground">
              לחצו על קטגוריה לראות את כל המוצרים
            </p>
          </div>

          {/* Accordion */}
          <div className="space-y-4">
            {categories.map((category, index) => {
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
                          📦 מוצרים יתווספו בקרוב...
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
