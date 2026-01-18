import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, CheckCircle } from "lucide-react";

const Requests = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    request_text: "",
    platform: "lazada",
    location: "thailand"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.request_text) {
      toast.error("נא למלא את כל השדות הנדרשים");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('contact_requests')
        .insert({
          email: formData.email,
          phone: formData.phone || null,
          request_text: formData.request_text,
          platform: formData.platform,
          location: formData.location
        });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("הבקשה נשלחה בהצלחה!");
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error("שגיאה בשליחת הבקשה, נסו שוב");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-24 pb-12">
        <div className="text-center max-w-md mx-auto px-4 relative z-0">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              הבקשה נשלחה בהצלחה! 🎉
            </h1>
            <p className="text-muted-foreground mb-6">
              קיבלנו את הבקשה שלך ונחזור אליך בהקדם עם המלצות מותאמות אישית.
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => navigate('/thailand')} variant="outline">
                חזרה לתאילנד
              </Button>
              <Button onClick={() => navigate('/israel')}>
                לדף ישראל
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      <Header />
      <main className="flex-1 pt-24 pb-8 md:pt-28 md:pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8 relative z-0">
              <h1 className="text-3xl font-bold text-foreground mb-3">
                📝 שלחו לנו בקשה
              </h1>
              <p className="text-lg text-muted-foreground">
                מחפשים מוצר ספציפי? ספרו לנו ונמצא לכם את הדיל הכי טוב!
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">
                  📧 אימייל <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="text-base py-5"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  נשלח לך תשובה + עדכונים על דילים חמים
                </p>
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">
                  📱 טלפון (אופציונלי)
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="05X-XXX-XXXX"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="text-base py-5"
                  dir="ltr"
                />
                <p className="text-xs text-muted-foreground">
                  לתקשורת מהירה בווטסאפ
                </p>
              </div>

              {/* Request Text */}
              <div className="space-y-2">
                <Label htmlFor="request" className="text-base">
                  🛒 מה אתם מחפשים? <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="request"
                  placeholder="למשל: מחפש שואב אבק רובוטי עד 3000 בט, או אוזניות בלוטות' איכותיות..."
                  value={formData.request_text}
                  onChange={(e) => setFormData({ ...formData, request_text: e.target.value })}
                  required
                  className="min-h-[120px] text-base"
                />
              </div>

              {/* Platform */}
              <div className="space-y-3">
                <Label className="text-base">🏪 מאיפה להביא?</Label>
                <RadioGroup
                  value={formData.platform}
                  onValueChange={(value) => setFormData({ ...formData, platform: value })}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="lazada" id="lazada" />
                    <Label htmlFor="lazada" className="cursor-pointer">Lazada</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="aliexpress" id="aliexpress" />
                    <Label htmlFor="aliexpress" className="cursor-pointer">AliExpress</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="cursor-pointer">לא משנה / אחר</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label className="text-base">🌍 לאן המשלוח?</Label>
                <RadioGroup
                  value={formData.location}
                  onValueChange={(value) => setFormData({ ...formData, location: value })}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="thailand" id="thailand" />
                    <Label htmlFor="thailand" className="cursor-pointer">🇹🇭 תאילנד</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <RadioGroupItem value="israel" id="israel" />
                    <Label htmlFor="israel" className="cursor-pointer">🇮🇱 ישראל</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Submit */}
              <Button 
                type="submit" 
                className="w-full py-6 text-lg bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "שולח..."
                ) : (
                  <>
                    <Send className="w-5 h-5 ml-2" />
                    שלח בקשה
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                הפרטים שלכם מאובטחים ולא יועברו לצד שלישי
              </p>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Requests;
