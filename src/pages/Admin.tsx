import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, LogOut, Calendar, Package, BarChart3, Save, X, Store, Star, StarOff, MessageSquare, Mail, Phone, ChevronDown, ChevronUp, Download, ExternalLink, PackageX, ChevronLeft, ChevronRight, Filter, Link2, Search, Moon, Sun } from "lucide-react";
import { LinkConverter } from "@/components/admin/LinkConverter";
import { ExternalLinkDealTab } from "@/components/admin/ExternalLinkDealTab";
import { ProductSearchTab } from "@/components/admin/ProductSearchTab";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import dknowLogo from "@/assets/dknow-logo.png";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClickData {
  id: string;
  button_type: string;
  source: string | null;
  created_at: string;
}

interface ClickStats {
  total: number;
  whatsapp: number;
  telegram: number;
  bySource: Record<string, { whatsapp: number; telegram: number }>;
  byDay: { date: string; whatsapp: number; telegram: number; total: number }[];
}

interface CategoryProduct {
  id: string;
  name_hebrew: string;
  name_english: string | null;
  affiliate_link: string;
  lazada_product_id: string | null;
  image_url: string | null;
  price_thb: number | null;
  rating: number | null;
  sales_count: number | null;
  category: string;
  is_active: boolean;
  out_of_stock: boolean | null;
}

const chartConfig = {
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(142, 70%, 45%)",
  },
  telegram: {
    label: "Telegram",
    color: "hsl(200, 100%, 50%)",
  },
};

const CATEGORIES_THAILAND = [
  "מוצרי חשמל",
  "ריהוט ונוחות", 
  "מוצרי מזון ישראליים",
  "מוצרי ניקיון וכביסה",
  "לילדים",
  "טיולים",
  "חצר וגינה",
  "הדברה",
  "DIY",
  "כללי"
];

const CATEGORIES_ISRAEL = [
  "טכנולוגיה",
  "אלקטרוניקה",
  "לבית",
  "אופנה ואקססוריז",
  "ספורט וטיולים",
  "כללי"
];

// Israel Editor Product interface (separate table from feed)
interface IsraelEditorProduct {
  id: string;
  aliexpress_product_id: string | null;
  product_name_hebrew: string;
  product_name_english: string | null;
  image_url: string | null;
  price_usd: number | null;
  original_price_usd: number | null;
  discount_percentage: number | null;
  rating: number | null;
  sales_count: number | null;
  tracking_link: string;
  category_name_hebrew: string;
  is_active: boolean | null;
  out_of_stock: boolean | null;
}

// AliExpress Feed Product interface (for FeedTab only)
interface AliExpressFeedProduct {
  id: string;
  aliexpress_product_id: string;
  product_name: string;
  product_name_hebrew: string | null;
  image_url: string | null;
  price_usd: number | null;
  original_price_usd: number | null;
  discount_percentage: number | null;
  commission_rate: number | null;
  sales_30d: number | null;
  rating: number | null;
  reviews_count: number | null;
  category_id: string | null;
  category_name_hebrew: string | null;
  tracking_link: string | null;
  is_featured: boolean | null;
  out_of_stock: boolean | null;
}

type ProductsPlatform = "lazada" | "aliexpress";

