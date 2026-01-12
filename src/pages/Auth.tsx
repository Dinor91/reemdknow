import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  password: z.string().min(6, "הסיסמה חייבת להכיל לפחות 6 תווים"),
});

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if this is a password recovery flow
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setIsPasswordRecovery(true);
    }
  }, []);

  useEffect(() => {
    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Only redirect to admin if user is logged in AND not in password recovery mode
    if (user && !isPasswordRecovery) {
      navigate("/admin");
    }
  }, [user, navigate, isPasswordRecovery]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (password.length < 6) {
      toast.error("הסיסמה חייבת להכיל לפחות 6 תווים");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("הסיסמאות לא תואמות");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("הסיסמה עודכנה בהצלחה!");
        setIsPasswordRecovery(false);
        // Clear the hash from URL
        window.history.replaceState(null, "", window.location.pathname);
        navigate("/admin");
      }
    } catch (err) {
      toast.error("אירעה שגיאה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email) {
      toast.error("נא להזין כתובת אימייל");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("נשלח אליך מייל לאיפוס הסיסמה!");
        setIsForgotPassword(false);
      }
    } catch (err) {
      toast.error("אירעה שגיאה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validate input
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast.error("פרטי התחברות שגויים");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("התחברת בהצלחה!");
          navigate("/admin");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast.error("משתמש כבר קיים במערכת");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("נרשמת בהצלחה! כעת תוכל להתחבר.");
          setIsLogin(true);
        }
      }
    } catch (err) {
      toast.error("אירעה שגיאה. נסה שוב.");
    } finally {
      setLoading(false);
    }
  };

  // Password recovery form - shown when user clicks reset link from email
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">הגדרת סיסמה חדשה</CardTitle>
            <CardDescription>
              הזן את הסיסמה החדשה שלך
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">סיסמה חדשה</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">אימות סיסמה</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "מעדכן..." : "עדכן סיסמה"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">איפוס סיסמה</CardTitle>
            <CardDescription>
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "שולח..." : "שלח קישור לאיפוס"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsForgotPassword(false)}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                חזרה להתחברות
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {isLogin ? "התחברות למערכת" : "הרשמה למערכת"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "הזן את פרטי ההתחברות שלך"
              : "צור חשבון חדש"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">סיסמה</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                dir="ltr"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "טוען..." : isLogin ? "התחבר" : "הירשם"}
            </Button>
          </form>
          <div className="mt-4 text-center space-y-2">
            {isLogin && (
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-foreground underline block w-full"
              >
                שכחתי סיסמה
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {isLogin ? "אין לך חשבון? הירשם" : "יש לך חשבון? התחבר"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
