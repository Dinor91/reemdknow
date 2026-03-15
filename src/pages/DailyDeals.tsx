import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Pencil, Sparkles, Check } from "lucide-react";

type Platform = "lazada" | "aliexpress";

interface CategoryOption {
  label: string;
  emoji: string;
  filterValues: string[] | number[] | "all";
}

interface LazadaCategoryOption extends CategoryOption {
  curatedCategories?: string[];
}

const LAZADA_CATEGORIES: LazadaCategoryOption[] = [
  { label: "Games & Kids", emoji: "🎮", filterValues: [5090, 5095], curatedCategories: ["ילדים"] },
  { label: "Gadgets", emoji: "📱", filterValues: [42062201], curatedCategories: ["גאדג׳טים", "בית חכם", "כלי עבודה"] },
  { label: "Small Appliances", emoji: "🏠", filterValues: [3833], curatedCategories: ["בית", "בית חכם"] },
  { label: "Best Sellers", emoji: "⭐", filterValues: "all" },
];

const ALIEXPRESS_CATEGORIES: CategoryOption[] = [
  { label: "Gadgets & Tech", emoji: "📱", filterValues: ["15", "44", "7", "202192403"] },
  { label: "Tools & Home", emoji: "🔧", filterValues: ["1511", "34", "13", "39"] },
  { label: "Toys", emoji: "🎮", filterValues: ["26"] },
  { label: "Best Sellers", emoji: "⭐", filterValues: "all" },
];

interface ProductItem {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  original_price: number | null;
  sales: number | null;
  rating: number | null;
  brand: string | null;
  category: string | null;
  tracking_link: string | null;
  discount_percentage: number | null;
  source?: "feed" | "curated";
}

