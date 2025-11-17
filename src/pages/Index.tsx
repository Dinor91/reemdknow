import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Categories } from "@/components/Categories";
import { HowItWorks } from "@/components/HowItWorks";
import { Partners } from "@/components/Partners";
import { Footer } from "@/components/Footer";
import { FloatingWhatsAppButton } from "@/components/FloatingWhatsAppButton";
import { Header } from "@/components/Header";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-16">
        <Hero country="thailand" />
        <About />
        <Categories />
        <HowItWorks />
        <Partners />
        <Footer />
      </div>
      <FloatingWhatsAppButton country="thailand" />
    </div>
  );
};

export default Index;
