import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { About } from "@/components/About";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ShoppingBag, Users, TrendingUp, ArrowRight, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-banner-new.jpeg";
import lazadaLogo from "@/assets/lazada-logo.png";
import aliexpressLogo from "@/assets/aliexpress-logo.svg";
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
  return (
    <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-8 md:py-16 pb-6 md:pb-12">
          <div className="px-4 md:px-0">
            <img
              src={heroImage}
              alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה"
              className="mb-6 md:mb-8 w-full max-w-full md:max-w-6xl mx-auto rounded-lg md:rounded-none object-cover"
            />
          </div>
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-4xl">
              {/* Mobile heading */}
              <h1 className="mb-6 md:hidden text-3xl font-bold text-foreground text-center leading-tight">
                המלצות אמינות על מוצרים שווים
                <br />
                <span className="text-primary text-[1.7rem]">מאחד שיודע</span>
              </h1>

              {/* Desktop heading */}
              <h1 className="mb-6 hidden md:block text-5xl font-bold text-foreground text-center leading-tight">
                המלצות אמיתיות
                <br />
                <span className="text-primary">כאלה שכל אחד צריך</span>
              </h1>

              {/* Desktop description */}
              <p className="hidden md:block text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                מוצרים שנבחרו בקפידה- נבדקו אישית, עברו סינון קפדני ובעלי דירוג גבוה
                <br />
                בין אם אתם בארץ או בצד השני של העולם- אני כאן בשבילכם
              </p>
            </div>
          </div>
        </section>

        {/* Countries Section */}
        <section className="py-8 md:py-12 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 text-foreground flex items-center justify-center gap-3">
              ?איפה אתם בעולם
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
            </h2>

            <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
              בחרו את היעד שלכם וקבלו המלצות מותאמות אישית
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Israel Card */}
              <Link to="/israel" onClick={() => handleCountryClick("israel")} className="group">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 h-full bg-gradient-to-br from-background via-background to-primary/5">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">ישראל</h3>
                      <span className="text-4xl">🇮🇱</span>
                    </div>

                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      רוצים לנסות לנצח את יוקר המחייה? לחצו פה
                    </p>

                    <Button
                      className="w-full group-hover:shadow-lg transition-all duration-300 bg-primary hover:bg-primary/90 text-lg py-6"
                      size="lg"
                    >
                      <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      <span>לחץ כאן להתחלה</span>
                    </Button>
                  </CardContent>
                </Card>
              </Link>

              {/* Thailand Card */}
              <Link to="/thailand" onClick={() => handleCountryClick("thailand")} className="group">
                <Card className="overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-105 h-full bg-gradient-to-br from-background via-background to-secondary/5">
                  <CardContent className="p-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-6">
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">תאילנד</h3>
                      <span className="text-4xl">🇹🇭</span>
                    </div>

                    <p className="text-muted-foreground mb-6 leading-relaxed">מטיילים פה, רילוקיישן? זה המקום הנכון</p>

                    <Button
                      className="w-full group-hover:shadow-lg transition-all duration-300 bg-secondary hover:bg-secondary/90 text-lg py-6"
                      size="lg"
                      variant="secondary"
                    >
                      <span>לחץ כאן להתחלה</span>
                      <ArrowLeft className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
            <h2 className="hidden md:block text-4xl font-bold text-center mb-12 text-foreground">
              למה אלפי ישראלים בוחרים בנו?
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
