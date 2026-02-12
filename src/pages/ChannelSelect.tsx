import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import logo from "@/assets/dknow-logo.png";

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

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

      <div className="max-w-md w-full space-y-4">
        
        {/* Logo + warm greeting - compact */}
        <div className="text-center space-y-1.5">
          <img 
            src={logo} 
            alt="(D)Know" 
            className="w-[120px] h-[120px] mx-auto rounded-2xl shadow-md ring-4 ring-white/80 object-cover" 
          />
          <p className="text-sm text-foreground">
            היי, אני ראם · נשוי ואבא ל-2, גר בתאילנד וממליץ על מוצרים באופן מקצועי
          </p>
        </div>

        {/* H1 - Campaign bridge hook */}
        <div className="text-center space-y-1.5">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            מפסיקים לשלם ביוקר! 💸
            <br />
            <span className="text-xl md:text-2xl">כל הדילים השווים מאליאקספרס אחרי סינון קפדני</span>
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed">
            המלצות אמינות מ-AliExpress ,KSP ועוד – בדיוק כמו שאני בודק למשפחה שלי. אצלי לא קונים חתול בשק!
          </p>
        </div>

        {/* Social proof - above CTA */}
        <p className="text-center text-sm font-semibold text-muted-foreground">
          <span className="text-[hsl(var(--heading))] font-bold">250+ ישראלים</span> כבר חוסכים חכם בכל יום!
        </p>

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
            <WhatsAppIcon className="h-6 w-6" />
            הצטרפות לקבוצה
          </Button>
        </a>

        {/* Value details */}
        <div className="bg-card rounded-2xl p-5 shadow-sm border border-border space-y-3">
          <h2 className="font-bold text-base text-center">מה תקבלו בקבוצה?</h2>
          
          <div className="space-y-2.5 text-[15px] text-foreground">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>המלצות יומיות על מוצרים איכותיים שעברו סינון ידני (כמו שראיתם בסרטון! 🔍)</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>קופונים בלעדיים והנחות שחוסכות מאות שקלים בכל קנייה 💰</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-[hsl(var(--heading))]"></span>
              <span>קהילת אימהות וצרכנים חכמים שעוזרים אחד לשני לקנות נכון 👨‍👩‍👧‍👦</span>
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
            <WhatsAppIcon className="h-5 w-5" />
            להצטרפות מהירה לקבוצה
          </Button>
        </a>
      </div>
    </div>
  );
};

export default ChannelSelect;
