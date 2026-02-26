import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Package, RotateCcw, X, ExternalLink, Loader2, AlertCircle, Copy, Check, AlertTriangle, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackButtonClick } from "@/lib/trackClick";
import logo from "@/assets/logo.jpg";

interface SearchResult {
  rank: number;
  label_hebrew: string;
  label_color: string;
  platform: string;
  platform_label: string;
  product_name: string;
  price_display: string;
  price_usd: number;
  original_price_display: string | null;
  discount_percentage: number | null;
  rating: number;
  sales_count: number;
  image_url: string;
  tracking_link: string;
  category: string | null;
  is_featured: boolean;
  is_live_result?: boolean;
  explanation_hebrew: string;
}

interface SearchResponse {
  success: boolean;
  message?: string;
  suggestion?: string;
  extracted_params?: {
    product: string;
    budget: string;
    rating: string;
    brand: string | null;
    platform: string;
    priority: string;
  };
  results?: SearchResult[];
  total_scanned?: number;
  live_results_count?: number;
  search_time_ms?: number;
  search_tier?: 1 | 2 | 3;
}

const LOADING_MESSAGES = [
  "מנתח את הבקשה... 🤔",
  "מחפש במאגר המוצרים... 🔍",
  "מדרג תוצאות... ⭐",
];

const LABEL_COLORS: Record<string, { border: string; bg: string; badge: string }> = {
  green: { border: "border-green-500", bg: "bg-green-500/10", badge: "bg-green-500/20 text-green-700" },
  blue: { border: "border-[hsl(var(--primary))]", bg: "bg-[hsl(var(--primary))]/10", badge: "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]" },
  orange: { border: "border-orange-500", bg: "bg-orange-500/10", badge: "bg-orange-500/20 text-orange-700" },
};

