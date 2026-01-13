import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { About } from "@/components/About";
import { ShoppingBag, Users, TrendingUp, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";
import heroImage from "@/assets/hero-banner-new.jpeg";

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
    <div className="min-h-screen" dir="rtl">
      <FacebookPixel />
      <Header />
      <div className="pt-16">
        {/* Hero Section - Value First Design */}
        <section className="bg-gradient-to-b from-background to-muted py-8 md:py-16">
          {/* Hero Banner Image */}
          <div className="px-4 md:px-0 mb-8 md:mb-12">
            <img
              src={heroImage}
              alt="REEM(D)KNOW - מוצרים חכמים שנבחרים בקפידה"
              className="w-full max-w-full md:max-w-6xl mx-auto rounded-lg md:rounded-none object-cover"
            />
          </div>

          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* H1 - Main Headline */}
              <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold text-foreground leading-[1.3] mb-2">
                🛒 קונים באליאקספרס או לאזדה?
              </h1>
              <p className="text-[24px] md:text-[28px] lg:text-[32px] font-bold text-foreground mb-8">
                אל תשלמו יותר מדי.
              </p>

              {/* H2 - Sub-headline */}
              <h2 className="text-[20px] md:text-[24px] font-semibold text-[#333333] mb-5">כאן תקבלו כל יום:</h2>

              {/* Benefits List */}
              <ul
                dir="rtl"
                className="text-[16px] md:text-[18px] lg:text-[20px] font-medium text-success space-y-4 mb-8 max-w-md mx-auto"
              >
                <li className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <span>דילים חמים שנבדקו אישית</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <span>מחירים שלא תמצאו בשום מקום</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-xl">✅</span>
                  <span>
                    חיסכון ממוצע: <strong>150 ש״ח</strong> למוצר
                  </span>
                </li>
              </ul>

              {/* Social Proof */}
              <p className="text-[16px] md:text-[18px] font-medium text-[#333333] mb-8">
                כבר <strong className="text-success">250+</strong> ישראלים חוסכים ככה.
              </p>

              {/* CTA Question */}
              <h2 className="text-[24px] md:text-[32px] lg:text-[36px] font-bold text-foreground mb-4">
                ?איפה אתם בעולם
              </h2>
              <p className="text-[16px] md:text-[18px] text-muted-foreground mb-8">
                בחרו את היעד שלכם וקבלו המלצות מותאמות אישית
              </p>

              {/* Country Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
                {/* Thailand Card */}
                <div className="bg-background border-2 border-gray-200 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 hover:border-[#f28433]">
                  <div className="h-1 bg-[#f28433]"></div>
                  <div className="p-8 md:p-10 text-center">
                    <span className="text-7xl md:text-8xl block mb-6">🇹🇭</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">תאילנד</h3>
                    <p className="text-base md:text-lg text-muted-foreground mb-6">
                      גרים או טסים לתאילנד?
                      <br />
                      דילים מלאזדה + משלוח מהיר
                    </p>
                    <Link
                      to="/thailand"
                      onClick={() => handleCountryClick("thailand")}
                      className="inline-block w-full bg-[#f28433] hover:bg-[#e07328] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg"
                    >
                      לדילים בתאילנד
                    </Link>
                  </div>
                </div>

                {/* Israel Card */}
                <div className="bg-background border-2 border-gray-200 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 hover:border-blue-400">
                  <div className="h-1 bg-blue-500"></div>
                  <div className="p-8 md:p-10 text-center">
                    <span className="text-7xl md:text-8xl block mb-6">🇮🇱</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">ישראל</h3>
                    <p className="text-base md:text-lg text-muted-foreground mb-6">
                      גרים בישראל?
                      <br />
                      דילים מאלי אקספרס + קופונים בלעדיים
                    </p>
                    <Link
                      to="/israel"
                      onClick={() => handleCountryClick("israel")}
                      className="inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg"
                    >
                      לדילים בישראל
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Builder Section - Why Trust Me */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 text-foreground">
              למה <span className="text-success">250</span> אנשים כבר הצטרפו אליי?
            </h2>

            <div className="max-w-2xl mx-auto">
              {/* Problem */}
              <div className="mb-8 p-6 bg-muted rounded-xl">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 text-center">
                  רוב המוצרים ברשת זה:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-lg">❌</span>
                    <span>דירוג מזויף</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-lg">❌</span>
                    <span>מחיר מנופח</span>
                  </li>
                  <li className="flex items-center gap-3 text-muted-foreground">
                    <span className="text-lg">❌</span>
                    <span>זמן משלוח אינסופי</span>
                  </li>
                </ul>
              </div>

              {/* Solution */}
              <div className="p-6 bg-success/10 rounded-xl border border-success/20">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 text-center">הפתרון שלי פשוט:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-foreground">
                    <span className="text-lg">✅</span>
                    <span>
                      רק מוצרים עם דירוג אמיתי <strong>4.5+</strong>
                    </span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <span className="text-lg">✅</span>
                    <span>
                      רק מוכרים עם <strong>500+</strong> הזמנות מאומתות
                    </span>
                  </li>
                  <li className="flex items-center gap-3 text-foreground">
                    <span className="text-lg">✅</span>
                    <span>רק דילים שבדקתי אישית</span>
                  </li>
                </ul>
              </div>
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
