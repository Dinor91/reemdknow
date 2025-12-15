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
      event_category: 'engagement',
      event_label: 'WhatsApp Community Join',
      source: "join_campaign" 
    });
    trackFBLead("channel_select_whatsapp");
  };

  const handleTelegramClick = () => {
    trackEvent("click_telegram", { 
      event_category: 'engagement',
      event_label: 'Telegram Community Join',
      source: "join_campaign" 
    });
    trackFBLead("channel_select_telegram");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <FacebookPixel />

      <div className="max-w-md w-full text-center space-y-6">
        <img src={logo} alt="Reem(D)Know" className="w-28 h-28 mx-auto rounded-full shadow-lg" />

        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            קונים חכם בתאילנד עם
            <br />
            <span className="text-[#41b5b3]">(D)Know</span> 💡
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            המלצות אמיתיות על מוצרים שנבדקו אישית
            <br />
            <span className="text-[#41b5b3] font-semibold">לבית, לילדים, לרכב ולחיים חכמים באמת</span>
          </p>
        </div>

        <div className="space-y-1">
          <p className="text-xl md:text-2xl font-bold text-[#f28433]">?איך תרצו לקבל את ההמלצות</p>
          <p className="text-sm text-muted-foreground">בחרו ערוץ ↓ ההצטרפות לוקחת 3 שניות</p>
        </div>

        <div className="space-y-3">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="block"
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-3 transition-all duration-300 hover:scale-105 animate-pulse-glow shadow-lg rounded-xl"
            >
              <MessageCircle className="h-6 w-6" />
              הצטרפות לקבוצה בוואטסאפ
            </Button>
          </a>

          <a
            href={telegramLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleTelegramClick}
            className="block"
          >
            <Button
              size="lg"
              className="w-full h-14 text-lg font-bold bg-[#0088cc] hover:bg-[#0077b5] text-white gap-3 transition-all duration-300 hover:scale-105 animate-pulse-glow-telegram shadow-lg rounded-xl"
            >
              <Send className="h-6 w-6" />
              הצטרפות לקבוצה בטלגרם
            </Button>
          </a>
        </div>

        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          💬 לא עוד קבוצת ספאם – רק מה שנבדק, נחקר ונשלח מהלב
        </p>
      </div>
    </div>
  );
};

export default ChannelSelect;
