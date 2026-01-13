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
        {/* Hero Section */}
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
