import { IsraelHero } from "@/components/IsraelHero";
import { FeaturedProductsIsrael } from "@/components/FeaturedProductsIsrael";
import { IsraelCategories } from "@/components/IsraelCategories";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";

const Israel = () => {
  useEffect(() => {
    trackFBViewContent("Israel Page");
    document.title = "(D)Know - דילים מאלי אקספרס לישראל";
  }, []);

  return (
    <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* 1. Hero Section */}
        <IsraelHero />

        {/* 2. Featured Products - הכי שווה מאלי */}
        <FeaturedProductsIsrael />

        {/* 4. Categories Accordion */}
        <IsraelCategories />

        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="israel" />
    </div>
  );
};

export default Israel;
