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

const thailandProducts = [
  {
    name: 'מכונת עשיית קפה Lofree Mocha קפה אספרסו נייד 20 בר לחץ גבוה',
    description: "מכונת קפה ניידת עם לחץ גבוה לאספרסו מושלם",
    link: "https://s.lazada.co.th/s.7aM6j?cc",
  },
  {
    name: "משחק קלפים עבריים",
    description: "משחק קלפים מהנה לכל המשפחה",
    link: "https://s.lazada.co.th/s.7aM7C?cc",
  },
  {
    name: "טוסטר דואר ברבר TOFFY",
    description: "טוסטר עיצובי ואיכותי למטבח",
    link: "https://s.lazada.co.th/s.7aMEX?cc",
  },
  {
    name: "משחת שיניים לילדים",
    description: "משחת שיניים בטוחה ויעילה לילדים",
    link: "https://s.lazada.co.th/s.7aMGY?cc",
  },
  {
    name: "בקבוק שתייה Owala",
    description: "בקבוק איכותי עם פקק נוח",
    link: "https://s.lazada.co.th/s.7aMHi?cc",
  },
  {
    name: "מערכת סאונד LG XBOOM",
    description: "רמקול חזק עם סאונד איכותי",
    link: "https://s.lazada.co.th/s.7aMJe?cc",
  },
];

const Thailand = () => {
  useEffect(() => {
    trackFBViewContent("Thailand Page");
    document.title = "Reem(D)Know - המוצרים השווים LAZADA";
  }, []);

  return (
    <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        <Hero country="thailand" />
        <About />
        <FeaturedProducts products={thailandProducts} country="thailand" />
        <HowItWorks />
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="thailand" />
    </div>
  );
};

export default Thailand;
