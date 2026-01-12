import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface ClickStats {
  total: number;
  whatsapp: number;
  telegram: number;
  bySource: Record<string, { whatsapp: number; telegram: number }>;
  today: number;
  thisWeek: number;
}

const Admin = () => {
  const [stats, setStats] = useState<ClickStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("button_clicks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);

      const clicks = data || [];
      
      const bySource: Record<string, { whatsapp: number; telegram: number }> = {};
      
      clicks.forEach((click) => {
        const source = click.source || "unknown";
        if (!bySource[source]) {
          bySource[source] = { whatsapp: 0, telegram: 0 };
        }
        if (click.button_type === "whatsapp") {
          bySource[source].whatsapp++;
        } else {
          bySource[source].telegram++;
        }
      });

      setStats({
        total: clicks.length,
        whatsapp: clicks.filter((c) => c.button_type === "whatsapp").length,
        telegram: clicks.filter((c) => c.button_type === "telegram").length,
        bySource,
        today: clicks.filter((c) => new Date(c.created_at) >= todayStart).length,
        thisWeek: clicks.filter((c) => new Date(c.created_at) >= weekStart).length,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">סטטיסטיקות קליקים</h1>
          <Button onClick={fetchStats} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            רענן
          </Button>
        </div>

        {loading && !stats ? (
          <p className="text-muted-foreground">טוען...</p>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
              <Card className="p-4 text-center">
                <p className="text-sm text-muted-foreground">היום</p>
                <p className="text-3xl font-bold text-foreground">{stats.today}</p>
              </Card>
            </div>

            {/* By Source */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">לפי מקור</h2>
              <div className="space-y-3">
                {Object.entries(stats.bySource).map(([source, counts]) => (
                  <div key={source} className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium">{source}</span>
                    <div className="flex gap-4">
                      <span className="text-green-600">WA: {counts.whatsapp}</span>
                      <span className="text-blue-500">TG: {counts.telegram}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Weekly Summary */}
            <Card className="p-4 text-center">
              <p className="text-sm text-muted-foreground">השבוע האחרון</p>
              <p className="text-3xl font-bold text-foreground">{stats.thisWeek}</p>
            </Card>
          </div>
        ) : (
          <p className="text-red-500">שגיאה בטעינת הנתונים</p>
        )}
      </div>
    </div>
  );
};

export default Admin;
