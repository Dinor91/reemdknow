import { useState } from "react";
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

const LAZADA_CATEGORIES: CategoryOption[] = [
  { label: "Games & Kids", emoji: "🎮", filterValues: [5090, 5095] },
  { label: "Gadgets", emoji: "📱", filterValues: [42062201] },
  { label: "Small Appliances", emoji: "🏠", filterValues: [3833] },
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
  const { toast } = useToast();

  const categories = platform === "lazada" ? LAZADA_CATEGORIES : ALIEXPRESS_CATEGORIES;

  const fetchProducts = async (cat: CategoryOption) => {
    setLoadingProducts(true);
    setSelectedCategory(cat.label);
    setSelectedProduct(null);
    setGeneratedMessage("");

    try {
      let items: ProductItem[] = [];

      if (platform === "lazada") {
        let query = supabase
          .from("feed_products")
          .select("id, product_name, image_url, price_thb, original_price_thb, sales_7d, rating, brand_name, category_name_hebrew, tracking_link, discount_percentage, category_l1")
          .eq("out_of_stock", false);

        if (cat.filterValues !== "all") {
          query = query.in("category_l1", cat.filterValues as number[]);
        }

        const { data, error } = await query.order("sales_7d", { ascending: false, nullsFirst: false }).limit(5);
        if (error) throw error;

        items = (data || []).map((p) => ({
          id: p.id,
          name: p.product_name,
          image_url: p.image_url,
          price: p.price_thb,
          original_price: p.original_price_thb,
          sales: p.sales_7d,
          rating: p.rating,
          brand: p.brand_name,
          category: p.category_name_hebrew,
          tracking_link: p.tracking_link,
          discount_percentage: p.discount_percentage,
        }));
      } else {
        let query = supabase
          .from("aliexpress_feed_products")
          .select("id, aliexpress_product_id, product_name, product_name_hebrew, image_url, price_usd, original_price_usd, sales_30d, rating, category_name_hebrew, tracking_link, discount_percentage, category_id")
          .eq("out_of_stock", false);

        if (cat.filterValues !== "all") {
          query = query.in("category_id", cat.filterValues as string[]);
        }

        const { data, error } = await query.order("sales_30d", { ascending: false, nullsFirst: false }).limit(5);
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
        });
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
            rating: selectedProduct.rating ?? "חדש",
            sales: selectedProduct.sales ?? 0,
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
        <div className="flex gap-3 justify-center mb-8">
          <Button
            size="lg"
            variant={platform === "lazada" ? "default" : "outline"}
            className={`text-lg px-6 py-6 transition-all ${platform === "lazada" ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-orange-500 text-orange-500 hover:bg-orange-50"}`}
            onClick={() => handlePlatformSwitch("lazada")}
          >
            🇹🇭 Lazada Thailand
          </Button>
          <Button
            size="lg"
            variant={platform === "aliexpress" ? "default" : "outline"}
            className={`text-lg px-6 py-6 transition-all ${platform === "aliexpress" ? "bg-blue-600 hover:bg-blue-700 text-white" : "border-blue-600 text-blue-600 hover:bg-blue-50"}`}
            onClick={() => handlePlatformSwitch("aliexpress")}
          >
            🇮🇱 AliExpress Israel
          </Button>
        </div>

        {/* Category Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          {categories.map((cat) => (
            <Button
              key={cat.label}
              variant={selectedCategory === cat.label ? "default" : "outline"}
              onClick={() => fetchProducts(cat)}
              className="text-base"
            >
              {cat.emoji} {cat.label}
            </Button>
          ))}
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
                <CardContent className="flex gap-4 p-4 items-center">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-20 h-20 object-contain rounded-md bg-muted flex-shrink-0"
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
                      {product.sales != null && product.sales > 0 && (
                        <span className="text-xs text-muted-foreground">
                          🔥 נמכר {product.sales} פעמים {platform === "lazada" ? "השבוע" : "החודש"}
                        </span>
                      )}
                    </div>
                    {product.brand && (
                      <p className="text-xs text-muted-foreground mt-1">{product.brand}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
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
