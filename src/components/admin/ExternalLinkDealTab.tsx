import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";

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

  const [platform, setPlatform] = useState<"aliexpress" | "lazada" | null>(null);
  const [product, setProduct] = useState<DecodedProduct | null>(null);
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [productId, setProductId] = useState<string | null>(null);
  const [decodeSuccess, setDecodeSuccess] = useState(false);
  const [currencySymbol, setCurrencySymbol] = useState("$");

  const [coupon, setCoupon] = useState("");
  const [dealMessage, setDealMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable fields (for manual override)
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editRating, setEditRating] = useState("");
  const [editSales, setEditSales] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBrand, setEditBrand] = useState("");

  const handleDecode = async () => {
    if (!url.trim()) {
      toast.error("הזן קישור");
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
      setEditName(p.name || "");
      setEditPrice(p.price || "");
      setEditRating(p.rating || "");
      setEditSales(p.sales_7d || "");
      setEditCategory(p.category || "כללי");
      setEditBrand(p.brand || "");

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
      const priceStr = `${editPrice} ${currencySymbol}`;
      const { data, error } = await supabase.functions.invoke("generate-deal-message", {
        body: {
          product: {
            name: editName,
            price: priceStr,
            rating: editRating || null,
            sales_7d: editSales ? parseInt(editSales) : null,
            brand: editBrand,
            category: editCategory,
            url: affiliateUrl,
          },
          coupon: coupon || undefined,
        },
      });

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
      // Save to deals_sent
      const { error: dealError } = await supabase.from("deals_sent" as any).insert({
        product_name: editName,
        product_name_hebrew: editName,
        platform: platform === "aliexpress" ? "israel" : "thailand",
        category: editCategory,
        affiliate_url: affiliateUrl,
        product_id: productId,
      } as any);

      if (dealError) console.error("deals_sent save error:", dealError);

      // Save to product table based on platform
      if (platform === "aliexpress") {
        const { error } = await supabase.from("israel_editor_products" as any).insert({
          aliexpress_product_id: productId,
          product_name_hebrew: editName,
          tracking_link: affiliateUrl,
          category_name_hebrew: editCategory,
          price_usd: editPrice ? parseFloat(editPrice) : null,
          rating: editRating ? parseFloat(editRating) : null,
          sales_count: editSales ? parseInt(editSales) : null,
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
          is_active: true,
          out_of_stock: false,
          source: "external_link",
        } as any);
        if (error) throw error;
      }

      setSaved(true);
      toast.success(`✅ נשמר ל-${platform === "aliexpress" ? "israel_editor_products" : "category_products"} + deals_sent`);
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
    setEditCategory("");
    setEditBrand("");
  };

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
              placeholder="הדבק קישור AliExpress / Lazada..."
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
              <Badge variant={platform === "aliexpress" ? "default" : "secondary"}>
                {platform === "aliexpress" ? "🇮🇱 AliExpress" : "🇹🇭 Lazada"}
              </Badge>
              <span className="text-xs text-muted-foreground">מטבע: {currencySymbol}</span>
              {decodeSuccess && <Badge variant="outline" className="text-green-600">✅ פענוח הצליח</Badge>}
              {platform && !decodeSuccess && product && <Badge variant="outline" className="text-yellow-600">⚠️ ערוך ידנית</Badge>}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">שם מוצר</label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="שם המוצר בעברית" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מחיר ({currencySymbol})</label>
                <Input value={editPrice} onChange={e => setEditPrice(e.target.value)} placeholder="0.00" dir="ltr" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">דירוג</label>
                <Input value={editRating} onChange={e => setEditRating(e.target.value)} placeholder="4.8" dir="ltr" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מכירות שבועיות</label>
                <Input value={editSales} onChange={e => setEditSales(e.target.value)} placeholder="0" dir="ltr" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">קטגוריה</label>
                <Input value={editCategory} onChange={e => setEditCategory(e.target.value)} placeholder="כללי" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">מותג</label>
                <Input value={editBrand} onChange={e => setEditBrand(e.target.value)} placeholder="מותג" />
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">קופון (אופציונלי)</label>
              <Input value={coupon} onChange={e => setCoupon(e.target.value)} placeholder="קוד קופון" dir="ltr" />
            </div>
            <Button onClick={handleGenerateMessage} disabled={isGenerating || !editName || !editPrice} className="w-full">
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
