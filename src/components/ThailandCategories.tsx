import { Home, Baby, Sparkles, Hammer, Trees, Tent, Utensils, Sofa, ShieldCheck, WashingMachine, ExternalLink } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CallToActionBanner } from "./CallToActionBanner";
import { ProductHoverCard } from "./ProductHoverCard";
import { useRef, useState } from "react";

interface Product {
  name: string;
  link: string;
}

interface Category {
  icon: any;
  emoji: string;
  title: string;
  description: string;
  products: Product[];
}

const categories: Category[] = [
  {
    icon: Home,
    emoji: "🔌",
    title: "מוצרי חשמל",
    description: "מכשירי חשמל לבית",
    products: [
      { name: "מתקן מים", link: "https://c.lazada.co.th/t/c.X31ts4?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מיקרוגל MIDEA", link: "https://c.lazada.co.th/t/c.X31v21?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "קומקום", link: "https://c.lazada.co.th/t/c.X31E0R?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "טוסטר", link: "https://c.lazada.co.th/t/c.X3tjTX?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מצנם", link: "https://c.lazada.co.th/t/c.X3tjSI?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "הליכון קומפקטי", link: "https://c.lazada.co.th/t/c.X3tj51?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "שואב רובוטי שוטף", link: "https://c.lazada.co.th/t/c.X3tj9L?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מסנן אוויר XIAOMI", link: "https://c.lazada.co.th/t/c.X3tQ8d?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מטען נייד UGREEN", link: "https://c.lazada.co.th/t/c.XeQjoD?sub_id1=+November-+first+campaign+&sub_aff_id=Reem%28D%29Know" },
      { name: "שייקר NINJA", link: "https://c.lazada.co.th/t/c.XeQjqK?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" }
    ]
  },
  {
    icon: Sofa,
    emoji: "🪑",
    title: "ריהוט ונוחות",
    description: "רהיטים ואביזרים לבית",
    products: [
      { name: "שולחן+כיסא פינת אוכל", link: "https://c.lazada.co.th/t/c.X31FBY" },
      { name: "כיסאות בר", link: "https://c.lazada.co.th/t/c.X31FtB" },
      { name: "מעקה מיטת ילד", link: "https://c.lazada.co.th/t/c.X31tRa?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מעמד למחשב נייד", link: "https://c.lazada.co.th/t/c.X31vZX" },
      { name: "שידות מיטה", link: "https://c.lazada.co.th/t/c.X31FtO" },
      { name: "קונסולה (חדר משחקים/סלון)", link: "https://www.lazada.co.th/products/xuxu-12090cm-i5340164561-s22696809645.html" },
      { name: "שולחן עבודה פשוט", link: "https://c.lazada.co.th/t/c.X31FGT" },
      { name: "שולחן סלון", link: "https://c.lazada.co.th/t/c.X31FGJ" },
      { name: "סל כביסה", link: "https://c.lazada.co.th/t/c.X31FGB" },
      { name: "ספת רביצה", link: "https://c.lazada.co.th/t/c.X31Fuj" }
    ]
  },
  {
    icon: Utensils,
    emoji: "🇮🇱",
    title: "מוצרי מזון ישראליים",
    description: "מזון ישראלי באיכות",
    products: [
      { name: "קפה טורקי", link: "https://c.lazada.co.th/t/c.X31twh?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "במבה", link: "https://c.lazada.co.th/t/c.X31tDK?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ביסלי", link: "https://c.lazada.co.th/t/c.X31tzt?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ויטמנצ'יק", link: "https://c.lazada.co.th/t/c.X31tAT?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "טחינה גולמית הר ברכה", link: "https://c.lazada.co.th/t/c.X31tAm?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "יין לקידוש תירוש", link: "https://c.lazada.co.th/t/c.X31G8o" },
      { name: "פתיבר", link: "https://c.lazada.co.th/t/c.X31GRG" },
      { name: "חלבה בטעם וניל", link: "https://c.lazada.co.th/t/c.X31G8X" },
      { name: "כוסמת", link: "https://c.lazada.co.th/t/c.X31GRZ" },
      { name: "שקדי מרק", link: "https://c.lazada.co.th/t/c.X31GQD" }
    ]
  },
  {
    icon: Baby,
    emoji: "👶",
    title: "לילדים",
    description: "משחקים וציוד לילדים",
    products: [
      { name: "מגנטים STEAM", link: "https://c.lazada.co.th/t/c.X31tgc?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מכוניות הוט ווילס", link: "https://c.lazada.co.th/t/c.X31tjT?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "LEGO בתפזורת", link: "https://c.lazada.co.th/t/c.X31tjG?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ג'אנגה (לבני עץ)", link: "https://c.lazada.co.th/t/c.X31tRC?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מגנטים Marble", link: "https://c.lazada.co.th/t/c.X4kEIE?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "משחק איות אנגלית", link: "https://c.lazada.co.th/t/c.X31va0" },
      { name: "משטח פעילות לתינוק", link: "https://c.lazada.co.th/t/c.X3tQEF?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מגן מזרון תינוק", link: "https://c.lazada.co.th/t/c.X3tQvv?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מגן מזרון פעוט", link: "https://c.lazada.co.th/t/c.X3tQBF?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מצופים", link: "https://c.lazada.co.th/t/c.X3tQyO?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" }
    ]
  },
  {
    icon: ShieldCheck,
    emoji: "🦟",
    title: "הדברה",
    description: "פתרונות הדברה ובטיחות",
    products: [
      { name: "דוחה יתושים חשמלי", link: "https://c.lazada.co.th/t/c.X31tIq?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "רשת מגנטית לדלת", link: "https://c.lazada.co.th/t/c.X31tFr?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ג'ל אנטי נמלים", link: "https://c.lazada.co.th/t/c.X31Glt" },
      { name: "תרסיס אנטי נמלים", link: "https://c.lazada.co.th/t/c.XeQ8f0?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "קוטל ג'וקים לניקוז", link: "https://c.lazada.co.th/t/c.XeQ85O?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ספריי נגד מזיקים", link: "https://c.lazada.co.th/t/c.X31GmQ" }
    ]
  },
  {
    icon: WashingMachine,
    emoji: "🧺",
    title: "מוצרי ניקיון וכביסה",
    description: "ניקיון וכביסה איכותיים",
    products: [
      { name: "מטליות חיטוי CIF", link: "https://c.lazada.co.th/t/c.X31Ga4?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מטליות ניקוי סנו", link: "https://c.lazada.co.th/t/c.X3tQpy?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מגבונים", link: "https://c.lazada.co.th/t/c.X3tQGW?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "אבקת כביסה", link: "https://c.lazada.co.th/t/c.XeQ8T4?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ג'ל כביסה", link: "https://c.lazada.co.th/t/c.XeQ87e?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "טבליות כביסה TIDE", link: "https://c.lazada.co.th/t/c.XeQ8Rc?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "טבליות כביסה TIDE OXI", link: "https://c.lazada.co.th/t/c.XeQ8je?sub_id1=November-+first+campaign+&sub_aff_id=Reem%28D%29Know" },
      { name: "טוש מסיר כתם TIDE OXI", link: "https://c.lazada.co.th/t/c.XeQ8RK?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מתלה כביסה קומפקטי", link: "https://c.lazada.co.th/t/c.XeQ8lb?sub_id1=+November-+first+campaign+&sub_aff_id=Reem%28D%29Know" },
      { name: "מתלה כביסה גדול", link: "https://c.lazada.co.th/t/c.XeQ8mq?sub_id1=+November-+first+campaign+&sub_aff_id=Reem%28D%29Know" }
    ]
  },
  {
    icon: Hammer,
    emoji: "🔧",
    title: "DIY",
    description: "כלים ופתרונות חכמים",
    products: [
      { name: "וו תלייה דביק", link: "https://c.lazada.co.th/t/c.X31Gcb?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מגוון אזיקונים", link: "https://c.lazada.co.th/t/c.X31t9M?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מברגה עדינה", link: "https://c.lazada.co.th/t/c.X31tl6?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "ברגים לקיר גבס", link: "https://c.lazada.co.th/t/c.X31tPz?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מברגה מולטי טול", link: "https://c.lazada.co.th/t/c.XeQ8Jx?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "פטיש", link: "https://c.lazada.co.th/t/c.XeQ8H9?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מפצל שקעים קומפקטי", link: "https://c.lazada.co.th/t/c.XeQ8FZ?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מפצל שקעים גדול", link: "https://c.lazada.co.th/t/c.XeQ8xY?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מתאם שקע", link: "https://c.lazada.co.th/t/c.XeQ8w9?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מסמר פלדה", link: "https://c.lazada.co.th/t/c.XeQ8DX?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" }
    ]
  },
  {
    icon: Trees,
    emoji: "🌳",
    title: "חצר וגינה",
    description: "פתרונות לחוץ",
    products: [
      { name: "רשת צל", link: "https://c.lazada.co.th/t/c.X31t4z?sub_aff_id=Reem%28D%29Know" },
      { name: "גדר לבריכה", link: "https://s.lazada.co.th/s.ZZimFo?cc" },
      { name: "ממטרה+צינור", link: "https://c.lazada.co.th/t/c.X31t90?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "שולחן מתקפל", link: "https://c.lazada.co.th/t/c.X31t9B?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מזרקה לילדים", link: "https://c.lazada.co.th/t/c.XeQ8ya?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "בריכה מתנפחת", link: "https://c.lazada.co.th/t/c.XeQ8yr?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "בריכת פעוטות מתנפחת", link: "https://c.lazada.co.th/t/c.XeQjdd?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "טרמפולינה", link: "https://c.lazada.co.th/t/c.XeQ8Bl?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מיטת שיזוף", link: "https://c.lazada.co.th/t/c.XeQjbG?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "שער כדורגל", link: "https://c.lazada.co.th/t/c.XeQ8zL?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" }
    ]
  },
  {
    icon: Tent,
    emoji: "⛺",
    title: "טיולים",
    description: "ציוד חכם למשפחות מטיילות",
    products: [
      { name: "מעמד לטלפון", link: "https://c.lazada.co.th/t/c.X31tkk?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "בקבוק Owala", link: "https://c.lazada.co.th/t/c.X31FBL" },
      { name: "קרם הגנה", link: "https://c.lazada.co.th/t/c.X31Ft7" },
      { name: "טרמפיסט לעגלת תינוק", link: "https://c.lazada.co.th/t/c.X31FJM" },
      { name: "צידנית", link: "https://c.lazada.co.th/t/c.XeQj3t?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מחצלת", link: "https://c.lazada.co.th/t/c.XeQjPB?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "כיסא מתקפל", link: "https://c.lazada.co.th/t/c.XeQjOB?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "סט משחקי חול", link: "https://c.lazada.co.th/t/c.XeQjar?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "מטריה", link: "https://c.lazada.co.th/t/c.XeQjNb?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" },
      { name: "שכמיה", link: "https://c.lazada.co.th/t/c.XeQjnc?sub_id1=November-+first+campaign&sub_aff_id=Reem%28D%29Know" }
    ]
  }
];

export const ThailandCategories = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const hasShownRef = useRef(false);

  const handleProductClick = () => {
    if (!hasShownRef.current) {
      setTimeout(() => {
        setDialogOpen(true);
        hasShownRef.current = true;
      }, 1500);
    }
  };

  return (
    <section className="bg-background py-8 md:py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-6xl">
          {/* Section Title */}
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              ההמלצות של (D)Know
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              לחצו על קטגוריה לראות את כל המוצרים
            </p>
          </div>
          {/* First 8 categories in 2 columns */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {categories.slice(0, 8).map((category, index) => {
              const Icon = category.icon;
              const categoryId = `item-${index}`;
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
                    className="rounded-xl bg-card shadow-sm border-2 border-border overflow-hidden transition-all hover:border-orange-400 hover:bg-orange-50/50"
                  >
                    <AccordionTrigger className="px-5 py-4 hover:no-underline transition-colors">
                      <div className="flex items-center gap-3 flex-row-reverse w-full">
                        <span className="text-2xl">{category.emoji}</span>
                        <div className="text-right flex-1">
                          <h3 className="text-lg font-semibold text-card-foreground">
                            {category.title}
                          </h3>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-5 pb-4">
                      <div className="grid gap-3 sm:grid-cols-2 mt-2">
                        {category.products.map((product, productIndex) => (
                          <ProductHoverCard key={productIndex} productUrl={product.link} productNameHebrew={product.name}>
                            <Button
                              variant="outline"
                              className="justify-between h-auto py-3 px-4 w-full"
                              asChild
                            >
                              <a
                                href={product.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => handleProductClick()}
                                className="flex items-center gap-2 flex-row-reverse"
                              >
                                <span className="text-right flex-1">{product.name}</span>
                                <ExternalLink className="h-4 w-4 flex-shrink-0" />
                              </a>
                            </Button>
                          </ProductHoverCard>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              );
            })}
          </div>

          {/* 9th category centered */}
          {categories[8] && (
            <div className="max-w-2xl mx-auto">
              <Accordion
                type="single"
                collapsible
                value={openCategory === "item-8" ? "item-8" : ""}
                onValueChange={(value) => setOpenCategory(value || null)}
              >
                <AccordionItem
                  value="item-8"
                  className="rounded-xl bg-card shadow-sm border-2 border-border overflow-hidden transition-all hover:border-orange-400 hover:bg-orange-50/50"
                >
                  <AccordionTrigger className="px-5 py-4 hover:no-underline transition-colors">
                    <div className="flex items-center gap-3 flex-row-reverse w-full">
                      <span className="text-2xl">{categories[8].emoji}</span>
                      <div className="text-right flex-1">
                        <h3 className="text-lg font-semibold text-card-foreground">
                          {categories[8].title}
                        </h3>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-4">
                    <div className="grid gap-3 sm:grid-cols-2 mt-2">
                      {categories[8].products.map((product, productIndex) => (
                        <ProductHoverCard key={productIndex} productUrl={product.link} productNameHebrew={product.name}>
                          <Button
                            variant="outline"
                            className="justify-between h-auto py-3 px-4 w-full"
                            asChild
                          >
                            <a
                              href={product.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => handleProductClick()}
                              className="flex items-center gap-2 flex-row-reverse"
                            >
                              <span className="text-right flex-1">{product.name}</span>
                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </a>
                          </Button>
                        </ProductHoverCard>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </div>
      </div>
      <CallToActionBanner open={dialogOpen} onOpenChange={setDialogOpen} />
    </section>
  );
};
