import { Hero } from "@/components/Hero";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { ProductGrid } from "@/components/ProductGrid";
import { israelProducts } from "@/data/products-israel";
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
        <ProductGrid
          products={israelProducts}
          title="מוצרים מומלצים מאליאקספרס"
          affiliateSource="website"
        />
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="israel" />
    </div>
  );
};
export default Israel;
