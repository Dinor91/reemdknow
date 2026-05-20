import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Copy, Archive, RefreshCw, Search, RotateCcw, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  const groups = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const weekCutoff = startOfToday - 6 * 24 * 60 * 60 * 1000;
    const buckets: { key: string; label: string; items: Draft[] }[] = [
      { key: "today", label: "היום", items: [] },
      { key: "yesterday", label: "אתמול", items: [] },
      { key: "week", label: "השבוע", items: [] },
      { key: "older", label: "ישן יותר", items: [] },
    ];
    for (const d of visible) {
      const t = new Date(d.created_at).getTime();
      if (t >= startOfToday) buckets[0].items.push(d);
      else if (t >= startOfYesterday) buckets[1].items.push(d);
      else if (t >= weekCutoff) buckets[2].items.push(d);
      else buckets[3].items.push(d);
    }
    return buckets.filter((b) => b.items.length > 0);
  }, [visible]);

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
    const text = d.audit_notes ?? "";
    if (!text) {
      toast.error("אין תוכן להעתקה (audit_notes ריק)");
      return;
    }
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
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-1.5">
                <h2 className="text-base font-bold">{group.label}</h2>
                <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map((d) => {
                  const isOpen = !!expanded[d.id];
                  const hasNotes = !!(d.audit_notes && d.audit_notes.trim());
                  return (
                    <Card key={d.id} className="overflow-hidden flex flex-col p-3 gap-3">
                      {/* Compact header: image + meta */}
                      <div className="flex gap-3">
                        <div className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden bg-muted">
                          {d.image_url ? (
                            <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">אין תמונה</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                          <h3 className="font-semibold text-sm line-clamp-2 leading-snug">
                            {d.product_name_hebrew || d.product_name_english || "ללא שם"}
                          </h3>
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {d.price_usd && d.price_usd > 0 && (
                              <span className="font-semibold">${Number(d.price_usd).toFixed(2)}</span>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {d.platform === "amazon" ? "Amazon" : "AE"}
                            </Badge>
                            {d.category_name_hebrew && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {d.category_name_hebrew}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expand/collapse audit_notes */}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full justify-between h-8 text-xs"
                        onClick={() => setExpanded((s) => ({ ...s, [d.id]: !s[d.id] }))}
                        disabled={!hasNotes}
                      >
                        <span>{!hasNotes ? "אין פוסט" : isOpen ? "הסתר פוסט" : "הצג פוסט מלא"}</span>
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      {isOpen && hasNotes && (
                        <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-2 font-sans leading-relaxed max-h-80 overflow-auto">
                          {d.audit_notes}
                        </pre>
                      )}

                      {/* Actions */}
                      <div className="mt-auto flex flex-col gap-2">
                        {!showArchived ? (
                          <>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                className="min-h-[40px]"
                                onClick={() => handleApprove(d)}
                                disabled={actingId === d.id}
                              >
                                <Send className="h-4 w-4 ml-1" />
                                אישור ושליחה
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-[40px]"
                                onClick={() => d.tracking_link && window.open(d.tracking_link, "_blank", "noopener,noreferrer")}
                                disabled={!d.tracking_link}
                              >
                                <ExternalLink className="h-4 w-4 ml-1" />
                                צפה במוצר
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                className="min-h-[40px]"
                                onClick={() => handleCopy(d)}
                              >
                                <Copy className="h-4 w-4 ml-1" />
                                וואטסאפ
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="min-h-[40px] hover:text-destructive"
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
                            className="w-full min-h-[40px]"
                            onClick={() => handleArchive(d, true)}
                            disabled={actingId === d.id}
                          >
                            <RotateCcw className="h-4 w-4 ml-2" />
                            שחזור
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
