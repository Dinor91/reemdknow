import { Button } from "@/components/ui/button";
import { trackWhatsAppClick, trackTelegramClick } from "@/lib/analytics";
import { trackFBLead } from "./FacebookPixel";
import { trackButtonClick } from "@/lib/trackClick";

interface JoinCTASectionProps {
  country: "israel" | "thailand";
}

export const JoinCTASection = ({ country }: JoinCTASectionProps) => {
  const whatsappLink =
    country === "israel"
      ? "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN"
      : "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j";
  const telegramLink = 
    country === "israel" 
      ? "https://t.me/+Wi46HCt_SbU3YWI0" 
      : "https://t.me/+wJIFEYTlOuUzZjBk";

  const handleWhatsAppClick = () => {
    trackWhatsAppClick(`${country}_cta_section`);
    trackFBLead(`WhatsApp - ${country}`);
    trackButtonClick("whatsapp", `${country}_cta_section`, country);
  };

  const handleTelegramClick = () => {
    trackTelegramClick(`${country}_cta_section`);
    trackFBLead(`Telegram - ${country}`);
    trackButtonClick("telegram", `${country}_cta_section`, country);
  };

  return (
    <section dir="rtl" className="bg-muted border-2 border-border rounded-2xl py-10 px-6 md:px-8 mx-4 md:mx-auto max-w-3xl my-10 text-center">
      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
          רוצים עוד המלצות?
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed mb-5">
          בקבוצה שלי אני משתף רק מוצרים שווים שעוברים סינון.
          <br />
          3-4 מוצרים בשבוע, בלי ספאם!
        </p>
        <p className="text-lg font-medium text-foreground mb-7">
          250+ ישראלים כבר שם 👇
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            asChild
            size="lg"
            className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 transition-all text-white w-full sm:w-auto min-w-[180px] text-lg py-6 px-8 rounded-lg"
          >
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
              onClick={handleWhatsAppClick}
            >
              💬 וואטסאפ
            </a>
          </Button>

          <Button
            asChild
            size="lg"
            className="bg-telegram hover:bg-telegram/90 hover:scale-105 transition-all text-white w-full sm:w-auto min-w-[180px] text-lg py-6 px-8 rounded-lg"
          >
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
              onClick={handleTelegramClick}
            >
              ✈️ טלגרם
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
