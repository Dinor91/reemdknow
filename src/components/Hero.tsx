import { Button } from "@/components/ui/button";
import { MessageCircle, Send } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
export const Hero = () => {
  return <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-16 md:py-24">
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl">
          <img src={heroImage} alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה לרכב, לבית ולילדים" className="mb-8 w-full rounded-bl-lg " />
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-6xl mx-0 text-center">המלצות אמיתיות מלאזדה- מוצרים שכל אחד צריך</h1>
          
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-whatsapp hover:bg-whatsapp/90 text-white w-full sm:w-auto">
              <a href="https://chat.whatsapp.com/J5w8NJTGSWpDGEEBxTTH7L" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                הצטרפו אלינו בווטסאפ
              </a>
            </Button>
            
            <Button asChild size="lg" className="bg-telegram hover:bg-telegram/90 text-white w-full sm:w-auto">
              <a href="https://t.me/+sDJV1Y-Gy803NGM0" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                הצטרפו אלינו בטלגרם
              </a>
            </Button>
          </div>
          
        </div>
      </div>
    </section>;
};