import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import logo from "@/assets/logo.jpg";

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "(D)Know - Facebook Dec Camp";
  }, []);

  const whatsappLink = "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j";
  const telegramLink = "https://t.me/+wJIFEYTlOuUzZjBk";

  const handleWhatsAppClick = () => {
    trackEvent("click_whatsapp", {
      event_category: "engagement",
      event_label: "WhatsApp Community Join",
      source: "join_campaign",
    });
    trackFBLead("channel_select_whatsapp");
  };

  const handleTelegramClick = () => {
    trackEvent("click_telegram", {
      event_category: "engagement",
      event_label: "Telegram Community Join",
      source: "join_campaign",
    });
    trackFBLead("channel_select_telegram");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FacebookPixel />

      <div className="max-w-md w-full text-center space-y-5">
        {/* Logo - bigger */}
        <img src={logo} alt="ראם (D)Know" className="w-36 h-36 mx-auto rounded-full shadow-lg" />

        {/* Hook */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground leading-tight">?טסים לתאילנד</h1>
          <p className="text-xl font-bold text-[#f28433]">אל תשלמו מחירי תיירים 💸</p>
        </div>

        {/* Personal intro - shorter and black */}
        <p className="text-lg text-foreground">אני ראם, גר בתאילנד וכל יום אני מוצא מוצרים שחוסכים לכם כסף</p>

        <p className="text-lg text-foreground">?כן, הם יגיעו אליכם למלון</p>

        {/* Value bullets - centered */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2 text-center">
          <p className="font-bold text-[#41b5b3] text-lg">💡 מה תקבלו?</p>
          <p className="text-base">✅ המלצה יומית על מוצר שבדקתי</p>
          <p className="text-base">✅ קופונים ומבצעים</p>
          <p className="text-base">✅ משלוח עד למלון</p>
        </div>

        {/* Social proof */}
        <p className="text-base font-bold text-[#f28433]">🔥 כבר 250+ ישראלים בקבוצה</p>

        {/* Main CTA */}
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
            הצטרפות לקבוצה
          </Button>
        </a>

        {/* Secondary option */}
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

        <p className="text-xs text-muted-foreground">אין לי זמן לספאם – יש לי 2 ילדים 😅</p>
      </div>
    </div>
  );
};

export default ChannelSelect;
