import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import logo from "@/assets/dknow-logo.png";

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "(D)Know - המלצות חכמות מאלי אקספרס ו-KSP";
  }, []);

  const whatsappLink = "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN";

  const handleWhatsAppClick = () => {
    trackEvent("click_whatsapp", {
      event_category: "engagement",
      event_label: "WhatsApp Community Join",
      source: "join_israel_landing",
    });
    trackFBLead("join_israel_whatsapp");
    trackButtonClick("whatsapp", "join_israel_landing", "israel");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" style={{ background: 'linear-gradient(180deg, hsl(38 30% 97%) 0%, hsl(38 25% 95%) 50%, hsl(210 20% 96%) 100%)' }}>
      <FacebookPixel />

      <div className="max-w-md w-full space-y-6">
        
        {/* Logo + warm greeting */}
        <div className="text-center space-y-2">
          <img 
            src={logo} 
            alt="(D)Know" 
            className="w-20 h-20 mx-auto rounded-2xl shadow-md ring-4 ring-white/80 object-cover" 
          />
          <p className="text-base text-muted-foreground">
            היי, אני ראם · נשוי ואבא ל-2, גר בתאילנד
          </p>
        </div>

        {/* H1 - Personal hook */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            הדילים שאני מוצא – עכשיו גם אצלכם
          </h1>
          <p className="text-lg text-muted-foreground">
            המלצות אמיתיות מ-AliExpress ו-KSP, כמו שהייתי ממליץ למשפחה
          </p>
        </div>

        {/* CTA - right after emotional peak */}
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

        {/* H2 - Value details */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-4">
          <h2 className="font-bold text-base text-center">מה תקבלו בקבוצה?</h2>
          
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

        {/* Anti-spam + second CTA */}
        <p className="text-center text-sm text-muted-foreground">
          3-4 הודעות בשבוע בלבד. בלי ספאם. אף פעם.
        </p>

        {/* Second CTA at bottom */}
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleWhatsAppClick}
          className="block"
        >
          <Button
            size="lg"
            className="w-full h-12 text-base font-bold bg-whatsapp hover:bg-whatsapp/90 text-white gap-3 transition-all duration-300 hover:scale-[1.03] shadow-md rounded-2xl"
          >
            <MessageCircle className="h-5 w-5" />
            רוצה להצטרף? לחצו כאן
          </Button>
        </a>
      </div>
    </div>
  );
};

export default ChannelSelect;
