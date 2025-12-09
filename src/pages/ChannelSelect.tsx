import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { useEffect } from "react";
import { MessageCircle, Send } from "lucide-react";
import logo from "@/assets/logo.jpg";

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "Reem(D)Know - בחרו ערוץ";
  }, []);

  const whatsappLink = "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j";
  const telegramLink = "https://t.me/+wJIFEYTlOuUzZjBk";

  const handleWhatsAppClick = () => {
    trackEvent("whatsapp_click", { source: "channel_select" });
    trackFBLead("channel_select_whatsapp");
  };

  const handleTelegramClick = () => {
    trackEvent("telegram_click", { source: "channel_select" });
    trackFBLead("channel_select_telegram");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <FacebookPixel />

      <div className="max-w-md w-full text-center space-y-8">
        <img src={logo} alt="Reem(D)Know" className="w-24 h-24 mx-auto rounded-full shadow-lg" />

        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">!ברוכים הבאים</h1>
          <p className="text-lg text-muted-foreground">?איך תרצו לקבל את ההמלצות הכי שוות</p>
        </div>

        <div className="space-y-4">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleWhatsAppClick}
            className="block"
          >
            <Button
              size="lg"
              className="w-full h-16 text-lg font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <MessageCircle className="h-6 w-6" />
              מעדיף בווטסאפ
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
              className="w-full h-16 text-lg font-bold bg-[#0088cc] hover:bg-[#0077b5] text-white gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg"
            >
              <Send className="h-6 w-6" />
              מעדיף בטלגרם
            </Button>
          </a>
        </div>

        <p className="text-sm text-muted-foreground">!הכנסו עכשיו והתחילו לחסוך כסף !דילים שווים והמלצות אמינות</p>
      </div>
    </div>
  );
};

export default ChannelSelect;
