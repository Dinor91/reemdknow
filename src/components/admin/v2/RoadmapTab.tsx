import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save, Target } from "lucide-react";

interface MilestoneProps {
  title: string;
  current: number;
  target: number;
  unit?: string;
}
function Milestone({ title, current, target, unit = "" }: MilestoneProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground">{pct}%</div>
      </div>
      <Progress value={pct} />
      <div className="text-xs text-muted-foreground mt-2">
        {current.toLocaleString()}{unit} / {target.toLocaleString()}{unit}
      </div>
    </Card>
  );
}

export function RoadmapTab() {
  const [stats, setStats] = useState({ ig: 0, community: 0, revenue: 0, automationPct: 0, editMin: 0 });
  const [editTimeInput, setEditTimeInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [growth, revenue, scoutCount, totalCount, edit] = await Promise.all([
      supabase.from("growth_metrics").select("*").order("recorded_at", { ascending: false }).limit(1),
      supabase
        .from("revenue_uploads")
        .select("gross_revenue_ils, uploaded_at")
        .gte("uploaded_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("israel_editor_products")
        .select("id", { count: "exact", head: true })
        .eq("source", "scout_v2")
        .eq("is_active", true)
        .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase
        .from("israel_editor_products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true)
        .gte("updated_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("roadmap_metrics").select("*").eq("key", "edit_time_minutes").maybeSingle(),
    ]);
    const g = (growth.data?.[0] as any) ?? {};
    const ig = g.instagram_followers ?? 0;
    const community = (g.whatsapp_members ?? 0) + (g.telegram_members ?? 0);
    const rev = (revenue.data ?? []).reduce((s: number, r: any) => s + Number(r.gross_revenue_ils ?? 0), 0);
    const scout = scoutCount.count ?? 0;
    const total = totalCount.count ?? 0;
    const automationPct = total > 0 ? Math.round((scout / total) * 100) : 0;
    const editMin = (edit.data as any)?.value ?? 0;
    setStats({ ig, community, revenue: Math.round(rev), automationPct, editMin });
    setEditTimeInput(String(editMin || ""));
  }
  useEffect(() => {
    load();
  }, []);

  async function saveEditTime() {
    setSaving(true);
    const value = parseFloat(editTimeInput) || 0;
    const { error } = await supabase
      .from("roadmap_metrics")
      .upsert({ key: "edit_time_minutes", value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("נשמר");
    setSaving(false);
  }

  const automationGoal = 95;
  const editTimeGoal = 2;

  return (
    <div className="space-y-4" dir="rtl">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="font-bold">יעדי V2.0</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">95% אוטומציה</div>
            <div className="text-3xl font-bold mt-1">{stats.automationPct}%</div>
            <Progress className="mt-2" value={Math.min(100, (stats.automationPct / automationGoal) * 100)} />
            <div className="text-xs text-muted-foreground mt-2">
              מתוך פריטים פעילים שאושרו ב-30 הימים האחרונים
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">זמן עריכה ממוצע (דקות)</div>
            <div className="text-3xl font-bold mt-1">{stats.editMin || "—"}</div>
            <Progress
              className="mt-2"
              value={stats.editMin ? Math.min(100, (editTimeGoal / Math.max(stats.editMin, 0.1)) * 100) : 0}
            />
            <div className="text-xs text-muted-foreground mt-2">יעד: ≤ {editTimeGoal} דקות</div>
            <div className="flex gap-2 mt-3">
              <Input
                type="number"
                step="0.1"
                value={editTimeInput}
                onChange={(e) => setEditTimeInput(e.target.value)}
                placeholder="עדכן זמן..."
              />
              <Button onClick={saveEditTime} disabled={saving} size="sm" className="min-h-[44px]">
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="font-bold mb-3">נקודות ציון — אוגוסט 2026</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Milestone title="עוקבי אינסטגרם" current={stats.ig} target={10000} />
          <Milestone title="קהילה (וואטסאפ+טלגרם)" current={stats.community} target={1000} />
          <Milestone title="הכנסה חודשית (₪)" current={stats.revenue} target={20000} unit="" />
        </div>
      </Card>
    </div>
  );
}
