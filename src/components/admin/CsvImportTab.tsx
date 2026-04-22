import { useState, useRef } from "react";
import Papa from "papaparse";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, Languages, X } from "lucide-react";
import { toast } from "sonner";
import { DEAL_CATEGORIES } from "@/lib/categories";

// CSV column name aliases — case-insensitive matching against AliExpress portal exports
const COLUMN_ALIASES: Record<string, string[]> = {
  aliexpress_product_id: ["product id", "productid", "product_id", "item id", "itemid"],
  product_name: ["product title", "product desc", "product_name", "title", "name", "product description"],
  tracking_link: ["promotion url", "target url", "promotion link", "promo url", "tracking link", "affiliate link", "affiliate url"],
  image_url: ["product main image", "image url", "main image", "image", "image_url", "picture"],
  price_usd: ["sale price", "discount price", "discounted price", "price", "sale_price"],
  original_price_usd: ["original price", "list price", "originalprice"],
  discount_percentage: ["discount", "discount %", "discount percentage", "discount_percent"],
  commission_rate: ["commission rate", "commission_rate", "commission %", "commission"],
  sales_30d: ["orders", "30day volume", "30 day volume", "sales", "monthly orders", "sales count"],
  rating: ["evaluate score", "rating", "score", "average rating"],
  category_id: ["category id", "categoryid", "category_id"],
};

type MappedRow = {
  aliexpress_product_id: string;
  product_name: string;
  tracking_link: string;
  image_url?: string | null;
  price_usd?: number | null;
  original_price_usd?: number | null;
  discount_percentage?: number | null;
  commission_rate?: number | null;
  sales_30d?: number | null;
  rating?: number | null;
  category_id?: string | null;
};

const RowSchema = z.object({
  aliexpress_product_id: z.string().trim().min(1).max(50),
  product_name: z.string().trim().min(1).max(500),
  tracking_link: z.string().trim().url().max(2000),
});

const normalizeKey = (key: string): string => key.trim().toLowerCase().replace(/[_\-\.]/g, " ").replace(/\s+/g, " ");

const buildHeaderMap = (headers: string[]): Record<string, string> => {
  const map: Record<string, string> = {};
  const normalized = headers.map((h) => ({ raw: h, norm: normalizeKey(h) }));
  for (const [target, aliases] of Object.entries(COLUMN_ALIASES)) {
    for (const alias of aliases) {
      const found = normalized.find((h) => h.norm === normalizeKey(alias));
      if (found) {
        map[target] = found.raw;
        break;
      }
    }
  }
  return map;
};

