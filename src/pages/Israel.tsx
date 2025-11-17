import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { HowItWorks } from "@/components/HowItWorks";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";

const israelProducts = [
  {
    name: "מנקה רצפות חכם",
    description: "מנקה רצפות אוטומטי עם ניווט חכם, מושלם לניקיון יומיומי",
    link: "https://aliexpress.com/item/example1",
  },
  {
    name: "אוזניות אלחוטיות",
    description: "אוזניות עם ביטול רעשים אקטיבי ואיכות סאונד מעולה",
    link: "https://aliexpress.com/item/example2",
  },
  {
    name: "שעון חכם",
    description: "שעון ספורט עם מעקב פעילות ומוניטור דופק",
    link: "https://aliexpress.com/item/example3",
  },
  {
    name: "מטען אלחוטי מהיר",
    description: "מטען אלחוטי תומך בטעינה מהירה לכל הטלפונים",
    link: "https://aliexpress.com/item/example4",
  },
  {
    name: "תאורת LED חכמה",
    description: "נורות חכמות עם שליטה מהאפליקציה ו-16 מיליון צבעים",
    link: "https://aliexpress.com/item/example5",
  },
  {
    name: "מצלמת אבטחה",
    description: "מצלמה עם ראיית לילה ושליטה מרחוק",
    link: "https://aliexpress.com/item/example6",
  },
];

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
        <FeaturedProducts products={israelProducts} country="israel" />
        <HowItWorks />
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="israel" />
    </div>
  );
};

export default Israel;
