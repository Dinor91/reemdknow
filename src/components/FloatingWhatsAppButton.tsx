import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const FloatingWhatsAppButton = () => {
  return (
    <a
      href="https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-50 animate-bounce hover:animate-none"
    >
      <Button
        size="lg"
        className="h-14 w-14 rounded-full bg-whatsapp hover:bg-whatsapp/90 text-white shadow-2xl hover:scale-110 transition-all"
      >
        <MessageCircle className="h-7 w-7" />
      </Button>
    </a>
  );
};
