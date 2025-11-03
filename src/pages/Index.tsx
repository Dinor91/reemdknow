import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Categories } from "@/components/Categories";
import { HowItWorks } from "@/components/HowItWorks";
import { Footer } from "@/components/Footer";
const Index = () => {
  return <div className="min-h-screen">
      <Hero />
      
      <Categories />
      <HowItWorks />
      <Footer />
    </div>;
};
export default Index;