import { Button } from "@/components/ui/button";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";

export const CallToActionBanner = () => {
  return (
    <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 bg-primary/20 rounded-full px-4 py-2">
            <ArrowLeft className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">אל תפספסו!</span>
          </div>
          
          <h2 className="mb-4 text-3xl md:text-4xl font-bold text-foreground">
            הצטרפו לקהילה שלנו עוד היום
          </h2>
          
          <p className="mb-8 text-lg text-muted-foreground max-w-2xl mx-auto">
            קבלו גישה מיידית להמלצות בלעדיות, הנחות מיוחדות ועדכונים על המוצרים הכי שווים
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button asChild size="lg" className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-xl text-base py-6 animate-pulse">
              <a href="https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                <span className="font-semibold">הצטרפו בווטסאפ</span>
              </a>
            </Button>
            
            <Button asChild size="lg" className="bg-telegram hover:bg-telegram/90 hover:scale-105 transition-all text-white w-full sm:w-auto shadow-xl text-base py-6">
              <a href="https://t.me/+wJIFEYTlOuUzZjBk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Send className="h-6 w-6" />
                <span className="font-semibold">הצטרפו בטלגרם</span>
              </a>
            </Button>
          </div>
          
          <p className="mt-6 text-sm text-muted-foreground">
            ✨ יותר מ-1000 חברים כבר נהנים מההמלצות שלנו
          </p>
        </div>
      </div>
    </section>
  );
};
