import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Copy, Archive, RefreshCw, Star, Search, RotateCcw } from "lucide-react";
import { formatForWhatsApp } from "@/lib/whatsappFormatter";

type Platform = "aliexpress" | "amazon";
interface Draft {
  id: string;
  platform: Platform;
  product_name_hebrew: string | null;
  product_name_english: string | null;
  image_url: string | null;
  price_usd: number | null;
  rating: number | null;
  sales_count: number | null;
  category_name_hebrew: string | null;
  tracking_link: string | null;
  audit_notes: string | null;
  archived_at: string | null;
  created_at: string;
  source: string | null;
}

const HANDS_FREE_DAILY_TARGET = 12;

export function ScoutDraftsTab() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<"all" | Platform>("all");
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const select =
      "id, product_name_hebrew, product_name_english, image_url, price_usd, rating, sales_count, category_name_hebrew, tracking_link, audit_notes, archived_at, created_at, source";
    const [aeRes, amzRes] = await Promise.all([
      supabase
        .from("israel_editor_products")
        .select(select)
        .eq("source", "scout_v2")
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("amazon_editor_products")
        .select(select)
        .eq("source", "scout_v2")
        .eq("is_active", false)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
    const ae: Draft[] = ((aeRes.data as any[]) || []).map((d) => ({ ...d, platform: "aliexpress" as Platform }));
    const amz: Draft[] = ((amzRes.data as any[]) || []).map((d) => ({ ...d, platform: "amazon" as Platform }));
    const merged = [...ae, ...amz].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setDrafts(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return drafts.filter((d) => {
      if (showArchived ? !d.archived_at : !!d.archived_at) return false;
      if (platformFilter !== "all" && d.platform !== platformFilter) return false;
      if (search) {
        const hay = `${d.product_name_hebrew ?? ""} ${d.product_name_english ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [drafts, showArchived, platformFilter, search]);

  const draftsLast24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return drafts.filter((d) => new Date(d.created_at).getTime() > cutoff && !d.archived_at).length;
  }, [drafts]);

  const draftsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return drafts.filter((d) => new Date(d.created_at).getTime() > cutoff).length;
  }, [drafts]);

  const tableFor = (p: Platform) => (p === "amazon" ? "amazon_editor_products" : "israel_editor_products");

  async function handleApprove(d: Draft) {
    setActingId(d.id);
    const { error } = await supabase.from(tableFor(d.platform)).update({ is_active: true }).eq("id", d.id);
    if (error) {
      toast.error("שגיאה באישור: " + error.message);
      setActingId(null);
      return;
    }
    try {
      const { error: fnErr } = await supabase.functions.invoke("post-scout-draft", {
        body: { productId: d.id, platform: d.platform },
      });
      if (fnErr) throw fnErr;
      toast.success("אושר ונשלח לטלגרם");
    } catch (e: any) {
      toast.warning("אושר, אבל שליחה לטלגרם נכשלה: " + (e?.message ?? ""));
    }
    setDrafts((prev) => prev.filter((x) => x.id !== d.id));
    setActingId(null);
  }

  async function handleCopy(d: Draft) {
    const text = formatForWhatsApp(d, d.platform);
    await navigator.clipboard.writeText(text);
    toast.success("הועתק לוואטסאפ");
  }

  async function handleArchive(d: Draft, restore = false) {
    setActingId(d.id);
    const { error } = await supabase
      .from(tableFor(d.platform))
      .update({ archived_at: restore ? null : new Date().toISOString() })
      .eq("id", d.id);
    if (error) {
      toast.error("שגיאה: " + error.message);
    } else {
      toast.success(restore ? "שוחזר" : "הועבר לארכיון");
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, archived_at: restore ? null : new Date().toISOString() } : x)));
    }
    setActingId(null);
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">Hands-Free Index — היום</div>
            <div className="text-3xl font-bold">
              {draftsLast24h} <span className="text-base font-normal text-muted-foreground">/ {HANDS_FREE_DAILY_TARGET}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">השבוע: {draftsThisWeek} / {HANDS_FREE_DAILY_TARGET * 7}</div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענון
          </Button>
        </div>
        <Progress className="mt-3" value={Math.min(100, (draftsLast24h / HANDS_FREE_DAILY_TARGET) * 100)} />
      </Card>

      {/* Filters */}
      <Card className="p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש בשם המוצר..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as any)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפלטפורמות</SelectItem>
              <SelectItem value="aliexpress">AliExpress</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived((s) => !s)}
            size="sm"
          >
            {showArchived ? "הצג פעילים" : "הצג ארכיון"}
          </Button>
        </div>
      </Card>

      {/* Drafts grid */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          אין טיוטות {showArchived ? "בארכיון" : "ממתינות"}. ה-Scout יזרים פריטים אוטומטית.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((d) => (
            <Card key={d.id} className="overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-muted">
                {d.image_url ? (
                  <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">אין תמונה</div>
                )}
                <Badge className="absolute top-2 right-2" variant="secondary">
                  {d.platform === "amazon" ? "Amazon" : "AliExpress"}
                </Badge>
                {d.category_name_hebrew && (
                  <Badge className="absolute top-2 left-2" variant="outline">{d.category_name_hebrew}</Badge>
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col gap-2">
                <h3 className="font-semibold text-sm line-clamp-2 min-h-[2.5rem]">
                  {d.product_name_hebrew || d.product_name_english || "ללא שם"}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {d.price_usd && d.price_usd > 0 && <span>${Number(d.price_usd).toFixed(2)}</span>}
                  {d.rating && d.rating > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" /> {Number(d.rating).toFixed(1)}
                    </span>
                  )}
                  {d.sales_count && d.sales_count > 0 && <span>🔥 {d.sales_count}</span>}
                </div>
                {d.audit_notes && (
                  <p className="text-xs italic bg-muted/50 rounded p-2 line-clamp-3">{d.audit_notes}</p>
                )}
                <div className="mt-auto pt-2 flex flex-col gap-2">
                  {!showArchived ? (
                    <>
                      <Button
                        size="sm"
                        className="w-full min-h-[44px]"
                        onClick={() => handleApprove(d)}
                        disabled={actingId === d.id}
                      >
                        <Send className="h-4 w-4 ml-2" />
                        אישור ושליחה
                      </Button>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="min-h-[44px]"
                          onClick={() => handleCopy(d)}
                        >
                          <Copy className="h-4 w-4 ml-1" />
                          וואטסאפ
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-h-[44px] hover:text-destructive"
                          onClick={() => handleArchive(d)}
                          disabled={actingId === d.id}
                        >
                          <Archive className="h-4 w-4 ml-1" />
                          ארכיון
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full min-h-[44px]"
                      onClick={() => handleArchive(d, true)}
                      disabled={actingId === d.id}
                    >
                      <RotateCcw className="h-4 w-4 ml-2" />
                      שחזור
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
