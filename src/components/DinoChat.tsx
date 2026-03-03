import { useState, useRef, useEffect, useCallback } from "react";
import dinoAvatar from "@/assets/dino-avatar.jpeg";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Send, Copy, Check, Loader2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ────────────────── Types ──────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "menu" | "products" | "buttons" | "deal_message" | "import_confirm";
  buttons?: ActionButton[];
  products?: ProductItem[];
  importData?: ImportConfirmData;
}

interface ActionButton {
  label: string;
  value: string;
}

interface ProductItem {
  id: string;
  name: string;
  image_url: string | null;
  price: number | null;
  sales: number | null;
  rating: number | null;
  brand: string | null;
  category: string | null;
  tracking_link: string | null;
  discount_percentage: number | null;
  source?: string;
  platform_label?: string;
  tier?: number;
}

interface ImportConfirmData {
  platform: "israel" | "thailand";
  platformLabel: string;
  productId: string | null;
  resolved_url: string;
  original_url: string;
}

type FlowType = "deal" | "search" | "import" | "summary" | "template" | "import_name" | null;
type DealStep = "platform" | "category" | "products" | "coupon" | "generating" | "done";
type SearchStep = "platform" | "query" | "searching" | "results";
type SummaryStep = "ask_products" | "generating" | "done";
type TemplateStep = "pick" | "edit" | "confirming" | "done";

// ────────────────── Constants ──────────────────

const STORAGE_KEY = "dino_chat_history";
const MAX_STORED = 10;

const QUICK_ACTIONS = [
  { emoji: "🔍", label: "חפש מוצר ללקוח", action: "search" },
  { emoji: "📦", label: "צור דיל יומי", action: "deal" },
  { emoji: "📥", label: "ייבא הודעה מהקבוצה", action: "import" },
  { emoji: "📊", label: "סטטיסטיקות", action: "stats" },
  { emoji: "✍️", label: "כתוב סיכום שבועי", action: "summary" },
  { emoji: "⚙️", label: "ערוך נוסח הודעה", action: "template" },
];

const LAZADA_CATEGORIES = [
  { label: "Games & Kids 🎮", value: "games_kids", filterValues: [5090, 5095], curatedCategories: ["ילדים"] },
  { label: "Gadgets 📱", value: "gadgets", filterValues: [42062201], curatedCategories: ["גאדג׳טים", "בית חכם", "כלי עבודה"] },
  { label: "Small Appliances 🏠", value: "appliances", filterValues: [3833], curatedCategories: ["בית", "בית חכם"] },
  { label: "Best Sellers ⭐", value: "best", filterValues: "all" as const },
];

const ALIEXPRESS_CATEGORIES = [
  { label: "Gadgets & Tech 📱", value: "gadgets_tech", filterValues: ["15", "44", "7", "202192403"] },
  { label: "Tools & Home 🔧", value: "tools_home", filterValues: ["1511", "34", "13", "39"] },
  { label: "Toys 🎮", value: "toys", filterValues: ["26"] },
  { label: "Best Sellers ⭐", value: "best", filterValues: "all" as const },
];

const TEMPLATE_OPTIONS = [
  { label: "סיכום שבועי", value: "סיכום_שבועי" },
  { label: "פתיחת דיל", value: "פתיחת_דיל" },
  { label: "סיום הודעה", value: "סיום_הודעה" },
];

const BACK_KEYWORDS = ["חזרה", "תפריט", "ביטול", "back", "cancel", "menu"];

// ────────────────── Helpers ──────────────────

function detectIntentLocally(text: string): { intent: FlowType | "stats" | "chat"; searchQuery?: string } {
  const lower = text.trim().toLowerCase();

  // Check for back/cancel commands
  if (BACK_KEYWORDS.some(k => lower === k || lower === `/${k}`)) {
    return { intent: "chat" }; // Will be handled separately
  }

  // Statistics
  if (lower.includes("סטטיסטיק") || lower.includes("קליקים") || lower.includes("נתונים")) {
    return { intent: "stats" };
  }

  // Daily deal
  if (lower.includes("דיל") || lower.includes("deal") || lower.includes("הודעה יומית") || lower.includes("צור דיל")) {
    return { intent: "deal" };
  }

  // Message import (URL detection)
  if (lower.includes("lazada.co.th") || lower.includes("s.click.aliexpress") || lower.includes("aliexpress.com/item") || lower.includes("c.lazada") || lower.includes("a.aliexpress")) {
    return { intent: "import" };
  }

  // Weekly summary
  if (lower.includes("סיכום") || lower.includes("שבועי") || lower.includes("summary")) {
    return { intent: "summary" };
  }

  // Edit template
  if (lower.includes("נוסח") || lower.includes("תבנית") || lower.includes("שנה את")) {
    return { intent: "template" };
  }

  // Product search
  if (lower.includes("חפש") || lower.includes("חיפוש") || lower.includes("מוצר") || lower.includes("search") || lower.includes("find")) {
    const query = text.replace(/חפש|חיפוש|מוצר|search|find/gi, "").trim();
    return { intent: "search", searchQuery: query || undefined };
  }

  return { intent: "chat" };
}

