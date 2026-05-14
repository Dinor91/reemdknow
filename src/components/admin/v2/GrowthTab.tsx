import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, ReferenceLine, CartesianGrid, Legend } from "recharts";
import { AlertTriangle, Save } from "lucide-react";
import { format } from "date-fns";

interface GrowthRow {
  id: string;
  recorded_at: string;
  instagram_followers: number | null;
  whatsapp_members: number | null;
  telegram_members: number | null;
}

const GOALS = { instagram: 10000, community: 1000 };

const chartConfig = {
  instagram: { label: "אינסטגרם", color: "hsl(330, 75%, 55%)" },
  community: { label: "קהילה (וואטסאפ+טלגרם)", color: "hsl(180, 60%, 45%)" },
};

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
        community: (r.whatsapp_members ?? 0) + (r.telegram_members ?? 0),
      })),
    [rows]
  );

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

      <Card className="p-4">
        <h3 className="font-bold mb-3">התקדמות מול יעדי אוגוסט 2026</h3>
        {loading ? (
          <div className="text-center text-muted-foreground py-8">טוען...</div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">הזן נתונים ראשונים כדי לראות גרף.</div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[260px] w-full">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
              <ReferenceLine y={GOALS.instagram} stroke="hsl(330, 75%, 55%)" strokeDasharray="5 5" label="יעד IG" />
              <ReferenceLine y={GOALS.community} stroke="hsl(180, 60%, 45%)" strokeDasharray="5 5" label="יעד קהילה" />
              <Line type="monotone" dataKey="instagram" stroke="hsl(330, 75%, 55%)" strokeWidth={2} />
              <Line type="monotone" dataKey="community" stroke="hsl(180, 60%, 45%)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        )}
      </Card>
    </div>
  );
}
