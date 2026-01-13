import { ThailandHero } from "@/components/ThailandHero";
import { ThailandCategories } from "@/components/ThailandCategories";
import { FeaturedProductsThailand } from "@/components/FeaturedProductsThailand";
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
        {/* 1. Hero Section */}
        <ThailandHero />

        {/* 2. Featured Products - הכי שווה השבוע */}
        <FeaturedProductsThailand />

        {/* 4. Categories Accordion */}
        <ThailandCategories />

        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="thailand" />
    </div>
  );
};

export default Thailand;