const ProductSearch = () => {
  const [message, setMessage] = useState("");
  const [platformOverride, setPlatformOverride] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [tierBannerDismissed, setTierBannerDismissed] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleCopyWhatsApp = useCallback((result: SearchResult, idx: number) => {
    const text = `היי! מצאתי לך מוצר מעולה 🎯\n\n` +
      `📦 *${result.product_name}*\n` +
      `💰 מחיר: ${result.price_display}\n` +
      (result.rating > 0 ? `⭐ דירוג: ${result.rating.toFixed(1)}\n` : "") +
      (result.sales_count > 0 ? `🛒 נמכרו: ${result.sales_count.toLocaleString()}\n` : "") +
      `\n🔗 לינק למוצר:\n${result.tracking_link}`;
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 3000);
    trackButtonClick("whatsapp_copy", `product_search_${result.platform}`);
  }, []);

  // Rotate loading messages
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSearch = async () => {
    if (!message.trim() || message.trim().length < 3) return;
    setIsLoading(true);
    setLoadingMsgIdx(0);
    setResponse(null);
    setTierBannerDismissed(false);

    try {
      const { data, error } = await supabase.functions.invoke("smart-search", {
        body: { message: message.trim(), platform_override: platformOverride },
      });

      if (error) {
        console.error("Search error:", error);
        setResponse({ success: false, message: "שגיאה בחיפוש, נסה שוב" });
        return;
      }

      setResponse(data as SearchResponse);

      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    } catch (err) {
      console.error("Search error:", err);
      setResponse({ success: false, message: "שגיאה בחיפוש, נסה שוב" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductClick = (result: SearchResult) => {
    trackButtonClick("whatsapp", `product_search_${result.platform}`);
    window.open(result.tracking_link, "_blank", "noopener,noreferrer");
  };

  const params = response?.extracted_params;
  const badges = [
    { icon: "🛍️", label: "מוצר", value: params?.product || "—" },
    { icon: "💰", label: "תקציב מקס׳", value: params?.budget || "—" },
    { icon: "⭐", label: "דירוג מינימלי", value: params?.rating || "—" },
    { icon: "🏷️", label: "מותג", value: params?.brand || "—" },
    { icon: "🌐", label: "פלטפורמה", value: params?.platform || "—" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b" style={{ backgroundColor: "#1A1A2E" }}>
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Logo" className="h-10 w-10 rounded-full object-contain" />
          </Link>
          <h1 className="text-lg md:text-xl font-bold text-center text-white">חיפוש מוצרים חכם</h1>
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span className={`h-2 w-2 rounded-full inline-block ${isLoading ? "bg-yellow-400 animate-pulse" : "bg-green-400"}`} />
            <span className="hidden sm:inline">{isLoading ? "מחפש..." : "מוכן לחיפוש"}</span>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6 space-y-6">
        {/* ─── INPUT AREA ─── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">📋 הדבקת הודעת לקוח</h2>
            <p className="text-sm text-muted-foreground">הדביקו הודעת לקוח והכלי יחלץ את פרמטרי החיפוש באופן אוטומטי</p>
          </div>

          {/* Platform Selection - Above textarea */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">🌐 קהל יעד</label>
            <Select value={platformOverride} onValueChange={setPlatformOverride}>
              <SelectTrigger className="w-full sm:w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background border z-50">
                <SelectItem value="all">🌐 הכל – שתי הפלטפורמות</SelectItem>
                <SelectItem value="israel">🇮🇱 ישראל – AliExpress</SelectItem>
                <SelectItem value="lazada">🇹🇭 תאילנד – Lazada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full resize-none pr-16 text-base"
              placeholder={`הדביקו הודעת לקוח כאן...\nדוגמה: היי ראם, אני מחפש אוזניות בלוטות׳, תקציב עד 800 באט, לא משנה מותג, פשוט איכות טובה`}
              disabled={isLoading}
            />
            {message && !isLoading && (
              <button
                onClick={() => setMessage("")}
                className="absolute top-2 right-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-background/80 rounded px-2 py-1"
              >
                <X className="h-3 w-3" /> נקה
              </button>
            )}
          </div>

          {/* Extracted Parameters */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">🔍 פרמטרים שזוהו:</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((p) => (
                <Badge key={p.label} variant="secondary" className="text-sm font-normal px-3 py-1.5 gap-1.5">
                  <span>{p.icon}</span>
                  <span className="text-muted-foreground">{p.label}:</span>
                  <span className="font-medium text-foreground">{p.value}</span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">

            <div className="flex-1 flex flex-col items-stretch sm:items-end gap-1">
              <Button
                onClick={handleSearch}
                disabled={isLoading || !message.trim() || message.trim().length < 3}
                className="w-full sm:w-auto text-white font-semibold px-8"
                style={{ backgroundColor: "#0F3460" }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    {LOADING_MESSAGES[loadingMsgIdx]}
                  </>
                ) : (
                  "🚀 חפש עכשיו"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center sm:text-start">
                {isLoading ? LOADING_MESSAGES[loadingMsgIdx] : "התוצאות יופיעו למטה תוך שניות"}
              </p>
            </div>
          </div>
        </section>

        {/* ─── RESULTS AREA ─── */}
        <section className="space-y-4" ref={resultsRef}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">📦 תוצאות חיפוש</h2>
            <span className="text-sm text-muted-foreground italic">
              {isLoading
                ? LOADING_MESSAGES[loadingMsgIdx]
                : response?.success && response.search_time_ms
                ? `נמצאו ${response.results?.length || 0} מתוך ${response.total_scanned || 0} מוצרים${response.live_results_count ? ` (${response.live_results_count} Live)` : ""} (${(response.search_time_ms / 1000).toFixed(1)}s)`
                : "ממתין לחיפוש..."}
            </span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-xl min-h-[300px]">
              <div className="text-center p-8 space-y-4">
                <Loader2 className="h-14 w-14 mx-auto text-muted-foreground animate-spin" />
                <p className="text-lg font-medium text-muted-foreground">{LOADING_MESSAGES[loadingMsgIdx]}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !response && (
            <div className="flex items-center justify-center border-2 border-dashed border-border rounded-xl min-h-[300px]">
              <div className="text-center p-8 space-y-3">
                <Search className="h-14 w-14 mx-auto text-muted-foreground/40" />
                <p className="text-lg font-medium text-muted-foreground">עדיין אין תוצאות</p>
                <p className="text-sm text-muted-foreground/70">הדביקו הודעת לקוח למעלה ולחצו על חפש עכשיו</p>
              </div>
            </div>
          )}

          {/* Error / No Results State */}
          {!isLoading && response && !response.success && (
            <div className="flex items-center justify-center border-2 border-dashed border-red-300 rounded-xl min-h-[200px] bg-red-50/50">
              <div className="text-center p-8 space-y-3">
                <AlertCircle className="h-14 w-14 mx-auto text-red-400" />
                <p className="text-lg font-medium text-foreground">{response.message}</p>
                {response.suggestion && <p className="text-sm text-muted-foreground">{response.suggestion}</p>}
                <Button
                  variant="outline"
                  onClick={() => {
                    setResponse(null);
                    setMessage("");
                  }}
                  className="gap-2 mt-2"
                >
                  <RotateCcw className="h-4 w-4" /> נסה שוב
                </Button>
              </div>
            </div>
          )}

          {/* Success State – Result Cards */}
          {!isLoading && response?.success && response.results && (
            <>
              {/* Tier Banner */}
              {!tierBannerDismissed && response.search_tier && response.search_tier === 2 && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  <span>⚠️ התאמה חלקית – לא נמצאו מספיק תוצאות מדויקות</span>
                  <button onClick={() => setTierBannerDismissed(true)} className="text-yellow-600 hover:text-yellow-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!tierBannerDismissed && response.search_tier && response.search_tier === 3 && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  <span>🔍 תוצאה מורחבת – הורחבנו את החיפוש כדי למצוא אלטרנטיבות</span>
                  <button onClick={() => setTierBannerDismissed(true)} className="text-orange-600 hover:text-orange-800">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {response.results.map((result, i) => {
                  const colors = LABEL_COLORS[result.label_color] || LABEL_COLORS.blue;
                  return (
                    <Card key={i} className={`border-2 ${colors.border} ${colors.bg} overflow-hidden`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold">
                            {["🥇", "🥈", "🥉"][i]} אפשרות {i + 1}
                          </span>
                          <Badge className={colors.badge}>{result.label_hebrew}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {result.platform_label}
                          </Badge>
                          {result.is_live_result && (
                            <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
                              🔴 Live
                            </Badge>
                          )}
                          {result.is_featured && !result.is_live_result && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs gap-1 cursor-help">
                                    ⭐ נבחר
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>מוצר נבחר על ידי (D)Know</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>

                        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {result.image_url ? (
                            <img src={result.image_url} alt={result.product_name} className="w-full h-full object-contain" loading="lazy" />
                          ) : (
                            <Package className="h-12 w-12 text-muted-foreground/30" />
                          )}
                        </div>

                        <p className="font-semibold text-foreground line-clamp-2">{result.product_name}</p>

                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {result.rating > 0 && <span>⭐ {result.rating.toFixed(1)}</span>}
                          {result.sales_count > 0 && <span>🛒 {result.sales_count.toLocaleString()} נמכרו</span>}
                        </div>

                        <div>
                          <span className="text-lg font-bold" style={{ color: "#FF6B35" }}>
                            💰 {result.price_display}
                          </span>
                          {result.original_price_display && (
                            <span className="mr-2 text-sm text-muted-foreground line-through">{result.original_price_display}</span>
                          )}
                          {result.discount_percentage && result.discount_percentage > 0 && (
                            <span className="mr-1 text-xs text-green-600 font-medium">-{result.discount_percentage}%</span>
                          )}
                        </div>

                        <hr className="border-border" />

                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">💬 למה המוצר הזה?</p>
                          <p className="text-sm text-muted-foreground italic">״{result.explanation_hebrew}״</p>
                        </div>

                        <hr className="border-border" />

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1 gap-2"
                            onClick={() => handleProductClick(result)}
                            disabled={!result.tracking_link}
                          >
                            <ExternalLink className="h-4 w-4" /> צפה במוצר
                          </Button>
                          <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleCopyWhatsApp(result, i)}
                            disabled={!result.tracking_link}
                          >
                            {copiedIdx === i ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            {copiedIdx === i ? "הועתק!" : "העתק"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2 pt-2">
                <span>החיפוש הושלם תוך {((response.search_time_ms || 0) / 1000).toFixed(1)} שניות</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setResponse(null);
                    setMessage("");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <RotateCcw className="h-3 w-3" /> חיפוש חדש
                </Button>
              </div>
            </>
          )}
        </section>
      </div>

      <footer className="border-t py-4 mt-auto">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
          <span>מופעל על ידי Lazada Open API & AliExpress API</span>
          <span>v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default ProductSearch;
