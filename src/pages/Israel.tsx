import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { HowItWorks } from "@/components/HowItWorks";
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
        <About />
        <section className="py-16 bg-background">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl text-center">
              <h2 className="text-3xl font-bold text-foreground mb-6">
                מוצרים מומלצים
              </h2>
              <p className="text-base sm:text-lg md:text-xl font-semibold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent animate-fade-in">
                ממש בקרוב יופיעו כאן ריכוז המלצות שוות ✨
              </p>
              <a 
                href="https://s.click.aliexpress.com/e/_c4WQp8zf"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-6 text-lg font-bold text-primary hover:text-primary/80 transition-all duration-300 hover:scale-105 underline decoration-2 underline-offset-4"
              >
                מבצעי יום הרווקים עדיין פעילים - לחצו כאן כדי להיכנס 🎉
              </a>
            </div>
          </div>
        </section>
        <HowItWorks />
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="israel" />
    </div>
  );
};

export default Israel;
