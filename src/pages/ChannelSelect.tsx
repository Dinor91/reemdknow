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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" style={{ background: 'linear-gradient(180deg, hsl(38 30% 97%) 0%, hsl(38 25% 95%) 50%, hsl(210 20% 96%) 100%)' }}>
      <FacebookPixel />

      <div className="max-w-md w-full space-y-6">
        
        {/* Hero: Avatar + Name */}
        <div className="text-center space-y-3">
          <img 
            src={logo} 
            alt="ראם (D)Know" 
            className="w-28 h-28 mx-auto rounded-full shadow-md ring-4 ring-white/80" 
          />
          <div>
            <h1 className="text-2xl font-bold text-foreground">היי, אני ראם</h1>
            <p className="text-base text-muted-foreground mt-1">
              נשוי ואבא ל-2, גר בתאילנד
            </p>
          </div>
        </div>

        {/* Key phrase - the emotional anchor */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border text-center">
          <p className="text-xl font-bold text-foreground leading-relaxed">
            אני ממליץ על מוצרים מ-AliExpress ו-KSP
          </p>
          <p className="text-xl font-bold mt-2 text-[hsl(var(--heading))]">
            כמו שהייתי ממליץ למשפחה ולחברים
          </p>
        </div>

        {/* CTA - Above the fold */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="block"
        >
          <Button
            size="lg"
            className="w-full h-14 text-lg font-bold bg-whatsapp hover:bg-whatsapp/90 text-white gap-3 transition-all duration-300 hover:scale-[1.03] animate-pulse-glow shadow-lg rounded-2xl"
          >
            <MessageCircle className="h-6 w-6" />
            הצטרפות לקבוצה
          </Button>
        </a>

        {/* Social proof */}
        <p className="text-center text-sm font-semibold text-muted-foreground">
          <span className="text-[hsl(var(--heading))]">250+ ישראלים</span> כבר בקבוצה
        </p>

        {/* Value props - clean, no icons */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <p className="font-bold text-base text-center text-[hsl(var(--heading))]">מה תקבלו בקבוצה?</p>
          
          <div className="space-y-3 text-base text-foreground">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>המלצה יומית על מוצר שבדקתי אישית</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>קופונים ומבצעים בלעדיים</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>קהילה תומכת</span>
            </div>
          </div>
        </div>

        {/* Anti-spam reassurance */}
        <p className="text-center text-sm text-muted-foreground">
          3-4 הודעות בשבוע בלבד. בלי ספאם. אף פעם.
        </p>



      </div>
    </div>
  );
};

export default ChannelSelect;
