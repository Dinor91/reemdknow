import { useState, useRef, useEffect, useCallback } from "react";
import dinoAvatar from "@/assets/dino-avatar.jpeg";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Send, Copy, Check, Loader2, ArrowRight, Maximize2, Minimize2, Trash2 } from "lucide-react";
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
  commission_rate?: number | null;
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

type FlowType = "deal" | "search" | "import" | "summary" | "template" | "import_name" | "sync_campaigns" | "conversions" | null;
type DealStep = "platform" | "commission_choice" | "category" | "products" | "coupon" | "generating" | "done";
type SearchStep = "platform" | "query" | "searching" | "results";
type SummaryStep = "ask_products" | "generating" | "done";
type TemplateStep = "pick" | "edit" | "confirming" | "done";

// ────────────────── Constants ──────────────────

const STORAGE_KEY = "dino_chat_history";
const DINO_UI_KEY = "dino_ui_state";
const MAX_STORED = 10;

const PRIMARY_ACTIONS = [
  { emoji: "📦", label: "צור דיל יומי", action: "deal" },
  { emoji: "🔍", label: "חפש מוצר ללקוח", action: "search" },
  { emoji: "📥", label: "ייבא הודעה מהקבוצה", action: "import" },
];

const SECONDARY_ACTIONS = [
  { emoji: "🚀", label: "ייבא קמפיינים עכשיו", action: "sync_campaigns" },
  { emoji: "💰", label: "דוח רווחים", action: "conversions" },
  { emoji: "✍️", label: "כתוב סיכום שבועי", action: "summary" },
  { emoji: "📝", label: "ערוך תבניות הודעות", action: "template" },
];

const LAZADA_CATEGORIES = [
  { label: "Games & Kids 🎮", value: "games_kids", filterValues: [5090, 5095], curatedCategories: ["ילדים"] },
  { label: "Gadgets 📱", value: "gadgets", filterValues: [42062201], curatedCategories: ["גאדג׳טים", "בית חכם", "כלי עבודה"] },
  { label: "Small Appliances 🏠", value: "appliances", filterValues: [3833], curatedCategories: ["בית", "בית חכם"] },
  { label: "Best Sellers ⭐", value: "best", filterValues: "all" as const },
];

const ALIEXPRESS_CATEGORIES = [
  { label: "🏠 גאדג׳טים ובית חכם", value: "gadgets_smart_home", filterValues: ["15", "44", "7", "202192403", "1420"] },
  { label: "🧩 משחקים ופתרונות לילדים", value: "games_kids", filterValues: ["26", "200000297"] },
  { label: "⚡ מוצרי חשמל קטנים", value: "small_appliances", filterValues: ["44", "1420"] },
  { label: "🏕️ ציוד לנסיעות וטיולים", value: "travel_outdoor", filterValues: ["18", "200000297"] },
  { label: "🚙 אביזרים לרכב ולאופנוע", value: "automotive", filterValues: ["34", "1511"] },
  { label: "⭐ הנמכרים ביותר", value: "best", filterValues: "all" as const },
];

const TEMPLATE_OPTIONS = [
  { label: "סיכום שבועי", value: "סיכום_שבועי" },
  { label: "פתיחת דיל", value: "פתיחת_דיל" },
  { label: "סיום הודעה", value: "סיום_הודעה" },
];

const BACK_KEYWORDS = ["חזרה", "תפריט", "ביטול", "back", "cancel", "menu"];

// Helper: findLastIndex polyfill for ES2022 compat
function findLastIdx<T>(arr: T[], predicate: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (predicate(arr[i])) return i;
  }
  return -1;
}

// ────────────────── Helpers ──────────────────

