import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { DEAL_CATEGORIES } from "@/lib/categories";

interface DecodedProduct {
  name: string;
  price: string;
  rating: string | null;
  sales_7d: string | null;
  category: string;
  brand: string;
}

export const ExternalLinkDealTab = () => {
  const [url, setUrl] = useState("");
  const [isDecoding, setIsDecoding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [platform, setPlatform] = useState<"aliexpress" | "lazada" | "ksp" | "amazon" | null>(null);
  const [product, setProduct] = useState<DecodedProduct | null>(null);
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [decodeSuccess, setDecodeSuccess] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [coupon, setCoupon] = useState("");
  const [dealMessage, setDealMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields (for manual override)
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editSales, setEditSales] = useState("");
  const [editCategory, setEditCategory] = useState("כללי");
  const [editBrand, setEditBrand] = useState("");

  // KSP-specific fields
  const [editOriginalPrice, setEditOriginalPrice] = useState("");
  const [editNote, setEditNote] = useState("");

  // Track which fields were empty from API (need manual entry)
  const [manualFields, setManualFields] = useState<Set<string>>(new Set());

  const isKspUrl = (u: string) => u.toLowerCase().includes("ksp.co.il");
  const isAmazonUrl = (u: string) => /amazon\.[a-z.]+|amzn\.to|a\.co\//i.test(u);

  const kspDiscountPercent = (): number | null => {
    const price = parseFloat(editPrice);
    const original = parseFloat(editOriginalPrice);
    if (!price || !original || original <= price) return null;
    return Math.round(((original - price) / original) * 100);
  };

  const resetManualForm = (newPlatform: "ksp" | "amazon", trimmedUrl: string, currency: string) => {
    setPlatform(newPlatform);
    setAffiliateUrl(trimmedUrl);
    setCurrencySymbol(currency);
    setDecodeSuccess(false);
    setProduct(null);
    setEditName("");
    setEditPrice("");
    setEditRating("");
    setEditSales("");
    setEditBrand("");
    setEditCategory("כללי");
    setEditOriginalPrice("");
    setEditNote("");
    setManualFields(new Set());
  };

  const handleDecode = async () => {
    if (!url.trim()) {
      toast.error("הזן קישור");
      return;
    }

    const trimmed = url.trim();

    // KSP: skip decode, go straight to manual form
    if (isKspUrl(trimmed)) {
      resetManualForm("ksp", trimmed, "₪");
      toast.info("🛒 קישור KSP — מלא את הפרטים ידנית");
      return;
    }

    // Amazon: skip decode, manual form (PA-API not connected)
    if (isAmazonUrl(trimmed)) {
      resetManualForm("amazon", trimmed, "$");
      toast.info("📦 קישור Amazon — מלא את הפרטים ידנית");
      return;
    }

    setIsDecoding(true);
    setDealMessage("");
    setSaved(false);

    try {
      const { data, error } = await supabase.functions.invoke("decode-external-link", {
        body: { url: url.trim() },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "שגיאה בפענוח");

      setPlatform(data.platform);
      setAffiliateUrl(data.affiliate_url);
      setProductId(data.product_id);
      setCurrencySymbol(data.currency_symbol);
      setDecodeSuccess(data.decode_success);

      const p = data.product;
      setProduct(p);
      setImageUrl(data.product?.image_url || null);
      setEditName(p.name || "");
      setEditPrice(p.price || "");
      setEditRating(p.rating || "");
      setEditSales(p.sales_7d || "");
      setEditBrand(p.brand || "");

      const apiCategory = p.category || "";
      const matchedCategory = (DEAL_CATEGORIES as readonly string[]).includes(apiCategory) ? apiCategory : "כללי";
      setEditCategory(matchedCategory);

      const manual = new Set<string>();
      if (!p.price) manual.add("price");
      if (!p.rating) manual.add("rating");
      if (!p.sales_7d) manual.add("sales");
      setManualFields(manual);

      if (data.decode_success) {
        toast.success(`✅ פענוח הצליח — ${data.platform === "aliexpress" ? "AliExpress" : "Lazada"}`);
      } else {
        toast.warning("⚠️ פענוח חלקי — מלא את השדות ידנית");
      }
    } catch (e: any) {
      console.error("Decode error:", e);
      toast.error(e.message || "שגיאה בפענוח");
    } finally {
      setIsDecoding(false);
    }
  };

  const handleGenerateMessage = async () => {
    if (!editName || !editPrice) {
      toast.error("נדרש שם מוצר ומחיר");
      return;
    }

    setIsGenerating(true);
    try {
      const isKsp = platform === "ksp";
      const isAmazon = platform === "amazon";
      const isManual = isKsp || isAmazon;
      const priceStr = isKsp ? `${editPrice} ₪` : `${editPrice} ${currencySymbol}`;
      const discount = kspDiscountPercent();

      const body: any = {
        product: {
          name: editName,
          price: priceStr,
          rating: isKsp ? null : (editRating || null),
          sales_7d: isKsp ? null : (editSales ? parseInt(editSales) : null),
          brand: editBrand,
          category: editCategory,
          url: affiliateUrl,
        },
        coupon: coupon || undefined,
      };

      if (isManual) {
        body.source = isKsp ? "ksp" : "amazon";
        const currencyLabel = isKsp ? "₪" : "$";
        body.product.original_price = editOriginalPrice ? `${editOriginalPrice} ${currencyLabel}` : null;
        body.product.discount_percent = discount;
        body.product.note = editNote || null;
      }

      const { data, error } = await supabase.functions.invoke("generate-deal-message", { body });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDealMessage(data.message);
      toast.success("✅ הודעה נוצרה בהצלחה!");
    } catch (e: any) {
      console.error("Generate error:", e);
      toast.error(e.message || "שגיאה ביצירת הודעה");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(dealMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("הועתק!");
    } catch {
      toast.error("שגיאה בהעתקה");
    }
  };

  const handleSave = async () => {
    if (!platform || !affiliateUrl) return;
    setIsSaving(true);

    try {
      const isKsp = platform === "ksp";
      const isAmazon = platform === "amazon";

      const platformLabel =
        isKsp || platform === "aliexpress" ? "israel" :
        isAmazon ? "amazon" :
        "thailand";

      const { error: dealError } = await supabase.from("deals_sent" as any).insert({
        product_name: editName,
        product_name_hebrew: editName,
        platform: platformLabel,
        category: editCategory,
        affiliate_url: affiliateUrl,
        product_id: (isKsp || isAmazon) ? null : productId,
      } as any);

      if (dealError) console.error("deals_sent save error:", dealError);

      // KSP: save to deals_sent only
      if (isAmazon) {
        const { error } = await supabase.from("amazon_editor_products" as any).insert({
          product_name_hebrew: editName,
          brand: editBrand || null,
          tracking_link: affiliateUrl,
          category_name_hebrew: editCategory,
          price_usd: editPrice ? parseFloat(editPrice) : null,
          original_price_usd: editOriginalPrice ? parseFloat(editOriginalPrice) : null,
          discount_percentage: kspDiscountPercent(),
          rating: editRating ? parseFloat(editRating) : null,
          sales_count: editSales ? parseInt(editSales) : null,
          note: editNote || null,
          is_active: true,
          out_of_stock: false,
          source: "external_link",
        } as any);
        if (error) throw error;
      } else if (!isKsp) {
        if (platform === "aliexpress") {
          const { error } = await supabase.from("israel_editor_products" as any).insert({
            aliexpress_product_id: productId,
            product_name_hebrew: editName,
            tracking_link: affiliateUrl,
            category_name_hebrew: editCategory,
            price_usd: editPrice ? parseFloat(editPrice) : null,
            rating: editRating ? parseFloat(editRating) : null,
            sales_count: editSales ? parseInt(editSales) : null,
            image_url: imageUrl || null,
            is_active: true,
            out_of_stock: false,
            source: "external_link",
          } as any);
          if (error) {
            if (error.code === "23505") {
              toast.info("המוצר כבר קיים במאגר ישראל");
            } else {
              throw error;
            }
          }
        } else {
          const { error } = await supabase.from("category_products" as any).insert({
            lazada_product_id: productId,
            name_hebrew: editName,
            affiliate_link: affiliateUrl,
            category: editCategory,
            price_thb: editPrice ? parseFloat(editPrice) : null,
            rating: editRating ? parseFloat(editRating) : null,
            sales_count: editSales ? parseInt(editSales) : null,
            image_url: imageUrl || null,
            is_active: true,
            out_of_stock: false,
            source: "external_link",
          } as any);
          if (error) throw error;
        }
      }

      setSaved(true);
      const targetTable =
        isKsp ? "deals_sent" :
        isAmazon ? "amazon_editor_products + deals_sent" :
        platform === "aliexpress" ? "israel_editor_products + deals_sent" :
        "category_products + deals_sent";
      toast.success(`✅ נשמר ל-${targetTable}`);
    } catch (e: any) {
      console.error("Save error:", e);
      toast.error(e.message || "שגיאה בשמירה");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setUrl("");
    setPlatform(null);
    setProduct(null);
    setAffiliateUrl("");
    setProductId(null);
    setDecodeSuccess(false);
    setCoupon("");
    setDealMessage("");
    setSaved(false);
    setEditName("");
    setEditPrice("");
    setEditRating("");
    setEditSales("");
    setEditCategory("כללי");
    setEditBrand("");
    setEditOriginalPrice("");
    setEditNote("");
    setManualFields(new Set());
    setImageUrl(null);
  };

  const manualInputClass = "border-orange-400 border-2";
  const isKsp = platform === "ksp";
  const isAmazon = platform === "amazon";
  const isManual = isKsp || isAmazon;
  const currencyLabel = isKsp ? "₪" : isAmazon ? "$" : currencySymbol;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Step 1: URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ExternalLink className="h-5 w-5" />
            דיל מקישור חיצוני
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="הדבק קישור AliExpress / Lazada / KSP / Amazon..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1"
              dir="ltr"
            />
            <Button onClick={handleDecode} disabled={isDecoding || !url.trim()}>
              {isDecoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="mr-1">פענח</span>
            </Button>
          </div>
          {platform && (
            <div className="flex items-center gap-2">
              <Badge variant={isManual ? "secondary" : platform === "aliexpress" ? "default" : "secondary"}>
                {isKsp ? "🛒 KSP" : isAmazon ? "📦 Amazon" : platform === "aliexpress" ? "🇮🇱 AliExpress" : "🇹🇭 Lazada"}
              </Badge>
              <span className="text-xs text-muted-foreground">מטבע: {currencySymbol}</span>
              {!isManual && decodeSuccess && <Badge variant="outline" className="text-green-600">✅ פענוח הצליח</Badge>}
              {!isManual && !decodeSuccess && product && <Badge variant="outline" className="text-yellow-600">⚠️ ערוך ידנית</Badge>}
              {isManual && <Badge variant="outline" className="text-blue-600">📝 מילוי ידני</Badge>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Product Details */}
      {platform && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">פרטי מוצר</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!isManual && imageUrl && (
              <div className="flex items-center gap-3">
                <img src={imageUrl} alt={editName} className="w-20 h-20 object-cover rounded-lg border border-border" />
                <span className="text-sm text-muted-foreground">תמונת מוצר</span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">שם מוצר <span className="text-red-500">*</span></label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="שם המוצר בעברית" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מותג {isManual && <span className="text-red-500">*</span>}</label>
                <Input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="מותג" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">קטגוריה <span className="text-red-500">*</span></label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קטגוריה" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">
                  מחיר ({currencySymbol}) <span className="text-red-500">*</span>
                </label>
                <Input
                  value={editPrice}
                  onChange={e => setEditPrice(e.target.value)}
                  placeholder={manualFields.has("price") ? "הכנס ידנית" : "0.00"}
                  dir="ltr"
                  className={manualFields.has("price") && !editPrice ? manualInputClass : ""}
                />
              </div>

              {/* Manual platforms (KSP/Amazon): original price + note */}
              {isManual && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">
                      מחיר מקורי ({currencyLabel})
                      {kspDiscountPercent() && (
                        <span className="text-green-600 font-medium mr-2">
                          {kspDiscountPercent()}% הנחה
                        </span>
                      )}
                    </label>
                    <Input
                      value={editOriginalPrice}
                      onChange={e => setEditOriginalPrice(e.target.value)}
                      placeholder="אופציונלי"
                      dir="ltr"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm text-muted-foreground">הערה חופשית</label>
                    <Input
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      placeholder='לדוגמה: "קניית 4 חבילות = 10% הנחה"'
                    />
                  </div>
                </>
              )}

              {/* Rating + sales — for all except KSP (Amazon DOES show these) */}
              {!isKsp && (
                <>
                  <div>
                    <label className="text-sm text-muted-foreground">דירוג</label>
                    <Input
                      value={editRating}
                      onChange={e => setEditRating(e.target.value)}
                      placeholder={manualFields.has("rating") ? "הכנס ידנית" : "4.8"}
                      dir="ltr"
                      className={manualFields.has("rating") && !editRating ? manualInputClass : ""}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">מכירות שבועיות</label>
                    <Input
                      value={editSales}
                      onChange={e => setEditSales(e.target.value)}
                      placeholder={manualFields.has("sales") ? "הכנס ידנית" : "0"}
                      dir="ltr"
                      className={manualFields.has("sales") && !editSales ? manualInputClass : ""}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Affiliate URL for KSP (read-only display) */}
            {isKsp && (
              <div>
                <label className="text-sm text-muted-foreground">קישור אפיליאציה</label>
                <Input value={affiliateUrl} onChange={e => setAffiliateUrl(e.target.value)} dir="ltr" />
              </div>
            )}

            {!isKsp && (
              <div>
                <label className="text-sm text-muted-foreground">קופון (אופציונלי)</label>
                <Input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="קוד קופון" dir="ltr" />
              </div>
            )}

            <Button
              onClick={handleGenerateMessage}
              disabled={isGenerating || !editName || !editPrice || (isKsp && !editBrand)}
              className="w-full"
            >
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : "📝"} צור הודעה
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Generated Message */}
      {dealMessage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>הודעה מוכנה</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="mr-1">{copied ? "הועתק!" : "העתק"}</span>
                </Button>
                {!saved && (
                  <Button size="sm" onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "💾"} שמור
                  </Button>
                )}
                {saved && <Badge variant="outline" className="text-green-600">✅ נשמר</Badge>}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={dealMessage} readOnly className="min-h-[200px] font-mono text-sm" dir="rtl" />
          </CardContent>
        </Card>
      )}

      {/* Reset button */}
      {platform && (
        <Button variant="outline" onClick={handleReset} className="w-full">
          🔄 התחל מחדש
        </Button>
      )}
    </div>
  );
};