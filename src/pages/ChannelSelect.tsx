import { Button } from "@/components/ui/button";
import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import logo from "@/assets/dknow-logo.png";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import ramProfile from "@/assets/ram-profile.jpeg";

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
    <div className="min-h-screen flex items-center justify-center px-4 py-5" dir="rtl" style={{ background: 'linear-gradient(180deg, hsl(38 30% 97%) 0%, hsl(38 25% 95%) 50%, hsl(210 20% 96%) 100%)' }}>
      <FacebookPixel />

      <div className="max-w-md w-full space-y-3">
        
        {/* Logo only - compact */}
        <div className="flex justify-center">
          <img 
            src={logo} 
            alt="(D)Know" 
            className="w-[56px] h-[56px] rounded-xl shadow-sm ring-2 ring-white/80 object-cover" 
          />
        </div>

        {/* H1 - benefit focused, bold */}
        <div className="text-center space-y-1.5">
          <h1 className="text-[22px] md:text-3xl font-extrabold text-foreground leading-tight">
            מפסיקים לשלם ביוקר! 💸
            <br />
            <span className="text-[19px] md:text-2xl font-bold">כל הדילים השווים מאליאקספרס אחרי סינון קפדני</span>
          </h1>
          <p className="text-[14px] text-muted-foreground leading-relaxed">
            אל תהמרו על הכסף שלכם. קבלו ישירות לווטסאפ רק מוצרים שעברו את ״מבחן הסינון״ שלי (כמו שראיתם בסרטון)
          </p>
        </div>

        {/* Social proof - above CTA */}
        <p className="text-center text-sm font-semibold text-muted-foreground">
          <span className="text-[hsl(var(--heading))] font-bold">250+ ישראלים</span> כבר חוסכים בקבוצה
        </p>

        {/* Primary CTA - above the fold */}
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
            רוצה להצטרף ולחסוך! 🔥
          </Button>
        </a>

        {/* Social proof bubble - WhatsApp testimonial */}
        <div className="bg-card rounded-2xl p-3.5 shadow-md border border-border flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-whatsapp/15 flex items-center justify-center">
            <WhatsAppIcon className="h-4 w-4 text-whatsapp" />
          </div>
          <div className="text-[13px] text-foreground leading-relaxed">
            <span className="font-bold">"חסכתי 500 ש״ח על עגלת הקניות בזכות הסינון של ראם!"</span>
            <span className="text-muted-foreground"> – חברת קהילה</span>
          </div>
        </div>

        {/* Benefits - authoritative */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border space-y-2.5">
          <h2 className="font-bold text-sm text-center text-muted-foreground">למה כדאי להצטרף?</h2>
          <div className="space-y-2 text-[14px] text-foreground">
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 text-base">🔍</span>
              <span><strong>סינון מקצועי:</strong> בדיקה ידנית של דירוג קונים ואמינות מוכר</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 text-base">💰</span>
              <span><strong>קופונים "מתחת לרדאר":</strong> הנחות שחוסכות מאות שקלים בכל קנייה</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="flex-shrink-0 text-base">🤫</span>
              <span><strong>קהילה שקטה:</strong> 0% ספאם, 100% ערך של "אחד שיודע"</span>
            </div>
          </div>
        </div>

        {/* Authority section - "Dknow - אחד שיודע" */}
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
          <h3 className="font-bold text-sm text-center text-muted-foreground mb-3">מי עומד מאחורי <span dir="ltr">(D)Know</span>?</h3>
          <div className="flex items-start gap-3">
            <Avatar className="w-12 h-12 flex-shrink-0 ring-2 ring-border">
              <AvatarImage src={ramProfile} alt="ראם" className="object-cover" />
              <AvatarFallback>ר</AvatarFallback>
            </Avatar>
            <p className="text-[13px] text-foreground leading-relaxed">
              היי, אני <strong>ראם</strong>. אבא ל-2 והנדימן בנשמה. אני גר בתאילנד וחי את עולם הקניות אונליין (Lazada, AliExpress ו-KSP). הפכתי לאובססיבי לסינון מוצרים כדי לוודא שאתם מקבלים רק <strong>איכות גבוהה במחיר הכי נמוך</strong>. אצלי לא קונים חתול בשק.
            </p>
          </div>
        </div>

        {/* Second CTA */}
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
