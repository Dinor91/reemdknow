import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Categories } from "@/components/Categories";
import { HowItWorks } from "@/components/HowItWorks";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <About />
      <Categories />
      <HowItWorks />
      <Partners />
      <Footer />
      <FloatingWhatsAppButton />
    </div>
  );
};

export default Index;