function detectIntentLocally(text: string): { intent: FlowType | "stats" | "tasks" | "chat"; searchQuery?: string } {
  const lower = text.trim().toLowerCase();

  // Check for back/cancel commands
  if (BACK_KEYWORDS.some(k => lower === k || lower === `/${k}`)) {
    return { intent: "chat" }; // Will be handled separately
  }

  // Tasks / onboarding keyword
  if (lower === "משימות" || lower === "פתיחה" || lower === "onboarding") {
    return { intent: "tasks" };
  }

  // Statistics
  if (lower.includes("סטטיסטיק") || lower.includes("קליקים") || lower.includes("נתונים")) {
    return { intent: "stats" };
  }

  // Conversions / Revenue
  if (lower.includes("המרות") || lower.includes("רווח") || lower.includes("כסף") || lower.includes("הכנסות") || lower.includes("earnings") || lower.includes("הרווחתי") || lower.includes("conversions")) {
    return { intent: "conversions" as any };
  }

  // Campaign sync
  if (lower.includes("ייבא קמפיינים") || lower.includes("קמפיינים") || lower.includes("campaigns") || lower.includes("sync campaigns")) {
    return { intent: "sync_campaigns" };
  }

  // High commission shortcut
  if (lower.includes("עמלה גבוהה") || lower.includes("high commission")) {
    return { intent: "deal", searchQuery: "high_commission" };
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
  const [flowHighCommission, setFlowHighCommission] = useState(false);
  const [showSecondaryMenu, setShowSecondaryMenu] = useState(false);

  // ── NEW: Drag, Expand, Minimize states ──
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  // Load saved UI state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DINO_UI_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isExpanded) setIsExpanded(parsed.isExpanded);
        if (parsed.position) setPosition(parsed.position);
      }
    } catch { /* ignore */ }
  }, []);

  // Save UI state to localStorage
  const saveUIState = useCallback((expanded: boolean, pos: { x: number; y: number } | null) => {
    try {
      localStorage.setItem(DINO_UI_KEY, JSON.stringify({ isExpanded: expanded, position: pos }));
    } catch { /* ignore */ }
  }, []);

  // ── Keyboard shortcuts (Ctrl+K to toggle, Escape to close) ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        if (!isAdmin) return;
        setIsOpen(prev => {
          if (!prev) {
            // Will trigger handleOpen logic via separate effect
            return true;
          }
          return false;
        });
      }
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        handleMinimize();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isAdmin]);

  // ── Drag handlers ──
  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    };
    const handleMouseUp = () => {
      setIsDragging(false);
      // Save position
      setPosition(prev => {
        saveUIState(isExpanded, prev);
        return prev;
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isExpanded, saveUIState]);

  const handleDragStart = (e: React.MouseEvent) => {
    // Only on desktop (not mobile), and only on the header area
    if (window.innerWidth < 640) return;
    const rect = (e.currentTarget as HTMLElement).closest("[data-dino-window]")?.getBoundingClientRect();
    if (!rect) return;
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  };

  // ── Mobile body scroll lock ──
  useEffect(() => {
    if (isOpen && window.innerWidth < 640) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  // ── Minimize animation ──
  const handleMinimize = () => {
    setIsMinimizing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsMinimizing(false);
    }, 250);
  };

  // ── Clear chat ──
  const handleClearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
    resetFlow();
    showWelcomeMenu();
  };

  // ── Toggle expand ──
  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded) {
      setPosition(null); // Center when expanding
    }
    saveUIState(newExpanded, newExpanded ? null : position);
  };

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
    setFlowHighCommission(false);
  };

  const handleBackToMenu = () => {
    resetFlow();
    setShowSecondaryMenu(false);
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
      const alertList: string[] = data?.alerts || [];
      
      // Add daily goal
      const goalMsg = await fetchDailyGoal();
      if (goalMsg) alertList.push(goalMsg);
      
      setAlerts(alertList);
    } catch { /* ignore */ }
  };

  const handleOpen = () => {
    if (!isOpen) setIsOpen(true);
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

  const handleCommissionChoice = async (choice: string) => {
    if (choice === "high_commission") {
      setFlowHighCommission(true);
      addUser("🔥 עמלה גבוהה");
      
      setIsLoading(true);
      try {
        if (flowPlatform === "israel") {
          // Check AliExpress campaign product count
          const { count } = await supabase
            .from("aliexpress_feed_products")
            .select("*", { count: "exact", head: true })
            .eq("is_campaign_product", true)
            .eq("out_of_stock", false);
          
          const campaignCount = count || 0;
          
          if (campaignCount === 0) {
            addAssistant("❌ אין קמפיינים רשומים", {
              type: "buttons",
              buttons: [
                { label: "🌐 פתח פורטל", value: "open_affiliate_portal" },
                { label: "🚀 ייבא קמפיינים", value: "trigger_sync" },
              ],
            });
            setIsLoading(false);
            return;
          } else if (campaignCount < 10) {
            addAssistant(`⚠️ יש רק ${campaignCount} מוצרי קמפיין, לייבא עוד?`, {
              type: "buttons",
              buttons: [
                { label: "🚀 ייבא עכשיו", value: "trigger_sync" },
                { label: "▶️ המשך עם מה שיש", value: "continue_categories" },
              ],
            });
            setIsLoading(false);
            return;
          } else {
            addAssistant(`✅ ${campaignCount} מוצרים זמינים`);
          }
        } else {
          // Check Lazada high commission product count
          const { count } = await supabase
            .from("feed_products")
            .select("*", { count: "exact", head: true })
            .gte("commission_rate", 0.15)
            .eq("out_of_stock", false);
          
          const hcCount = count || 0;
          
          if (hcCount === 0) {
            addAssistant("❌ אין מוצרים עם עמלה גבוהה כרגע");
            setFlowHighCommission(false);
          } else {
            addAssistant(`✅ ${hcCount} מוצרים עם עמלה גבוהה זמינים`);
          }
        }
      } catch (e) {
        console.error("Commission count error:", e);
      } finally {
        setIsLoading(false);
      }
      
      showCategoryPicker(flowPlatform!);
    } else {
      setFlowHighCommission(false);
      addUser("🛒 רגיל");
      showCategoryPicker(flowPlatform!);
    }
  };

  const handlePlatformSelect = (platform: "israel" | "thailand") => {
    setFlowPlatform(platform);
    addUser(platform === "israel" ? "🇮🇱 ישראל" : "🇹🇭 תאילנד");

    if (activeFlow === "deal") {
      // Show commission choice for both Israel and Thailand
      addAssistant("🛒 מיון רגיל (לפי מכירות) או 🔥 עמלה גבוהה?", {
        type: "buttons",
        buttons: [
          { label: "🛒 רגיל", value: "normal" },
          { label: "🔥 עמלה גבוהה", value: "high_commission" },
        ],
      });
      return;
    } else if (activeFlow === "search") {
      if (searchQuery) {
        executeSearch(platform, searchQuery);
      } else {
        addAssistant("מה לחפש? 🔍");
      }
    }
  };

  // ────────── DEAL FLOW ──────────

  const showCategoryPicker = async (platform: "israel" | "thailand") => {
    const cats = platform === "thailand" ? LAZADA_CATEGORIES : ALIEXPRESS_CATEGORIES;
    let counts: Record<string, number> = {};

    try {
      if (platform === "israel") {
        let query = supabase.from("aliexpress_feed_products")
          .select("category_id").eq("out_of_stock", false);
        if (flowHighCommission) query = query.eq("is_campaign_product", true);
        const { data } = await query;
        const rawCounts: Record<string, number> = {};
        let total = 0;
        for (const row of data || []) {
          if (row.category_id) rawCounts[row.category_id] = (rawCounts[row.category_id] || 0) + 1;
          total++;
        }
        for (const cat of cats) {
          if (cat.filterValues === "all") counts[cat.value] = total;
          else counts[cat.value] = (cat.filterValues as string[]).reduce((s, id) => s + (rawCounts[id] || 0), 0);
        }
      } else {
        let feedQuery = supabase.from("feed_products")
          .select("category_l1").eq("out_of_stock", false);
        if (flowHighCommission) feedQuery = feedQuery.gte("commission_rate", 0.15);
        const [feedRes, curatedRes] = await Promise.all([
          feedQuery,
          supabase.from("category_products").select("category").eq("is_active", true),
        ]);
        const feedCounts: Record<number, number> = {};
        let feedTotal = 0;
        for (const row of feedRes.data || []) {
          if (row.category_l1) feedCounts[row.category_l1] = (feedCounts[row.category_l1] || 0) + 1;
          feedTotal++;
        }
        const curatedCounts: Record<string, number> = {};
        let curatedTotal = 0;
        for (const row of curatedRes.data || []) {
          if (row.category) curatedCounts[row.category] = (curatedCounts[row.category] || 0) + 1;
          curatedTotal++;
        }
        for (const cat of cats) {
          const lazCat = cat as typeof LAZADA_CATEGORIES[0];
          if (cat.filterValues === "all") {
            counts[cat.value] = feedTotal + (flowHighCommission ? 0 : curatedTotal);
          } else {
            const feedCount = (cat.filterValues as number[]).reduce((s, id) => s + (feedCounts[id] || 0), 0);
            const curCount = flowHighCommission ? 0 : (lazCat.curatedCategories || []).reduce((s, c) => s + (curatedCounts[c] || 0), 0);
            counts[cat.value] = feedCount + curCount;
          }
        }
      }
    } catch (e) {
      console.error("Error fetching category counts:", e);
    }

    addAssistant("בחר קטגוריה:", {
      type: "buttons",
      buttons: cats.map(c => ({
        label: counts[c.value] !== undefined ? `${c.label} (${counts[c.value]})` : c.label,
        value: c.value,
      })),
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
          .select("id, product_name, image_url, price_thb, sales_7d, rating, brand_name, category_name_hebrew, tracking_link, discount_percentage, category_l1, commission_rate")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") feedQ = feedQ.in("category_l1", cat.filterValues as number[]);
        if (flowHighCommission) {
          feedQ = feedQ.gte("commission_rate", 0.15);
          feedQ = feedQ.order("commission_rate", { ascending: false }).order("sales_7d", { ascending: false, nullsFirst: false });
        } else {
          feedQ = feedQ.order("sales_7d", { ascending: false, nullsFirst: false });
        }
        feedQ = feedQ.limit(10);

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
          commission_rate: (p as any).commission_rate,
        }));
        const curItems: ProductItem[] = (curRes.data || []).map(p => ({
          id: `curated-${p.id}`, name: p.name_hebrew || p.name_english || "Unknown",
          image_url: p.image_url, price: p.price_thb, sales: p.sales_count, rating: p.rating,
          brand: null, category: p.category, tracking_link: p.affiliate_link,
          discount_percentage: null, source: "curated",
        }));

        const merged = flowHighCommission ? [...feedItems] : [...curItems, ...feedItems];
        const seen = new Set<string>();
        const deduped: ProductItem[] = [];
        for (const item of merged) {
          const key = (item.name || "").substring(0, 40).toLowerCase().trim();
          if (!seen.has(key)) { seen.add(key); deduped.push(item); }
        }
        if (flowHighCommission) {
          deduped.sort((a, b) => (b.commission_rate || 0) - (a.commission_rate || 0));
        } else {
          deduped.sort((a, b) => (b.sales || 0) - (a.sales || 0));
        }

        // Fallback for Thailand high commission
        if (flowHighCommission && deduped.length === 0) {
          addAssistant("לא נמצאו מוצרים עם עמלה גבוהה בקטגוריה הזו, מציג מוצרים רגילים... 🔄");
          let fallbackQ = supabase.from("feed_products")
            .select("id, product_name, image_url, price_thb, sales_7d, rating, brand_name, category_name_hebrew, tracking_link, discount_percentage, category_l1, commission_rate")
            .eq("out_of_stock", false);
          if (cat.filterValues !== "all") fallbackQ = fallbackQ.in("category_l1", cat.filterValues as number[]);
          fallbackQ = fallbackQ.order("sales_7d", { ascending: false, nullsFirst: false }).order("rating", { ascending: false, nullsFirst: false }).limit(20);
          const { data: fbData } = await fallbackQ;
          const fbItems = (fbData || []).map(p => ({
            id: p.id, name: p.product_name, image_url: p.image_url, price: p.price_thb,
            sales: p.sales_7d, rating: p.rating, brand: p.brand_name, category: p.category_name_hebrew,
            tracking_link: p.tracking_link, discount_percentage: p.discount_percentage, source: "feed",
            commission_rate: (p as any).commission_rate,
          }));
          items = fbItems.slice(0, 10);
        } else {
          items = deduped.slice(0, 10);
        }
      } else {
        let q = supabase.from("aliexpress_feed_products")
          .select("id, aliexpress_product_id, product_name, product_name_hebrew, image_url, price_usd, sales_30d, rating, category_name_hebrew, tracking_link, discount_percentage, category_id, commission_rate")
          .eq("out_of_stock", false);
        if (cat.filterValues !== "all") q = q.in("category_id", cat.filterValues as string[]);

        if (flowHighCommission) {
          q = q.gte("commission_rate", 0.15);
          q = q.order("commission_rate", { ascending: false }).order("sales_30d", { ascending: false, nullsFirst: false });
        } else {
          q = q.order("sales_30d", { ascending: false, nullsFirst: false }).order("rating", { ascending: false, nullsFirst: false }).order("commission_rate", { ascending: false, nullsFirst: false });
        }
        const { data } = await q.limit(20);

        // Fallback: if high commission returned 0, retry without filter
        if (flowHighCommission && (!data || data.length === 0)) {
          addAssistant("לא נמצאו מוצרים עם עמלה גבוהה בקטגוריה הזו, מציג מוצרים רגילים... 🔄");
          const { data: fallbackData } = await supabase.from("aliexpress_feed_products")
            .select("id, aliexpress_product_id, product_name, product_name_hebrew, image_url, price_usd, sales_30d, rating, category_name_hebrew, tracking_link, discount_percentage, category_id, commission_rate")
            .eq("out_of_stock", false)
            .in("category_id", cat.filterValues === "all" ? [] : cat.filterValues as string[])
            .order("sales_30d", { ascending: false, nullsFirst: false })
            .order("rating", { ascending: false, nullsFirst: false })
            .order("commission_rate", { ascending: false, nullsFirst: false })
            .limit(20);
          items = (fallbackData || []).map(p => ({
            id: p.id, name: p.product_name_hebrew || p.product_name, image_url: p.image_url,
            price: p.price_usd, sales: p.sales_30d, rating: p.rating, brand: null,
            category: p.category_name_hebrew,
            tracking_link: `https://www.aliexpress.com/item/${p.aliexpress_product_id}.html`,
            discount_percentage: p.discount_percentage,
            commission_rate: p.commission_rate,
          })).slice(0, 10);
        } else {
          items = (data || []).map(p => ({
            id: p.id, name: p.product_name_hebrew || p.product_name, image_url: p.image_url,
            price: p.price_usd, sales: p.sales_30d, rating: p.rating, brand: null,
            category: p.category_name_hebrew,
            tracking_link: `https://www.aliexpress.com/item/${p.aliexpress_product_id}.html`,
            discount_percentage: p.discount_percentage,
            commission_rate: p.commission_rate,
          })).slice(0, 10);
        }
      }

      setFlowProducts(items);
      if (items.length === 0) {
        addAssistant("לא נמצאו מוצרים בקטגוריה הזו 😕");
        resetFlow();
      } else {
        addAssistant(`נמצאו ${items.length} מוצרים, בחר מספר:`, { type: "products", products: items, buttons: [{ label: "🔄 קטגוריה אחרת", value: "change_category" }] });
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
    addAssistant("מה לעשות עם המוצר?", {
      type: "buttons",
      buttons: [
        { label: "📝 צור הודעת דיל", value: "generate_deal_msg" },
        { label: "🔍 בדוק קופונים", value: "check_coupons" },
      ],
    });
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
      // Track daily goal
      await trackDealGenerated();
      setFlowProducts([]);
      setSelectedProduct(null);
      addAssistant("מה עכשיו? 🦕", {
        type: "buttons",
        buttons: [
          { label: "🔄 קטגוריה אחרת", value: "change_category" },
          { label: "🏠 תפריט ראשי", value: "back_to_menu" },
        ],
      });
    } catch (e: any) {
      console.error("Deal generation error:", e);
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  // ────────── CREATE DEAL FROM SEARCH RESULT ──────────

  const handleCreateDealFromSearch = async (product: ProductItem) => {
    setIsLoading(true);
    addAssistant("📝 יוצר הודעת דיל...");

    try {
      const platform = product.platform_label?.includes("Lazada") ? "thailand" : "israel";
      const currencySymbol = platform === "thailand" ? "฿" : "$";
      const priceStr = product.price ? `${product.price} ${currencySymbol}` : "לא ידוע";

      const data = await invokeAction("generate_deal", {
        product: {
          name: product.name,
          price: priceStr,
          rating: product.rating ?? null,
          sales_7d: product.sales ?? 0,
          brand: product.brand || "",
          category: product.category || "",
          url: product.tracking_link || "",
        },
        coupon: "",
      });

      if (data?.error) throw new Error(data.error);

      // Replace "יוצר הודעת דיל..." with the actual message
      setMessages(prev => {
        const updated = [...prev];
        const idx = findLastIdx(updated, m => m.content === "📝 יוצר הודעת דיל...");
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], content: data.message || "שגיאה ביצירת הודעה", type: "deal_message" };
        }
        return updated;
      });
      scrollToBottom();

      // Save to deals_sent
      try {
        await invokeAction("save_deal", {
          product_id: product.id,
          product_name: product.name,
          product_name_hebrew: product.name,
          affiliate_url: product.tracking_link,
          platform,
          category: product.category,
          commission_rate: product.commission_rate,
        });
      } catch (e) {
        console.error("Failed to save deal:", e);
      }

      // Track daily goal
      await trackDealGenerated();
    } catch (e: any) {
      console.error("Deal from search error:", e);
      setMessages(prev => {
        const updated = [...prev];
        const idx = findLastIdx(updated, m => m.content === "📝 יוצר הודעת דיל...");
        if (idx >= 0) updated[idx] = { ...updated[idx], content: `שגיאה: ${e.message} ❌` };
        return updated;
      });
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
    const platformLabel = pendingImport!.platform === "israel" ? "ישראל" : "תאילנד";

    // Step 1: Identifying
    addAssistant("🔍 מזהה מוצר מהקישור...");

    try {
      // Step 2: Scraping
      setTimeout(() => {
        setMessages(prev => {
          const updated = [...prev];
          const idx = findLastIdx(updated, m => m.content === "🔍 מזהה מוצר מהקישור...");
          if (idx >= 0) updated[idx] = { ...updated[idx], content: "📸 מושך תמונות ופרטים..." };
          return updated;
        });
      }, 800);

      const data = await invokeAction("import_product", {
        confirmed: true,
        platform: pendingImport!.platform,
        resolved_url: pendingImport!.resolved_url,
        product_name: productName,
      });

      // Step 3: Update to saving
      setMessages(prev => {
        const updated = [...prev];
        const idx = findLastIdx(updated, m => 
          m.content === "📸 מושך תמונות ופרטים..." || m.content === "🔍 מזהה מוצר מהקישור..."
        );
        if (idx >= 0) updated[idx] = { ...updated[idx], content: "💾 שומר למאגר..." };
        return updated;
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      if (data?.success && data.step === "saved") {
        // Step 4: Done!
        setMessages(prev => {
          const updated = [...prev];
          const idx = findLastIdx(updated, m => m.content === "💾 שומר למאגר...");
          if (idx >= 0) {
            updated[idx] = { 
              ...updated[idx], 
              content: `✅ המוצר נוסף להמלצות העורך!\n\n${data.message}\n\n📊 סטטוס: פעיל בדף ${platformLabel}\n🔗 [צפה בדף הציבורי](/${pendingImport!.platform === "israel" ? "israel" : "thailand"})` 
            };
          }
          return updated;
        });
      } else {
        setMessages(prev => {
          const updated = [...prev];
          const idx = findLastIdx(updated, m => m.content === "💾 שומר למאגר...");
          if (idx >= 0) updated[idx] = { ...updated[idx], content: data?.error || "שגיאה בשמירה ❌" };
          return updated;
        });
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

  // ────────── SUMMARY FLOW (DATA-DRIVEN) ──────────

  const startSummaryFlow = async () => {
    setActiveFlow("summary");
    setIsLoading(true);
    addAssistant("📊 טוען ניתוח שבועי...");

    try {
      const data = await invokeAction("weekly_analytics");

      if (data?.error) {
        throw new Error(data.error);
      }

      const { topProducts, topCategories, totalOrders, totalCommissionILS, trend, lazadaOrders, aliexpressOrders } = data;

      // Build internal analytics view
      let report = "📊 **סיכום שבועי — ניתוח ביצועים**\n\n";
      
      // Totals
      report += `📦 סה\"כ הזמנות: **${totalOrders}** (🇹🇭 ${lazadaOrders} | 🇮🇱 ${aliexpressOrders})\n`;
      report += `💰 סה\"כ עמלה: **₪${totalCommissionILS}**`;
      if (trend !== null) {
        const trendEmoji = trend > 0 ? "📈" : trend < 0 ? "📉" : "➡️";
        report += ` ${trendEmoji} ${trend > 0 ? "+" : ""}${trend}% מהשבוע הקודם`;
      }
      report += "\n\n";

      // Top products
      if (topProducts && topProducts.length > 0) {
        report += "🏆 **מוצרים מובילים:**\n";
        const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
        topProducts.forEach((p: any, i: number) => {
          report += `${medals[i] || `${i + 1}.`} ${p.platform} ${p.name} — ${p.count} מכירות (₪${Math.round(p.commission_ils)})\n`;
        });
        report += "\n";
      }

      // Category breakdown
      if (topCategories && topCategories.length > 0) {
        report += "📂 **קטגוריות:**\n";
        topCategories.forEach((c: any) => {
          report += `• ${c.name} — ${c.count} הזמנות (₪${Math.round(c.commission_ils)})\n`;
        });
        report += "\n";
      }

      if (totalOrders === 0) {
        report += "⚠️ אין נתוני הזמנות השבוע. הפעל דוח רווחים קודם כדי למלא את בסיס הנתונים.\n";
      }

      // Remove loading message and show report
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.content !== "📊 טוען ניתוח שבועי...");
        return [...withoutLoading, { 
          role: "assistant" as const, 
          content: report,
          type: "text" as const,
        }];
      });
      scrollToBottom();

      // Show action button for group message
      if (totalOrders > 0) {
        addAssistant("מה לעשות עם הדוח?", {
          type: "buttons",
          buttons: [
            { label: "📱 צור הודעה לקבוצה", value: "generate_weekly_msg" },
            { label: "🏠 תפריט ראשי", value: "back_to_menu" },
          ],
        });
      } else {
        resetFlow();
      }
    } catch (e: any) {
      console.error("Weekly analytics error:", e);
      setMessages(prev => prev.filter(m => m.content !== "📊 טוען ניתוח שבועי..."));
      addAssistant(`שגיאה בטעינת ניתוח שבועי: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateWeeklyMessage = async () => {
    setIsLoading(true);
    addAssistant("📝 יוצר הודעה לקבוצה...");

    try {
      // Fetch analytics data again for the message
      const analyticsData = await invokeAction("weekly_analytics");
      const { topProducts, totalCommissionILS, totalOrders } = analyticsData;

      const data = await invokeAction("generate_weekly_message", {
        topProducts: topProducts || [],
        totalCommissionILS: totalCommissionILS || 0,
        totalOrders: totalOrders || 0,
      });

      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.content !== "📝 יוצר הודעה לקבוצה...");
        return [...withoutLoading, {
          role: "assistant" as const,
          content: data?.message || "שגיאה ביצירת הודעה",
          type: "deal_message" as const,
        }];
      });
      scrollToBottom();
      resetFlow();
    } catch (e: any) {
      console.error("Weekly message error:", e);
      setMessages(prev => prev.filter(m => m.content !== "📝 יוצר הודעה לקבוצה..."));
      addAssistant(`שגיאה: ${e.message} ❌`);
      resetFlow();
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummaryProducts = async (text: string) => {
    // Legacy fallback - shouldn't normally be called anymore
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

  // ────────── CAMPAIGN SYNC ──────────

  const handleCampaignSync = async () => {
    setActiveFlow("sync_campaigns");
    setIsLoading(true);
    addAssistant("🚀 מתחיל ייבוא קמפיינים מ-AliExpress...");

    try {
      const { data, error } = await supabase.functions.invoke("sync-campaigns-manual");
      if (error) throw error;

      if (data?.success) {
        addAssistant(
          `✅ ייבוא קמפיינים הושלם!\n\n` +
          `📢 קמפיינים פעילים: ${data.campaigns_found}\n` +
          `📦 מוצרים יובאו: ${data.products_imported}\n` +
          `💰 עמלה ממוצעת: ${data.avg_commission_rate}\n` +
          `🌐 תורגמו: ${data.translated}\n` +
          (data.errors > 0 ? `⚠️ שגיאות: ${data.errors}` : "")
        );
      } else {
        addAssistant(`שגיאה: ${data?.error || "לא ידוע"} ❌`);
      }
    } catch (e: any) {
      console.error("Campaign sync error:", e);
      addAssistant(`שגיאה בייבוא: ${e.message} ❌`);
    } finally {
      setIsLoading(false);
      resetFlow();
    }
  };

  // ────────── CONVERSIONS ──────────

  const showConversionsMenu = () => {
    setActiveFlow("conversions");
    addAssistant("📊 בחר דוח רווחים:", {
      type: "buttons",
      buttons: [
        { label: "🇹🇭 לזדה", value: "conversions_lazada" },
        { label: "🇮🇱 אליאקספרס", value: "conversions_aliexpress" },
        { label: "📊 דוח מלא", value: "conversions_all" },
      ],
    });
  };

  const handleConversionsAction = async (reportType: string) => {
    setIsLoading(true);
    addAssistant("⏳ טוען נתוני רווחים...");

    try {
      const data = await invokeAction(reportType);
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.content !== "⏳ טוען נתוני רווחים...");
        return [...withoutLoading, { role: "assistant" as const, content: data?.message || "אין נתונים" }];
      });
      scrollToBottom();
    } catch (e: any) {
      console.error("Conversions error:", e);
      setMessages(prev => {
        const withoutLoading = prev.filter(m => m.content !== "⏳ טוען נתוני רווחים...");
        return [...withoutLoading, { role: "assistant" as const, content: `שגיאה: ${e.message} ❌` }];
      });
    } finally {
      setIsLoading(false);
      resetFlow();
    }
  };

  // ────────── DAILY GOAL ──────────

  const fetchDailyGoal = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [israelRes, thailandRes] = await Promise.all([
        supabase
          .from("button_clicks")
          .select("*", { count: "exact", head: true })
          .eq("button_type", "deal_generated")
          .eq("country", "israel")
          .gte("created_at", todayISO),
        supabase
          .from("button_clicks")
          .select("*", { count: "exact", head: true })
          .eq("button_type", "deal_generated")
          .eq("country", "thailand")
          .gte("created_at", todayISO),
      ]);

      const israelCount = israelRes.count || 0;
      const thailandCount = thailandRes.count || 0;
      const total = israelCount + thailandCount;

      // Check if after 18:00 Israel time (UTC+3)
      const israelHour = new Date(Date.now() + 3 * 60 * 60 * 1000).getUTCHours();
      const missing = Math.max(0, 2 - israelCount) + Math.max(0, 2 - thailandCount);

      if (total >= 4) {
        return `🎉 יעד יומי הושלם! 🇮🇱 ${israelCount}/2 | 🇹🇭 ${thailandCount}/2`;
      }

      let msg = `📊 🇮🇱 ${israelCount}/2 | 🇹🇭 ${thailandCount}/2`;
      if (israelHour >= 18 && missing > 0) {
        msg += ` ⚠️ חסרים ${missing} דילים`;
      }
      return msg;
    } catch {
      return null;
    }
  };

  const trackDealGenerated = async () => {
    try {
      const country = flowPlatform || "israel";
      await supabase.functions.invoke("track-click", {
        body: { button_type: "deal_generated", source: "dino_chat", country },
      });
    } catch { /* ignore */ }
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

    if (intent === "tasks") {
      addUser(text);
      addAssistant("🔄 טוען משימות...");
      await fetchAlerts();
      setMessages(prev => prev.filter(m => m.content !== "🔄 טוען משימות..."));
      addAssistant("היי! מה נעשה? 🦕", { type: "menu" });
      return;
    }
    if (intent === "stats") {
      addUser(text);
      await handleStatistics();
      return;
    }
    if (intent === "sync_campaigns") {
      addUser(text);
      await handleCampaignSync();
      return;
    }
    if (intent === "conversions") {
      addUser(text);
      showConversionsMenu();
      return;
    }
    if (intent === "deal") {
      addUser(text);
      if (sq === "high_commission") {
        // Pre-set high commission and go directly to Israel
        setFlowHighCommission(true);
        setActiveFlow("deal");
        setFlowPlatform("israel");
        addAssistant("🔥 עמלה גבוהה - בחר קטגוריה:", {
          type: "buttons",
          buttons: ALIEXPRESS_CATEGORIES.map(c => ({ label: c.label, value: c.value })),
        });
      } else {
        showPlatformPicker("deal");
      }
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
    if (action === "sync_campaigns") {
      handleCampaignSync();
      return;
    }
    if (action === "conversions") {
      showConversionsMenu();
      return;
    }
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

    // Conversion report buttons
    if (value === "conversions_lazada" || value === "conversions_aliexpress" || value === "conversions_all") {
      addUser(value === "conversions_lazada" ? "🇹🇭 לזדה" : value === "conversions_aliexpress" ? "🇮🇱 אליאקספרס" : "📊 דוח מלא");
      handleConversionsAction(value);
      return;
    }

    // Product action buttons (after selecting a product)
    if (value === "generate_deal_msg" && selectedProduct) {
      addUser("📝 צור הודעת דיל");
      addAssistant("יש קופון? (אם לא, כתוב 'לא')");
      return;
    }
    if (value === "check_coupons" && selectedProduct) {
      addUser("🔍 בדוק קופונים");
      const productUrl = selectedProduct.tracking_link || `https://www.aliexpress.com/item/${selectedProduct.id}.html`;
      window.open(productUrl, "_blank");
      addAssistant("פתחתי את דף המוצר בטאב חדש — בדוק שם קופונים 🎟️");
      return;
    }

    // Campaign status buttons
    if (value === "open_affiliate_portal") {
      window.open("https://portals.aliexpress.com/", "_blank");
      addAssistant("פתחתי את פורטל השותפים בטאב חדש 🌐");
      return;
    }
    if (value === "trigger_sync") {
      handleCampaignSync();
      return;
    }
    if (value === "continue_categories") {
      showCategoryPicker(flowPlatform!);
      return;
    }
    if (value === "change_category") {
      setFlowProducts([]);
      setSelectedProduct(null);
      showCategoryPicker(flowPlatform!);
      return;
    }
    if (value === "back_to_menu") {
      resetFlow();
      setShowSecondaryMenu(false);
      addAssistant("חזרנו לתפריט 🦕", { type: "menu" });
      return;
    }
    if (value === "generate_weekly_msg") {
      addUser("📱 צור הודעה לקבוצה");
      handleGenerateWeeklyMessage();
      return;
    }

    // Commission choice (deal flow - both Israel and Thailand)
    if (activeFlow === "deal" && flowPlatform && (value === "normal" || value === "high_commission")) {
      handleCommissionChoice(value);
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
          onClick={() => { setIsOpen(true); handleOpen(); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center overflow-hidden animate-in fade-in slide-in-from-bottom-4 ring-2 ring-teal-400 hover:ring-teal-300"
          aria-label="פתח את דינו (Ctrl+K)"
        >
          <img src={dinoAvatar} alt="דינו" className="w-full h-full object-cover" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          data-dino-window
          className={`fixed z-50 bg-background border border-border shadow-2xl flex flex-col
            ${isMinimizing ? "animate-out fade-out slide-out-to-bottom-4 duration-200" : "animate-in fade-in slide-in-from-bottom-4"}
            bottom-0 right-0 w-full h-full
            ${isExpanded
              ? "sm:w-[70vw] sm:h-[80vh] sm:max-w-[1200px]"
              : "sm:w-[380px] sm:h-[560px]"
            }
            sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl`}
          style={
            window.innerWidth >= 640 && position && !isExpanded
              ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
              : window.innerWidth >= 640 && !position && !isExpanded
              ? { bottom: 24, right: 24, top: "auto", left: "auto" }
              : window.innerWidth >= 640 && isExpanded
              ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)", right: "auto", bottom: "auto" }
              : undefined
          }
          dir="rtl"
        >
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-3 border-b bg-teal-500 sm:rounded-t-2xl ${isDragging ? "cursor-grabbing" : "sm:cursor-grab"}`}
            onMouseDown={handleDragStart}
          >
            <div className="flex items-center gap-2">
              <img src={dinoAvatar} alt="דינו" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-bold text-white text-lg">דינו</span>
              {(() => {
                const hasError = alerts.some(a => a.includes("❌"));
                const hasWarn = alerts.some(a => a.includes("⚠️"));
                const emoji = hasError ? "🔴" : hasWarn ? "🟡" : "🟢";
                const color = hasError ? "bg-red-500" : hasWarn ? "bg-yellow-400" : "bg-green-400";
                const tooltip = hasError
                  ? alerts.find(a => a.includes("❌")) || "בעיה קריטית"
                  : hasWarn
                  ? alerts.find(a => a.includes("⚠️")) || "יש התראות"
                  : "הכל תקין ✅";
                return (
                  <div className="relative group/status flex items-center gap-1">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${color}`} />
                    <span className="text-white/80 text-xs cursor-default">{emoji}</span>
                    <div className="absolute top-full right-0 mt-2 w-52 bg-popover text-popover-foreground text-xs rounded-lg shadow-xl border border-border p-3 opacity-0 invisible group-hover/status:opacity-100 group-hover/status:visible transition-all duration-200 z-[60] pointer-events-none" dir="rtl">
                      <p className="font-semibold mb-1">{hasError ? "🔴 בעיה קריטית" : hasWarn ? "🟡 יש התראות" : "🟢 הכל תקין"}</p>
                      {alerts.length > 0 ? alerts.map((a, i) => (
                        <p key={i} className="text-muted-foreground leading-relaxed">{a}</p>
                      )) : <p className="text-muted-foreground">אין התראות</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClearChat} className="text-white/60 hover:text-white transition-colors p-1" title="נקה שיחה">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={toggleExpand} className="text-white/60 hover:text-white transition-colors p-1 hidden sm:block" title={isExpanded ? "הקטן" : "הגדל"}>
                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={handleMinimize} className="text-white/80 hover:text-white transition-colors p-1" title="סגור (Esc)">
                <X className="w-5 h-5" />
              </button>
            </div>
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
            <div className="flex-1 overflow-y-auto p-3 space-y-3" ref={scrollRef} style={{ overscrollBehavior: "contain" }}>
              {messages.map((msg, i) => (
                <div key={i}>
                  {/* Menu */}
                  {msg.role === "assistant" && msg.type === "menu" ? (
                    <div className="space-y-2">
                      <p className={`font-medium text-foreground ${isExpanded ? 'text-base' : 'text-sm'}`}>{msg.content}</p>
                      {!showSecondaryMenu ? (
                        <>
                          <div className="grid grid-cols-1 gap-2">
                            {PRIMARY_ACTIONS.map(qa => (
                              <button key={qa.action} onClick={() => handleQuickAction(qa.action)}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-right text-sm transition-colors">
                                <span>{qa.emoji}</span>
                                <span className={`leading-tight ${isExpanded ? 'text-sm' : 'text-xs'}`}>{qa.label}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowSecondaryMenu(true)}
                            className="flex items-center justify-center gap-1.5 w-full p-2 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-border text-xs transition-colors"
                          >
                            <span>⚙️</span>
                            <span>כלים נוספים</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-1 gap-2">
                            {SECONDARY_ACTIONS.map(qa => (
                              <button key={qa.action} onClick={() => { setShowSecondaryMenu(false); handleQuickAction(qa.action); }}
                                className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-right text-sm transition-colors">
                                <span>{qa.emoji}</span>
                                <span className={`leading-tight ${isExpanded ? 'text-sm' : 'text-xs'}`}>{qa.label}</span>
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => setShowSecondaryMenu(false)}
                            className="flex items-center justify-center gap-1.5 w-full p-2 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-border text-xs transition-colors"
                          >
                            <span>↩️</span>
                            <span>חזרה לראשי</span>
                          </button>
                        </>
                      )}
                    </div>
                  )

                  /* Buttons (including import confirm) */
                  : (msg.type === "buttons" || msg.type === "import_confirm") && msg.buttons ? (
                    <div className="space-y-2">
                      <div className={`text-foreground whitespace-pre-wrap ${isExpanded ? 'text-base' : 'text-sm'}`}>{msg.content}</div>
                      <div className="flex flex-wrap gap-2">
                        {msg.buttons.map(btn => (
                          <Button key={btn.value} size={isExpanded ? "default" : "sm"} variant="outline" onClick={() => handleButtonClick(btn.value)}
                            disabled={isLoading} className={isExpanded ? "text-base" : "text-sm"}>
                            {btn.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )

                  /* Product cards */
                  : msg.type === "products" && msg.products ? (
                    <div className="space-y-2">
                      <p className={`text-foreground ${isExpanded ? 'text-base' : 'text-sm'}`}>{msg.content}</p>
                      {msg.products.map((p, idx) => (
                        <div key={p.id}
                          onClick={() => activeFlow === "deal" ? handleProductSelect(p) : undefined}
                          className={`flex gap-2 p-2 rounded-lg border text-sm ${activeFlow === "deal" ? "cursor-pointer hover:bg-accent" : ""} ${selectedProduct?.id === p.id ? "ring-2 ring-primary" : "border-border"}`}>
                          {p.image_url && (
                            <img src={p.image_url} alt="" className="w-12 h-12 object-contain rounded bg-muted shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium line-clamp-1 text-foreground ${isExpanded ? 'text-base' : 'text-sm'}`}>{idx + 1}. {p.name}</p>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {p.price != null && (
                                <Badge variant="secondary" className="text-xs">
                                  {flowPlatform === "thailand" || p.platform_label?.includes("Lazada") ? `฿${p.price}` : `$${p.price}`}
                                </Badge>
                              )}
                              {p.sales != null && p.sales > 0 && (
                                <span className="text-xs text-muted-foreground">🔥 {p.sales}</span>
                              )}
                              {p.commission_rate != null && p.commission_rate > 0 && (
                                <Badge className="text-[10px] bg-green-600 text-white border-green-600">
                                  🔥 {Math.round(p.commission_rate * 100)}%
                                </Badge>
                              )}
                              {p.tier && p.tier > 1 && (
                                <Badge variant={p.tier === 2 ? "outline" : "destructive"} className="text-[10px]">
                                  {p.tier === 2 ? "⚠️ Tier 2" : "🔍 Tier 3"}
                                </Badge>
                              )}
                            </div>
                            {p.tracking_link && activeFlow !== "deal" && (
                              <div className="flex items-center gap-3 mt-0.5">
                                <a href={p.tracking_link} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-teal-600 hover:underline truncate">
                                  🔗 פתח מוצר
                                </a>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCreateDealFromSearch(p); }}
                                  disabled={isLoading}
                                  className="text-xs text-teal-600 hover:underline disabled:opacity-50"
                                >
                                  📝 צור דיל
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border">
                          {msg.buttons.map(btn => (
                            <Button key={btn.value} size="sm" variant="outline" onClick={() => handleButtonClick(btn.value)}
                              disabled={isLoading} className="text-sm">
                              {btn.label}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  )

                  /* User message */
                  : msg.role === "user" ? (
                    <div className="flex justify-start">
                      <div className={`bg-teal-500 text-white rounded-2xl rounded-br-sm px-3 py-2 max-w-[85%] ${isExpanded ? 'text-base' : 'text-sm'}`}>
                        {msg.content}
                      </div>
                    </div>
                  )

                  /* Assistant message (text or deal_message) */
                  : (
                    <div className="flex justify-end">
                      <div className={`bg-muted rounded-2xl rounded-bl-sm px-3 py-2 max-w-[85%] whitespace-pre-wrap relative group ${isExpanded ? 'text-base' : 'text-sm'}`}>
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
                  className={`flex-1 rounded-xl ${isExpanded ? 'text-base h-11' : 'text-sm'}`}
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