const ProductsTab = () => {
  const [platform, setPlatform] = useState<ProductsPlatform>("lazada");
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [aliexpressProducts, setAliexpressProducts] = useState<IsraelEditorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CategoryProduct> & { category?: string }>({});
  const [aliEditingId, setAliEditingId] = useState<string | null>(null);
  const [aliEditData, setAliEditData] = useState<Partial<IsraelEditorProduct> & { category_name_hebrew?: string }>({});
  const [filter, setFilter] = useState("");
  const [updatingFromApi, setUpdatingFromApi] = useState(false);
 const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [quickCategoryUpdate, setQuickCategoryUpdate] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name_hebrew: "",
    affiliate_link: "",
    category: CATEGORIES_THAILAND[0],
    image_url: "",
    price_thb: "",
    rating: "",
    sales_count: "",
  });
  const [newAliProduct, setNewAliProduct] = useState({
    product_name_hebrew: "",
    tracking_link: "",
    category_name_hebrew: CATEGORIES_ISRAEL[0],
    image_url: "",
    price_usd: "",
    original_price_usd: "",
    rating: "",
    sales_count: "",
  });

  const fetchLazadaProducts = async () => {
    const { data, error } = await supabase
      .from("category_products")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching Lazada products:", error);
      toast.error("שגיאה בטעינת מוצרי Lazada");
    } else {
      setProducts(data || []);
    }
  };

  const fetchAliexpressEditorProducts = async () => {
    const { data, error } = await supabase
      .from("israel_editor_products")
      .select("*")
      .order("category_name_hebrew", { ascending: true })
      .order("sales_count", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("Error fetching Israel editor products:", error);
      toast.error("שגיאה בטעינת מוצרי ישראל");
    } else {
      setAliexpressProducts(data || []);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    if (platform === "lazada") {
      await fetchLazadaProducts();
    } else {
      await fetchAliexpressEditorProducts();
    }
    setLoading(false);
  };

  const updateFromApi = async () => {
    setUpdatingFromApi(true);
    try {
     const { data: session } = await supabase.auth.getSession();
     if (!session?.session?.access_token) {
       toast.error("יש להתחבר כאדמין");
       setUpdatingFromApi(false);
       return;
     }
     
     toast.info("🔄 מעדכן מחירים ותמונות מ-Lazada...");
     const { data, error } = await supabase.functions.invoke("update-category-products", {
       headers: {
         Authorization: `Bearer ${session.session.access_token}`
       }
     });
     
     if (error) throw error;
     
     if (data?.updated > 0) {
       toast.success(`✅ עודכנו ${data.updated} מוצרים (${data.foundInFeed || 0} נמצאו בפיד)`);
     } else {
       toast.info("כל המוצרים כבר מעודכנים");
     }
     fetchProducts();
    } catch (e) {
      console.error("Error updating from API:", e);
      toast.error("שגיאה בעדכון מה-API");
    }
    setUpdatingFromApi(false);
  };

  const startEdit = (product: CategoryProduct) => {
    setEditingId(product.id);
    setEditData({
      name_hebrew: product.name_hebrew,
      affiliate_link: product.affiliate_link,
      image_url: product.image_url || "",
      price_thb: product.price_thb || undefined,
      rating: product.rating || undefined,
      sales_count: product.sales_count || undefined,
      out_of_stock: product.out_of_stock || false,
      category: product.category,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase
      .from("category_products")
      .update({
        name_hebrew: editData.name_hebrew,
        affiliate_link: editData.affiliate_link,
        image_url: editData.image_url || null,
        price_thb: editData.price_thb || null,
        rating: editData.rating || null,
        sales_count: editData.sales_count || null,
        out_of_stock: editData.out_of_stock || false,
        category: editData.category,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving:", error);
      toast.error("שגיאה בשמירה");
    } else {
      toast.success("נשמר בהצלחה!");
      setEditingId(null);
      fetchProducts();
    }
  };

  const toggleOutOfStock = async (product: CategoryProduct) => {
    const newValue = !product.out_of_stock;
    const { error } = await supabase
      .from("category_products")
      .update({ out_of_stock: newValue, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      toast.error("שגיאה בעדכון");
    } else {
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, out_of_stock: newValue } : p
      ));
      toast.success(newValue ? "סומן כאזל במלאי" : "סומן כזמין");
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    const allCategories = new Set(Object.keys(groupedProducts));
    setExpandedCategories(allCategories);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

 // Category keywords for auto-detection (Thailand)
 const CATEGORY_KEYWORDS: Record<string, string[]> = {
   "בית": ["home", "kitchen", "bathroom", "bedroom", "furniture", "decor", "storage", "organizer", "towel", "curtain", "pillow", "blanket", "lamp", "pot", "pan", "bowl", "container", "utensil", "knife", "cutting board", "plate", "cup", "mug", "blender", "mixer", "coffee", "tea", "bbq", "grill", "opener", "silicone"],
   "ילדים": ["kid", "child", "baby", "toy", "game", "puzzle", "doll", "lego", "educational", "stroller", "diaper", "bottle", "pacifier", "infant", "toddler", "children", "school", "backpack kid", "lunch box", "playmat", "balloon", "birthday"],
   "טיולים": ["travel", "luggage", "suitcase", "backpack", "camping", "hiking", "outdoor", "tent", "sleeping bag", "flashlight", "water bottle"],
   "בריאות": ["health", "medical", "massage", "fitness", "exercise", "yoga", "gym", "weight", "scale", "blood pressure", "thermometer", "vitamin", "posture", "back support", "knee", "wrist", "pain relief", "sleep", "trimmer", "clipper", "shaver", "beard", "razor", "essential oil", "diffuser"],
   "גאדג׳טים": ["gadget", "electronic", "usb", "bluetooth", "wireless", "speaker", "headphone", "earphone", "power bank", "cable", "charger", "adapter", "mouse", "keyboard", "webcam", "microphone", "led", "drone", "camera", "tripod", "phone holder", "tablet", "smart watch", "earbuds", "tws", "headset", "hub", "dock"],
   "נסיעות": ["passport", "neck pillow", "travel adapter", "packing"],
   "רכב": ["car", "auto", "vehicle", "tire", "wheel", "motor", "engine", "dashboard", "gps", "driving", "parking", "seat cover", "steering", "headlight", "brake", "motorcycle", "bike holder", "trunk", "windshield", "charger car", "obd", "rearview", "mirror car", "bumper", "wiper"],
   "בית חכם": ["smart home", "wifi", "alexa", "google home", "automation", "sensor", "switch", "socket", "plug smart", "bulb smart", "camera security", "doorbell", "lock smart", "thermostat", "remote control", "zigbee", "tuya", "robot vacuum", "dreame", "xiaomi robot", "roborock", "roomba"],
   "כלי עבודה": ["tool", "drill", "screwdriver", "wrench", "hammer", "plier", "saw", "measure", "tape", "level", "multimeter", "soldering", "welding", "cutting", "grinding", "toolbox", "work light", "safety", "ladder", "pump"],
   "הדברה": ["pest", "insect", "mosquito", "bug", "repellent", "trap", "cockroach", "ant", "fly", "mouse trap", "rat"],
   "חצר וגינה": ["garden", "plant", "flower", "hose", "sprinkler", "lawn", "patio"],
   "DIY": ["diy", "craft", "paint", "brush", "glue", "screw", "nail", "wood", "renovation"]
 };

 const detectCategory = (productName: string): string => {
   if (!productName) return "כללי";
   const lowerName = productName.toLowerCase();
   for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
     for (const keyword of keywords) {
       if (lowerName.includes(keyword.toLowerCase())) {
         return category;
       }
     }
   }
   return "כללי";
 };

 const handleRecategorize = async () => {
   setIsRecategorizing(true);
   try {
     const { data: productsToUpdate, error } = await supabase
       .from('category_products')
       .select('id, name_hebrew, name_english, category')
       .eq('category', 'כללי');

     if (error) throw error;

     if (!productsToUpdate || productsToUpdate.length === 0) {
       toast.info("אין מוצרים בקטגוריית 'כללי' לסיווג");
       setIsRecategorizing(false);
       return;
     }

     let updated = 0;
     for (const product of productsToUpdate) {
       const productName = product.name_english || product.name_hebrew;
       const newCategory = detectCategory(productName);
       
       if (newCategory !== 'כללי') {
         const { error: updateError } = await supabase
           .from('category_products')
           .update({ category: newCategory })
           .eq('id', product.id);
         
         if (!updateError) updated++;
       }
     }

     toast.success(`סווגו מחדש ${updated} מתוך ${productsToUpdate.length} מוצרים`);
     fetchProducts();
   } catch (err) {
     console.error('Error recategorizing:', err);
     toast.error("שגיאה בסיווג מחדש");
   } finally {
     setIsRecategorizing(false);
   }
 };

  const handleQuickCategoryChange = async (productId: string, newCategory: string) => {
    setQuickCategoryUpdate(prev => ({ ...prev, [productId]: true }));
    try {
      const { error } = await supabase
        .from('category_products')
        .update({ category: newCategory, updated_at: new Date().toISOString() })
        .eq('id', productId);

      if (error) throw error;
      
      toast.success(`הועבר לקטגוריה "${newCategory}"`);
      fetchProducts();
    } catch (err) {
      console.error('Error updating category:', err);
      toast.error("שגיאה בעדכון קטגוריה");
    } finally {
      setQuickCategoryUpdate(prev => ({ ...prev, [productId]: false }));
    }
  };

  const addNewProduct = async () => {
    if (!newProduct.name_hebrew || !newProduct.affiliate_link) {
      toast.error("נא למלא שם מוצר וקישור");
      return;
    }

    const { error } = await supabase
      .from("category_products")
      .insert({
        name_hebrew: newProduct.name_hebrew,
        affiliate_link: newProduct.affiliate_link,
        category: newProduct.category,
        image_url: newProduct.image_url || null,
        price_thb: newProduct.price_thb ? parseFloat(newProduct.price_thb) : null,
        rating: newProduct.rating ? parseFloat(newProduct.rating) : null,
        sales_count: newProduct.sales_count ? parseInt(newProduct.sales_count) : null,
        is_active: true,
        out_of_stock: false,
      });

    if (error) {
      console.error("Error adding product:", error);
      toast.error("שגיאה בהוספת מוצר");
    } else {
      toast.success("המוצר נוסף בהצלחה!");
      // Trigger automatic image scraping in background if no image was provided
      if (!newProduct.image_url) {
        toast.info("מחפש תמונה אוטומטית...");
        supabase.functions.invoke("scrape-lazada-images").catch(console.error);
      }
      setShowAddProduct(false);
      setNewProduct({
        name_hebrew: "",
        affiliate_link: "",
        category: CATEGORIES_THAILAND[0],
        image_url: "",
        price_thb: "",
        rating: "",
        sales_count: "",
      });
      fetchProducts();
    }
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`למחוק את "${name}"?`)) return;
    
    const { error } = await supabase
      .from("category_products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("המוצר נמחק");
      fetchProducts();
    }
  };

  // Israel Editor CRUD functions
  const startAliEdit = (product: IsraelEditorProduct) => {
    setAliEditingId(product.id);
    setAliEditData({
      product_name_hebrew: product.product_name_hebrew || "",
      tracking_link: product.tracking_link || "",
      image_url: product.image_url || "",
      price_usd: product.price_usd || undefined,
      original_price_usd: product.original_price_usd || undefined,
      rating: product.rating || undefined,
      sales_count: product.sales_count || undefined,
      out_of_stock: product.out_of_stock || false,
      category_name_hebrew: product.category_name_hebrew || CATEGORIES_ISRAEL[0],
    });
  };

  const cancelAliEdit = () => {
    setAliEditingId(null);
    setAliEditData({});
  };

  const saveAliEdit = async (id: string) => {
    const discountPct = aliEditData.original_price_usd && aliEditData.price_usd
      ? Math.round((1 - aliEditData.price_usd / aliEditData.original_price_usd) * 100)
      : null;

    const { error } = await supabase
      .from("israel_editor_products")
      .update({
        product_name_hebrew: aliEditData.product_name_hebrew,
        tracking_link: aliEditData.tracking_link || null,
        image_url: aliEditData.image_url || null,
        price_usd: aliEditData.price_usd || null,
        original_price_usd: aliEditData.original_price_usd || null,
        discount_percentage: discountPct,
        rating: aliEditData.rating || null,
        sales_count: aliEditData.sales_count || null,
        out_of_stock: aliEditData.out_of_stock || false,
        category_name_hebrew: aliEditData.category_name_hebrew,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("Error saving:", error);
      toast.error("שגיאה בשמירה");
    } else {
      toast.success("נשמר בהצלחה!");
      setAliEditingId(null);
      fetchProducts();
    }
  };

  const toggleAliOutOfStock = async (product: IsraelEditorProduct) => {
    const newValue = !product.out_of_stock;
    const { error } = await supabase
      .from("israel_editor_products")
      .update({ out_of_stock: newValue, updated_at: new Date().toISOString() })
      .eq("id", product.id);

    if (error) {
      toast.error("שגיאה בעדכון");
    } else {
      setAliexpressProducts(aliexpressProducts.map(p => 
        p.id === product.id ? { ...p, out_of_stock: newValue } : p
      ));
      toast.success(newValue ? "סומן כאזל במלאי" : "סומן כזמין");
    }
  };

  const addNewAliProduct = async () => {
    if (!newAliProduct.product_name_hebrew || !newAliProduct.tracking_link) {
      toast.error("נא למלא שם מוצר וקישור");
      return;
    }

    const priceUsd = newAliProduct.price_usd ? parseFloat(newAliProduct.price_usd) : null;
    const originalPriceUsd = newAliProduct.original_price_usd ? parseFloat(newAliProduct.original_price_usd) : null;
    const discountPct = originalPriceUsd && priceUsd
      ? Math.round((1 - priceUsd / originalPriceUsd) * 100)
      : null;

    const { error } = await supabase
      .from("israel_editor_products")
      .insert({
        aliexpress_product_id: `manual-${Date.now()}`,
        product_name_hebrew: newAliProduct.product_name_hebrew,
        tracking_link: newAliProduct.tracking_link,
        category_name_hebrew: newAliProduct.category_name_hebrew,
        image_url: newAliProduct.image_url || null,
        price_usd: priceUsd,
        original_price_usd: originalPriceUsd,
        discount_percentage: discountPct,
        rating: newAliProduct.rating ? parseFloat(newAliProduct.rating) : null,
        sales_count: newAliProduct.sales_count ? parseInt(newAliProduct.sales_count) : null,
        is_active: true,
        out_of_stock: false,
      });

    if (error) {
      console.error("Error adding product:", error);
      toast.error("שגיאה בהוספת מוצר");
    } else {
      toast.success("המוצר נוסף בהצלחה!");
      // Trigger automatic image scraping in background if no image was provided
      if (!newAliProduct.image_url) {
        toast.info("מחפש תמונה אוטומטית...");
        supabase.functions.invoke("scrape-product-images").catch(console.error);
      }
      setShowAddProduct(false);
      setNewAliProduct({
        product_name_hebrew: "",
        tracking_link: "",
        category_name_hebrew: CATEGORIES_ISRAEL[0],
        image_url: "",
        price_usd: "",
        original_price_usd: "",
        rating: "",
        sales_count: "",
      });
      fetchProducts();
    }
  };

  const deleteAliProduct = async (id: string, name: string) => {
    if (!confirm(`למחוק את "${name}"?`)) return;
    
    const { error } = await supabase
      .from("israel_editor_products")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("המוצר נמחק");
      fetchProducts();
    }
  };

  const expandAllAli = () => {
    const allCategories = new Set(Object.keys(groupedAliProducts));
    setExpandedCategories(allCategories);
  };

  useEffect(() => {
    fetchProducts();
  }, [platform]);

  const filteredProducts = products.filter(
    (p) =>
      p.name_hebrew.includes(filter) ||
      p.category.includes(filter) ||
      (p.name_english && p.name_english.toLowerCase().includes(filter.toLowerCase()))
  );

  const groupedProducts = filteredProducts.reduce((acc, product) => {
    if (!acc[product.category]) {
      acc[product.category] = [];
    }
    acc[product.category].push(product);
    return acc;
  }, {} as Record<string, CategoryProduct[]>);

  // Filter and group Israel editor products
  const filteredAliProducts = aliexpressProducts.filter(
    (p) =>
      p.product_name_hebrew.toLowerCase().includes(filter.toLowerCase()) ||
      (p.category_name_hebrew && p.category_name_hebrew.includes(filter))
  );

  const groupedAliProducts = filteredAliProducts.reduce((acc, product) => {
    const category = product.category_name_hebrew || "כללי";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, IsraelEditorProduct[]>);

  return (
    <div className="space-y-4">
      {/* Platform Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Button
          variant={platform === "lazada" ? "default" : "outline"}
          onClick={() => setPlatform("lazada")}
          className={`text-xs md:text-sm ${platform === "lazada" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
          size="sm"
        >
          <Store className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
          <span className="hidden sm:inline">Lazada (תאילנד)</span>
          <span className="sm:hidden">Lazada</span>
        </Button>
        <Button
          variant={platform === "aliexpress" ? "default" : "outline"}
          onClick={() => setPlatform("aliexpress")}
          className={`text-xs md:text-sm ${platform === "aliexpress" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
          size="sm"
        >
          <Package className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
          <span className="hidden sm:inline">AliExpress (ישראל)</span>
          <span className="sm:hidden">AliExpress</span>
        </Button>
      </div>

      {platform === "lazada" ? (
        /* Lazada Products - Existing UI */
        <>
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <Input
              placeholder="חיפוש מוצר..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full sm:max-w-xs"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setShowAddProduct(true)} variant="default" className="bg-green-600 hover:bg-green-700 text-xs md:text-sm" size="sm">
                <Package className="h-3 w-3 md:h-4 md:w-4 ml-1" />
                <span className="hidden sm:inline">הוסף מוצר</span>
                <span className="sm:hidden">הוסף</span>
              </Button>
              <Button onClick={expandAll} variant="ghost" size="sm" className="text-xs md:text-sm">
                פתח הכל
              </Button>
              <Button onClick={collapseAll} variant="ghost" size="sm" className="text-xs md:text-sm">
                סגור הכל
              </Button>
              <Button onClick={fetchProducts} variant="outline" disabled={loading} size="sm" className="text-xs md:text-sm">
                <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${loading ? "animate-spin" : ""}`} />
                רענן
              </Button>
              <Button onClick={updateFromApi} disabled={updatingFromApi} size="sm" className="text-xs md:text-sm">
                <Package className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${updatingFromApi ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">עדכון מ-API</span>
                <span className="sm:hidden">API</span>
              </Button>
             <Button onClick={handleRecategorize} disabled={isRecategorizing} variant="secondary" size="sm" className="text-xs md:text-sm">
               <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${isRecategorizing ? "animate-spin" : ""}`} />
               <span className="hidden sm:inline">סווג "כללי"</span>
               <span className="sm:hidden">סווג</span>
             </Button>
            </div>
          </div>

          {/* Add New Product Form */}
          {showAddProduct && (
            <Card className="p-4 border-green-300 bg-green-50/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                הוספת מוצר חדש
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">שם המוצר בעברית *</label>
                  <Input
                    value={newProduct.name_hebrew}
                    onChange={(e) => setNewProduct({ ...newProduct, name_hebrew: e.target.value })}
                    placeholder="שם המוצר"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">קישור affiliate *</label>
                  <Input
                    value={newProduct.affiliate_link}
                    onChange={(e) => setNewProduct({ ...newProduct, affiliate_link: e.target.value })}
                    placeholder="https://c.lazada.co.th/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">קטגוריה</label>
                  <Select value={newProduct.category} onValueChange={(val) => setNewProduct({ ...newProduct, category: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES_THAILAND.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">תמונה URL</label>
                  <Input
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מחיר (฿)</label>
                  <Input
                    type="number"
                    value={newProduct.price_thb}
                    onChange={(e) => setNewProduct({ ...newProduct, price_thb: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">דירוג</label>
                  <Input
                    type="number"
                    step="0.1"
                    max="5"
                    value={newProduct.rating}
                    onChange={(e) => setNewProduct({ ...newProduct, rating: e.target.value })}
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">נמכרו</label>
                  <Input
                    type="number"
                    value={newProduct.sales_count}
                    onChange={(e) => setNewProduct({ ...newProduct, sales_count: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addNewProduct} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 ml-1" />
                  הוסף מוצר
                </Button>
                <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                  <X className="h-4 w-4 ml-1" />
                  ביטול
                </Button>
              </div>
            </Card>
          )}

          <div className="text-sm text-muted-foreground">
            סה"כ {products.length} מוצרים | {products.filter(p => p.price_thb).length} עם מחיר | {products.filter(p => p.out_of_stock).length} אזלו במלאי
          </div>

          {loading ? (
            <p className="text-muted-foreground">טוען...</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
                <Card key={category} className="overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{category}</h3>
                      <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
                      {categoryProducts.some(p => p.out_of_stock) && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {categoryProducts.filter(p => p.out_of_stock).length} אזלו
                        </span>
                      )}
                    </div>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  {expandedCategories.has(category) && (
                    <div className="border-t p-4 space-y-2">
                      {categoryProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`p-3 rounded-lg border ${
                            product.out_of_stock 
                              ? "border-red-300 bg-red-50/50" 
                              : editingId === product.id 
                                ? "border-orange-400 bg-orange-50" 
                                : "bg-muted/30"
                          }`}
                        >
                          {editingId === product.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">שם המוצר</label>
                                  <Input
                                    value={editData.name_hebrew || ""}
                                    onChange={(e) => setEditData({ ...editData, name_hebrew: e.target.value })}
                                    placeholder="שם המוצר"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">קישור לאזדה</label>
                                  <Input
                                    value={editData.affiliate_link || ""}
                                    onChange={(e) => setEditData({ ...editData, affiliate_link: e.target.value })}
                                    placeholder="https://..."
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">קטגוריה</label>
                                  <Select value={editData.category || ""} onValueChange={(val) => setEditData({ ...editData, category: val })}>
                                    <SelectTrigger className="text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORIES_THAILAND.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">תמונה URL</label>
                                  <Input
                                    value={editData.image_url || ""}
                                    onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                                    placeholder="https://..."
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">מחיר (฿)</label>
                                  <Input
                                    type="number"
                                    value={editData.price_thb || ""}
                                    onChange={(e) => setEditData({ ...editData, price_thb: parseFloat(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">דירוג</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    max="5"
                                    value={editData.rating || ""}
                                    onChange={(e) => setEditData({ ...editData, rating: parseFloat(e.target.value) || undefined })}
                                    placeholder="4.5"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">נמכרו</label>
                                  <Input
                                    type="number"
                                    value={editData.sales_count || ""}
                                    onChange={(e) => setEditData({ ...editData, sales_count: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={editData.out_of_stock || false}
                                      onCheckedChange={(checked) => setEditData({ ...editData, out_of_stock: checked })}
                                    />
                                    <label className="text-xs text-muted-foreground">אזל במלאי</label>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveEdit(product.id)}>
                                  <Save className="h-3 w-3 ml-1" />
                                  שמור
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit}>
                                  <X className="h-3 w-3 ml-1" />
                                  ביטול
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteProduct(product.id, product.name_hebrew)}>
                                  <X className="h-3 w-3 ml-1" />
                                  מחק
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center text-xs flex-shrink-0">📦</div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="font-medium text-sm sm:text-base truncate">{product.name_hebrew}</div>
                                    {product.out_of_stock && (
                                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <PackageX className="h-3 w-3" />
                                        אזל
                                      </span>
                                    )}
                                  </div>
                                  {product.name_english && (
                                    <div className="text-xs text-muted-foreground truncate">{product.name_english}</div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mr-10 sm:mr-0">
                                {product.price_thb ? (
                                  <span className="font-medium text-orange-600">฿{product.price_thb.toLocaleString()}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                {product.rating ? (
                                  <span>⭐ {product.rating}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                <div className="flex items-center gap-1">
                                  <Switch
                                    checked={product.out_of_stock || false}
                                    onCheckedChange={() => toggleOutOfStock(product)}
                                  />
                                </div>
                                <a
                                  href={product.affiliate_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                                {category === "כללי" && (
                                  <Select 
                                    value="" 
                                    onValueChange={(val) => handleQuickCategoryChange(product.id, val)}
                                    disabled={quickCategoryUpdate[product.id]}
                                  >
                                    <SelectTrigger className="w-[120px] h-8 text-xs bg-background border">
                                      <SelectValue placeholder={quickCategoryUpdate[product.id] ? "מעדכן..." : "העבר ל..."} />
                                    </SelectTrigger>
                                    <SelectContent className="bg-background z-50 border shadow-lg">
                                      {CATEGORIES_THAILAND.filter(cat => cat !== "כללי").map(cat => (
                                        <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => startEdit(product)}>
                                  ערוך
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* AliExpress Products - Full management like Lazada */
        <>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Input
              placeholder="חיפוש מוצר..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex gap-2">
              <Button onClick={() => setShowAddProduct(true)} variant="default" className="bg-green-600 hover:bg-green-700">
                <Package className="h-4 w-4 ml-2" />
                הוסף מוצר
              </Button>
              <Button onClick={expandAllAli} variant="ghost" size="sm">
                פתח הכל
              </Button>
              <Button onClick={collapseAll} variant="ghost" size="sm">
                סגור הכל
              </Button>
              <Button onClick={fetchProducts} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
                רענן
              </Button>
            </div>
          </div>

          {/* Add New AliExpress Product Form */}
          {showAddProduct && (
            <Card className="p-4 border-green-300 bg-green-50/50">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                הוספת מוצר חדש (ישראל)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">שם המוצר בעברית *</label>
                  <Input
                    value={newAliProduct.product_name_hebrew}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, product_name_hebrew: e.target.value })}
                    placeholder="שם המוצר"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">קישור affiliate *</label>
                  <Input
                    value={newAliProduct.tracking_link}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, tracking_link: e.target.value })}
                    placeholder="https://s.click.aliexpress.com/..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground">קטגוריה</label>
                  <Select value={newAliProduct.category_name_hebrew} onValueChange={(val) => setNewAliProduct({ ...newAliProduct, category_name_hebrew: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES_ISRAEL.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">תמונה URL</label>
                  <Input
                    value={newAliProduct.image_url}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מחיר ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAliProduct.price_usd}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, price_usd: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">מחיר מקורי ($)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newAliProduct.original_price_usd}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, original_price_usd: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">דירוג</label>
                  <Input
                    type="number"
                    step="0.1"
                    max="5"
                    value={newAliProduct.rating}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, rating: e.target.value })}
                    placeholder="4.5"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">נמכרו</label>
                  <Input
                    type="number"
                    value={newAliProduct.sales_count}
                    onChange={(e) => setNewAliProduct({ ...newAliProduct, sales_count: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addNewAliProduct} className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 ml-1" />
                  הוסף מוצר
                </Button>
                <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                  <X className="h-4 w-4 ml-1" />
                  ביטול
                </Button>
              </div>
            </Card>
          )}

          <div className="text-sm text-muted-foreground">
            סה"כ {aliexpressProducts.length} מוצרים מועדפים | {aliexpressProducts.filter(p => p.out_of_stock).length} אזלו במלאי
          </div>

          {loading ? (
            <p className="text-muted-foreground">טוען...</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(groupedAliProducts).map(([category, categoryProducts]) => (
                <Card key={category} className="overflow-hidden">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{category}</h3>
                      <span className="text-sm text-muted-foreground">({categoryProducts.length})</span>
                      {categoryProducts.some(p => p.out_of_stock) && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          {categoryProducts.filter(p => p.out_of_stock).length} אזלו
                        </span>
                      )}
                    </div>
                    {expandedCategories.has(category) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </button>
                  
                  {expandedCategories.has(category) && (
                    <div className="border-t p-4 space-y-2">
                      {categoryProducts.map((product) => (
                        <div
                          key={product.id}
                          className={`p-3 rounded-lg border ${
                            product.out_of_stock 
                              ? "border-red-300 bg-red-50/50" 
                              : aliEditingId === product.id 
                                ? "border-blue-400 bg-blue-50" 
                                : "bg-muted/30"
                          }`}
                        >
                          {aliEditingId === product.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">שם המוצר בעברית</label>
                                  <Input
                                    value={aliEditData.product_name_hebrew || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, product_name_hebrew: e.target.value })}
                                    placeholder="שם המוצר"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">קישור AliExpress</label>
                                  <Input
                                    value={aliEditData.tracking_link || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, tracking_link: e.target.value })}
                                    placeholder="https://..."
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">קטגוריה</label>
                                  <Select value={aliEditData.category_name_hebrew || ""} onValueChange={(val) => setAliEditData({ ...aliEditData, category_name_hebrew: val })}>
                                    <SelectTrigger className="text-sm">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {CATEGORIES_ISRAEL.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">תמונה URL</label>
                                  <Input
                                    value={aliEditData.image_url || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, image_url: e.target.value })}
                                    placeholder="https://..."
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">מחיר ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={aliEditData.price_usd || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, price_usd: parseFloat(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">מחיר מקורי ($)</label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={aliEditData.original_price_usd || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, original_price_usd: parseFloat(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">דירוג</label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    max="5"
                                    value={aliEditData.rating || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, rating: parseFloat(e.target.value) || undefined })}
                                    placeholder="4.5"
                                    className="text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">נמכרו</label>
                                  <Input
                                    type="number"
                                    value={aliEditData.sales_count || ""}
                                    onChange={(e) => setAliEditData({ ...aliEditData, sales_count: parseInt(e.target.value) || undefined })}
                                    placeholder="0"
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex items-end gap-2">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={aliEditData.out_of_stock || false}
                                      onCheckedChange={(checked) => setAliEditData({ ...aliEditData, out_of_stock: checked })}
                                    />
                                    <label className="text-xs text-muted-foreground">אזל במלאי</label>
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => saveAliEdit(product.id)}>
                                  <Save className="h-3 w-3 ml-1" />
                                  שמור
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelAliEdit}>
                                  <X className="h-3 w-3 ml-1" />
                                  ביטול
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteAliProduct(product.id, product.product_name_hebrew)}>
                                  <X className="h-3 w-3 ml-1" />
                                  מחק
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center text-xs flex-shrink-0">📦</div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                                    <div className="font-medium text-sm sm:text-base truncate">{product.product_name_hebrew}</div>
                                    {product.out_of_stock && (
                                      <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                                        <PackageX className="h-3 w-3" />
                                        אזל
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm mr-10 sm:mr-0">
                                {product.price_usd ? (
                                  <span className="font-medium text-blue-600">${product.price_usd.toFixed(2)}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                {product.discount_percentage && product.discount_percentage > 0 && (
                                  <span className="text-xs text-green-600">-{product.discount_percentage}%</span>
                                )}
                                {product.rating ? (
                                  <span>⭐ {product.rating.toFixed(1)}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                                <div className="flex items-center gap-1">
                                  <Switch
                                    checked={product.out_of_stock || false}
                                    onCheckedChange={() => toggleAliOutOfStock(product)}
                                  />
                                </div>
                                {product.tracking_link && (
                                  <a
                                    href={product.tracking_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                <Button size="sm" variant="ghost" onClick={() => startAliEdit(product)}>
                                  ערוך
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
              {Object.keys(groupedAliProducts).length === 0 && (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground mb-4">אין מוצרים עדיין</p>
                  <p className="text-sm text-muted-foreground">
                    לחצו על "הוסף מוצר" כדי להתחיל להוסיף מוצרים
                  </p>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Lazada Feed Product interface
interface LazadaFeedProduct {
  id: string;
  lazada_product_id: string;
  product_name: string;
  image_url: string | null;
  price_thb: number | null;
  currency: string | null;
  sales_7d: number | null;
  commission_rate: number | null;
  category_l1: number | null;
  brand_name: string | null;
  tracking_link: string | null;
  is_featured: boolean | null;
  out_of_stock: boolean | null;
}


type FeedPlatform = "lazada" | "aliexpress";

const FeedTab = () => {
  const [platform, setPlatform] = useState<FeedPlatform>("lazada");
  const [lazadaProducts, setLazadaProducts] = useState<LazadaFeedProduct[]>([]);
  const [aliexpressProducts, setAliexpressProducts] = useState<AliExpressFeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [expandProgress, setExpandProgress] = useState("");
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"sales" | "commission" | "price">("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const ITEMS_PER_PAGE = 20;

  const fetchLazadaProducts = async () => {
    const { data, error } = await supabase
      .from("feed_products")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching Lazada products:", error);
      toast.error("שגיאה בטעינת מוצרי Lazada");
    } else {
      console.log(`Fetched ${data?.length || 0} Lazada products`);
      setLazadaProducts(data || []);
    }
  };

  const fetchAliexpressProducts = async () => {
    const { data, error } = await supabase
      .from("aliexpress_feed_products")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching AliExpress products:", error);
      toast.error("שגיאה בטעינת מוצרי AliExpress");
    } else {
      console.log(`Fetched ${data?.length || 0} AliExpress products`);
      setAliexpressProducts(data || []);
    }
  };

  const fetchFeedProducts = async () => {
    setLoading(true);
    if (platform === "lazada") {
      await fetchLazadaProducts();
    } else {
      await fetchAliexpressProducts();
    }
    setLoading(false);
  };

  const syncProducts = async () => {
    setSyncing(true);
    try {
      const functionName = platform === "lazada" ? "sync-feed-products" : "sync-aliexpress-products";
      toast.info("מסנכרן מוצרים... זה יכול לקחת עד דקה");
      
      const { data, error } = await supabase.functions.invoke(functionName);
      
      if (error) throw error;
      
      // Show results from sync
      if (data) {
        const msg = `סונכרנו ${data.upserted || 0} מוצרים מתוך ${data.totalFetched || 0}`;
        toast.success(msg);
      } else {
        toast.success("הסינכרון הושלם!");
      }
      
      // Refresh the product list immediately after sync completes
      await fetchFeedProducts();
    } catch (e) {
      console.error("Error syncing:", e);
      toast.error("שגיאה בסינכרון - נסה שוב");
    }
    setSyncing(false);
  };

  const expandLazadaDb = async () => {
    setExpanding(true);
    setExpandProgress("מתחיל הרחבת מאגר...");
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error("יש להתחבר כאדמין");
        setExpanding(false);
        return;
      }

      const totalBatches = 5; // 30 categories / 6 per batch
      let totalNewProducts = 0;
      let initialCount = 0;
      let finalCount = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const fromCat = batch * 6 + 1;
        const toCat = Math.min((batch + 1) * 6, 30);
        setExpandProgress(`באצ' ${batch + 1}/${totalBatches} (קטגוריות ${fromCat}-${toCat} מתוך 30)...`);
        toast.info(`🔄 באצ' ${batch + 1}/${totalBatches} - סורק קטגוריות ${fromCat}-${toCat}...`);

        const { data, error } = await supabase.functions.invoke("expand-lazada-db", {
          headers: { Authorization: `Bearer ${session.session.access_token}` },
          body: { batch },
        });

        if (error) throw error;

        totalNewProducts += data.new_products || 0;
        if (batch === 0) initialCount = data.initial_count;
        finalCount = data.final_count;

        setExpandProgress(`באצ' ${batch + 1}/${totalBatches} הושלם: +${data.new_products} מוצרים`);
      }

      const msg = `✅ הרחבה הושלמה! ${initialCount} → ${finalCount} מוצרים (+${totalNewProducts} חדשים)`;
      toast.success(msg);
      setExpandProgress(msg);
      await fetchFeedProducts();
    } catch (e) {
      console.error("Error expanding DB:", e);
      toast.error("שגיאה בהרחבת המאגר");
      setExpandProgress("שגיאה בהרחבה");
    }
    setExpanding(false);
  };

  const toggleLazadaFeatured = async (product: LazadaFeedProduct) => {
    const { error } = await supabase
      .from("feed_products")
      .update({ is_featured: !product.is_featured })
      .eq("id", product.id);

    if (error) {
      toast.error("שגיאה בעדכון");
    } else {
      setLazadaProducts(lazadaProducts.map(p => 
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      toast.success(product.is_featured ? "הוסר מהמועדפים" : "נוסף למועדפים");
    }
  };

  const toggleAliexpressFeatured = async (product: AliExpressFeedProduct) => {
    const { error } = await supabase
      .from("aliexpress_feed_products")
      .update({ is_featured: !product.is_featured })
      .eq("id", product.id);

    if (error) {
      toast.error("שגיאה בעדכון");
    } else {
      setAliexpressProducts(aliexpressProducts.map(p => 
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      toast.success(product.is_featured ? "הוסר מהמועדפים" : "נוסף למועדפים");
    }
  };

  useEffect(() => {
    fetchFeedProducts();
  }, [platform]);

  // Get current products based on platform
  const currentProducts = platform === "lazada" ? lazadaProducts : aliexpressProducts;

  // Filter products
  const filteredProducts = currentProducts.filter(p => {
    const name = p.product_name.toLowerCase();
    const searchTerm = filter.toLowerCase();
    if (platform === "lazada") {
      const lazadaProduct = p as LazadaFeedProduct;
      return name.includes(searchTerm) || 
        (lazadaProduct.brand_name && lazadaProduct.brand_name.toLowerCase().includes(searchTerm));
    } else {
      const aliProduct = p as AliExpressFeedProduct;
      return name.includes(searchTerm) || 
        (aliProduct.product_name_hebrew && aliProduct.product_name_hebrew.includes(filter));
    }
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aVal: number, bVal: number;
    
    if (platform === "lazada") {
      const aLaz = a as LazadaFeedProduct;
      const bLaz = b as LazadaFeedProduct;
      switch (sortBy) {
        case "sales":
          aVal = aLaz.sales_7d || 0;
          bVal = bLaz.sales_7d || 0;
          break;
        case "commission":
          aVal = aLaz.commission_rate || 0;
          bVal = bLaz.commission_rate || 0;
          break;
        case "price":
          aVal = aLaz.price_thb || 0;
          bVal = bLaz.price_thb || 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
    } else {
      const aAli = a as AliExpressFeedProduct;
      const bAli = b as AliExpressFeedProduct;
      switch (sortBy) {
        case "sales":
          aVal = aAli.sales_30d || 0;
          bVal = bAli.sales_30d || 0;
          break;
        case "commission":
          aVal = aAli.commission_rate || 0;
          bVal = bAli.commission_rate || 0;
          break;
        case "price":
          aVal = aAli.price_usd || 0;
          bVal = bAli.price_usd || 0;
          break;
        default:
          aVal = 0;
          bVal = 0;
      }
    }
    
    return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
  });

  // Pagination
  const totalPages = Math.ceil(sortedProducts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const featuredCount = currentProducts.filter(p => p.is_featured).length;

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortBy, sortOrder, platform]);

  return (
    <div className="space-y-4">
      {/* Platform Selector */}
      <div className="flex flex-wrap items-center gap-2 border-b pb-3">
        <Button
          variant={platform === "lazada" ? "default" : "outline"}
          onClick={() => setPlatform("lazada")}
          className={`text-xs md:text-sm ${platform === "lazada" ? "bg-orange-500 hover:bg-orange-600" : ""}`}
          size="sm"
        >
          <Store className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
          <span className="hidden sm:inline">Lazada (תאילנד)</span>
          <span className="sm:hidden">Lazada</span>
        </Button>
        <Button
          variant={platform === "aliexpress" ? "default" : "outline"}
          onClick={() => setPlatform("aliexpress")}
          className={`text-xs md:text-sm ${platform === "aliexpress" ? "bg-blue-500 hover:bg-blue-600" : ""}`}
          size="sm"
        >
          <Package className="h-3 w-3 md:h-4 md:w-4 ml-1 md:ml-2" />
          <span className="hidden sm:inline">AliExpress (ישראל)</span>
          <span className="sm:hidden">AliExpress</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <Input
          placeholder="חיפוש מוצר..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={fetchFeedProducts} variant="outline" disabled={loading} size="sm" className="text-xs md:text-sm">
            <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${loading ? "animate-spin" : ""}`} />
            רענן
          </Button>
          <Button onClick={syncProducts} disabled={syncing} className="bg-green-600 hover:bg-green-700 text-xs md:text-sm" size="sm">
            <Store className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${syncing ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">סנכרן מ-{platform === "lazada" ? "Lazada" : "AliExpress"}</span>
            <span className="sm:hidden">סנכרן</span>
          </Button>
          {platform === "lazada" && (
            <Button onClick={expandLazadaDb} disabled={expanding} className="bg-purple-600 hover:bg-purple-700 text-xs md:text-sm" size="sm">
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${expanding ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">🔄 הרחב מאגר Lazada</span>
              <span className="sm:hidden">הרחב DB</span>
            </Button>
          )}
        </div>
      </div>

      {expandProgress && (
        <div className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
          {expanding && <span className="animate-pulse">⏳ </span>}
          {expandProgress}
        </div>
      )}

      {/* Filtering options */}
      <Card className="p-2 sm:p-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Filter className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">מיון:</span>
          </div>
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as "sales" | "commission" | "price")}>
            <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">מכירות</SelectItem>
              <SelectItem value="commission">עמלה</SelectItem>
              <SelectItem value="price">מחיר</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as "asc" | "desc")}>
            <SelectTrigger className="w-24 sm:w-32 h-8 text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">גבוה לנמוך</SelectItem>
              <SelectItem value="asc">נמוך לגבוה</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="text-sm text-muted-foreground">
        סה"כ {currentProducts.length} מוצרים בפיד | ⭐ {featuredCount} מועדפים | מציג {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, sortedProducts.length)} מתוך {sortedProducts.length}
      </div>

      {loading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : (
        <>
          <div className="grid gap-3">
            {platform === "lazada" ? (
              // Lazada Products
              (paginatedProducts as LazadaFeedProduct[]).map((product) => (
                <Card key={product.id} className={`p-2 sm:p-3 ${product.is_featured ? 'border-orange-400 bg-orange-50/50' : ''}`}>
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                    <a 
                      href={product.tracking_link || `https://www.lazada.co.th/products/-i${product.lazada_product_id}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-muted flex items-center justify-center text-xs">📦</div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a 
                        href={product.tracking_link || `https://www.lazada.co.th/products/-i${product.lazada_product_id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-xs sm:text-sm line-clamp-2 hover:text-orange-600 transition-colors cursor-pointer"
                      >
                        {product.product_name}
                      </a>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {product.brand_name && <span className="hidden sm:inline">{product.brand_name}</span>}
                        {product.sales_7d && product.sales_7d > 0 && (
                          <span className="text-orange-600">🔥 {product.sales_7d}</span>
                        )}
                        {product.commission_rate && product.commission_rate > 0 && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            product.commission_rate >= 0.10 
                              ? 'bg-green-100 text-green-800' 
                              : product.commission_rate >= 0.05 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {(product.commission_rate * 100).toFixed(0)}%
                          </span>
                        )}
                        {product.price_thb && (
                          <span className="font-bold text-orange-600 sm:hidden">฿{product.price_thb.toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                      {product.price_thb && (
                        <span className="font-bold text-orange-600 hidden sm:inline">฿{product.price_thb.toLocaleString()}</span>
                      )}
                      <a
                        href={product.tracking_link || `https://www.lazada.co.th/products/-i${product.lazada_product_id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 sm:p-2 hover:bg-muted rounded transition-colors"
                        title="פתח מוצר"
                      >
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      </a>
                      <Button
                        size="sm"
                        variant={product.is_featured ? "default" : "outline"}
                        onClick={() => toggleLazadaFeatured(product)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        {product.is_featured ? <Star className="h-3 w-3 sm:h-4 sm:w-4" /> : <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              // AliExpress Products
              (paginatedProducts as AliExpressFeedProduct[]).map((product) => (
                <Card key={product.id} className={`p-2 sm:p-3 ${product.is_featured ? 'border-red-400 bg-red-50/50' : ''}`}>
                  <div className="flex items-start sm:items-center gap-2 sm:gap-4">
                    <a 
                      href={product.tracking_link || `https://www.aliexpress.com/item/${product.aliexpress_product_id}.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-12 h-12 sm:w-16 sm:h-16 rounded object-cover" />
                      ) : (
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded bg-muted flex items-center justify-center text-xs">📦</div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a 
                        href={product.tracking_link || `https://www.aliexpress.com/item/${product.aliexpress_product_id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-xs sm:text-sm line-clamp-2 hover:text-blue-600 transition-colors cursor-pointer"
                      >
                        {product.product_name_hebrew || product.product_name}
                      </a>
                      <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        {product.sales_30d && product.sales_30d > 0 && (
                          <span className="text-red-600">🔥 {product.sales_30d}</span>
                        )}
                        {product.commission_rate && (
                          <span className="text-green-600">{(product.commission_rate * 100).toFixed(0)}%</span>
                        )}
                        {product.discount_percentage && product.discount_percentage > 0 && (
                          <span className="text-purple-600">-{product.discount_percentage}%</span>
                        )}
                        {product.price_usd && (
                          <span className="font-bold text-red-600 sm:hidden">${product.price_usd.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                      {product.price_usd && (
                        <span className="font-bold text-red-600 hidden sm:inline">${product.price_usd.toFixed(2)}</span>
                      )}
                      <a
                        href={product.tracking_link || `https://www.aliexpress.com/item/${product.aliexpress_product_id}.html`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 sm:p-2 hover:bg-muted rounded transition-colors"
                        title="פתח מוצר"
                      >
                        <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                      </a>
                      <Button
                        size="sm"
                        variant={product.is_featured ? "default" : "outline"}
                        onClick={() => toggleAliexpressFeatured(product)}
                        className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                      >
                        {product.is_featured ? <Star className="h-3 w-3 sm:h-4 sm:w-4" /> : <StarOff className="h-3 w-3 sm:h-4 sm:w-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="w-8 h-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground mr-2">
                עמוד {currentPage} מתוך {totalPages}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ContactRequest {
  id: string;
  email: string;
  phone: string | null;
  request_text: string;
  platform: string;
  location: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  budget: string | null;
  requirements: string | null;
}

interface BlockedEmail {
  id: string;
  email: string;
  reason: string | null;
  blocked_at: string;
  notes: string | null;
}

const RequestsTab = () => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [blockedEmails, setBlockedEmails] = useState<BlockedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [locationTab, setLocationTab] = useState<"all" | "thailand" | "israel">("all");
  const [showBlocked, setShowBlocked] = useState(false);
  const { user } = useAuth();

  const fetchRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching requests:", error);
      toast.error("שגיאה בטעינת פניות");
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const fetchBlockedEmails = async () => {
    const { data, error } = await supabase
      .from("blocked_emails")
      .select("*")
      .order("blocked_at", { ascending: false });

    if (error) {
      console.error("Error fetching blocked emails:", error);
    } else {
      setBlockedEmails(data || []);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase
      .from("contact_requests")
      .update({ status: newStatus })
      .eq("id", id);

    if (error) {
      toast.error("שגיאה בעדכון סטטוס");
    } else {
      toast.success("סטטוס עודכן");
      fetchRequests();
    }
  };

  const markAsSpam = async (request: ContactRequest) => {
    if (!confirm(`לסמן את ${request.email} כספאם? המייל הזה לא יוכל לשלוח בקשות נוספות.`)) return;

    // Add to blocked emails
    const { error: blockError } = await supabase
      .from("blocked_emails")
      .insert({
        email: request.email.toLowerCase(),
        reason: "spam",
        blocked_by: user?.id,
        notes: `חסום מבקשה: ${request.request_text.substring(0, 100)}...`
      });

    if (blockError) {
      if (blockError.code === '23505') {
        toast.info("המייל הזה כבר חסום");
      } else {
        toast.error("שגיאה בחסימת המייל");
        console.error(blockError);
        return;
      }
    }

    // Update request status to spam
    const { error: updateError } = await supabase
      .from("contact_requests")
      .update({ status: "spam" })
      .eq("id", request.id);

    if (updateError) {
      toast.error("שגיאה בעדכון סטטוס");
    } else {
      toast.success("המייל סומן כספאם וחסום");
      fetchRequests();
      fetchBlockedEmails();
    }
  };

  const unblockEmail = async (blocked: BlockedEmail) => {
    if (!confirm(`להסיר חסימה מ-${blocked.email}?`)) return;

    const { error } = await supabase
      .from("blocked_emails")
      .delete()
      .eq("id", blocked.id);

    if (error) {
      toast.error("שגיאה בהסרת חסימה");
    } else {
      toast.success("החסימה הוסרה");
      fetchBlockedEmails();
    }
  };

  const exportToExcel = () => {
    const filteredForExport = getFilteredRequests();
    const headers = ["תאריך", "מייל", "טלפון", "פלטפורמה", "מיקום", "סטטוס", "תקציב", "תוכן הפניה", "דרישות", "הערות מנהל"];
    const rows = filteredForExport.map(r => [
      new Date(r.created_at).toLocaleDateString('he-IL'),
      r.email,
      r.phone || "",
      r.platform,
      r.location,
      r.status,
      r.budget || "",
      r.request_text.replace(/,/g, ";"),
      r.requirements?.replace(/,/g, ";") || "",
      r.admin_notes?.replace(/,/g, ";") || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `פניות_${locationTab}_${new Date().toLocaleDateString('he-IL')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("הקובץ הורד בהצלחה!");
  };

  useEffect(() => {
    fetchRequests();
    fetchBlockedEmails();
  }, []);

  const getFilteredRequests = () => {
    return requests.filter(r => {
      const matchesSearch = r.email.toLowerCase().includes(filter.toLowerCase()) ||
        r.request_text.toLowerCase().includes(filter.toLowerCase()) ||
        (r.phone && r.phone.includes(filter));
      
      const matchesLocation = locationTab === "all" || r.location === locationTab;
      
      return matchesSearch && matchesLocation && r.status !== "spam";
    });
  };

  const filteredRequests = getFilteredRequests();

  const israelCount = requests.filter(r => r.location === "israel" && r.status !== "spam").length;
  const thailandCount = requests.filter(r => r.location === "thailand" && r.status !== "spam").length;
  const newIsraelCount = requests.filter(r => r.location === "israel" && r.status === "new").length;
  const newThailandCount = requests.filter(r => r.location === "thailand" && r.status === "new").length;

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500",
    spam: "bg-red-100 text-red-700"
  };

  const statusLabels: Record<string, string> = {
    new: "חדש",
    in_progress: "בטיפול",
    done: "טופל",
    cancelled: "בוטל",
    spam: "ספאם"
  };

  const platformLabels: Record<string, string> = {
    lazada: "Lazada",
    aliexpress: "AliExpress",
    ksp: "KSP",
    other: "אחר"
  };

  const locationLabels: Record<string, string> = {
    thailand: "🇹🇭 תאילנד",
    israel: "🇮🇱 ישראל"
  };

  return (
    <div className="space-y-4">
      {/* Location Tabs */}
      <Tabs value={locationTab} onValueChange={(v) => setLocationTab(v as "all" | "thailand" | "israel")} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">
            הכל ({requests.filter(r => r.status !== "spam").length})
          </TabsTrigger>
          <TabsTrigger value="thailand">
            🇹🇭 תאילנד ({thailandCount})
            {newThailandCount > 0 && <span className="mr-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">{newThailandCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="israel">
            🇮🇱 ישראל ({israelCount})
            {newIsraelCount > 0 && <span className="mr-1 bg-blue-500 text-white text-xs px-1.5 rounded-full">{newIsraelCount}</span>}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <Input
          placeholder="חיפוש לפי מייל או תוכן..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => setShowBlocked(!showBlocked)} 
            variant={showBlocked ? "default" : "outline"} 
            size="sm" 
            className="text-xs md:text-sm"
          >
            🚫 חסומים ({blockedEmails.length})
          </Button>
          <Button onClick={exportToExcel} variant="outline" disabled={filteredRequests.length === 0} size="sm" className="text-xs md:text-sm">
            <Download className="h-3 w-3 md:h-4 md:w-4 ml-1" />
            <span className="hidden sm:inline">ייצוא לאקסל</span>
            <span className="sm:hidden">ייצוא</span>
          </Button>
          <Button onClick={fetchRequests} variant="outline" disabled={loading} size="sm" className="text-xs md:text-sm">
            <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 ml-1 ${loading ? "animate-spin" : ""}`} />
            רענן
          </Button>
        </div>
      </div>

      {/* Blocked Emails Panel */}
      {showBlocked && (
        <Card className="p-4 border-red-200 bg-red-50">
          <h3 className="font-bold mb-3 text-red-800">🚫 מיילים חסומים ({blockedEmails.length})</h3>
          {blockedEmails.length === 0 ? (
            <p className="text-sm text-red-600">אין מיילים חסומים</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {blockedEmails.map(blocked => (
                <div key={blocked.id} className="flex items-center justify-between bg-white p-2 rounded text-sm">
                  <div>
                    <span className="font-mono">{blocked.email}</span>
                    <span className="text-xs text-muted-foreground mr-2">
                      ({new Date(blocked.blocked_at).toLocaleDateString('he-IL')})
                    </span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => unblockEmail(blocked)} className="text-xs">
                    הסר חסימה
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="text-sm text-muted-foreground">
        מציג {filteredRequests.length} פניות | {filteredRequests.filter(r => r.status === 'new').length} חדשות
      </div>

      {loading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">אין פניות {locationTab !== "all" ? `מ${locationLabels[locationTab]}` : ""}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <Card key={request.id} className={`p-4 ${request.status === 'new' ? 'border-blue-400' : ''}`}>
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[request.status] || statusColors.new}`}>
                        {statusLabels[request.status] || request.status}
                      </span>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {platformLabels[request.platform] || request.platform}
                      </span>
                      <span className="text-xs">
                        {locationLabels[request.location] || request.location}
                      </span>
                      {request.budget && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          💰 {request.budget}
                        </span>
                      )}
                    </div>
                    <p className="text-sm mb-2">{request.request_text}</p>
                    {request.requirements && (
                      <p className="text-xs text-muted-foreground mb-2 bg-muted p-2 rounded">
                        <strong>דרישות:</strong> {request.requirements}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {request.email}
                      </span>
                      {request.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {request.phone}
                        </span>
                      )}
                      <span>
                        {new Date(request.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {request.status === 'new' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(request.id, 'in_progress')}>
                        התחל טיפול
                      </Button>
                    )}
                    {request.status === 'in_progress' && (
                      <Button size="sm" onClick={() => updateStatus(request.id, 'done')}>
                        סיים
                      </Button>
                    )}
                    {request.status !== 'spam' && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => markAsSpam(request)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      >
                        🚫 ספאם
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const StatsTab = () => {
  const [allClicks, setAllClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 13);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());

  const fetchClicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("button_clicks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllClicks(data || []);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<ClickStats | null>(() => {
    if (allClicks.length === 0 && !loading) {
      return {
        total: 0,
        whatsapp: 0,
        telegram: 0,
        bySource: {},
        byDay: [],
      };
    }
    if (allClicks.length === 0) return null;

    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filteredClicks = allClicks.filter((click) => {
      const clickDate = new Date(click.created_at);
      return clickDate >= startOfDay && clickDate <= endOfDay;
    });

    const bySource: Record<string, { whatsapp: number; telegram: number }> = {};
    const byDayMap: Record<string, { whatsapp: number; telegram: number }> = {};

    const current = new Date(startOfDay);
    while (current <= endOfDay) {
      const dateStr = current.toISOString().split("T")[0];
      byDayMap[dateStr] = { whatsapp: 0, telegram: 0 };
      current.setDate(current.getDate() + 1);
    }

    filteredClicks.forEach((click) => {
      const source = click.source || "unknown";
      if (!bySource[source]) {
        bySource[source] = { whatsapp: 0, telegram: 0 };
      }
      if (click.button_type === "whatsapp") {
        bySource[source].whatsapp++;
      } else {
        bySource[source].telegram++;
      }

      const clickDate = new Date(click.created_at).toISOString().split("T")[0];
      if (byDayMap[clickDate]) {
        if (click.button_type === "whatsapp") {
          byDayMap[clickDate].whatsapp++;
        } else {
          byDayMap[clickDate].telegram++;
        }
      }
    });

    const byDay = Object.entries(byDayMap).map(([date, counts]) => ({
      date: new Date(date).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
      }),
      whatsapp: counts.whatsapp,
      telegram: counts.telegram,
      total: counts.whatsapp + counts.telegram,
    }));

    return {
      total: filteredClicks.length,
      whatsapp: filteredClicks.filter((c) => c.button_type === "whatsapp").length,
      telegram: filteredClicks.filter((c) => c.button_type === "telegram").length,
      bySource,
      byDay,
    };
  }, [allClicks, startDate, endDate, loading]);

  useEffect(() => {
    fetchClicks();
  }, []);

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4">
          <span className="font-medium text-sm sm:text-base">טווח תאריכים:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-right text-xs sm:text-sm h-8 sm:h-9">
                  <Calendar className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {format(startDate, "dd/MM/yyyy", { locale: he })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span className="text-sm">עד</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-right text-xs sm:text-sm h-8 sm:h-9">
                  <Calendar className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
                  {format(endDate, "dd/MM/yyyy", { locale: he })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-background" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={fetchClicks} disabled={loading} variant="outline" size="sm" className="h-8 sm:h-9">
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </Card>

      {loading && !stats ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <Card className="p-2 sm:p-4 text-center">
              <p className="text-xs sm:text-sm text-muted-foreground">סה"כ</p>
              <p className="text-xl sm:text-3xl font-bold text-foreground">{stats.total}</p>
            </Card>
            <Card className="p-2 sm:p-4 text-center bg-green-500/10">
              <p className="text-xs sm:text-sm text-muted-foreground">WA</p>
              <p className="text-xl sm:text-3xl font-bold text-green-600">{stats.whatsapp}</p>
            </Card>
            <Card className="p-2 sm:p-4 text-center bg-blue-500/10">
              <p className="text-xs sm:text-sm text-muted-foreground">TG</p>
              <p className="text-xl sm:text-3xl font-bold text-blue-500">{stats.telegram}</p>
            </Card>
          </div>

          {/* Clicks Chart */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">קליקים לפי ימים</h2>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={stats.byDay} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="whatsapp"
                  fill="var(--color-whatsapp)"
                  radius={[4, 4, 0, 0]}
                  stackId="stack"
                />
                <Bar
                  dataKey="telegram"
                  fill="var(--color-telegram)"
                  radius={[4, 4, 0, 0]}
                  stackId="stack"
                />
              </BarChart>
            </ChartContainer>
          </Card>

          {/* Join Page Stats */}
          {(() => {
            const joinClicks = allClicks.filter(c => {
              const clickDate = new Date(c.created_at);
              const startOfDay = new Date(startDate);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(endDate);
              endOfDay.setHours(23, 59, 59, 999);
              return c.source === 'join_israel_landing' && clickDate >= startOfDay && clickDate <= endOfDay;
            });
            const joinWA = joinClicks.filter(c => c.button_type === 'whatsapp').length;
            const joinTG = joinClicks.filter(c => c.button_type === 'telegram').length;
            return (
              <Card className="p-4 sm:p-6 border-2 border-orange-200 bg-orange-50/30">
                <h2 className="text-lg sm:text-xl font-semibold mb-3 flex items-center gap-2">
                  📊 דף Join (מודעות)
                </h2>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">סה"כ קליקים</p>
                    <p className="text-2xl font-bold text-orange-600">{joinClicks.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">WhatsApp</p>
                    <p className="text-2xl font-bold text-green-600">{joinWA}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Telegram</p>
                    <p className="text-2xl font-bold text-blue-500">{joinTG}</p>
                  </div>
                </div>
                {stats && stats.total > 0 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    {joinClicks.length > 0 
                      ? `${((joinClicks.length / stats.total) * 100).toFixed(1)}% מכלל הקליקים`
                      : 'אין קליקים מדף Join בטווח הנבחר'
                    }
                  </p>
                )}
              </Card>
            );
          })()}

          {/* By Source */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">לפי מקור</h2>
            <div className="space-y-3">
              {Object.entries(stats.bySource).length > 0 ? (
                Object.entries(stats.bySource).map(([source, counts]) => (
                  <div key={source} className="flex items-center justify-between border-b pb-2">
                    <span className={`font-medium ${source === 'join_israel_landing' ? 'text-orange-600' : ''}`}>
                      {source === 'join_israel_landing' ? '📢 ' + source : source}
                    </span>
                    <div className="flex gap-4">
                      <span className="text-green-600">WA: {counts.whatsapp}</span>
                      <span className="text-blue-500">TG: {counts.telegram}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">אין נתונים בטווח הנבחר</p>
              )}
            </div>
          </Card>
        </>
      ) : (
        <p className="text-red-500">שגיאה בטעינת הנתונים</p>
      )}
    </div>
  );
};

const Admin = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex-shrink-0 hover:opacity-80 transition-opacity">
              <img 
                src={dknowLogo} 
                alt="(D)Know Logo" 
                className="h-10 w-10 rounded-lg object-cover"
              />
            </Link>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">פאנל ניהול</h1>
            {user && (
              <span className="text-sm text-muted-foreground hidden md:inline">({user.email})</span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button onClick={toggleTheme} variant="outline" size="icon" className="h-9 w-9" title={isDark ? "מצב בהיר" : "מצב לילה"}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Link to="/daily-deals">
              <Button variant="outline" size="sm" className="gap-1">
                📦 Daily Deals
              </Button>
            </Link>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 ml-2" />
              התנתק
            </Button>
          </div>
        </div>

        <Tabs defaultValue="stats" className="w-full" dir="rtl">
          <TabsList className="flex w-full overflow-x-auto mb-6 gap-1 h-auto flex-wrap md:flex-nowrap">
            <TabsTrigger value="stats" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">סטטיסטיקות</span>
              <span className="sm:hidden">סטטס</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <Package className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">המלצות העורך</span>
              <span className="sm:hidden">המלצות</span>
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <Store className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">מוצרים פופולריים</span>
              <span className="sm:hidden">פופולרי</span>
            </TabsTrigger>
            <TabsTrigger value="converter" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <Link2 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">המרת קישורים</span>
              <span className="sm:hidden">המרה</span>
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
              פניות
            </TabsTrigger>
            <TabsTrigger value="smart-search" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <Search className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">חיפוש חכם</span>
              <span className="sm:hidden">חיפוש</span>
            </TabsTrigger>
            <TabsTrigger value="external-deal" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3 py-2 flex-shrink-0">
              <ExternalLink className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">דיל מקישור</span>
              <span className="sm:hidden">דיל🔗</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="stats">
            <StatsTab />
          </TabsContent>
          <TabsContent value="products">
            <ProductsTab />
          </TabsContent>
          <TabsContent value="feed">
            <FeedTab />
          </TabsContent>
          <TabsContent value="converter">
            <LinkConverter />
          </TabsContent>
          <TabsContent value="requests">
            <RequestsTab />
          </TabsContent>
          <TabsContent value="smart-search">
            <ProductSearchTab />
          </TabsContent>
          <TabsContent value="external-deal">
            <ExternalLinkDealTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
