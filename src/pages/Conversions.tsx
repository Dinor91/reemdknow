import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { LogOut, TrendingUp, DollarSign, ShoppingCart, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Conversion {
  id: string;
  conversion_type: string;
  order_id: string | null;
  product_name: string | null;
  commission_amount: number | null;
  order_amount: number | null;
  tracking_id: string | null;
  conversion_time: string;
  created_at: string;
}

export default function Conversions() {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isAdmin) {
        toast.error('אין לך הרשאות לצפות בדף זה');
        navigate('/');
      }
    }
  }, [user, isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchConversions();
    }
  }, [user, isAdmin]);

  const fetchConversions = async () => {
    try {
      const { data, error } = await supabase
        .from('lazada_conversions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConversions(data || []);
    } catch (error) {
      console.error('Error fetching conversions:', error);
      toast.error('שגיאה בטעינת ההמרות');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const totalCommission = conversions.reduce(
    (sum, conv) => sum + (conv.commission_amount || 0),
    0
  );
  const totalOrders = conversions.length;
  const totalRevenue = conversions.reduce(
    (sum, conv) => sum + (conv.order_amount || 0),
    0
  );

  if (authLoading || (user && !isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            התנתק
          </Button>
          <h1 className="text-2xl font-bold">ניהול המרות Lazada</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">סה"כ עמלות</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">
                ฿{totalCommission.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">בהט תאילנדי</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in [animation-delay:100ms]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">סה"כ הזמנות</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">{totalOrders}</div>
              <p className="text-xs text-muted-foreground">המרות כוללות</p>
            </CardContent>
          </Card>

          <Card className="animate-fade-in [animation-delay:200ms]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-sm font-medium">סה"כ מכירות</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-2xl font-bold">
                ฿{totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">ערך הזמנות</p>
            </CardContent>
          </Card>
        </div>

        {/* Conversions Table */}
        <Card className="animate-fade-in [animation-delay:300ms]">
          <CardHeader className="text-right">
            <CardTitle>רשימת המרות</CardTitle>
            <CardDescription>
              כל ההמרות שהתקבלו מ-Lazada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : conversions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                עדיין לא התקבלו המרות
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead className="text-right">Tracking ID</TableHead>
                      <TableHead className="text-right">סכום הזמנה</TableHead>
                      <TableHead className="text-right">עמלה</TableHead>
                      <TableHead className="text-right">מוצר</TableHead>
                      <TableHead className="text-right">מספר הזמנה</TableHead>
                      <TableHead className="text-right">תאריך</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          <Badge variant="outline">{conversion.conversion_type}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {conversion.tracking_id || '-'}
                        </TableCell>
                        <TableCell>
                          ฿{conversion.order_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ฿{conversion.commission_amount?.toFixed(2) || '0.00'}
                        </TableCell>
                        <TableCell>{conversion.product_name || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {conversion.order_id || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(conversion.created_at).toLocaleDateString('he-IL')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
