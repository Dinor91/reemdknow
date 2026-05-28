import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Copy, Archive, RefreshCw, Search, RotateCcw, ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Pencil, Save, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { ArchiveReasonDialog, ARCHIVE_REASON_LABELS, type ArchiveReason } from "@/components/admin/ArchiveReasonDialog";
import { getTimeBucket } from "@/lib/timeBucket";

type PlatformFilter = "all" | "amazon" | "aliexpress" | "ksp";
type ReasonFilter = "all" | "sent" | "wording" | "price" | "image" | "other";
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
  archive_reason: string | null;
  sent_at: string | null;
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

// Workday model — local browser time.
// A "workday" runs from yesterday 21:30 → today 21:30 (local).
// Scan runs at 22:00 local, so reset at 21:30 sits safely 30min before it.
// publishDayOf(d) returns the END of the workday `d` belongs to — used as
// a stable grouping anchor and as the label date ("היום" = current workday end).
const WORKDAY_RESET_HOUR = 21;
const WORKDAY_RESET_MINUTE = 30;

function publishDayOf(date: Date) {
  const end = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    WORKDAY_RESET_HOUR,
    WORKDAY_RESET_MINUTE,
    0,
    0,
  );
  // If `date` is at/after today's 21:30, it belongs to tomorrow's workday.
  if (date.getTime() >= end.getTime()) {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

function dayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function ScoutDraftsTab() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [reasonFilter, setReasonFilter] = useState<ReasonFilter>("all");
  const [search, setSearch] = useState("");
  const [actingId, setActingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [archiveDialog, setArchiveDialog] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function load() {
    setLoading(true);
    const select =
      "id, product_name_hebrew, product_name_english, image_url, price_usd, rating, sales_count, category_name_hebrew, tracking_link, audit_notes, archived_at, archive_reason, sent_at, created_at, source, is_active";
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
      if (showArchived && reasonFilter !== "all") {
        if ((d.archive_reason ?? "other") !== reasonFilter) return false;
      }
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
  }, [drafts, showArchived, reasonFilter, platformFilter, search]);

  const pendingCount = useMemo(
    () => drafts.filter((d) => !d.archived_at && !d.is_active).length,
    [drafts],
  );

  // Anchor = end of the workday `now` belongs to (local 21:30 boundary).
  const todayStart = useMemo(() => publishDayOf(now), [now]);

  const draftsToday = useMemo(() => {
    return drafts.filter((d) => publishDayOf(new Date(d.created_at)).getTime() === todayStart.getTime()).length;
  }, [drafts, todayStart]);

  const sentToday = useMemo(() => {
    return drafts.filter((d) => {
      if (publishDayOf(new Date(d.created_at)).getTime() !== todayStart.getTime()) return false;
      return sentIds.has(d.id) || d.archive_reason === "sent" || !!d.sent_at;
    }).length;
  }, [drafts, todayStart, sentIds]);

  const draftsThisWeek = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return drafts.filter((d) => {
      const created = new Date(d.created_at);
      if (created.getTime() <= cutoff) return false;
      // Exclude Saturday (no work day) — count by publish day.
      return publishDayOf(created).getDay() !== 6;
    }).length;
  }, [drafts]);

  // Hierarchical nav cubes: current week → day-by-day; older same month → week cube; older → month cube.
  const monthNamesHe = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const navCubes = useMemo(() => {
    if (showArchived) return [] as { key: string; short: string; count: number; scrollKey: string; anchor: number }[];
    // Start of current calendar week (Sunday) based on todayStart (publish day anchor).
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // back to Sunday
    weekStart.setHours(0, 0, 0, 0);
    const currentMonth = todayStart.getMonth();
    const currentYear = todayStart.getFullYear();

    type Bucket = { key: string; short: string; count: number; scrollKey: string; anchor: number };
    const buckets = new Map<string, Bucket>();

    for (const d of visible) {
      const pd = publishDayOf(new Date(d.created_at));
      if (pd.getDay() === 6) continue; // skip Saturday entries (shouldn't exist, defensive)
      const dKey = dayKey(pd);
      let bucketKey: string;
      let short: string;
      let anchor: number;

      if (pd.getTime() >= weekStart.getTime()) {
        // Current week → per-day cube
        bucketKey = `day:${dKey}`;
        const diffDays = Math.round((todayStart.getTime() - pd.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays === 0) short = "היום";
        else if (diffDays === 1) short = "אתמול";
        else short = `${String(pd.getDate()).padStart(2, "0")}/${String(pd.getMonth() + 1).padStart(2, "0")}`;
        anchor = pd.getTime();
      } else if (pd.getFullYear() === currentYear && pd.getMonth() === currentMonth) {
        // Previous weeks of current month → week cube
        const weekInMonth = Math.ceil(pd.getDate() / 7);
        bucketKey = `week:${pd.getFullYear()}-${pd.getMonth() + 1}-${weekInMonth}`;
        short = `${weekInMonth}/${pd.getMonth() + 1}`;
        // anchor = end-of-week-in-month for sorting
        anchor = new Date(pd.getFullYear(), pd.getMonth(), weekInMonth * 7).getTime();
      } else {
        // Older → month cube
        bucketKey = `month:${pd.getFullYear()}-${pd.getMonth() + 1}`;
        short = monthNamesHe[pd.getMonth()];
        anchor = new Date(pd.getFullYear(), pd.getMonth() + 1, 0).getTime();
      }

      const existing = buckets.get(bucketKey);
      if (existing) {
        existing.count += 1;
        if (pd.getTime() > existing.anchor || existing.scrollKey === "") {
          // Keep newest scroll target inside the bucket
          if (pd.getTime() > new Date(existing.scrollKey).getTime()) existing.scrollKey = dKey;
        }
      } else {
        buckets.set(bucketKey, { key: bucketKey, short, count: 1, scrollKey: dKey, anchor });
      }
    }

    return Array.from(buckets.values()).sort((a, b) => b.anchor - a.anchor);
  }, [visible, showArchived, todayStart]);

  /**
   * Active view → group by the publish day: every draft created on calendar day X
   * is shown under calendar day X+1, and rolls to "אתמול" at midnight.
   * Archive view → group hierarchically by year → month → week.
   */
  const dayGroups = useMemo(() => {
    if (showArchived) return [];
    const byDay = new Map<string, { items: Draft[]; publishDay: Date }>();
    for (const d of visible) {
      const publishDay = publishDayOf(new Date(d.created_at));
      const key = dayKey(publishDay);
      if (!byDay.has(key)) byDay.set(key, { items: [], publishDay });
      byDay.get(key)!.items.push(d);
    }
    const dayNames = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
    const keys = Array.from(byDay.keys()).sort((a, b) => (a < b ? 1 : -1));
    return keys.map((key) => {
      const entry = byDay.get(key)!;
      const labelDate = entry.publishDay;
      const diffDays = Math.round((todayStart.getTime() - labelDate.getTime()) / (24 * 60 * 60 * 1000));
      let label: string;
      let short: string;
      if (diffDays === 0) {
        label = "היום";
        short = "היום";
      } else if (diffDays === 1) {
        label = "אתמול";
        short = "אתמול";
      } else {
        const dayName = dayNames[labelDate.getDay()];
        const dm = `${String(labelDate.getDate()).padStart(2, "0")}/${String(labelDate.getMonth() + 1).padStart(2, "0")}`;
        label = `יום ${dayName} • ${dm}`;
        short = dm;
      }
      return { key, label, short, items: entry.items };
    });
  }, [visible, showArchived, todayStart]);

  // Year → Month → Week hierarchy for archive view.
  const archiveTree = useMemo(() => {
    if (!showArchived) return [];
    type WeekNode = { key: string; label: string; items: Draft[] };
    type MonthNode = { key: string; label: string; weeks: Map<string, WeekNode> };
    type YearNode = { key: string; label: string; months: Map<string, MonthNode> };
    const years = new Map<string, YearNode>();

    for (const d of visible) {
      const stamp = d.archived_at || d.sent_at || d.created_at;
      const b = getTimeBucket(stamp);
      let y = years.get(b.yearKey);
      if (!y) { y = { key: b.yearKey, label: b.yearLabel, months: new Map() }; years.set(b.yearKey, y); }
      let m = y.months.get(b.monthKey);
      if (!m) { m = { key: b.monthKey, label: b.monthLabel, weeks: new Map() }; y.months.set(b.monthKey, m); }
      let w = m.weeks.get(b.weekKey);
      if (!w) { w = { key: b.weekKey, label: b.weekLabel, items: [] }; m.weeks.set(b.weekKey, w); }
      w.items.push(d);
    }

    const sortDesc = (a: string, b: string) => (a < b ? 1 : -1);
    return Array.from(years.values())
      .sort((a, b) => sortDesc(a.key, b.key))
      .map((y) => ({
        ...y,
        months: Array.from(y.months.values())
          .sort((a, b) => sortDesc(a.key, b.key))
          .map((m) => ({
            ...m,
            weeks: Array.from(m.weeks.values()).sort((a, b) => sortDesc(a.key, b.key)),
          })),
      }));
  }, [visible, showArchived]);

  const tableFor = (s: SourceTable) => (s === "amazon" ? "amazon_editor_products" : "israel_editor_products");

  async function handleApprove(d: Draft) {
    setActingId(d.id);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from(tableFor(d.source_table))
      .update({ is_active: true, sent_at: nowIso, archived_at: nowIso, archive_reason: "sent" })
      .eq("id", d.id);
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
    setSentIds((prev) => new Set(prev).add(d.id));
    setDrafts((prev) => prev.map((x) =>
      x.id === d.id ? { ...x, is_active: true, sent_at: nowIso, archived_at: nowIso, archive_reason: "sent" } : x,
    ));
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

  async function handleArchiveConfirm(reason: ArchiveReason, notes: string) {
    const d = archiveDialog;
    if (!d) return;
    setActingId(d.id);
    const nowIso = new Date().toISOString();
    const patch: Record<string, any> = {
      is_active: false,
      archived_at: nowIso,
      archive_reason: reason,
    };
    if (notes) {
      // Append to existing notes rather than overwrite.
      const existing = (d.audit_notes ?? "").trim();
      patch.audit_notes = existing ? `${existing}\n\n[ארכיון] ${notes}` : `[ארכיון] ${notes}`;
    }
    const { error } = await supabase.from(tableFor(d.source_table)).update(patch).eq("id", d.id);
    if (error) {
      toast.error("שגיאה: " + error.message);
    } else {
      toast.success("הועבר לארכיון");
      setDrafts((prev) => prev.map((x) =>
        x.id === d.id ? { ...x, ...patch } : x,
      ));
      setArchiveDialog(null);
    }
    setActingId(null);
  }

  async function handleRestore(d: Draft) {
    setActingId(d.id);
    const { error } = await supabase
      .from(tableFor(d.source_table))
      .update({ archived_at: null, archive_reason: null, sent_at: null })
      .eq("id", d.id);
    if (error) {
      toast.error("שגיאה: " + error.message);
    } else {
      toast.success("שוחזר");
      setDrafts((prev) => prev.map((x) =>
        x.id === d.id ? { ...x, archived_at: null, archive_reason: null, sent_at: null } : x,
      ));
    }
    setActingId(null);
  }

  function startEdit(d: Draft) {
    setEditingId(d.id);
    setEditedText(d.audit_notes ?? "");
    setExpanded((s) => ({ ...s, [d.id]: true }));
  }

  function cancelEdit() {
    setEditingId(null);
    setEditedText("");
  }

  async function saveEdit(d: Draft) {
    setSavingId(d.id);
    const { error } = await supabase
      .from(tableFor(d.source_table))
      .update({ audit_notes: editedText })
      .eq("id", d.id);
    if (error) {
      toast.error("שגיאה בשמירה: " + error.message);
    } else {
      setDrafts((prev) => prev.map((x) => (x.id === d.id ? { ...x, audit_notes: editedText } : x)));
      toast.success("הטקסט נשמר");
      setEditingId(null);
      setEditedText("");
    }
    setSavingId(null);
  }


  function scrollToDay(key: string) {
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const REASON_TABS: { value: ReasonFilter; label: string }[] = [
    { value: "all", label: "הכל" },
    { value: "sent", label: "נשלח" },
    { value: "wording", label: "ניסוח" },
    { value: "price", label: "מחיר" },
    { value: "image", label: "תמונה" },
    { value: "other", label: "אחר" },
  ];

  const renderCard = (d: Draft) => {
    const isOpen = !!expanded[d.id];
    const hasNotes = !!(d.audit_notes && d.audit_notes.trim());
    const platform = detectPlatform(d);
    const isSent = sentIds.has(d.id) || d.is_active === true;
    const reasonKey = d.archive_reason ?? "";
    const reasonLabel = ARCHIVE_REASON_LABELS[reasonKey];
    const isSentArchive = showArchived && reasonKey === "sent";
    return (
      <Card
        key={d.id}
        className={`overflow-hidden flex flex-col p-2.5 gap-2 ${
          isSentArchive ? "border-green-500/40" : (isSent && !showArchived ? "border-green-500/40" : "")
        } ${showArchived && reasonKey && reasonKey !== "sent" ? "border-red-400/40" : ""}`}
      >
        <div className="flex gap-2.5">
          <div className="relative w-20 h-20 shrink-0 rounded-md overflow-hidden bg-muted">
            {d.image_url ? (
              <img src={d.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">אין תמונה</div>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm line-clamp-2 leading-snug flex-1">
                {d.product_name_hebrew || d.product_name_english || "ללא שם"}
              </h3>
              {showArchived && reasonLabel ? (
                <Badge
                  className={`text-[10px] px-1.5 py-0 shrink-0 ${
                    reasonKey === "sent"
                      ? "bg-green-600 hover:bg-green-600 text-white"
                      : "bg-red-100 text-red-700 hover:bg-red-100"
                  }`}
                >
                  {reasonKey === "sent" && <CheckCircle2 className="h-3 w-3 ml-1" />}
                  {reasonLabel}
                </Badge>
              ) : isSent ? (
                <Badge className="bg-green-600 hover:bg-green-600 text-white text-[10px] px-1.5 py-0 shrink-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  נשלח
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-1 flex-wrap text-xs">
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

        <Button
          size="sm"
          variant="ghost"
          className="w-full justify-between h-7 text-xs"
          onClick={() => setExpanded((s) => ({ ...s, [d.id]: !s[d.id] }))}
          disabled={!hasNotes}
        >
          <span>{!hasNotes ? "אין פוסט" : isOpen ? "הסתר פוסט" : "הצג פוסט מלא"}</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {isOpen && hasNotes && editingId !== d.id && (
          <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded p-2 font-sans leading-relaxed max-h-[28rem] overflow-auto">
            {d.audit_notes}
          </pre>
        )}
        {editingId === d.id && (
          <div className="flex flex-col gap-1.5">
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="text-xs font-sans leading-relaxed min-h-[16rem] max-h-[32rem]"
              dir="rtl"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" className="h-9" onClick={() => saveEdit(d)} disabled={savingId === d.id}>
                <Save className="h-4 w-4 ml-1" />
                שמור
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={cancelEdit} disabled={savingId === d.id}>
                <X className="h-4 w-4 ml-1" />
                בטל
              </Button>
            </div>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-1.5">
          {!showArchived ? (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  size="sm"
                  className="h-9"
                  onClick={() => handleApprove(d)}
                  disabled={actingId === d.id || isSent || editingId === d.id}
                  variant={isSent ? "secondary" : "default"}
                >
                  {isSent ? (
                    <><CheckCircle2 className="h-4 w-4 ml-1" />נשלח</>
                  ) : (
                    <><Send className="h-4 w-4 ml-1" />אישור ושליחה</>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => d.tracking_link && window.open(d.tracking_link, "_blank", "noopener,noreferrer")}
                  disabled={!d.tracking_link}
                >
                  <ExternalLink className="h-4 w-4 ml-1" />
                  צפה במוצר
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <Button size="sm" variant="secondary" className="h-9" onClick={() => handleCopy(d)}>
                  <Copy className="h-4 w-4 ml-1" />
                  וואטסאפ
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9"
                  onClick={() => startEdit(d)}
                  disabled={actingId === d.id || editingId === d.id}
                  title="ערוך את טקסט הפוסט לפני שליחה"
                >
                  <Pencil className="h-4 w-4 ml-1" />
                  ערוך
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="h-9"
                  onClick={() => setArchiveDialog(d)}
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
              onClick={() => handleRestore(d)}
              disabled={actingId === d.id}
            >
              <RotateCcw className="h-4 w-4 ml-2" />
              שחזור
            </Button>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* KPI */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm text-muted-foreground">Hands-Free Index — היום</div>
            <div className="text-3xl font-bold">
              הודעות שנשלחו: {sentToday} <span className="text-base font-normal text-muted-foreground">/ {draftsToday}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              דאטה בייס: היום נכנסו {draftsToday} מתוך {HANDS_FREE_DAILY_TARGET}
            </div>
            <div className="text-xs text-muted-foreground">
              השבוע: {draftsThisWeek} / {HANDS_FREE_DAILY_TARGET * 6} • ממתינות: {pendingCount}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענון
          </Button>
        </div>
        <Progress className="mt-3" value={draftsToday > 0 ? Math.min(100, (sentToday / draftsToday) * 100) : 0} />
      </Card>

      {/* Filters */}
      <Card className="p-3 space-y-2">
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

        {showArchived && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {REASON_TABS.map((t) => (
              <Button
                key={t.value}
                size="sm"
                variant={reasonFilter === t.value ? "default" : "outline"}
                className="h-7 text-xs"
                onClick={() => setReasonFilter(t.value)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        )}
      </Card>

      {/* Day quick-nav (active view only) */}
      {!loading && !showArchived && navCubes.length > 1 && (
        <Card className="p-2">
          <div className="flex gap-1.5 overflow-x-auto">
            {navCubes.map((g) => (
              <Button
                key={g.key}
                size="sm"
                variant="outline"
                className="shrink-0 h-8 text-xs"
                onClick={() => scrollToDay(g.scrollKey)}
              >
                {g.short}
                <Badge variant="secondary" className="mr-1.5 text-[10px] px-1.5 py-0">{g.count}</Badge>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">טוען...</div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          אין טיוטות {showArchived ? "בארכיון" : "ממתינות"}. ה-Scout יזרים פריטים אוטומטית.
        </Card>
      ) : showArchived ? (
        <div className="space-y-6">
          {archiveTree.map((year) => (
            <section key={year.key} className="space-y-3">
              <h2 className="text-xl font-bold border-b pb-1">{year.label}</h2>
              {year.months.map((month) => (
                <div key={month.key} className="space-y-2 pr-2">
                  <h3 className="text-base font-semibold text-muted-foreground">{month.label}</h3>
                  {month.weeks.map((week) => (
                    <div key={week.key} className="space-y-2 pr-3">
                      <div className="flex items-center gap-2 sticky top-0 bg-background/95 backdrop-blur z-10 py-1.5">
                        <h4 className="text-sm font-medium">{week.label}</h4>
                        <Badge variant="secondary" className="text-[10px]">{week.items.length}</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {week.items.map(renderCard)}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {dayGroups.map((group) => (
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
                {group.items.map(renderCard)}
              </div>
            </section>
          ))}
        </div>
      )}

      <ArchiveReasonDialog
        open={!!archiveDialog}
        onOpenChange={(open) => { if (!open) setArchiveDialog(null); }}
        onConfirm={handleArchiveConfirm}
        loading={!!actingId && !!archiveDialog && actingId === archiveDialog.id}
      />
    </div>
  );
}
