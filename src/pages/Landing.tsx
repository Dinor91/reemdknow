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
              <h1 className="mb-6 text-3xl md:text-5xl font-bold text-foreground">
                -המלצות אמיתיות
בכל מקום בעולם
                <br />
                <span className="text-primary">כאלה שכל אחד צריך      </span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                מוצרים שנבחרו בקפידה- נבדקו אישית, עברו סינון קפדני ובעלי דירוג גבוה
בין אם אתם בארץ או בצד השני שלו - אני כאן בשבילכם
                <br />
                בין אם אתם בארץ או בצד השני של כדור הארץ - אנחנו כאן בשבילכם
              </p>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12 max-w-3xl mx-auto">
                <div className="bg-card p-4 rounded-lg border border-border">
                  <Users className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">500+</div>
                  <div className="text-sm text-muted-foreground">חברי קהילה</div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border">
                  <ShoppingBag className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">100+</div>
                  <div className="text-sm text-muted-foreground">מוצרים נבדקו</div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border">
                  <MapPin className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">2</div>
                  <div className="text-sm text-muted-foreground">מדינות</div>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border">
                  <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl font-bold text-foreground">24/7</div>
                  <div className="text-sm text-muted-foreground">עדכונים</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Countries Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">?איפה אתם בעולם</h2>
            <p className="text-center text-muted-foreground mb-12 text-lg">
              בחרו את היעד שלכם וקבלו המלצות מותאמות אישית
            </p>

            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Thailand Card */}
              <Link to="/thailand" onClick={() => handleCountryClick("thailand")}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <img src={lazadaLogo} alt="Lazada" className="h-16 w-auto" />
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                          תאילנד 🇹🇭
                        </h3>
                        <p className="text-muted-foreground text-lg">המלצות אמיתיות מ-Lazada</p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-foreground">
                          ✨ מוצרים שנבחרו על ידי ישראלים בתאילנד
                          <br />
                          🚀 משלוחים מהירים
                          <br />
                          💎 מחירים משתלמים
                        </p>
                      </div>

                      <Button className="w-full group-hover:scale-105 transition-transform">
                        לחצו כאן למוצרים בתאילנד
                        <ArrowRight className="mr-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              {/* Israel Card */}
              <Link to="/israel" onClick={() => handleCountryClick("israel")}>
                <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer border-2 hover:border-primary">
                  <CardContent className="p-8">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <img src={aliexpressLogo} alt="AliExpress" className="h-16 w-auto" />
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
                          ישראל 🇮🇱
                        </h3>
                        <p className="text-muted-foreground text-lg">המלצות אמיתיות מ-AliExpress</p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm text-foreground">
                          ✨ מוצרים שנבדקו על ידי משפחה וחברים
                          <br />
                          🎉 מבצעים מיוחדים
                          <br />
                          💪 איכות מובטחת
                        </p>
                      </div>

                      <Button className="w-full group-hover:scale-105 transition-transform">
                        לחצו כאן למוצרים בישראל
                        <ArrowRight className="mr-2 h-5 w-5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <About />

        {/* Value Proposition */}
        <section className="py-16 md:py-24 bg-muted">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">?(D)Konw למה  </h2>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">נבדק אישית</h3>
                  <p className="text-muted-foreground">כל מוצר נבדק על ידי אנשים אמיתיים מהקהילה</p>
                </div>

                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="text-4xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">קהילה תומכת</h3>
                  <p className="text-muted-foreground">קבוצות ווטסאפ וטלגרם פעילות עם מאות משתמשים</p>
                </div>

                <div className="bg-card p-6 rounded-lg border border-border">
                  <div className="text-4xl mb-4">⚡</div>
                  <h3 className="text-xl font-semibold mb-2 text-foreground">עדכונים שוטפים</h3>
                  <p className="text-muted-foreground">מוצרים חדשים ומבצעים מתעדכנים באופן קבוע</p>
                </div>
              </div>

              <div className="bg-primary/10 p-8 rounded-lg border-2 border-primary/20 mt-12">
                <p className="text-xl font-semibold text-foreground mb-2">💡 הרעיון שלנו פשוט</p>
                <p className="text-lg text-muted-foreground">
                  לחסוך לכם זמן, כסף וכאב ראש בחיפוש אחר מוצרים איכותיים
                  <br />
                  בין אם אתם בבית או בצד השני של העולם
                </p>
              </div>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </div>;
};
export default Landing;