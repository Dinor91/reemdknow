import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid, Legend } from "recharts";
import { AlertTriangle, Save, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";

interface GrowthRow {
  id: string;
  recorded_at: string;
  instagram_followers: number | null;
  whatsapp_members: number | null;
  telegram_members: number | null;
}

const GOALS = { instagram: 10000, community: 1000 };

const IG_COLOR = "hsl(330, 75%, 55%)";
const COMM_COLOR = "hsl(180, 60%, 45%)";
const WA_COLOR = "hsl(142, 60%, 45%)";
const TG_COLOR = "hsl(210, 80%, 55%)";

const fmt = (n: number) => n.toLocaleString("he-IL");

const igConfig = {
  instagram: { label: "אינסטגרם", color: IG_COLOR },
};
const commConfig = {
  community: { label: "סך קהילה", color: COMM_COLOR },
  whatsapp: { label: "וואטסאפ", color: WA_COLOR },
  telegram: { label: "טלגרם", color: TG_COLOR },
};

function Delta({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null || previous === undefined) return null;
  const diff = current - previous;
  if (diff === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" /> ללא שינוי
      </span>
    );
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  const cls = diff > 0 ? "text-emerald-600" : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${cls}`}>
      <Icon className="h-3 w-3" />
      {diff > 0 ? "+" : ""}
      {fmt(diff)}
    </span>
  );
}

function ProgressRing({ current, goal, color, size = 96 }: { current: number; goal: number; color: string; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, (current / goal) * 100);
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-lg font-bold tabular-nums leading-none">{Math.round(pct)}%</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">מהיעד</div>
      </div>
    </div>
  );
}

function KpiHeader({
  title,
  current,
  previous,
  goal,
  color,
}: {
  title: string;
  current: number;
  previous: number | null;
  goal: number;
  color: string;
}) {
  const remaining = Math.max(0, goal - current);
  return (
    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
      <div>
        <div className="text-sm text-muted-foreground">{title}</div>
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold tabular-nums" style={{ color }}>{fmt(current)}</div>
          <div className="text-sm text-muted-foreground">מתוך {fmt(goal)}</div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <Delta current={current} previous={previous} />
          {remaining > 0 && (
            <span className="text-xs text-muted-foreground">נותרו {fmt(remaining)}</span>
          )}
        </div>
      </div>
      <ProgressRing current={current} goal={goal} color={color} />
    </div>
  );
}

export function GrowthTab() {
  const [rows, setRows] = useState<GrowthRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ instagram: "", whatsapp: "", telegram: "" });
  const [lastRevenueAt, setLastRevenueAt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [g, r] = await Promise.all([
      supabase.from("growth_metrics").select("*").order("recorded_at", { ascending: true }).limit(200),
      supabase.from("revenue_uploads").select("uploaded_at").order("uploaded_at", { ascending: false }).limit(1),
    ]);
    if (g.data) {
      setRows(g.data as any);
      const last = g.data[g.data.length - 1] as any;
      if (last) {
        setForm({
          instagram: String(last.instagram_followers ?? ""),
          whatsapp: String(last.whatsapp_members ?? ""),
          telegram: String(last.telegram_members ?? ""),
        });
      }
    }
    if (r.data && r.data[0]) setLastRevenueAt((r.data[0] as any).uploaded_at);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  const lastUpdate = rows[rows.length - 1]?.recorded_at ?? null;
  const daysSince = useMemo(() => {
    const candidates = [lastUpdate, lastRevenueAt].filter(Boolean) as string[];
    if (!candidates.length) return Infinity;
    const newest = Math.max(...candidates.map((d) => new Date(d).getTime()));
    return Math.floor((Date.now() - newest) / (24 * 60 * 60 * 1000));
  }, [lastUpdate, lastRevenueAt]);

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        date: format(new Date(r.recorded_at), "dd/MM"),
        instagram: r.instagram_followers ?? 0,
        whatsapp: r.whatsapp_members ?? 0,
        telegram: r.telegram_members ?? 0,
        community: (r.whatsapp_members ?? 0) + (r.telegram_members ?? 0),
      })),
    [rows]
  );

  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const igNow = last?.instagram_followers ?? 0;
  const igPrev = prev ? prev.instagram_followers ?? 0 : null;
  const commNow = (last?.whatsapp_members ?? 0) + (last?.telegram_members ?? 0);
  const commPrev = prev ? (prev.whatsapp_members ?? 0) + (prev.telegram_members ?? 0) : null;

  const xInterval = chartData.length > 10 ? Math.ceil(chartData.length / 8) : 0;

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("growth_metrics").insert({
      instagram_followers: form.instagram ? parseInt(form.instagram) : null,
      whatsapp_members: form.whatsapp ? parseInt(form.whatsapp) : null,
      telegram_members: form.telegram ? parseInt(form.telegram) : null,
    });
    if (error) toast.error("שגיאה: " + error.message);
    else {
      toast.success("נשמר");
      load();
    }
    setSaving(false);
  }

  const renderEmpty = () => (
    <div className="text-center text-muted-foreground py-8">הזן נתונים ראשונים כדי לראות גרף.</div>
  );

  const renderSinglePoint = (value: number, goal: number) => (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-5xl font-bold">{fmt(value)}</div>
      <div className="text-sm text-muted-foreground mt-1">יעד: {fmt(goal)} — נדרשת עוד מדידה כדי לראות מגמה</div>
    </div>
  );

  return (
    <div className="space-y-4" dir="rtl">
      {daysSince > 7 && (
        <Card className="p-4 border-destructive bg-destructive/10">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0" />
            <div>
              <div className="font-bold text-destructive">נדרש עדכון שבועי</div>
              <div className="text-sm text-muted-foreground">
                {daysSince === Infinity ? "אין נתונים עדיין" : `${daysSince} ימים מאז העדכון האחרון`}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-bold mb-3">עדכון מהיר — נתוני קהילה</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label>אינסטגרם</Label>
            <Input
              type="number"
              value={form.instagram}
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
              placeholder="עוקבים"
            />
          </div>
          <div>
            <Label>וואטסאפ</Label>
            <Input
              type="number"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="חברים"
            />
          </div>
          <div>
            <Label>טלגרם</Label>
            <Input
              type="number"
              value={form.telegram}
              onChange={(e) => setForm({ ...form, telegram: e.target.value })}
              placeholder="חברים"
            />
          </div>
        </div>
        <Button className="mt-3 w-full sm:w-auto min-h-[44px]" onClick={save} disabled={saving}>
          <Save className="h-4 w-4 ml-2" />
          שמור
        </Button>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Instagram */}
        <Card className="p-4">
          <KpiHeader title="אינסטגרם — עוקבים" current={igNow} previous={igPrev} goal={GOALS.instagram} />
          {loading ? (
            <div className="text-center text-muted-foreground py-8">טוען...</div>
          ) : chartData.length === 0 ? (
            renderEmpty()
          ) : chartData.length === 1 ? (
            renderSinglePoint(igNow, GOALS.instagram)
          ) : (
            <ChartContainer config={igConfig} className="h-[240px] w-full">
              <AreaChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="igFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={IG_COLOR} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={IG_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="date" interval={xInterval} fontSize={11} />
                <YAxis
                  domain={[0, Math.max(GOALS.instagram * 1.1, igNow * 1.15)]}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
                  fontSize={11}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ReferenceLine
                  y={GOALS.instagram}
                  stroke={IG_COLOR}
                  strokeDasharray="5 5"
                  label={{ value: `יעד ${fmt(GOALS.instagram)}`, fontSize: 10, fill: IG_COLOR, position: "insideTopRight" }}
                />
                <Area
                  type="monotone"
                  dataKey="instagram"
                  stroke={IG_COLOR}
                  strokeWidth={2.5}
                  fill="url(#igFill)"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </Card>

        {/* Community */}
        <Card className="p-4">
          <KpiHeader title="קהילה — וואטסאפ + טלגרם" current={commNow} previous={commPrev} goal={GOALS.community} />
          <div className="flex gap-4 text-xs text-muted-foreground -mt-2 mb-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: WA_COLOR }} />
              וואטסאפ: <strong className="text-foreground">{fmt(last?.whatsapp_members ?? 0)}</strong>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: TG_COLOR }} />
              טלגרם: <strong className="text-foreground">{fmt(last?.telegram_members ?? 0)}</strong>
            </span>
          </div>
          {loading ? (
            <div className="text-center text-muted-foreground py-8">טוען...</div>
          ) : chartData.length === 0 ? (
            renderEmpty()
          ) : chartData.length === 1 ? (
            renderSinglePoint(commNow, GOALS.community)
          ) : (
            <ChartContainer config={commConfig} className="h-[240px] w-full">
              <LineChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="date" interval={xInterval} fontSize={11} />
                <YAxis
                  domain={[0, Math.max(GOALS.community * 1.1, commNow * 1.15)]}
                  tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
                  fontSize={11}
                  width={40}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine
                  y={GOALS.community}
                  stroke={COMM_COLOR}
                  strokeDasharray="5 5"
                  label={{ value: `יעד ${fmt(GOALS.community)}`, fontSize: 10, fill: COMM_COLOR, position: "insideTopRight" }}
                />
                <Line
                  type="monotone"
                  dataKey="community"
                  name="סך קהילה"
                  stroke={COMM_COLOR}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="whatsapp"
                  name="וואטסאפ"
                  stroke={WA_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="telegram"
                  name="טלגרם"
                  stroke={TG_COLOR}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
