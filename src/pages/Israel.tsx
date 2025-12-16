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
    document.title = "(D)Know - המוצרים השווים Israel";
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
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">אתם עכשיו בישראל? זה המקום הנכון</h2>
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
