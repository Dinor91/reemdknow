import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { About } from "@/components/About";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, ShoppingBag, Users, TrendingUp, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-image.jpg";
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
      event_label: country
    });
  };
  return <div className="min-h-screen">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted py-12 md:py-20">
          <img src={heroImage} alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה" className="mb-8 w-full md:max-w-6xl md:mx-auto" />
          <div className="container mx-auto px-4 text-center">
            <div className="mx-auto max-w-4xl">
              <h1 className="mb-6 text-3xl md:text-5xl font-bold text-foreground text-center leading-tight">
                המלצות אמיתיות
                <br />
                <span className="text-primary">כאלה שכל אחד צריך</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-center leading-relaxed">
                מוצרים שנבחרו בקפידה- נבדקו אישית, עברו סינון קפדני ובעלי דירוג גבוה
                <br />
                בין אם אתם בארץ או בצד השני של העולם- אני כאן בשבילכם
              </p>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-12 text-foreground">
              למה אלפי ישראלים בוחרים בנו?
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">500+</div>
                <div className="text-sm text-muted-foreground">מוצרים נבחרים</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">10K+</div>
                <div className="text-sm text-muted-foreground">לקוחות מרוצים</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">95%</div>
                <div className="text-sm text-muted-foreground">שביעות רצון</div>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">2</div>
                <div className="text-sm text-muted-foreground">מדינות</div>
              </div>
            </div>
          </div>
        </section>

        {/* Countries Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-4xl font-bold text-center mb-4 text-foreground">
              ?איפה אתם בעולם
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
                      <span className="text-4xl">🇮🇱</span>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground">ישראל</h3>
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <MapPin className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      הצטרפו אליי וקבלו המלצות ודילים החל ממוצרים לבית דרך גאדג'טים ועד למשחקי ילדים
                    </p>

                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <img src={aliexpressLogo} alt="AliExpress" className="h-6 w-auto" />
                      </div>
                      <span className="text-sm text-muted-foreground">Aliexpress-המוצרים השווים </span>
                    </div>

                    <Button className="w-full group-hover:shadow-lg transition-all duration-300 bg-primary hover:bg-primary/90 text-lg py-6" size="lg">
                      <span>לחצו כאן לקטלוג המוצרים</span>
                      <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
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
                      <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                        <MapPin className="w-6 h-6 text-secondary" />
                      </div>
                    </div>
                    
                    <p className="text-muted-foreground mb-6 leading-relaxed">
                      מוצרים נבחרים במיוחד עבור תושבים ומטיילים בתאילנד
                    </p>

                    <div className="flex items-center justify-center gap-3 mb-6">
                      <div className="p-3 bg-background rounded-lg border border-border">
                        <img src={lazadaLogo} alt="Lazada" className="h-6 w-auto" />
                      </div>
                      <span className="text-sm text-muted-foreground">Lazada-הדילים הכי חמים      </span>
                    </div>

                    <Button className="w-full group-hover:shadow-lg transition-all duration-300 bg-secondary hover:bg-secondary/90 text-lg py-6" size="lg" variant="secondary">
                      <span>לחצו כאן לקטלוג המוצרים</span>
                      <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <About />

        <Footer />
      </div>
    </div>;
};
export default Landing;