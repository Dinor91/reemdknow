import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, LogOut, Calendar, Package, BarChart3, Save, X, Store, Star, StarOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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

const ProductsTab = () => {
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<CategoryProduct>>({});
  const [filter, setFilter] = useState("");
  const [updatingFromApi, setUpdatingFromApi] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("category_products")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching products:", error);
      toast.error("שגיאה בטעינת מוצרים");
    } else {
      setProducts(data || []);
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
      image_url: product.image_url || "",
      price_thb: product.price_thb || undefined,
      rating: product.rating || undefined,
      sales_count: product.sales_count || undefined,
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
        image_url: editData.image_url || null,
        price_thb: editData.price_thb || null,
        rating: editData.rating || null,
        sales_count: editData.sales_count || null,
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

  useEffect(() => {
    fetchProducts();
  }, []);

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
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <Input
          placeholder="חיפוש מוצר..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex gap-2">
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

      <div className="text-sm text-muted-foreground">
        סה"כ {products.length} מוצרים | {products.filter(p => p.price_thb).length} עם מחיר | {products.filter(p => p.image_url).length} עם תמונה
      </div>

      {loading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedProducts).map(([category, categoryProducts]) => (
            <Card key={category} className="p-4">
              <h3 className="text-lg font-semibold mb-3 border-b pb-2">{category} ({categoryProducts.length})</h3>
              <div className="space-y-2">
                {categoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 rounded-lg border ${editingId === product.id ? "border-orange-400 bg-orange-50" : "bg-muted/30"}`}
                  >
                    {editingId === product.id ? (
                      <div className="space-y-3">
                        <div className="font-medium">{product.name_hebrew}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                          <div className="min-w-0">
                            <div className="font-medium truncate">{product.name_hebrew}</div>
                            {product.name_english && (
                              <div className="text-xs text-muted-foreground truncate">{product.name_english}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
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
                          <Button size="sm" variant="ghost" onClick={() => startEdit(product)}>
                            ערוך
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface FeedProduct {
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

const FeedTab = () => {
  const [products, setProducts] = useState<FeedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchFeedProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("feed_products")
      .select("*")
      .order("sales_7d", { ascending: false });

    if (error) {
      console.error("Error fetching feed products:", error);
      toast.error("שגיאה בטעינת מוצרי הפיד");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const syncFromLazada = async () => {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke("sync-feed-products");
      if (error) throw error;
      toast.success("הסינכרון החל! הרענן בעוד מספר שניות");
      setTimeout(fetchFeedProducts, 10000);
    } catch (e) {
      console.error("Error syncing:", e);
      toast.error("שגיאה בסינכרון");
    }
    setSyncing(false);
  };

  const toggleFeatured = async (product: FeedProduct) => {
    const { error } = await supabase
      .from("feed_products")
      .update({ is_featured: !product.is_featured })
      .eq("id", product.id);

    if (error) {
      toast.error("שגיאה בעדכון");
    } else {
      setProducts(products.map(p => 
        p.id === product.id ? { ...p, is_featured: !p.is_featured } : p
      ));
      toast.success(product.is_featured ? "הוסר מהמועדפים" : "נוסף למועדפים");
    }
  };

  useEffect(() => {
    fetchFeedProducts();
  }, []);

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.brand_name && p.brand_name.toLowerCase().includes(filter.toLowerCase()))
  );

  const featuredCount = products.filter(p => p.is_featured).length;

  return (
    <div className="space-y-4">
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
          <Button onClick={syncFromLazada} disabled={syncing}>
            <Store className={`h-4 w-4 ml-2 ${syncing ? "animate-pulse" : ""}`} />
            סנכרן מ-Lazada
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        סה"כ {products.length} מוצרים בפיד | ⭐ {featuredCount} מועדפים
      </div>

      {loading ? (
        <p className="text-muted-foreground">טוען...</p>
      ) : (
        <div className="grid gap-3">
          {filteredProducts.slice(0, 50).map((product) => (
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
                    onClick={() => toggleFeatured(product)}
                  >
                    {product.is_featured ? <Star className="h-4 w-4" /> : <StarOff className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filteredProducts.length > 50 && (
            <p className="text-center text-muted-foreground text-sm">
              מוצגים 50 מתוך {filteredProducts.length} מוצרים
            </p>
          )}
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
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="stats" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              סטטיסטיקות
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              מוצרים
            </TabsTrigger>
            <TabsTrigger value="feed" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              פיד Lazada
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
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;