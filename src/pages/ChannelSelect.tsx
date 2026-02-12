import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4" dir="rtl">
      <FacebookPixel />

      <div className="max-w-md w-full text-center space-y-5">
        {/* Logo */}
        <img src={logo} alt="ראם (D)Know" className="w-32 h-32 mx-auto rounded-full shadow-lg" />

        {/* Hook */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground leading-tight">
            קונים באלי אקספרס?
          </h1>
          <p className="text-xl font-bold" style={{ color: '#f28433' }}>
            יש דרך חכמה יותר
          </p>
        </div>

        {/* Personal intro */}
        <p className="text-lg text-foreground leading-relaxed">
          אני ראם, כל יום אני מוצא לכם מוצרים שווים מ-AliExpress ו-KSP – כמו שהייתי ממליץ למשפחה ולחברים
        </p>

        {/* Value bullets */}
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3 text-center border border-blue-100">
          <p className="font-bold text-lg" style={{ color: '#41b5b3' }}>מה תקבלו?</p>
          <p className="text-base">מוצרים שנבדקו אישית עם דירוג 4.5+ ✅</p>
          <p className="text-base">קופונים והנחות בלעדיות ✅</p>
          <p className="text-base">3-4 המלצות בשבוע, בלי ספאם ✅</p>
        </div>

        {/* Social proof */}
        <p className="text-base font-bold" style={{ color: '#f28433' }}>
          🔥 כבר 250+ ישראלים בקבוצה
        </p>

        {/* Main CTA - WhatsApp */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="block"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-3 transition-all duration-300 hover:scale-105 animate-pulse-glow shadow-xl rounded-xl"
          >
            <MessageCircle className="h-6 w-6" />
            הצטרפות לקבוצה בוואטסאפ
          </Button>
        </a>

        {/* Secondary - Telegram */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">מעדיפים טלגרם?</p>
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

        <p className="text-sm text-muted-foreground">בלי פרסומות. בלי שטויות. רק מה ששווה באמת.</p>
      </div>
    </div>
  );
};

export default ChannelSelect;