const DailyDeals = () => {
  const [platform, setPlatform] = useState<Platform>("lazada");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [coupon, setCoupon] = useState("");
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [editedMessage, setEditedMessage] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [copied, setCopied] = useState(false);
  const [highCommission, setHighCommission] = useState(false);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const { toast } = useToast();

  const categories = platform === "lazada" ? LAZADA_CATEGORIES : ALIEXPRESS_CATEGORIES;

  // Fetch category counts when platform or commission mode changes
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (platform === "aliexpress") {
          let query = supabase
            .from("aliexpress_feed_products")
            .select("category_id")
            .eq("out_of_stock", false);
          if (highCommission) query = query.eq("is_campaign_product", true);
          const { data, error } = await query;
          if (error) throw error;
          const counts: Record<string, number> = {};
          let total = 0;
          for (const row of data || []) {
            if (row.category_id) {
              counts[row.category_id] = (counts[row.category_id] || 0) + 1;
            }
            total++;
          }
          const result: Record<string, number> = {};
          for (const cat of ALIEXPRESS_CATEGORIES) {
            if (cat.filterValues === "all") {
              result[cat.label] = total;
            } else {
              result[cat.label] = (cat.filterValues as string[]).reduce((sum, id) => sum + (counts[id] || 0), 0);
            }
          }
          setCategoryCounts(result);
        } else {
          let feedQuery = supabase.from("feed_products").select("category_l1").eq("out_of_stock", false);
          if (highCommission) feedQuery = feedQuery.gte("commission_rate", 0.15);
          const [feedRes, curatedRes] = await Promise.all([
            feedQuery,
            supabase.from("category_products").select("category").eq("is_active", true),
          ]);
          const feedCounts: Record<number, number> = {};
          let feedTotal = 0;
          for (const row of feedRes.data || []) {
            if (row.category_l1) {
              feedCounts[row.category_l1] = (feedCounts[row.category_l1] || 0) + 1;
            }
            feedTotal++;
          }
          const curatedCounts: Record<string, number> = {};
          let curatedTotal = 0;
          for (const row of curatedRes.data || []) {
            if (row.category) {
              curatedCounts[row.category] = (curatedCounts[row.category] || 0) + 1;
            }
            curatedTotal++;
          }
          const result: Record<string, number> = {};
          for (const cat of LAZADA_CATEGORIES) {
            const lazCat = cat as LazadaCategoryOption;
            if (cat.filterValues === "all") {
              result[cat.label] = feedTotal + (highCommission ? 0 : curatedTotal);
            } else {
              const feedCount = (cat.filterValues as number[]).reduce((sum, id) => sum + (feedCounts[id] || 0), 0);
              const curCount = highCommission ? 0 : (lazCat.curatedCategories || []).reduce((sum, c) => sum + (curatedCounts[c] || 0), 0);
              result[cat.label] = feedCount + curCount;
            }
          }
          setCategoryCounts(result);
        }
      } catch (e) {
        console.error("Error fetching category counts:", e);
      }
    };
    fetchCounts();
  }, [platform, highCommission]);

  const fetchProducts = async (cat: CategoryOption) => {
    setLoadingProducts(true);
    setSelectedCategory(cat.label);
    setSelectedProduct(null);
    setGeneratedMessage("");

    try {
      let items: ProductItem[] = [];

      if (platform === "lazada") {
        const lazadaCat = cat as LazadaCategoryOption;

        // Query feed_products
        let feedQuery = supabase
          .from("feed_products")
          .select("id, product_name, image_url, price_thb, original_price_thb, sales_7d, rating, brand_name, category_name_hebrew, tracking_link, discount_percentage, category_l1")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") {
          feedQuery = feedQuery.in("category_l1", cat.filterValues as number[]);
        }
        feedQuery = feedQuery.order("sales_7d", { ascending: false, nullsFirst: false }).order("rating", { ascending: false, nullsFirst: false }).limit(20);

        // Query category_products (curated)
        let curatedQuery = supabase
          .from("category_products")
          .select("id, name_hebrew, name_english, price_thb, image_url, affiliate_link, category, rating, sales_count")
          .eq("is_active", true);
        if (lazadaCat.curatedCategories) {
          curatedQuery = curatedQuery.in("category", lazadaCat.curatedCategories);
        }
        curatedQuery = curatedQuery.order("sales_count", { ascending: false, nullsFirst: false }).order("rating", { ascending: false, nullsFirst: false }).limit(20);

        const [feedRes, curatedRes] = await Promise.all([feedQuery, curatedQuery]);
        if (feedRes.error) throw feedRes.error;
        if (curatedRes.error) throw curatedRes.error;

        const feedItems: ProductItem[] = (feedRes.data || []).map((p: any) => ({
          id: p.id,
          name: p.product_name_hebrew || p.product_name,
          image_url: p.image_url,
          price: p.price_thb,
          original_price: p.original_price_thb,
          sales: p.sales_7d,
          rating: p.rating,
          brand: p.brand_name,
          category: p.category_name_hebrew,
          tracking_link: p.tracking_link,
          discount_percentage: p.discount_percentage,
          source: "feed" as const,
        }));

        const curatedItems: ProductItem[] = (curatedRes.data || []).map((p) => ({
          id: `curated-${p.id}`,
          name: p.name_hebrew || p.name_english || "Unknown",
          image_url: p.image_url,
          price: p.price_thb,
          original_price: null,
          sales: p.sales_count,
          rating: p.rating,
          brand: null,
          category: p.category,
          tracking_link: p.affiliate_link,
          discount_percentage: null,
          source: "curated" as const,
        }));

        // Merge, deduplicate by first 40 chars of name, sort by sales then rating, limit 10
        const merged = [...curatedItems, ...feedItems];
        const seen = new Set<string>();
        const deduped: ProductItem[] = [];
        for (const item of merged) {
          const key = (item.name || "").substring(0, 40).toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            deduped.push(item);
          }
        }
        deduped.sort((a, b) => {
          const salesDiff = (b.sales || 0) - (a.sales || 0);
          if (salesDiff !== 0) return salesDiff;
          return (b.rating || 0) - (a.rating || 0);
        });
        items = deduped.slice(0, 10);

      } else {
        let query = supabase
          .from("aliexpress_feed_products")
          .select("id, aliexpress_product_id, product_name, product_name_hebrew, image_url, price_usd, original_price_usd, sales_30d, rating, category_name_hebrew, tracking_link, discount_percentage, category_id, commission_rate")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") {
          query = query.in("category_id", cat.filterValues as string[]);
        }
        const { data, error } = await query
          .order("sales_30d", { ascending: false, nullsFirst: false })
          .order("rating", { ascending: false, nullsFirst: false })
          .order("commission_rate", { ascending: false, nullsFirst: false })
          .limit(20);
        if (error) throw error;

        items = (data || []).map((p) => {
          const shortLink = `https://www.aliexpress.com/item/${p.aliexpress_product_id}.html`;
          return {
            id: p.id,
            name: p.product_name_hebrew || p.product_name,
            image_url: p.image_url,
            price: p.price_usd,
            original_price: p.original_price_usd,
            sales: p.sales_30d,
            rating: p.rating,
            brand: null,
            category: p.category_name_hebrew,
            tracking_link: shortLink,
            discount_percentage: p.discount_percentage,
          };
        }).slice(0, 10);
      }

      setProducts(items);
    } catch (e) {
      console.error("Error fetching products:", e);
      toast({ title: "שגיאה בטעינת מוצרים", variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  };

  const generateMessage = async () => {
    if (!selectedProduct) return;
    setLoadingMessage(true);
    setGeneratedMessage("");
    setIsEditing(false);

    const currencySymbol = platform === "lazada" ? "฿" : "$";
    const priceStr = selectedProduct.price ? `${selectedProduct.price} ${currencySymbol}` : "לא ידוע";

    try {
      const { data, error } = await supabase.functions.invoke("generate-deal-message", {
        body: {
          product: {
            name: selectedProduct.name,
            price: priceStr,
            rating: selectedProduct.rating ?? null,
            sales_7d: selectedProduct.sales ?? 0,
            brand: selectedProduct.brand || "",
            category: selectedProduct.category || "",
            url: selectedProduct.tracking_link || "",
          },
          coupon: coupon.trim() || "",
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setGeneratedMessage(data.message);
      setEditedMessage(data.message);
    } catch (e: any) {
      console.error("Error generating message:", e);
      toast({ title: "שגיאה ביצירת הודעה", description: e.message, variant: "destructive" });
    } finally {
      setLoadingMessage(false);
    }
  };

  const copyToClipboard = async () => {
    const text = isEditing ? editedMessage : generatedMessage;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast({ title: "שגיאה בהעתקה", variant: "destructive" });
    }
  };

  const handlePlatformSwitch = (p: Platform) => {
    setPlatform(p);
    setSelectedCategory(null);
    setProducts([]);
    setSelectedProduct(null);
    setGeneratedMessage("");
    setCoupon("");
    setHighCommission(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">📦 Daily Deals Generator</h1>
          <p className="text-muted-foreground">בחר פלטפורמה וקטגוריה ← קבל מוצר ← הודעה מוכנה לשליחה</p>
        </div>

        {/* Platform Selector */}
        <div className="grid grid-cols-2 gap-3 mb-8 max-w-md mx-auto">
          <Button
            size="lg"
            variant={platform === "lazada" ? "default" : "outline"}
            className={`text-sm sm:text-lg px-3 sm:px-6 py-6 transition-all w-full ${platform === "lazada" ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-orange-500 text-orange-500 hover:bg-orange-50"}`}
            onClick={() => handlePlatformSwitch("lazada")}
          >
            🇹🇭 Lazada Thailand
          </Button>
          <Button
            size="lg"
            variant={platform === "aliexpress" ? "default" : "outline"}
            className={`text-sm sm:text-lg px-3 sm:px-6 py-6 transition-all w-full ${platform === "aliexpress" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-600 text-blue-600 hover:bg-blue-50"}`}
            onClick={() => handlePlatformSwitch("aliexpress")}
          >
            🇮🇱 AliExpress Israel
          </Button>
        </div>

        {/* High Commission Toggle */}
        <div className="flex justify-center mb-6">
          <Button
            variant={highCommission ? "default" : "outline"}
            onClick={() => setHighCommission(!highCommission)}
            className={`gap-2 ${highCommission ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          >
            💰 {highCommission ? "עמלה גבוהה ✓" : "עמלה גבוהה"}
          </Button>
        </div>

        {/* Category Buttons with counts */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {categories.map((cat) => {
            const count = categoryCounts[cat.label];
            return (
              <Button
                key={cat.label}
                variant={selectedCategory === cat.label ? "default" : "outline"}
                onClick={() => fetchProducts(cat)}
                className="text-base"
              >
                {cat.emoji} {cat.label}{count != null ? ` (${count})` : ""}
              </Button>
            );
          })}
        </div>

        {/* Loading */}
        {loadingProducts && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Product Cards */}
        {!loadingProducts && products.length > 0 && (
          <div className="grid gap-4 mb-8">
            {products.map((product) => (
              <Card
                key={product.id}
                className={`cursor-pointer transition-all hover:shadow-md ${selectedProduct?.id === product.id ? "ring-2 ring-primary" : ""}`}
                onClick={() => { setSelectedProduct(product); setGeneratedMessage(""); setIsEditing(false); }}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex gap-3 items-start">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-md bg-muted flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground line-clamp-2 text-sm mb-1">{product.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {product.price != null && product.price > 0 && (
                          <Badge variant="secondary" className="text-sm font-bold">
                            {platform === "lazada" ? `฿${product.price}` : `$${product.price}`}
                          </Badge>
                        )}
                        {product.discount_percentage != null && product.discount_percentage > 0 && (
                          <Badge variant="destructive" className="text-xs">-{product.discount_percentage}%</Badge>
                        )}
                      </div>
                      {product.sales != null && product.sales > 0 && (
                        <span className="text-xs text-muted-foreground block mt-1">
                          🔥 נמכר {product.sales} פעמים {platform === "lazada" ? "השבוע" : "החודש"}
                        </span>
                      )}
                      {product.brand && (
                        <p className="text-xs text-muted-foreground mt-1">{product.brand}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3"
                    onClick={(e) => { e.stopPropagation(); setSelectedProduct(product); setGeneratedMessage(""); setIsEditing(false); }}
                  >
                    ✍️ צור הודעה
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Message Generator Form */}
        {selectedProduct && (
          <Card className="mb-8">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-foreground">✍️ יצירת הודעה עבור: {selectedProduct.name}</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-sm text-muted-foreground mb-1 block">קופון (אם יש)</label>
                  <Input
                    placeholder="למשל: TH10"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                </div>
                <Button onClick={generateMessage} disabled={loadingMessage} className="gap-2">
                  {loadingMessage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  🪄 צור הודעה
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Message */}
        {(generatedMessage || loadingMessage) && (
          <Card className="mb-8">
            <CardContent className="p-6">
              {loadingMessage ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">יוצר הודעה...</span>
                </div>
              ) : isEditing ? (
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="min-h-[300px] text-sm leading-relaxed"
                  dir="rtl"
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground" dir="rtl">
                  {generatedMessage}
                </div>
              )}

              {generatedMessage && !loadingMessage && (
                <div className="flex gap-3 mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (isEditing) {
                        setIsEditing(false);
                      } else {
                        setEditedMessage(generatedMessage);
                        setIsEditing(true);
                      }
                    }}
                    className="gap-2"
                  >
                    <Pencil className="h-4 w-4" />
                    {isEditing ? "סיום עריכה" : "✏️ ערוך"}
                  </Button>
                  <Button onClick={copyToClipboard} className="gap-2">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "✅ הועתק!" : "📋 העתק לWhatsApp"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DailyDeals;
