import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import { MessageCircle, Send, Star, Tag, Users, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.jpg";

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "(D)Know - המלצות חכמות מאלי אקספרס ו-KSP";
  }, []);

  const whatsappLink = "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN";
  const telegramLink = "https://t.me/+Wi46HCt_SbU3YWI0";

  const handleWhatsAppClick = () => {
    trackEvent("click_whatsapp", {
      event_category: "engagement",
      event_label: "WhatsApp Community Join",
      source: "join_israel_landing",
    });
    trackFBLead("join_israel_whatsapp");
    trackButtonClick("whatsapp", "join_israel_landing", "israel");
  };

  const handleTelegramClick = () => {
    trackEvent("click_telegram", {
      event_category: "engagement",
      event_label: "Telegram Community Join",
      source: "join_israel_landing",
    });
    trackFBLead("join_israel_telegram");
    trackButtonClick("telegram", "join_israel_landing", "israel");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-blue-50/30 flex items-center justify-center px-4 py-8" dir="rtl">
      <FacebookPixel />

      <div className="max-w-md w-full space-y-6">
        
        {/* Hero: Avatar + Name + Trust line */}
        <div className="text-center space-y-3">
          <img 
            src={logo} 
            alt="ראם (D)Know" 
            className="w-28 h-28 mx-auto rounded-full shadow-lg ring-4 ring-white" 
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">היי, אני ראם 👋</h1>
            <p className="text-base text-muted-foreground mt-1">
              נשוי ואבא ל-2, גר בתאילנד
            </p>
          </div>
        </div>

        {/* Emotional hook - the key phrase */}
        <div className="relative">
          <div className="bg-white rounded-2xl p-5 shadow-md border border-border text-center">
            <p className="text-xl font-bold text-foreground leading-relaxed">
              אני ממליץ על מוצרים מ-AliExpress ו-KSP
            </p>
            <p className="text-xl font-bold mt-2" style={{ color: '#41b5b3' }}>
              כמו שהייתי ממליץ למשפחה ולחברים
            </p>
          </div>
        </div>

        {/* CTA - Above the fold on mobile */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="block"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-3 transition-all duration-300 hover:scale-[1.03] animate-pulse-glow shadow-xl rounded-2xl"
          >
            <MessageCircle className="h-6 w-6" />
            הצטרפות לקבוצה
          </Button>
        </a>

        {/* Social proof - right under CTA */}
        <p className="text-center text-sm font-semibold text-muted-foreground">
          🔥 <span style={{ color: '#f28433' }}>250+ ישראלים</span> כבר בקבוצה
        </p>

        {/* Value props - visual cards */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#41b5b320' }}>
              <Star className="w-5 h-5" style={{ color: '#41b5b3' }} />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">המלצה יומית על מוצר שבדקתי אישית</p>
              <p className="text-sm text-muted-foreground">רק מוצרים עם דירוג 4.5+ שבאמת שווים</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f2843320' }}>
              <Tag className="w-5 h-5" style={{ color: '#f28433' }} />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">קופונים ומבצעים בלעדיים</p>
              <p className="text-sm text-muted-foreground">הנחות שלא תמצאו לבד</p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm border border-border">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3b82f620' }}>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-bold text-foreground text-base">קהילה תומכת</p>
              <p className="text-sm text-muted-foreground">שואלים, עוזרים, ממליצים אחד לשני</p>
            </div>
          </div>
        </div>

        {/* Objection killer */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span>3-4 הודעות בשבוע בלבד. בלי ספאם. אף פעם.</span>
        </div>

        {/* Telegram secondary */}
        <div className="space-y-2 pt-1">
          <p className="text-center text-xs text-muted-foreground">מעדיפים טלגרם?</p>
          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTelegramClick}
            className="block"
          >
            <Button
              size="lg"
              variant="outline"
              className="w-full h-10 text-sm font-semibold border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc] hover:text-white gap-2 transition-all duration-300 rounded-xl"
            >
              <Send className="h-4 w-4" />
              הצטרפות בטלגרם
            </Button>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ChannelSelect;
