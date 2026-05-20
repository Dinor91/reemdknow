import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Copy, Archive, RefreshCw, Search, RotateCcw, ExternalLink, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

type PlatformFilter = "all" | "amazon" | "aliexpress" | "ksp";
type SourceTable = "amazon" | "israel";
interface Draft {
  id: string;
  source_table: SourceTable;
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
  is_active: boolean | null;
}

const HANDS_FREE_DAILY_TARGET = 12;

function detectPlatform(d: Draft): "amazon" | "aliexpress" | "ksp" | "other" {
  if (d.source_table === "amazon") return "amazon";
  const link = (d.tracking_link ?? "").toLowerCase();
  if (link.includes("aliexpress")) return "aliexpress";
  if (link.includes("ksp")) return "ksp";
  return "other";
}

function platformLabel(p: "amazon" | "aliexpress" | "ksp" | "other") {
  if (p === "amazon") return "Amazon";
  if (p === "aliexpress") return "AE";
  if (p === "ksp") return "KSP";
  return "—";
}

export function ScoutDraftsTab() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  async function load() {
    setLoading(true);
    const select =
      "id, product_name_hebrew, product_name_english, image_url, price_usd, rating, sales_count, category_name_hebrew, tracking_link, audit_notes, archived_at, created_at, source, is_active";
    const [israelRes, amzRes] = await Promise.all([
      supabase
        .from("israel_editor_products")
        .select(select)
        .eq("source", "scout_v2")
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("amazon_editor_products")
        .select(select)
        .eq("source", "scout_v2")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);
    const israel: Draft[] = ((israelRes.data as any[]) || []).map((d) => ({ ...d, source_table: "israel" as SourceTable }));
    const amz: Draft[] = ((amzRes.data as any[]) || []).map((d) => ({ ...d, source_table: "amazon" as SourceTable }));
    const merged = [...israel, ...amz].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    setDrafts(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    return drafts.filter((d) => {
      if (showArchived ? !d.archived_at : !!d.archived_at) return false;
      if (platformFilter !== "all") {
        const p = detectPlatform(d);
        if (p !== platformFilter) return false;
      }
      if (search) {
        const hay = `${d.product_name_hebrew ?? ""} ${d.product_name_english ?? ""}`.toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [drafts, showArchived, platformFilter, search]);

  const pendingCount = useMemo(
    () => drafts.filter((d) => !d.archived_at && !d.is_active).length,
    [drafts],
  );

  const draftsLast24h = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return drafts.filter((d) => new Date(d.created_at).getTime() > cutoff && !d.archived_at).length;
  }, [drafts]);

  const draftsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return drafts.filter((d) => new Date(d.created_at).getTime() > cutoff).length;
  }, [drafts]);

  // Group by day (YYYY-MM-DD)
  const groups = useMemo(() => {
    const byDay = new Map<string, Draft[]>();
    for (const d of visible) {
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(d);
    }
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const keys = Array.from(byDay.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((key) => {
      const [y, m, d] = key.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      const diffDays = Math.round((startOfToday - date.getTime()) / (24 * 60 * 60 * 1000));
      let label: string;
      let short: string;
      if (diffDays === 0) {
        label = "היום";
        short = "היום";
      } else if (diffDays === 1) {
        label = "אתמול";
        short = "אתמול";
      } else {
        const dayName = dayNames[date.getDay()];
        const dm = `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
        label = `יום ${dayName} • ${dm}`;
        short = dm;
      }
      return { key, label, short, items: byDay.get(key)! };
    });
  }, [visible]);

  const tableFor = (s: SourceTable) => (s === "amazon" ? "amazon_editor_products" : "israel_editor_products");

  async function handleApprove(d: Draft) {
    setActingId(d.id);
    const { error } = await supabase.from(tableFor(d.source_table)).update({ is_active: true }).eq("id", d.id);
    if (error) {
      toast.error("שגיאה באישור: " + error.message);
      setActingId(null);
      return;
    }
    try {
      const platform = d.source_table === "amazon" ? "amazon" : "aliexpress";
      const { error: fnErr } = await supabase.functions.invoke("post-scout-draft", {
        body: { productId: d.id, platform },
      });
      if (fnErr) throw fnErr;
      toast.success("אושר ונשלח לטלגרם");
    } catch (e: any) {
      toast.warning("אושר, אבל שליחה לטלגרם נכשלה: " + (e?.message ?? ""));
    }
    // Mark as sent locally + reflect is_active=true so the green badge persists
    setSentIds((prev) => new Set(prev).add(d.id));
    setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, is_active: true } : x)));
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
      .from(tableFor(d.source_table))
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

  function scrollToDay(key: string) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
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
            <div className="text-xs text-muted-foreground mt-1">השבוע: {draftsThisWeek} / {HANDS_FREE_DAILY_TARGET * 7} • ממתינות: {pendingCount}</div>
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
          <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformFilter)}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הפלטפורמות</SelectItem>
              <SelectItem value="aliexpress">AliExpress</SelectItem>
              <SelectItem value="amazon">Amazon</SelectItem>
              <SelectItem value="ksp">KSP</SelectItem>
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

      {/* Day quick-nav */}
      {!loading && groups.length > 1 && (
        <Card className="p-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {groups.map((g) => (
              <Button
                key={g.key}
                size="sm"
                variant="outline"
                className="shrink-0 h-8 text-xs"
                onClick={() => scrollToDay(g.key)}
              >
                {g.short}
                <Badge variant="secondary" className="mr-1.5 text-[10px] px-1.5 py-0">{g.items.length}</Badge>
              </Button>
            ))}
          </div>
        </Card>
      )}

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
            <section
              key={group.key}
              ref={(el) => (sectionRefs.current[group.key] = el)}
              className="space-y-2 scroll-mt-4"
            >
              <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-1.5">
                <h2 className="text-base font-bold">{group.label}</h2>
                <Badge variant="secondary" className="text-[10px]">{group.items.length}</Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map((d) => {
                  const isOpen = !!expanded[d.id];
                  const hasNotes = !!(d.audit_notes && d.audit_notes.trim());
                  const platform = detectPlatform(d);
                  const isSent = sentIds.has(d.id) || d.is_active === true;
                  return (
                    <Card key={d.id} className={`overflow-hidden flex flex-col p-3 gap-3 ${isSent ? "border-green-500/40" : ""}`}>
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
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm line-clamp-2 leading-snug flex-1">
                              {d.product_name_hebrew || d.product_name_english || "ללא שם"}
                            </h3>
                            {isSent && (
                              <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0 shrink-0 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                נשלח
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap text-xs">
                            {d.price_usd && d.price_usd > 0 && (
                              <span className="font-semibold">${Number(d.price_usd).toFixed(2)}</span>
                            )}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {platformLabel(platform)}
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
                                disabled={actingId === d.id || isSent}
                                variant={isSent ? "secondary" : "default"}
                              >
                                {isSent ? (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 ml-1" />
                                    נשלח
                                  </>
                                ) : (
                                  <>
                                    <Send className="h-4 w-4 ml-1" />
                                    אישור ושליחה
                                  </>
                                )}
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
