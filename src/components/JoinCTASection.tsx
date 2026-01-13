import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
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
    <section className="bg-gradient-to-br from-orange-50/80 to-white border-2 border-orange-400 rounded-2xl py-12 md:py-14 mx-4 md:mx-auto max-w-3xl my-16">
      <div className="px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            💡 רוצים עוד דילים חמים?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            30+ מוצרים חדשים בקבוצה כל שבוע!
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              asChild
              size="lg"
              className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 hover:-translate-y-1 transition-all text-white w-full sm:w-auto shadow-lg hover:shadow-xl text-lg py-6 px-8 rounded-xl"
            >
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
                onClick={handleWhatsAppClick}
              >
                <span className="text-2xl">📱</span>
                <span className="font-semibold">הצטרפו לוואטסאפ</span>
              </a>
            </Button>

            <Button
              asChild
              size="lg"
              className="bg-telegram hover:bg-telegram/90 hover:scale-105 hover:-translate-y-1 transition-all text-white w-full sm:w-auto shadow-lg hover:shadow-xl text-lg py-6 px-8 rounded-xl"
            >
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3"
                onClick={handleTelegramClick}
              >
                <span className="text-2xl">✈️</span>
                <span className="font-semibold">הצטרפו לטלגרם</span>
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
