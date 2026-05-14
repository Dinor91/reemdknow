import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Upload, Plus, ExternalLink } from "lucide-react";
import { format, startOfWeek } from "date-fns";

const RATE_THB_TO_ILS = 0.36;
const RATE_USD_TO_ILS = 3.7;

type Platform = "amazon" | "aliexpress" | "lazada";

interface RevenueRow {
  id: string;
  uploaded_at: string;
  platform: Platform;
  period_start: string | null;
  period_end: string | null;
  gross_revenue_ils: number;
  commission_ils: number;
  orders_count: number;
  filename: string | null;
}

interface ClickRow {
  source: string | null;
  created_at: string;
}
interface InvestigationPost {
  id: string;
  posted_at: string;
  title: string;
  url: string | null;
}

const chartConfig = {
  ils: { label: "₪", color: "hsl(var(--primary))" },
};

function parseCsv(text: string): string[][] {
  // Simple CSV split (handles quoted fields lightly).
  const rows: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cols: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) {
        cols.push(cur);
        cur = "";
      } else cur += ch;
    }
    cols.push(cur);
    rows.push(cols.map((c) => c.trim()));
  }
  return rows;
}

function detectPlatform(headers: string[]): Platform {
  const h = headers.join(" ").toLowerCase();
  if (h.includes("asin") || h.includes("amazon")) return "amazon";
  if (h.includes("lazada") || h.includes("thb") || h.includes("฿")) return "lazada";
  return "aliexpress";
}

function pickColumn(headers: string[], keys: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const lc = headers[i].toLowerCase();
    if (keys.some((k) => lc.includes(k))) return i;
  }
  return -1;
}

function summarizeCsv(rows: string[][]) {
  if (rows.length < 2) return null;
  const headers = rows[0];
  const platform = detectPlatform(headers);
  const grossIdx = pickColumn(headers, ["sales", "revenue", "amount", "ordered product sales", "paid"]);
  const commIdx = pickColumn(headers, ["commission", "fee", "earning"]);
  const ordersIdx = pickColumn(headers, ["orders", "items shipped", "qty", "count"]);
  let gross = 0;
  let comm = 0;
  let orders = 0;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const num = (s: string) => parseFloat((s || "").replace(/[^0-9.\-]/g, "")) || 0;
    if (grossIdx >= 0) gross += num(row[grossIdx]);
    if (commIdx >= 0) comm += num(row[commIdx]);
    if (ordersIdx >= 0) orders += num(row[ordersIdx]);
    else orders += 1;
  }
  const rate = platform === "lazada" ? RATE_THB_TO_ILS : RATE_USD_TO_ILS;
  return {
    platform,
    gross_revenue_ils: +(gross * rate).toFixed(2),
    commission_ils: +(comm * rate).toFixed(2),
    orders_count: Math.round(orders),
  };
}

export function RevenueTab() {
  const [revenues, setRevenues] = useState<RevenueRow[]>([]);
  const [clicks, setClicks] = useState<ClickRow[]>([]);
  const [posts, setPosts] = useState<InvestigationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newPost, setNewPost] = useState({ title: "", url: "" });
  const [adding, setAdding] = useState(false);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [rev, clk, ip] = await Promise.all([
      supabase.from("revenue_uploads").select("*").order("uploaded_at", { ascending: false }).limit(50),
      supabase
        .from("button_clicks")
        .select("source, created_at")
        .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(1000),
      supabase
        .from("investigation_posts")
        .select("*")
        .gte("posted_at", since)
        .order("posted_at", { ascending: false }),
    ]);
    if (rev.data) setRevenues(rev.data as any);
    if (clk.data) setClicks(clk.data as any);
    if (ip.data) setPosts(ip.data as any);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const weeklyRevenue = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const r of revenues) {
      const wk = format(startOfWeek(new Date(r.uploaded_at), { weekStartsOn: 0 }), "dd/MM");
      buckets.set(wk, (buckets.get(wk) ?? 0) + Number(r.gross_revenue_ils ?? 0));
    }
    return Array.from(buckets.entries())
      .map(([week, ils]) => ({ week, ils: +ils.toFixed(0) }))
      .reverse();
  }, [revenues]);

  const hitOfWeek = useMemo(() => {
    const tally = new Map<string, number>();
    for (const c of clicks) {
      const k = c.source ?? "unknown";
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    return Array.from(tally.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, ils]) => ({ week: source, ils }));
  }, [clicks]);

  const postsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return posts.filter((p) => new Date(p.posted_at).getTime() > cutoff).length;
  }, [posts]);

  async function onCsvFile(file: File) {
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const summary = summarizeCsv(rows);
      if (!summary) throw new Error("CSV ריק או לא תקין");
      const { error } = await supabase.from("revenue_uploads").insert({
        ...summary,
        filename: file.name,
        raw: { rows: rows.slice(0, 500) },
      });
      if (error) throw error;
      toast.success(`נטען: ₪${summary.gross_revenue_ils} מ-${summary.platform}`);
      load();
    } catch (e: any) {
      toast.error("שגיאה: " + e.message);
    }
    setUploading(false);
  }

  async function addPost() {
    if (!newPost.title) return;
    setAdding(true);
    const { error } = await supabase.from("investigation_posts").insert({
      title: newPost.title,
      url: newPost.url || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("נוסף");
      setNewPost({ title: "", url: "" });
      load();
    }
    setAdding(false);
  }

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="p-4">
        <h3 className="font-bold mb-3">העלאת CSV הכנסות (Amazon / AliExpress / Lazada)</h3>
        <Label
          htmlFor="csv-upload"
          className="block border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/30 transition-colors min-h-[100px] flex items-center justify-center"
        >
          <div>
            <Upload className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm">{uploading ? "מעלה..." : "גרור קובץ CSV או לחץ לבחירה"}</div>
            <div className="text-xs text-muted-foreground mt-1">מזהה אוטומטית פלטפורמה ומבצע המרה ל-ILS</div>
          </div>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCsvFile(f);
              e.target.value = "";
            }}
          />
        </Label>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-4">
          <h3 className="font-bold mb-3">הכנסה שבועית (₪)</h3>
          {weeklyRevenue.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">אין נתונים עדיין</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={weeklyRevenue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ils" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-bold mb-3">Hit of the Week — קליקים</h3>
          {hitOfWeek.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">אין קליקים השבוע</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[220px] w-full">
              <BarChart data={hitOfWeek} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="week" width={90} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ils" fill="hsl(var(--primary))" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div>
            <h3 className="font-bold">פוסטי חקירה — Viral Ratio</h3>
            <div className="text-2xl font-bold mt-1">
              {postsThisWeek} <span className="text-base font-normal text-muted-foreground">/ 2 השבוע</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
          <Input
            placeholder="כותרת הפוסט"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
          />
          <Input
            placeholder="קישור (אופציונלי)"
            value={newPost.url}
            onChange={(e) => setNewPost({ ...newPost, url: e.target.value })}
          />
          <Button onClick={addPost} disabled={adding || !newPost.title} className="min-h-[44px]">
            <Plus className="h-4 w-4 ml-1" />
            הוסף
          </Button>
        </div>
        {posts.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {posts.slice(0, 5).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 border-b border-border py-1">
                <span className="truncate">{p.title}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(p.posted_at), "dd/MM")}</span>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="hover:text-primary">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
