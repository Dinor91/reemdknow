import { Hero } from "@/components/Hero";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";

const Israel = () => {
  useEffect(() => {
    trackFBViewContent("Israel Page");
    document.title = "Reem(D)Know - המוצרים השווים AliExpress";
  }, []);

  return (
    <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        <Hero country="israel" />
        <section className="py-12 md:py-16 bg-muted">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                אתם עכשיו בישראל? זה המקום הנכון
              </h2>
            </div>
          </div>
        </section>
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold text-orange-500 mb-6">
                מוצרים מומלצים
              </h2>
              <p className="text-base sm:text-lg md:text-xl font-semibold text-foreground animate-fade-in">
                ממש בקרוב יופיעו כאן ריכוז המלצות שוות ✨
              </p>
              <a 
                href="https://s.click.aliexpress.com/e/_c4WQp8zf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 text-lg sm:text-xl md:text-2xl font-semibold text-orange-500 hover:text-orange-600 transition-all duration-300 hover:scale-105 underline decoration-2 underline-offset-4"
              >
                מבצעי יום הרווקים - לחצו כאן 🎉
              </a>
            </div>
          </div>
        </section>
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="israel" />
    </div>
  );
};

export default Israel;
