import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";

export const Hero = () => {
  return <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl">
          <img src={heroImage} alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה לרכב, לבית ולילדים" className="mb-8 w-full rounded-lg" />
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl">-המלצות אמיתיות מלאזדה מוצרים שכל אחד צריך</h1>
          <p className="mb-4 text-xl text-muted-foreground md:text-2xl">המלצות מבוססות שימוש אישי, דירוגים גבוהים וסינון קפדני</p>
          
          
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center" dir="ltr">
            <Button size="lg" className="bg-whatsapp hover:bg-whatsapp/90 text-white text-lg px-8 py-6" asChild>
              <a href="https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j" target="_blank" rel="noopener noreferrer" className="flex items-center">
                הצטרפו לקבוצת WhatsApp
                <MessageCircle className="mr-2 h-5 w-5" />
              </a>
            </Button>
            
            <Button size="lg" className="bg-telegram hover:bg-telegram/90 text-white text-lg px-8 py-6" asChild>
              <a href="https://t.me/+wJIFEYTlOuUzZjBk" target="_blank" rel="noopener noreferrer" className="flex items-center">
                הצטרפו לקבוצת Telegram
                <Send className="mr-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>;
};