function isBackCommand(text: string): boolean {
  const lower = text.trim().toLowerCase();
  return BACK_KEYWORDS.some(k => lower === k || lower === `/${k}`);
}

// ────────────────── Component ──────────────────

const DinoChat = () => {
  const { isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const { toast } = useToast();

  // Flow state
  const [activeFlow, setActiveFlow] = useState<FlowType>(null);
  const [flowPlatform, setFlowPlatform] = useState<"israel" | "thailand" | null>(null);
  const [flowProducts, setFlowProducts] = useState<ProductItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingImport, setPendingImport] = useState<ImportConfirmData | null>(null);

  if (!isAdmin) return null;

  /* eslint-disable react-hooks/rules-of-hooks -- all hooks declared above */

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 100);
  };

  const addMessage = (msg: ChatMessage) => {
    setMessages(prev => {
      const updated = [...prev, msg];
      saveToStorage(updated);
      return updated;
    });
    scrollToBottom();
  };

  const addAssistant = (content: string, extra?: Partial<ChatMessage>) => {
    addMessage({ role: "assistant", content, ...extra });
  };

  const addUser = (content: string) => {
    addMessage({ role: "user", content });
  };

  const resetFlow = () => {
    setActiveFlow(null);
    setFlowPlatform(null);
    setFlowProducts([]);
    setSelectedProduct(null);
    setSearchQuery("");
    setEditingTemplate(null);
    setPendingImport(null);
  };

  const handleBackToMenu = () => {
    resetFlow();
    addAssistant("חזרנו לתפריט 🦕", { type: "menu" });
  };

  const saveToStorage = (msgs: ChatMessage[]) => {
    try {
      const toStore = msgs.filter(m => m.type !== "menu" && m.type !== "buttons" && m.type !== "products" && m.type !== "import_confirm").slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch { /* ignore */ }
  };

  const loadFromStorage = (): ChatMessage[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  };

  const invokeAction = async (action: string, params?: any) => {
    const { data, error } = await supabase.functions.invoke("dino-chat", {
      body: { action, params },
    });
    if (error) throw error;
    return data;
  };

  const fetchAlerts = async () => {
    try {
      const data = await invokeAction("get_alerts");
      if (data?.alerts) setAlerts(data.alerts);
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    setIsOpen(true);
    resetFlow();
    const stored = loadFromStorage();
    if (stored.length > 0) {
      setShowResumePrompt(true);
      setMessages([]);
    } else {
      showWelcomeMenu();
    }
    fetchAlerts();
  };

  const showWelcomeMenu = () => {
    setMessages([{ role: "assistant", content: "היי! מה נעשה? 🦕", type: "menu" }]);
  };

  const handleResumeChoice = (resume: boolean) => {
    setShowResumePrompt(false);
    if (resume) {
      setMessages(loadFromStorage());
    } else {
      localStorage.removeItem(STORAGE_KEY);
      showWelcomeMenu();
    }
  };

  // ────────── Platform picker ──────────

  const showPlatformPicker = (flowType: FlowType) => {
    setActiveFlow(flowType);
    addAssistant("🇮🇱 ישראל או 🇹🇭 תאילנד?", {
      type: "buttons",
      buttons: [
        { label: "🇮🇱 ישראל", value: "israel" },
        { label: "🇹🇭 תאילנד", value: "thailand" },
      ],
    });
  };

  const handlePlatformSelect = (platform: "israel" | "thailand") => {
    setFlowPlatform(platform);
    addUser(platform === "israel" ? "🇮🇱 ישראל" : "🇹🇭 תאילנד");

    if (activeFlow === "deal") {
      showCategoryPicker(platform);
    } else if (activeFlow === "search") {
      if (searchQuery) {
        executeSearch(platform, searchQuery);
      } else {
        addAssistant("מה לחפש? 🔍");
      }
    }
  };

  // ────────── DEAL FLOW ──────────

  const showCategoryPicker = (platform: "israel" | "thailand") => {
    const cats = platform === "thailand" ? LAZADA_CATEGORIES : ALIEXPRESS_CATEGORIES;
    addAssistant("בחר קטגוריה:", {
      type: "buttons",
      buttons: cats.map(c => ({ label: c.label, value: c.value })),
    });
  };

  const handleCategorySelect = async (catValue: string) => {
    addUser(catValue);
    setIsLoading(true);

    try {
      const platform = flowPlatform!;
      const cats = platform === "thailand" ? LAZADA_CATEGORIES : ALIEXPRESS_CATEGORIES;
      const cat = cats.find(c => c.value === catValue)!;
      let items: ProductItem[] = [];

      if (platform === "thailand") {
        const lazCat = cat as typeof LAZADA_CATEGORIES[0];
        let feedQ = supabase.from("feed_products")
          .select("id, product_name, image_url, price_thb, sales_7d, rating, brand_name, category_name_hebrew, tracking_link, discount_percentage, category_l1")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") feedQ = feedQ.in("category_l1", cat.filterValues as number[]);
        feedQ = feedQ.order("sales_7d", { ascending: false, nullsFirst: false }).limit(10);

        let curQ = supabase.from("category_products")
          .select("id, name_hebrew, name_english, price_thb, image_url, affiliate_link, category, rating, sales_count")
          .eq("is_active", true);
        if (lazCat.curatedCategories) curQ = curQ.in("category", lazCat.curatedCategories);
        curQ = curQ.order("sales_count", { ascending: false, nullsFirst: false }).limit(10);

        const [feedRes, curRes] = await Promise.all([feedQ, curQ]);

        const feedItems: ProductItem[] = (feedRes.data || []).map(p => ({
          id: p.id, name: p.product_name, image_url: p.image_url, price: p.price_thb,
          sales: p.sales_7d, rating: p.rating, brand: p.brand_name, category: p.category_name_hebrew,
          tracking_link: p.tracking_link, discount_percentage: p.discount_percentage, source: "feed",
        }));
        const curItems: ProductItem[] = (curRes.data || []).map(p => ({
          id: `curated-${p.id}`, name: p.name_hebrew || p.name_english || "Unknown",
          image_url: p.image_url, price: p.price_thb, sales: p.sales_count, rating: p.rating,
          brand: null, category: p.category, tracking_link: p.affiliate_link,
          discount_percentage: null, source: "curated",
        }));

        const merged = [...curItems, ...feedItems];
        const seen = new Set<string>();
        const deduped: ProductItem[] = [];
        for (const item of merged) {
          const key = (item.name || "").substring(0, 40).toLowerCase().trim();
          if (!seen.has(key)) { seen.add(key); deduped.push(item); }
        }
        deduped.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        items = deduped.slice(0, 5);
      } else {
        let q = supabase.from("aliexpress_feed_products")
          .select("id, aliexpress_product_id, product_name, product_name_hebrew, image_url, price_usd, sales_30d, rating, category_name_hebrew, tracking_link, discount_percentage, category_id")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") q = q.in("category_id", cat.filterValues as string[]);
        const { data } = await q.order("sales_30d", { ascending: false, nullsFirst: false }).limit(5);

        items = (data || []).map(p => ({
          id: p.id, name: p.product_name_hebrew || p.product_name, image_url: p.image_url,
          price: p.price_usd, sales: p.sales_30d, rating: p.rating, brand: null,
          category: p.category_name_hebrew,
          tracking_link: `https://www.aliexpress.com/item/${p.aliexpress_product_id}.html`,
          discount_percentage: p.discount_percentage,
        }));
      }

      setFlowProducts(items);
      if (items.length === 0) {
        addAssistant("לא נמצאו מוצרים בקטגוריה הזו 😕");
        resetFlow();
      } else {
        addAssistant(`נמצאו ${items.length} מוצרים, בחר מספר:`, { type: "products", products: items });
      }
    } catch (e: any) {
      console.error("Category fetch error:", e);
      addAssistant("שגיאה בטעינת מוצרים ❌");
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (product: ProductItem) => {
    setSelectedProduct(product);
    addUser(`בחרתי: ${product.name}`);
    addAssistant("יש קופון? (אם לא, כתוב 'לא')");
  };

  const handleCouponAndGenerate = async (couponText: string) => {
    addUser(couponText);
    const coupon = couponText.trim().toLowerCase() === "לא" ? "" : couponText.trim();
    setIsLoading(true);

    try {
      const currencySymbol = flowPlatform === "thailand" ? "฿" : "$";
      const priceStr = selectedProduct!.price ? `${selectedProduct!.price} ${currencySymbol}` : "לא ידוע";

      const data = await invokeAction("generate_deal", {
        product: {
          name: selectedProduct!.name,
          price: priceStr,
          rating: selectedProduct!.rating ?? null,
          sales_7d: selectedProduct!.sales ?? 0,
          brand: selectedProduct!.brand || "",
          category: selectedProduct!.category || "",
          url: selectedProduct!.tracking_link || "",
        },
        coupon,
      });

      if (data?.error) throw new Error(data.error);
      addAssistant(data.message || "שגיאה ביצירת הודעה", { type: "deal_message" });
      resetFlow();
    } catch (e: any) {
      console.error("Deal generation error:", e);
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── SEARCH FLOW ──────────

  const executeSearch = async (platform: "israel" | "thailand", query: string) => {
    setIsLoading(true);
    addAssistant("🔍 מחפש...");

    try {
      const data = await invokeAction("search", {
        platform: platform === "israel" ? "israel" : "thailand",
        query,
      });

      const results: ProductItem[] = (data?.results || []).map((p: any) => ({
        id: p.id,
        name: p.product_name,
        image_url: p.image_url || "",
        price: p.price_usd || null,
        sales: p.sales_count || 0,
        rating: p.rating || 0,
        brand: null,
        category: p.category,
        tracking_link: p.tracking_link || "",
        discount_percentage: p.discount_percentage,
        platform_label: p.platform_label,
        tier: p.search_tier,
        source: p.source,
      }));

      setMessages(prev => {
        const withoutSearching = prev.filter(m => m.content !== "🔍 מחפש...");
        if (results.length === 0) {
          return [...withoutSearching, { role: "assistant" as const, content: "לא נמצאו תוצאות 😕" }];
        }
        return [...withoutSearching, {
          role: "assistant" as const,
          content: `נמצאו ${results.length} תוצאות:`,
          type: "products" as const,
          products: results,
        }];
      });
      scrollToBottom();
      resetFlow();
    } catch (e: any) {
      console.error("Search error:", e);
      addAssistant(`שגיאה בחיפוש: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── IMPORT FLOW ──────────

  const handleImport = async (text: string) => {
    addUser(text);
    setIsLoading(true);
    setActiveFlow("import");

    try {
      const data = await invokeAction("import_product", { text });

      if (!data?.success) {
        addAssistant(data?.error || "שגיאה בזיהוי הלינק ❌");
        resetFlow();
        return;
      }

      if (data.step === "confirm") {
        const importData: ImportConfirmData = {
          platform: data.platform,
          platformLabel: data.platformLabel,
          productId: data.productId,
          resolved_url: data.resolved_url,
          original_url: data.original_url,
        };
        setPendingImport(importData);
        addAssistant(
          `זיהיתי לינק מ-${data.platformLabel}${data.productId ? `\nמזהה מוצר: ${data.productId}` : ""}\n\nלשמור במאגר?`,
          {
            type: "import_confirm",
            importData,
            buttons: [
              { label: "✅ כן, שמור", value: "confirm_import" },
              { label: "❌ לא, בטל", value: "cancel_import" },
            ],
          }
        );
      }
    } catch (e: any) {
      console.error("Import error:", e);
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportConfirm = async (confirm: boolean) => {
    if (!confirm || !pendingImport) {
      addUser("❌ בוטל");
      addAssistant("בוטל, לא נשמר מאומה.");
      resetFlow();
      return;
    }

    addUser("✅ שמור");
    // Ask for product name
    setActiveFlow("import_name");
    addAssistant("מה שם המוצר בעברית? (או כתוב 'דלג' לשם ברירת מחדל)");
  };

  const handleImportName = async (text: string) => {
    addUser(text);
    setIsLoading(true);

    const productName = text.trim().toLowerCase() === "דלג" ? undefined : text.trim();

    try {
      const data = await invokeAction("import_product", {
        confirmed: true,
        platform: pendingImport!.platform,
        resolved_url: pendingImport!.resolved_url,
        product_name: productName,
      });

      if (data?.success && data.step === "saved") {
        addAssistant(data.message);
      } else {
        addAssistant(data?.error || "שגיאה בשמירה ❌");
      }
      resetFlow();
    } catch (e: any) {
      console.error("Import save error:", e);
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── SUMMARY FLOW ──────────

  const startSummaryFlow = () => {
    setActiveFlow("summary");
    addAssistant("📝 כתוב את שמות 3 המוצרים של השבוע (מופרדים בפסיקים או שורות):");
  };

  const handleSummaryProducts = async (text: string) => {
    addUser(text);
    setIsLoading(true);

    try {
      const templateData = await invokeAction("fetch_template", { template_name: "סיכום_שבועי" });
      const template = templateData?.content || "";

      const productNames = text.split(/[,،\n]+/).map((s: string) => s.trim()).filter(Boolean);

      const data = await invokeAction("generate_summary", {
        template,
        product_names: productNames,
      });

      addAssistant(data?.message || "שגיאה ביצירת סיכום", { type: "deal_message" });
      resetFlow();
    } catch (e: any) {
      console.error("Summary error:", e);
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── TEMPLATE FLOW ──────────

  const startTemplateFlow = () => {
    setActiveFlow("template");
    addAssistant("איזה נוסח לערוך?", {
      type: "buttons",
      buttons: TEMPLATE_OPTIONS.map(t => ({ label: t.label, value: t.value })),
    });
  };

  const handleTemplateSelect = async (templateName: string) => {
    addUser(templateName);
    setEditingTemplate(templateName);
    setIsLoading(true);

    try {
      const data = await invokeAction("fetch_template", { template_name: templateName });
      const content = data?.content || "(ריק)";
      addAssistant(`הנוסח הנוכחי:\n\n${content}\n\nכתוב את הנוסח החדש:`);
    } catch (e: any) {
      addAssistant("שגיאה בטעינת התבנית ❌");
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateUpdate = async (newContent: string) => {
    addUser(newContent);
    setIsLoading(true);

    try {
      const data = await invokeAction("update_template", {
        template_name: editingTemplate,
        new_content: newContent,
      });
      addAssistant(data?.message || "עודכן ✅");
      resetFlow();
    } catch (e: any) {
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── STATISTICS ──────────

  const handleStatistics = async () => {
    setIsLoading(true);
    try {
      const data = await invokeAction("statistics");
      addAssistant(data?.message || "אין נתונים");
    } catch (e: any) {
      addAssistant(`שגיאה: ${e.message} ❌`);
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── STREAMING CHAT ──────────

  const streamChat = async (chatMessages: { role: string; content: string }[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dino-chat`;
    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
      },
      body: JSON.stringify({ action: "chat", messages: chatMessages }),
    });
    if (!resp.ok) {
      const errData = await resp.json().catch(() => ({}));
      throw new Error(errData.error || `Error ${resp.status}`);
    }
    return resp;
  };

  const sendStreamingChat = async (text: string, allMessages: ChatMessage[]) => {
    setIsLoading(true);
    try {
      const chatMsgs = allMessages
        .filter(m => !m.type || m.type === "text" || m.type === "deal_message")
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await streamChat(chatMsgs);
      if (!resp.body) throw new Error("No stream body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && !last.type) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { role: "assistant", content: assistantContent }];
              });
              scrollToBottom();
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setMessages(prev => { saveToStorage(prev); return prev; });
    } catch (e: any) {
      console.error("Chat error:", e);
      const errMsg = e.message === "RATE_LIMITED" ? "יותר מדי בקשות ⏳"
        : e.message === "PAYMENT_REQUIRED" ? "נגמר הקרדיט 💳"
        : `שגיאה: ${e.message}`;
      addAssistant(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── MAIN SEND ──────────

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setInput("");

    // Check for back command in any flow
    if (isBackCommand(text) && activeFlow) {
      addUser(text);
      handleBackToMenu();
      return;
    }

    // If we're in an active flow, route to the right handler
    if (activeFlow === "import_name" && pendingImport) {
      await handleImportName(text);
      return;
    }
    if (activeFlow === "deal" && selectedProduct) {
      await handleCouponAndGenerate(text);
      return;
    }
    if (activeFlow === "search" && flowPlatform) {
      addUser(text);
      setSearchQuery(text);
      await executeSearch(flowPlatform, text);
      return;
    }
    if (activeFlow === "summary") {
      await handleSummaryProducts(text);
      return;
    }
    if (activeFlow === "template" && editingTemplate) {
      await handleTemplateUpdate(text);
      return;
    }

    // Detect intent locally
    const { intent, searchQuery: sq } = detectIntentLocally(text);

    if (intent === "stats") {
      addUser(text);
      await handleStatistics();
      return;
    }
    if (intent === "deal") {
      addUser(text);
      showPlatformPicker("deal");
      return;
    }
    if (intent === "search") {
      addUser(text);
      if (sq) setSearchQuery(sq);
      showPlatformPicker("search");
      return;
    }
    if (intent === "import") {
      await handleImport(text);
      return;
    }
    if (intent === "summary") {
      addUser(text);
      startSummaryFlow();
      return;
    }
    if (intent === "template") {
      addUser(text);
      startTemplateFlow();
      return;
    }

    // Default: streaming chat
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages.filter(m => m.type !== "menu"), userMsg];
    setMessages(newMessages);
    scrollToBottom();
    await sendStreamingChat(text, newMessages);
  };

  // ────────── QUICK ACTIONS ──────────

  const handleQuickAction = (action: string) => {
    const actionMessages: Record<string, string> = {
      search: "חפש מוצר",
      deal: "צור דיל יומי",
      import: "ייבא הודעה מהקבוצה",
      stats: "הראה סטטיסטיקות",
      summary: "כתוב סיכום שבועי",
      template: "ערוך נוסח הודעה",
    };
    sendMessage(actionMessages[action] || action);
  };

  // ────────── BUTTON HANDLER ──────────

  const handleButtonClick = (value: string) => {
    // Import confirm/cancel
    if (value === "confirm_import") {
      handleImportConfirm(true);
      return;
    }
    if (value === "cancel_import") {
      handleImportConfirm(false);
      return;
    }

    if (activeFlow === "deal" && !flowPlatform) {
      handlePlatformSelect(value as "israel" | "thailand");
    } else if (activeFlow === "search" && !flowPlatform) {
      handlePlatformSelect(value as "israel" | "thailand");
    } else if (activeFlow === "deal" && flowPlatform && flowProducts.length === 0) {
      handleCategorySelect(value);
    } else if (activeFlow === "template" && !editingTemplate) {
      handleTemplateSelect(value);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "שגיאה בהעתקה", variant: "destructive" });
    }
  };

  // ────────── RENDER ──────────

  const renderAssistantText = (content: string) => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-1">{children}</ol>,
        li: ({ children }) => <li className="mb-0.5">{children}</li>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center overflow-hidden animate-in fade-in slide-in-from-bottom-4 ring-2 ring-teal-400 hover:ring-teal-300"
          aria-label="פתח את דינו"
        >
          <img src={dinoAvatar} alt="דינו" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed z-50 bg-background border border-border shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 bottom-0 right-0 w-full h-full sm:bottom-6 sm:right-6 sm:w-[380px] sm:h-[560px] sm:max-h-[calc(100vh-6rem)] sm:rounded-2xl" dir="rtl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-teal-500 sm:rounded-t-2xl">
            <div className="flex items-center gap-2">
              <img src={dinoAvatar} alt="דינו" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-bold text-white text-lg">דינו</span>
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse" />
            </div>
            <button onClick={() => { setIsOpen(false); resetFlow(); }} className="text-white/80 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="px-3 py-2 space-y-1 border-b bg-amber-50 dark:bg-amber-950/20">
              {alerts.map((alert, i) => (
                <p key={i} className="text-xs text-amber-700 dark:text-amber-300">{alert}</p>
              ))}
            </div>
          )}

          {/* Back to Menu button */}
          {activeFlow && !showResumePrompt && (
            <div className="px-3 py-1.5 border-b">
              <button
                onClick={() => { handleBackToMenu(); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowRight className="w-3 h-3" />
                <span>↩️ חזרה לתפריט</span>
              </button>
            </div>
          )}

          {/* Resume Prompt */}
          {showResumePrompt && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-4">
                <p className="text-lg">🦕 המשך משיחה קודמת?</p>
                <div className="flex gap-3 justify-center">
                  <Button size="sm" onClick={() => handleResumeChoice(true)}>כן, המשך</Button>
                  <Button size="sm" variant="outline" onClick={() => handleResumeChoice(false)}>שיחה חדשה</Button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {!showResumePrompt && (
            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {/* Menu */}
                  {msg.role === "assistant" && msg.type === "menu" ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">{msg.content}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {QUICK_ACTIONS.map(qa => (
                          <button key={qa.action} onClick={() => handleQuickAction(qa.action)}
                            className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-right text-sm transition-colors">
                            <span>{qa.emoji}</span>
                            <span className="text-xs leading-tight">{qa.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )

                  /* Buttons (including import confirm) */
                  : (msg.type === "buttons" || msg.type === "import_confirm") && msg.buttons ? (
                    <div className="space-y-2">
                      <div className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</div>
                      <div className="flex flex-wrap gap-2">
                        {msg.buttons.map(btn => (
                          <Button key={btn.value} size="sm" variant="outline" onClick={() => handleButtonClick(btn.value)}
                            disabled={isLoading} className="text-sm">
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )

                  /* Product cards */
                  : msg.type === "products" && msg.products ? (
                    <div className="space-y-2">
                      <p className="text-sm text-foreground">{msg.content}</p>
                      {msg.products.map((p, idx) => (
                        <div key={p.id}
                          onClick={() => activeFlow === "deal" ? handleProductSelect(p) : undefined}
                          className={`flex gap-2 p-2 rounded-lg border text-sm ${activeFlow === "deal" ? "cursor-pointer hover:bg-accent" : ""} ${selectedProduct?.id === p.id ? "ring-2 ring-primary" : "border-border"}`}>
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="w-12 h-12 object-contain rounded bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium line-clamp-1 text-foreground">{idx + 1}. {p.name}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {p.price != null && (
                                <Badge variant="secondary" className="text-xs">
                                  {flowPlatform === "thailand" || p.platform_label?.includes("Lazada") ? `฿${p.price}` : `$${p.price}`}
                                </Badge>
                              )}
                              {p.sales != null && p.sales > 0 && (
                                <span className="text-xs text-muted-foreground">🔥 {p.sales}</span>
                              )}
                              {p.tier && p.tier > 1 && (
                                <Badge variant={p.tier === 2 ? "outline" : "destructive"} className="text-[10px]">
                                  {p.tier === 2 ? "⚠️ Tier 2" : "🔍 Tier 3"}
                                </Badge>
                              )}
                            </div>
                            {p.tracking_link && activeFlow !== "deal" && (
                              <a href={p.tracking_link} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-teal-600 hover:underline mt-0.5 block truncate">
                                🔗 פתח מוצר
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )

                  /* User message */
                  : msg.role === "user" ? (
                    <div className="flex justify-start">
                      <div className="bg-teal-500 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] text-sm">
                        {msg.content}
                      </div>
                    </div>
                  )

                  /* Assistant message (text or deal_message) */
                  : (
                    <div className="flex justify-end">
                      <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%] text-sm whitespace-pre-wrap relative group">
                        {msg.type === "deal_message" ? msg.content : renderAssistantText(msg.content)}
                        {msg.content.length > 50 && (
                          <button onClick={() => copyText(msg.content)}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-background/80">
                            {copied === msg.content ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        )}
                        {msg.type === "deal_message" && (
                          <Button size="sm" variant="outline" className="mt-2 w-full gap-1 text-xs" onClick={() => copyText(msg.content)}>
                            {copied === msg.content ? <><Check className="w-3 h-3" /> הועתק!</> : <><Copy className="w-3 h-3" /> העתק לWhatsApp</>}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl px-4 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          {!showResumePrompt && (
            <div className="p-3 border-t">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeFlow ? "כתוב כאן... (או 'חזרה' לתפריט)" : "כתוב לדינו..."}
                  className="flex-1 text-sm rounded-xl"
                  disabled={isLoading}
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={isLoading || !input.trim()}
                  className="rounded-xl bg-teal-500 hover:bg-teal-600 shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DinoChat;
