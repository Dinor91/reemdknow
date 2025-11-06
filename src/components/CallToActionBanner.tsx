import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Send, Sparkles } from "lucide-react";

interface CallToActionBannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CallToActionBanner = ({ open, onOpenChange }: CallToActionBannerProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 inline-flex items-center gap-2 bg-primary/20 rounded-full px-4 py-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">הצעה מיוחדת!</span>
          </div>
          <DialogTitle className="text-2xl text-center">
            הצטרפו לקהילה שלנו
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-center text-muted-foreground">
            קבלו גישה להמלצות בלעדיות, הנחות מיוחדות ועדכונים על המוצרים הכי שווים
          </p>
          
          <div className="flex flex-col gap-3">
            <Button asChild size="lg" className="bg-whatsapp hover:bg-whatsapp/90 hover:scale-105 transition-all text-white w-full shadow-lg">
              <a href="https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                <span className="font-semibold">הצטרפו בווטסאפ</span>
              </a>
            </Button>
            
            <Button asChild size="lg" className="bg-telegram hover:bg-telegram/90 hover:scale-105 transition-all text-white w-full shadow-lg">
              <a href="https://t.me/+wJIFEYTlOuUzZjBk" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                <span className="font-semibold">הצטרפו בטלגרם</span>
              </a>
            </Button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            ✨ יותר מ-1000 חברים כבר נהנים מההמלצות שלנו
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
