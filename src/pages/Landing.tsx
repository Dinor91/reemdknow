import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { About } from "@/components/About";
import { ShoppingBag, Users, TrendingUp, MapPin, Star, Flame, Send } from "lucide-react";
import { Link } from "react-router-dom";
import { trackEvent } from "@/lib/analytics";
import { FacebookPixel, trackFBViewContent } from "@/components/FacebookPixel";
import { useEffect } from "react";
import heroImage from "@/assets/new-banner.jpg";

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
              className="w-full max-w-full md:max-w-5xl mx-auto rounded-lg md:rounded-xl object-cover max-h-[200px] md:max-h-[300px] lg:max-h-[350px]"
            />
          </div>

          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              {/* H1 - Main Headline */}
              <h1 className="text-[28px] md:text-[36px] lg:text-[40px] font-bold text-foreground leading-[1.3] mb-2">
                קונים באליאקספרס או לאזדה?
              </h1>
              <p className="text-[24px] md:text-[28px] lg:text-[32px] font-bold text-foreground mb-10">
                אל תשלמו יותר מדי.
              </p>

              {/* What's on the site */}
              <div className="mb-10">
                <h2 className="text-[18px] md:text-[20px] font-semibold text-muted-foreground mb-5">
                  מה תמצאו באתר?
                </h2>
                <div className="flex items-start justify-center gap-6 md:gap-10 text-foreground">
                  <button 
                    onClick={() => document.getElementById('country-selection')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center gap-2 hover:text-primary transition-colors group max-w-[70px] md:max-w-[90px]"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Users className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-center leading-tight">הצטרפות לקהילה</span>
                  </button>
                  <button 
                    onClick={() => document.getElementById('country-selection')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center gap-2 hover:text-primary transition-colors group max-w-[70px] md:max-w-[90px]"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Star className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-center leading-tight">המלצות העורך</span>
                  </button>
                  <button 
                    onClick={() => document.getElementById('country-selection')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center gap-2 hover:text-primary transition-colors group max-w-[70px] md:max-w-[90px]"
                  >
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Flame className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-center leading-tight">הכי נמכרים</span>
                  </button>
                  <Link to="/requests" className="flex flex-col items-center gap-2 hover:text-primary transition-colors group max-w-[70px] md:max-w-[90px]">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Send className="w-6 h-6 md:w-7 md:h-7 text-primary" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-center leading-tight">מצא לי מוצר</span>
                  </Link>
                </div>
              </div>

              {/* CTA Question */}
              <div id="country-selection">
                <h2 className="text-[24px] md:text-[32px] lg:text-[36px] font-bold text-foreground mb-4">
                  איפה אתם בעולם?
                </h2>
                <p className="text-[20px] md:text-[24px] font-semibold text-[#333333] mb-8">
                  בחרו את היעד שלכם, הצטרפו לווטסאפ/ טלגרם וקבלו המלצות על בסיס יומי
                </p>
              </div>

              {/* Country Selection Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-3xl mx-auto">
                {/* Thailand Card */}
                <div className="bg-background border-2 border-gray-200 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 hover:border-[#f28433]">
                  <div className="h-1 bg-[#f28433]"></div>
                  <div className="p-8 md:p-10 text-center h-full flex flex-col">
                    <span className="text-7xl md:hidden block mb-6">🇹🇭</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">תאילנד</h3>
                    <p className="text-base md:text-lg text-muted-foreground mb-6 flex-grow">
                      גרים או טסים לתאילנד?
                      <br />
                      דילים מלאזדה + משלוח מהיר
                    </p>
                    <Link
                      to="/thailand"
                      onClick={() => handleCountryClick("thailand")}
                      className="inline-block w-full bg-[#f28433] hover:bg-[#e07328] text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg mt-auto"
                    >
                      לדילים בתאילנד
                    </Link>
                  </div>
                </div>

                {/* Israel Card */}
                <div className="bg-background border-2 border-gray-200 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all duration-300 hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] hover:-translate-y-1.5 hover:border-blue-400">
                  <div className="h-1 bg-blue-500"></div>
                  <div className="p-8 md:p-10 text-center h-full flex flex-col">
                    <span className="text-7xl md:hidden block mb-6">🇮🇱</span>
                    <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">ישראל</h3>
                    <p className="text-base md:text-lg text-muted-foreground mb-6 flex-grow">
                      גרים בישראל?
                      <br />
                      דילים מאלי אקספרס + קופונים בלעדיים
                    </p>
                    <Link
                      to="/israel"
                      onClick={() => handleCountryClick("israel")}
                      className="inline-block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 text-lg mt-auto"
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
              למה <span className="text-foreground">250</span> אנשים כבר הצטרפו אליי?
            </h2>

            <div className="max-w-2xl mx-auto">
              {/* Problem */}
              <div className="mb-8 p-6 bg-[#f28433]/5 rounded-xl">
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4 text-center">
                  רוב המוצרים ברשת הם:
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
              <div className="p-6 bg-blue-500/5 rounded-xl">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="flex w-10 h-10 md:w-16 md:h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-3 md:mb-4">
                  <ShoppingBag className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">500+</div>
                <div className="text-sm text-muted-foreground">מוצרים נבחרים</div>
              </div>
              <div className="text-center">
                <div className="flex w-10 h-10 md:w-16 md:h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-3 md:mb-4">
                  <Users className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">250</div>
                <div className="text-sm text-muted-foreground">לקוחות מרוצים</div>
              </div>
              <div className="text-center">
                <div className="flex w-10 h-10 md:w-16 md:h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-3 md:mb-4">
                  <TrendingUp className="w-5 h-5 md:w-8 md:h-8 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">95%</div>
                <div className="text-sm text-muted-foreground">שביעות רצון</div>
              </div>
              <div className="text-center">
                <div className="flex w-10 h-10 md:w-16 md:h-16 bg-primary/10 rounded-full items-center justify-center mx-auto mb-3 md:mb-4">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary" />
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