const parseNumber = (val: unknown): number | null => {
  if (val === null || val === undefined || val === "") return null;
  const s = String(val).replace(/[%$,₪฿\s]/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
};

const parseInt10 = (val: unknown): number | null => {
  const n = parseNumber(val);
  return n === null ? null : Math.round(n);
};

export const CsvImportTab = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerMap, setHeaderMap] = useState<Record<string, string>>({});
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [validRows, setValidRows] = useState<MappedRow[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [campaignName, setCampaignName] = useState("");
  const [categoryName, setCategoryName] = useState<string>(DEAL_CATEGORIES[0]);
  const [isImporting, setIsImporting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number; skipped: number } | null>(null);

  const reset = () => {
    setFileName("");
    setHeaders([]);
    setHeaderMap({});
    setRawRows([]);
    setValidRows([]);
    setSkippedCount(0);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processRows = (rows: Record<string, string>[], map: Record<string, string>) => {
    let skipped = 0;
    const valid: MappedRow[] = [];
    for (const row of rows) {
      const candidate: Partial<MappedRow> = {
        aliexpress_product_id: map.aliexpress_product_id ? String(row[map.aliexpress_product_id] ?? "").trim() : "",
        product_name: map.product_name ? String(row[map.product_name] ?? "").trim() : "",
        tracking_link: map.tracking_link ? String(row[map.tracking_link] ?? "").trim() : "",
        image_url: map.image_url ? String(row[map.image_url] ?? "").trim() || null : null,
        price_usd: map.price_usd ? parseNumber(row[map.price_usd]) : null,
        original_price_usd: map.original_price_usd ? parseNumber(row[map.original_price_usd]) : null,
        discount_percentage: map.discount_percentage ? parseInt10(row[map.discount_percentage]) : null,
        commission_rate: map.commission_rate ? parseNumber(row[map.commission_rate]) : null,
        sales_30d: map.sales_30d ? parseInt10(row[map.sales_30d]) : null,
        rating: map.rating ? parseNumber(row[map.rating]) : null,
        category_id: map.category_id ? String(row[map.category_id] ?? "").trim() || null : null,
      };
      const parsed = RowSchema.safeParse(candidate);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      // Compute missing discount percentage
      if (candidate.discount_percentage == null && candidate.price_usd && candidate.original_price_usd && candidate.original_price_usd > candidate.price_usd) {
        candidate.discount_percentage = Math.round((1 - candidate.price_usd / candidate.original_price_usd) * 100);
      }
      valid.push(candidate as MappedRow);
    }
    setValidRows(valid);
    setSkippedCount(skipped);
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    setImportResult(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = (results.meta.fields ?? []).filter(Boolean);
        const map = buildHeaderMap(fields);
        setHeaders(fields);
        setHeaderMap(map);
        setRawRows(results.data);
        if (!map.aliexpress_product_id || !map.product_name || !map.tracking_link) {
          toast.error("חסרות עמודות חובה ב-CSV (Product Id / Title / Promotion Url)");
          return;
        }
        processRows(results.data, map);
        toast.success(`נטענו ${results.data.length} שורות מה-CSV`);
      },
      error: (err) => {
        toast.error(`שגיאה בקריאת CSV: ${err.message}`);
      },
    });
  };

  const handleImport = async () => {
    if (!campaignName.trim()) {
      toast.error("נא להזין שם קמפיין");
      return;
    }
    if (validRows.length === 0) {
      toast.error("אין שורות תקינות לייבוא");
      return;
    }

    // Auth check — RLS requires admin role
    const { data: session } = await supabase.auth.getSession();
    if (!session?.session?.user) {
      toast.error("יש להתחבר כאדמין");
      return;
    }

    setIsImporting(true);
    setImportResult(null);
    try {
      // Find existing IDs to compute insert vs update
      const ids = validRows.map((r) => r.aliexpress_product_id);
      const { data: existing, error: existErr } = await supabase
        .from("aliexpress_feed_products")
        .select("aliexpress_product_id")
        .in("aliexpress_product_id", ids);
      if (existErr) throw existErr;
      const existingIds = new Set((existing ?? []).map((e) => e.aliexpress_product_id));

      const payload = validRows.map((r) => ({
        aliexpress_product_id: r.aliexpress_product_id,
        product_name: r.product_name,
        tracking_link: r.tracking_link,
        image_url: r.image_url ?? null,
        price_usd: r.price_usd ?? null,
        original_price_usd: r.original_price_usd ?? null,
        discount_percentage: r.discount_percentage ?? null,
        commission_rate: r.commission_rate ?? null,
        sales_30d: r.sales_30d ?? null,
        rating: r.rating ?? null,
        category_id: r.category_id ?? null,
        category_name_hebrew: categoryName,
        campaign_name: campaignName.trim(),
        is_campaign_product: true,
        out_of_stock: false,
        currency: "USD",
        updated_at: new Date().toISOString(),
      }));

      // Upsert in batches of 100
      const BATCH = 100;
      for (let i = 0; i < payload.length; i += BATCH) {
        const slice = payload.slice(i, i + BATCH);
        const { error } = await supabase
          .from("aliexpress_feed_products")
          .upsert(slice, { onConflict: "aliexpress_product_id" });
        if (error) throw error;
      }

      const inserted = payload.filter((p) => !existingIds.has(p.aliexpress_product_id)).length;
      const updated = payload.length - inserted;
      setImportResult({ inserted, updated, skipped: skippedCount });
      toast.success(`✅ יובאו: ${inserted} חדשים, ${updated} עודכנו`);
    } catch (err) {
      console.error("CSV import error:", err);
      const msg = err instanceof Error ? err.message : "שגיאה לא ידועה";
      toast.error(`שגיאה בייבוא: ${msg}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleTranslate = async () => {
    setIsTranslating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke("translate-products", {
        headers: session?.session?.access_token
          ? { Authorization: `Bearer ${session.session.access_token}` }
          : undefined,
      });
      if (error) throw error;
      toast.success(`✅ תורגמו ${data?.translated ?? 0} מוצרים`);
    } catch (err) {
      console.error("Translate error:", err);
      toast.error("שגיאה בתרגום");
    } finally {
      setIsTranslating(false);
    }
  };

  const requiredMissing = headers.length > 0 && (!headerMap.aliexpress_product_id || !headerMap.product_name || !headerMap.tracking_link);

  return (
    <div className="space-y-6" dir="rtl">
      <Card className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <FileSpreadsheet className="h-6 w-6 text-primary mt-1" />
          <div>
            <h2 className="text-xl font-bold">ייבוא מוצרים מ-CSV</h2>
            <p className="text-sm text-muted-foreground mt-1">
              העלאת קובץ CSV של קמפיין AliExpress (Designated Products) לטבלת המוצרים.
              העמודות החובה: <code className="bg-muted px-1 rounded">Product Id</code>,{" "}
              <code className="bg-muted px-1 rounded">Product Title</code>,{" "}
              <code className="bg-muted px-1 rounded">Promotion Url</code>.
            </p>
          </div>
        </div>

        {/* File picker */}
        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
          <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button onClick={() => fileInputRef.current?.click()} variant="outline">
            <Upload className="h-4 w-4 ml-2" />
            בחר קובץ CSV
          </Button>
          {fileName && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="font-medium">{fileName}</span>
              <button onClick={reset} className="text-muted-foreground hover:text-destructive">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </Card>

      {headers.length > 0 && (
        <Card className="p-6">
          <h3 className="font-bold mb-3">מיפוי עמודות אוטומטי</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {Object.entries(COLUMN_ALIASES).map(([target]) => {
              const matched = headerMap[target];
              const isRequired = ["aliexpress_product_id", "product_name", "tracking_link"].includes(target);
              return (
                <div key={target} className="flex items-center gap-2">
                  {matched ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className={`h-4 w-4 flex-shrink-0 ${isRequired ? "text-destructive" : "text-muted-foreground"}`} />
                  )}
                  <span className="font-mono text-xs">{target}</span>
                  <span className="text-muted-foreground">←</span>
                  <span className={matched ? "" : "text-muted-foreground italic"}>
                    {matched ?? (isRequired ? "חסר (חובה!)" : "לא נמצא")}
                  </span>
                </div>
              );
            })}
          </div>

          {requiredMissing && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded text-sm">
              ⚠️ חסרות עמודות חובה — לא ניתן להמשיך
            </div>
          )}
        </Card>
      )}

      {validRows.length > 0 && !requiredMissing && (
        <>
          <Card className="p-6">
            <h3 className="font-bold mb-4">הגדרות ייבוא</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="campaign-name">שם הקמפיין *</Label>
                <Input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value.slice(0, 100))}
                  placeholder="לדוגמה: April Auto"
                  maxLength={100}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="category">קטגוריה *</Label>
                <Select value={categoryName} onValueChange={setCategoryName}>
                  <SelectTrigger id="category" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DEAL_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 text-sm">
              <span className="font-medium">📊 סיכום:</span>
              <span className="text-green-600">{validRows.length} שורות תקינות</span>
              {skippedCount > 0 && <span className="text-orange-600">{skippedCount} ידולגו (חסרים שדות)</span>}
            </div>
          </Card>

          {/* Preview first 5 rows */}
          <Card className="p-6">
            <h3 className="font-bold mb-3">תצוגה מקדימה (5 שורות ראשונות)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-right">ID</th>
                    <th className="p-2 text-right">שם</th>
                    <th className="p-2 text-right">מחיר</th>
                    <th className="p-2 text-right">הנחה</th>
                    <th className="p-2 text-right">עמלה</th>
                    <th className="p-2 text-right">מכירות</th>
                  </tr>
                </thead>
                <tbody>
                  {validRows.slice(0, 5).map((r) => (
                    <tr key={r.aliexpress_product_id} className="border-b">
                      <td className="p-2 font-mono">{r.aliexpress_product_id}</td>
                      <td className="p-2 max-w-xs truncate">{r.product_name}</td>
                      <td className="p-2">{r.price_usd ? `$${r.price_usd}` : "-"}</td>
                      <td className="p-2">{r.discount_percentage ? `${r.discount_percentage}%` : "-"}</td>
                      <td className="p-2">{r.commission_rate ? `${r.commission_rate}%` : "-"}</td>
                      <td className="p-2">{r.sales_30d ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleImport} disabled={isImporting || !campaignName.trim()}>
              {isImporting ? (
                <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> מייבא...</>
              ) : (
                <><Upload className="h-4 w-4 ml-2" /> ייבוא {validRows.length} מוצרים</>
              )}
            </Button>
            {importResult && (
              <Button onClick={handleTranslate} disabled={isTranslating} variant="outline">
                {isTranslating ? (
                  <><Loader2 className="h-4 w-4 ml-2 animate-spin" /> מתרגם...</>
                ) : (
                  <><Languages className="h-4 w-4 ml-2" /> תרגם לעברית עכשיו</>
                )}
              </Button>
            )}
          </div>

          {importResult && (
            <Card className="p-4 bg-green-500/10 border-green-500/30">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div className="text-sm">
                  <strong>✅ ייבוא הושלם!</strong> נוספו <strong>{importResult.inserted}</strong> חדשים,
                  עודכנו <strong>{importResult.updated}</strong>, דולגו <strong>{importResult.skipped}</strong>.
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
