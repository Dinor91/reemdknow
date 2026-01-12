import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ClickData {
  id: string;
  button_type: string;
  source: string | null;
  created_at: string;
}

interface ClickStats {
  total: number;
  whatsapp: number;
  telegram: number;
  bySource: Record<string, { whatsapp: number; telegram: number }>;
  byDay: { date: string; whatsapp: number; telegram: number; total: number }[];
}

const chartConfig = {
  whatsapp: {
    label: "WhatsApp",
    color: "hsl(142, 70%, 45%)",
  },
  telegram: {
    label: "Telegram",
    color: "hsl(200, 100%, 50%)",
  },
};

const Admin = () => {
  const [allClicks, setAllClicks] = useState<ClickData[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setDate(date.getDate() - 13);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const fetchClicks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("button_clicks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAllClicks(data || []);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo<ClickStats | null>(() => {
    if (allClicks.length === 0 && !loading) {
      return {
        total: 0,
        whatsapp: 0,
        telegram: 0,
        bySource: {},
        byDay: [],
      };
    }
    if (allClicks.length === 0) return null;

    const startOfDay = new Date(startDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);

    const filteredClicks = allClicks.filter((click) => {
      const clickDate = new Date(click.created_at);
      return clickDate >= startOfDay && clickDate <= endOfDay;
    });

    const bySource: Record<string, { whatsapp: number; telegram: number }> = {};
    const byDayMap: Record<string, { whatsapp: number; telegram: number }> = {};

    // Initialize all days in range
    const current = new Date(startOfDay);
    while (current <= endOfDay) {
      const dateStr = current.toISOString().split("T")[0];
      byDayMap[dateStr] = { whatsapp: 0, telegram: 0 };
      current.setDate(current.getDate() + 1);
    }

    filteredClicks.forEach((click) => {
      const source = click.source || "unknown";
      if (!bySource[source]) {
        bySource[source] = { whatsapp: 0, telegram: 0 };
      }
      if (click.button_type === "whatsapp") {
        bySource[source].whatsapp++;
      } else {
        bySource[source].telegram++;
      }

      const clickDate = new Date(click.created_at).toISOString().split("T")[0];
      if (byDayMap[clickDate]) {
        if (click.button_type === "whatsapp") {
          byDayMap[clickDate].whatsapp++;
        } else {
          byDayMap[clickDate].telegram++;
        }
      }
    });

    const byDay = Object.entries(byDayMap).map(([date, counts]) => ({
      date: new Date(date).toLocaleDateString("he-IL", {
        day: "2-digit",
        month: "2-digit",
      }),
      whatsapp: counts.whatsapp,
      telegram: counts.telegram,
      total: counts.whatsapp + counts.telegram,
    }));

    return {
      total: filteredClicks.length,
      whatsapp: filteredClicks.filter((c) => c.button_type === "whatsapp").length,
      telegram: filteredClicks.filter((c) => c.button_type === "telegram").length,
      bySource,
      byDay,
    };
  }, [allClicks, startDate, endDate, loading]);

  useEffect(() => {
    fetchClicks();
  }, []);

  return (
    <div className="min-h-screen bg-background p-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">סטטיסטיקות קליקים</h1>
            {user && (
              <span className="text-sm text-muted-foreground">({user.email})</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchClicks} disabled={loading} variant="outline">
              <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
              רענן
            </Button>
            <Button onClick={handleSignOut} variant="outline">
              <LogOut className="h-4 w-4 ml-2" />
              התנתק
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-medium">טווח תאריכים:</span>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-right">
                    <Calendar className="ml-2 h-4 w-4" />
                    {format(startDate, "dd/MM/yyyy", { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span>עד</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-right">
                    <Calendar className="ml-2 h-4 w-4" />
                    {format(endDate, "dd/MM/yyyy", { locale: he })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-background" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </Card>

        {loading && !stats ? (
          <p className="text-muted-foreground">טוען...</p>
        ) : stats ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            </div>

            {/* Clicks Chart */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">קליקים לפי ימים</h2>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={stats.byDay} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="whatsapp"
                    fill="var(--color-whatsapp)"
                    radius={[4, 4, 0, 0]}
                    stackId="stack"
                  />
                  <Bar
                    dataKey="telegram"
                    fill="var(--color-telegram)"
                    radius={[4, 4, 0, 0]}
                    stackId="stack"
                  />
                </BarChart>
              </ChartContainer>
            </Card>

            {/* By Source */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">לפי מקור</h2>
              <div className="space-y-3">
                {Object.entries(stats.bySource).length > 0 ? (
                  Object.entries(stats.bySource).map(([source, counts]) => (
                    <div key={source} className="flex items-center justify-between border-b pb-2">
                      <span className="font-medium">{source}</span>
                      <div className="flex gap-4">
                        <span className="text-green-600">WA: {counts.whatsapp}</span>
                        <span className="text-blue-500">TG: {counts.telegram}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">אין נתונים בטווח הנבחר</p>
                )}
              </div>
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
