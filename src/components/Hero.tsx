import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Users, Gift, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
export const Hero = () => {
  return <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-16 md:py-24">
      <img src={heroImage} alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה לרכב, לבית ולילדים" className="mb-8 w-full md:max-w-6xl md:mx-auto" />
      <div className="container mx-auto px-4 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 font-bold tracking-tight md:text-6xl mx-0 text-center text-2xl text-stone-950">המלצות אמיתיות מלאזדה- מוצרים שכל אחד צריך</h1>
          
          {/* Benefits section */}
          <div className="mb-8 flex flex-wrap gap-4 justify-center items-center text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <span>קהילה פעילה</span>
            </div>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <span>הנחות בלעדיות</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span>המלצות מעודכנות</span>
            </div>
          </div>
          
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-lg text-base py-6">
              <a href="https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                <span className="font-semibold">הצטרפו אלינו בווטסאפ</span>
              </a>
            </Button>
            
            <Button asChild size="lg" className="bg-telegram hover:bg-telegram/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-lg text-base py-6">
              <a href="https://t.me/+wJIFEYTlOuUzZjBk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Send className="h-6 w-6" />
                <span className="font-semibold">הצטרפו אלינו בטלגרם</span>
              </a>
            </Button>
          </div>
          
        </div>
      </div>
    </section>;
};