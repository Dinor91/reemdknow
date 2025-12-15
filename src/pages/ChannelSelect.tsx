import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import logo from "@/assets/dknow-logo.png";

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

      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="ראם (D)Know" className="w-56 h-56 mx-auto rounded-full shadow-lg" />

        <div className="space-y-3">
          <h1 className="text-2xl md:text-3xl font-bold text-[#f28433] leading-tight">היי, אני ראם 👋</h1>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
            Lazada ישראלי שגר בתאילנד, חי את
            <br />
            <span className="font-semibold text-[#41b5b3]">ומשתף אתכם רק במוצרים הכי שווים</span>
            <br />
            <span className="font-semibold text-foreground"> לא מכירים? היכנסו ותקבלו את כל המידע </span>
          </p>
        </div>

        {/* Main CTA - above the fold */}
        <div className="space-y-3 pt-2">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="block"
          >
            <Button
              size="lg"
              className="w-full h-16 text-xl font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-3 transition-all duration-300 hover:scale-105 animate-pulse-glow shadow-xl rounded-xl"
            >
              <MessageCircle className="h-7 w-7" />
              ?רוצה את ההמלצה של היום
            </Button>
          </a>

          <p className="text-sm text-muted-foreground">
            ✅ <span className="font-semibold text-[#41b5b3]">כבר יותר מ-200 ישראלים בחרו להרוויח</span>
          </p>
        </div>

        {/* Secondary option */}
        <div className="pt-2 space-y-2">
          <p className="text-sm text-muted-foreground">מעדיפים טלגרם?</p>
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
              className="w-full h-12 text-base font-semibold border-[#0088cc] text-[#0088cc] hover:bg-[#0088cc] hover:text-white gap-2 transition-all duration-300 rounded-xl"
            >
              <Send className="h-5 w-5" />
              הצטרפות בטלגרם
            </Button>
          </a>
        </div>

        <p className="text-sm md:text-base text-muted-foreground pt-2">אין לי זמן לספאם – יש לי 2 ילדים 😅</p>
      </div>
    </div>
  );
};

export default ChannelSelect;
