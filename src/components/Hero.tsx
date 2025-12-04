import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import thailandHeroBanner from "@/assets/thailand-hero-banner.jpeg";
import israelHeroBanner from "@/assets/israel-hero-banner.jpeg";
import { trackWhatsAppClick, trackTelegramClick } from "@/lib/analytics";
import { trackFBLead } from "./FacebookPixel";

interface HeroProps {
  country: "israel" | "thailand";
}

export const Hero = ({ country }: HeroProps) => {
  const whatsappLink =
    country === "israel"
      ? "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN"
      : "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j";
  const telegramLink = country === "israel" ? "https://t.me/+Wi46HCt_SbU3YWI0" : "https://t.me/+wJIFEYTlOuUzZjBk";

  const handleWhatsAppClick = () => {
    trackWhatsAppClick();
    trackFBLead(`WhatsApp - ${country}`);
  };

  const handleTelegramClick = () => {
    trackTelegramClick();
    trackFBLead(`Telegram - ${country}`);
  };

  const heroBanner = country === "thailand" ? thailandHeroBanner : israelHeroBanner;
  const altText =
    country === "thailand"
      ? "מוצרים שכל אחד צריך - דילים שווים בכל יום! Lazada"
      : "מוצרים שכל אחד צריך - דילים שווים בכל יום! AliExpress";

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-8 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <img src={heroBanner} alt={altText} className="w-full max-w-4xl mx-auto mb-8" />

          <p className="text-center text-lg md:text-xl font-semibold mb-4" style={{ color: "#41b5b3" }}>
            ?איפה אתה רוצה לקבל את ההמלצות הכי חמות
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-lg text-base py-6"
            >
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
                onClick={handleWhatsAppClick}
              >
                <MessageCircle className="h-6 w-6" />
                <span className="font-semibold">קח אותי לווטסאפ</span>
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              className="bg-telegram hover:bg-telegram/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-lg text-base py-6"
            >
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
                onClick={handleTelegramClick}
              >
                <Send className="h-6 w-6" />
                <span className="font-semibold">קח אותי לטלגרם</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
