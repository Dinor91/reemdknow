import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, LogOut, Calendar, Package, BarChart3, Save, X, Store, Star, StarOff, MessageSquare, Mail, Phone, ChevronDown, ChevronUp, Download, ExternalLink, PackageX, ChevronLeft, ChevronRight, Filter } from "lucide-react";
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

const CATEGORIES = [
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

// AliExpress Feed Product interface (moved up for ProductsTab)
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
  const [aliexpressProducts, setAliexpressProducts] = useState<AliExpressFeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CategoryProduct> & { category?: string }>({});
  const [filter, setFilter] = useState("");
  const [updatingFromApi, setUpdatingFromApi] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name_hebrew: "",
    affiliate_link: "",
    category: CATEGORIES[0],
    image_url: "",
    price_thb: "",
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
      .from("aliexpress_feed_products")
      .select("*")
      .eq("is_featured", true)
      .order("sales_30d", { ascending: false });

    if (error) {
      console.error("Error fetching AliExpress products:", error);
      toast.error("שגיאה בטעינת מוצרי AliExpress");
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
      const { error } = await supabase.functions.invoke("update-category-products");
      if (error) throw error;
      toast.success("העדכון החל! הרענן בעוד מספר שניות");
      setTimeout(fetchProducts, 5000);
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
      setShowAddProduct(false);
      setNewProduct({
        name_hebrew: "",
        affiliate_link: "",
        category: CATEGORIES[0],
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

  return (
    <div className="space-y-4">
      {/* Platform Selector */}
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={platform === "lazada" ? "default" : "outline"}
          onClick={() => setPlatform("lazada")}
          className={platform === "lazada" ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
          <Store className="h-4 w-4 ml-2" />
          Lazada (תאילנד)
        </Button>
        <Button
          variant={platform === "aliexpress" ? "default" : "outline"}
          onClick={() => setPlatform("aliexpress")}
          className={platform === "aliexpress" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Package className="h-4 w-4 ml-2" />
          AliExpress (ישראל)
        </Button>
      </div>

      {platform === "lazada" ? (
        /* Lazada Products - Existing UI */
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
              <Button onClick={expandAll} variant="ghost" size="sm">
                פתח הכל
              </Button>
              <Button onClick={collapseAll} variant="ghost" size="sm">
                סגור הכל
              </Button>
              <Button onClick={fetchProducts} variant="outline" disabled={loading}>
                <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
                רענן
              </Button>
              <Button onClick={updateFromApi} disabled={updatingFromApi}>
                <Package className={`h-4 w-4 ml-2 ${updatingFromApi ? "animate-pulse" : ""}`} />
                עדכון מ-API
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
                      {CATEGORIES.map(cat => (
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
                                      {CATEGORIES.map(cat => (
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
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs">📦</div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <div className="font-medium truncate">{product.name_hebrew}</div>
                                    {product.out_of_stock && (
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded flex items-center gap-1">
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
                              <div className="flex items-center gap-3 text-sm">
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
        /* AliExpress Products - Editor's picks from featured */
        <>
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <Input
              placeholder="חיפוש מוצר..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={fetchProducts} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
              רענן
            </Button>
          </div>

          <div className="text-sm text-muted-foreground">
            סה"כ {aliexpressProducts.length} מוצרים מועדפים (המלצות עורך)
          </div>

          {loading ? (
            <p className="text-muted-foreground">טוען...</p>
          ) : aliexpressProducts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground mb-4">אין מוצרים מועדפים עדיין</p>
              <p className="text-sm text-muted-foreground">
                לכו לטאב "מוצרים פופולריים" &gt; AliExpress וסמנו מוצרים כמועדפים (⭐)
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {aliexpressProducts
                .filter(p => 
                  p.product_name.toLowerCase().includes(filter.toLowerCase()) ||
                  (p.product_name_hebrew && p.product_name_hebrew.includes(filter))
                )
                .map((product) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt="" className="w-16 h-16 rounded object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded bg-muted flex items-center justify-center text-2xl flex-shrink-0">📦</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-2 mb-1">
                          {product.product_name_hebrew || product.product_name}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium text-blue-600">${product.price_usd?.toFixed(2)}</span>
                          {product.discount_percentage && product.discount_percentage > 0 && (
                            <span className="text-xs text-green-600">-{product.discount_percentage}%</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          {product.rating && <span>⭐ {product.rating.toFixed(1)}</span>}
                          {product.sales_30d && <span>🔥 {product.sales_30d.toLocaleString()}</span>}
                        </div>
                      </div>
                    </div>
                    {product.tracking_link && (
                      <a
                        href={product.tracking_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 block text-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="h-3 w-3 inline mr-1" />
                        צפה ב-AliExpress
                      </a>
                    )}
                  </Card>
                ))}
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
  const [filter, setFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<"sales" | "commission" | "price">("sales");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const ITEMS_PER_PAGE = 20;

  const fetchLazadaProducts = async () => {
    const { data, error } = await supabase
      .from("feed_products")
      .select("*");

    if (error) {
      console.error("Error fetching Lazada products:", error);
      toast.error("שגיאה בטעינת מוצרי Lazada");
    } else {
      setLazadaProducts(data || []);
    }
  };

  const fetchAliexpressProducts = async () => {
    const { data, error } = await supabase
      .from("aliexpress_feed_products")
      .select("*");

    if (error) {
      console.error("Error fetching AliExpress products:", error);
      toast.error("שגיאה בטעינת מוצרי AliExpress");
    } else {
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
      const { error } = await supabase.functions.invoke(functionName);
      if (error) throw error;
      toast.success("הסינכרון החל! הרענן בעוד מספר שניות");
      setTimeout(fetchFeedProducts, 10000);
    } catch (e) {
      console.error("Error syncing:", e);
      toast.error("שגיאה בסינכרון");
    }
    setSyncing(false);
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
      <div className="flex items-center gap-2 border-b pb-3">
        <Button
          variant={platform === "lazada" ? "default" : "outline"}
          onClick={() => setPlatform("lazada")}
          className={platform === "lazada" ? "bg-orange-500 hover:bg-orange-600" : ""}
        >
          <Store className="h-4 w-4 ml-2" />
          Lazada (תאילנד)
        </Button>
        <Button
          variant={platform === "aliexpress" ? "default" : "outline"}
          onClick={() => setPlatform("aliexpress")}
          className={platform === "aliexpress" ? "bg-blue-500 hover:bg-blue-600" : ""}
        >
          <Package className="h-4 w-4 ml-2" />
          AliExpress (ישראל)
        </Button>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Input
          placeholder="חיפוש מוצר..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <Button onClick={fetchFeedProducts} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענן
          </Button>
          <Button onClick={syncProducts} disabled={syncing} className="bg-green-600 hover:bg-green-700">
            <Store className={`h-4 w-4 ml-2 ${syncing ? "animate-pulse" : ""}`} />
            סנכרן מ-{platform === "lazada" ? "Lazada" : "AliExpress"}
          </Button>
        </div>
      </div>

      {/* Filtering options */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">מיון:</span>
          </div>
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as "sales" | "commission" | "price")}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sales">מכירות</SelectItem>
              <SelectItem value="commission">עמלה</SelectItem>
              <SelectItem value="price">מחיר</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortOrder} onValueChange={(val) => setSortOrder(val as "asc" | "desc")}>
            <SelectTrigger className="w-32">
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
                <Card key={product.id} className={`p-3 ${product.is_featured ? 'border-orange-400 bg-orange-50/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-16 h-16 rounded object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">{product.product_name}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {product.brand_name && <span>{product.brand_name}</span>}
                        {product.sales_7d && product.sales_7d > 0 && (
                          <span className="text-orange-600">🔥 {product.sales_7d} נמכרו</span>
                        )}
                        {product.commission_rate && (
                          <span className="text-green-600">{(product.commission_rate * 100).toFixed(1)}% עמלה</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {product.price_thb && (
                        <span className="font-bold text-orange-600">฿{product.price_thb.toLocaleString()}</span>
                      )}
                      <Button
                        size="sm"
                        variant={product.is_featured ? "default" : "outline"}
                        onClick={() => toggleLazadaFeatured(product)}
                      >
                        {product.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              // AliExpress Products
              (paginatedProducts as AliExpressFeedProduct[]).map((product) => (
                <Card key={product.id} className={`p-3 ${product.is_featured ? 'border-red-400 bg-red-50/50' : ''}`}>
                  <div className="flex items-center gap-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-16 h-16 rounded object-cover" />
                    ) : (
                      <div className="w-16 h-16 rounded bg-muted flex items-center justify-center">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm line-clamp-2">
                        {product.product_name_hebrew || product.product_name}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {product.sales_30d && product.sales_30d > 0 && (
                          <span className="text-red-600">🔥 {product.sales_30d} נמכרו</span>
                        )}
                        {product.commission_rate && (
                          <span className="text-green-600">{(product.commission_rate * 100).toFixed(1)}% עמלה</span>
                        )}
                        {product.discount_percentage && product.discount_percentage > 0 && (
                          <span className="text-purple-600">-{product.discount_percentage}%</span>
                        )}
                        {product.rating && (
                          <span className="text-amber-500">⭐ {product.rating.toFixed(1)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {product.price_usd && (
                        <span className="font-bold text-red-600">${product.price_usd.toFixed(2)}</span>
                      )}
                      <Button
                        size="sm"
                        variant={product.is_featured ? "default" : "outline"}
                        onClick={() => toggleAliexpressFeatured(product)}
                      >
                        {product.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
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
}

const RequestsTab = () => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

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

  const exportToExcel = () => {
    // Create CSV content
    const headers = ["תאריך", "מייל", "טלפון", "פלטפורמה", "מיקום", "סטטוס", "תוכן הפניה", "הערות מנהל"];
    const rows = requests.map(r => [
      new Date(r.created_at).toLocaleDateString('he-IL'),
      r.email,
      r.phone || "",
      r.platform,
      r.location,
      r.status,
      r.request_text.replace(/,/g, ";"),
      r.admin_notes?.replace(/,/g, ";") || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    // Add BOM for Hebrew support
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `פניות_${new Date().toLocaleDateString('he-IL')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("הקובץ הורד בהצלחה!");
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const filteredRequests = requests.filter(r =>
    r.email.toLowerCase().includes(filter.toLowerCase()) ||
    r.request_text.toLowerCase().includes(filter.toLowerCase()) ||
    (r.phone && r.phone.includes(filter))
  );

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    done: "bg-green-100 text-green-700",
    cancelled: "bg-gray-100 text-gray-500"
  };

  const statusLabels: Record<string, string> = {
    new: "חדש",
    in_progress: "בטיפול",
    done: "טופל",
    cancelled: "בוטל"
  };

  const platformLabels: Record<string, string> = {
    lazada: "Lazada",
    aliexpress: "AliExpress",
    other: "אחר"
  };

  const locationLabels: Record<string, string> = {
    thailand: "🇹🇭 תאילנד",
    israel: "🇮🇱 ישראל"
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Input
          placeholder="חיפוש לפי מייל או תוכן..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
          <Button onClick={exportToExcel} variant="outline" disabled={requests.length === 0}>
            <Download className="h-4 w-4 ml-2" />
            ייצוא לאקסל
          </Button>
          <Button onClick={fetchRequests} variant="outline" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענן
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        סה"כ {requests.length} פניות | {requests.filter(r => r.status === 'new').length} חדשות
      </div>

      {loading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : filteredRequests.length === 0 ? (
        <Card className="p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">אין פניות עדיין</p>
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
                    </div>
                    <p className="text-sm mb-2">{request.request_text}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                  <div className="flex gap-2 flex-shrink-0">
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
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-medium">טווח תאריכים:</span>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-right">
                  <Calendar className="ml-2 h-4 w-4" />
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
            <span>עד</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-right">
                  <Calendar className="ml-2 h-4 w-4" />
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
          </div>
          <Button onClick={fetchClicks} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </Card>

      {loading && !stats ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">סה"כ קליקים</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </Card>
            <Card className="p-4 text-center bg-green-500/10">
              <p className="text-sm text-muted-foreground">WhatsApp</p>
              <p className="text-3xl font-bold text-green-600">{stats.whatsapp}</p>
            </Card>
            <Card className="p-4 text-center bg-blue-500/10">
              <p className="text-sm text-muted-foreground">Telegram</p>
              <p className="text-3xl font-bold text-blue-500">{stats.telegram}</p>
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

          {/* By Source */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">לפי מקור</h2>
            <div className="space-y-3">
              {Object.entries(stats.bySource).length > 0 ? (
                Object.entries(stats.bySource).map(([source, counts]) => (
                  <div key={source} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{source}</span>
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
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="h-4 w-4 ml-2" />
            התנתק
          </Button>
        </div>

        <Tabs defaultValue="stats" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              סטטיסטיקות
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              המלצות העורך
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              מוצרים פופולריים
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              פניות
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
          <TabsContent value="requests">
            <RequestsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
