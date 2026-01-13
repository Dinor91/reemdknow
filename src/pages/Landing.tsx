import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { About } from "@/components/About";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ShoppingBag, Users, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";

const Landing = () => {
  useEffect(() => {
    trackFBViewContent("Landing Page");
    document.title = "Reem(D)Know - המלצות חכמות בכל מקום בעולם";
  }, []);

  const handleCountryClick = (country: string) => {
    trackEvent("landing_country_click", {
      event_category: "navigation",
      event_label: country,
    });
  };

  const scrollToCountries = () => {
    const countriesSection = document.getElementById("countries-section");
    if (countriesSection) {
      countriesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen" dir="rtl">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* Hero Section - New Design */}
        <section className="bg-gradient-to-b from-background to-muted py-12 md:py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* H1 - Hero Headline */}
              <h1 className="text-[28px] md:text-[40px] lg:text-[48px] font-bold text-[#1a1a1a] leading-[1.2] mb-6">
                🛒 קונים באלי אקספרס ולאזדה?
                <br />
                עצרו לשנייה.
              </h1>

              {/* H2 - Problem Statement */}
              <h2 className="text-[20px] md:text-[24px] lg:text-[28px] font-semibold text-[#333333] leading-[1.3] mb-4">
                רוב המוצרים שם זה:
              </h2>

              {/* Problem List */}
              <ul className="list-none text-right max-w-md mx-auto mb-8">
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-[#555555] mb-3 flex items-center justify-end gap-2">
                  <span>דירוג מזויף</span>
                  <span>❌</span>
                </li>
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-[#555555] mb-3 flex items-center justify-end gap-2">
                  <span>מחיר מנופח</span>
                  <span>❌</span>
                </li>
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-[#555555] mb-3 flex items-center justify-end gap-2">
                  <span>זמן משלוח אינסופי</span>
                  <span>❌</span>
                </li>
              </ul>

              {/* H2 - Solution Statement */}
              <h2 className="text-[20px] md:text-[24px] lg:text-[28px] font-semibold text-[#333333] leading-[1.3] mb-4 mt-8">
                הפתרון שלי פשוט:
              </h2>

              {/* Solution List */}
              <ul className="list-none text-right max-w-md mx-auto mb-8">
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-success font-medium mb-3 flex items-center justify-end gap-2">
                  <span>רק מוצרים עם <strong>4.5+</strong> דירוג אמיתי</span>
                  <span>✅</span>
                </li>
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-success font-medium mb-3 flex items-center justify-end gap-2">
                  <span>רק מוכרים עם <strong>500+</strong> הזמנות</span>
                  <span>✅</span>
                </li>
                <li className="text-[16px] md:text-[18px] lg:text-[20px] text-success font-medium mb-3 flex items-center justify-end gap-2">
                  <span>רק דילים שבדקתי אישית</span>
                  <span>✅</span>
                </li>
              </ul>

              {/* Social Proof */}
              <p className="text-[16px] md:text-[18px] lg:text-[20px] font-medium text-[#333333] mb-4">
                <strong className="text-success">250+</strong> ישראלים כבר חוסכים איתי.
              </p>

              {/* CTA Text */}
              <p className="text-[20px] md:text-[24px] lg:text-[28px] font-bold text-cta-blue mb-6">
                הבא בתור? 👇
              </p>

              {/* Primary Button */}
              <Button
                onClick={scrollToCountries}
                size="lg"
                className="bg-cta-blue hover:bg-cta-blue-hover text-white text-[16px] md:text-[18px] font-semibold px-8 py-4 md:py-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 w-full md:w-auto"
              >
                בחרו את היעד שלכם ↓
              </Button>
            </div>
          </div>
        </section>

        {/* Countries Section */}
        <section id="countries-section" className="py-8 md:py-12 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 text-foreground flex items-center justify-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              ?איפה אתם בעולם
            </h2>

            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto text-lg md:text-xl">
              בחרו את היעד שלכם וקבלו המלצות מותאמות אישית
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Israel Card */}
              <Link to="/israel" onClick={() => handleCountryClick("israel")} className="group">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 h-full bg-gradient-to-br from-background via-background to-primary/5">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <span className="text-4xl">🇮🇱</span>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">ישראל</h3>
                    </div>

                    <p className="text-muted-foreground mb-6 leading-relaxed text-lg md:text-xl">
                      ?רוצים להקל על יוקר המחיה
                    </p>

                    <Button
                      className="w-full group-hover:shadow-lg transition-all duration-300 bg-[#f28433] hover:bg-[#f28433]/90 text-lg py-6"
                      size="lg"
                    >
                      <span>לחץ כאן</span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              {/* Thailand Card */}
              <Link to="/thailand" onClick={() => handleCountryClick("thailand")} className="group">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 h-full bg-gradient-to-br from-background via-background to-secondary/5">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <span className="text-4xl">🇹🇭</span>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">תאילנד</h3>
                    </div>

                    <p className="text-muted-foreground mb-6 leading-relaxed text-lg md:text-xl">
                      ?מטיילים פה? רילוקיישן
                    </p>

                    <Button
                      className="w-full group-hover:shadow-lg transition-all duration-300 bg-[#f28433] hover:bg-[#f28433]/90 text-lg py-6 text-white"
                      size="lg"
                    >
                      <span>לחץ כאן</span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <About />

        {/* Stats Section */}
        <section className="pt-12 md:pt-16 pb-16 md:pb-24 bg-background">
          <div className="container mx-auto px-4">
            {/* Desktop heading */}
            <h2 className="hidden md:block text-4xl font-bold text-center mb-12 text-[#41b5b3]">
              ?למה אלפי ישראלים בוחרים בנו
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="hidden md:flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">500+</div>
                <div className="text-sm text-muted-foreground">מוצרים נבחרים</div>
              </div>
              <div className="text-center">
                <div className="hidden md:flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">10K+</div>
                <div className="text-sm text-muted-foreground">לקוחות מרוצים</div>
              </div>
              <div className="text-center">
                <div className="hidden md:flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">95%</div>
                <div className="text-sm text-muted-foreground">שביעות רצון</div>
              </div>
              <div className="text-center">
                <div className="hidden md:flex w-16 h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-4">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">2</div>
                <div className="text-sm text-muted-foreground">מדינות</div>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
};

export default Landing;
