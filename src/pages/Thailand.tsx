import { ThailandHero } from "@/components/ThailandHero";
import { ThailandCategories } from "@/components/ThailandCategories";
import { JoinCTASection } from "@/components/JoinCTASection";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";

const Thailand = () => {
  useEffect(() => {
    trackFBViewContent("Thailand Page");
    document.title = "(D)Know - דילים מלאזדה תאילנד";
  }, []);

  return (
    <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* Page Header */}
        <section className="text-center py-8 md:py-10 bg-gradient-to-br from-orange-100 to-white border-b-2 border-orange-400">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              🇹🇭 דילים מלאזדה - תאילנד
            </h1>
            <p className="text-base text-muted-foreground">
              משלוח מהיר לכל תאילנד | תשלום במזומן | מוצרים נבדקים
            </p>
          </div>
        </section>

        {/* Hero with personal intro */}
        <ThailandHero />

        {/* Categories - First 4 */}
        <ThailandCategories />

        {/* CTA Section - After categories */}
        <JoinCTASection country="thailand" />

        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="thailand" />
    </div>
  );
};

export default Thailand;
