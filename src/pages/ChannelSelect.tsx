import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect, useState } from "react";
import ramProfile from "@/assets/ram-profile.jpeg";

/* ──────────── Inline SVG Icons ──────────── */

const WhatsAppIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const InstagramIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const FacebookIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TikTokIcon = ({ className = "h-5 w-5" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const FireIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-orange-400">
    <path d="M12 23c-3.866 0-7-3.134-7-7 0-2.485 1.394-4.942 2.798-6.932.602-.854 1.243-1.636 1.808-2.298.39-.457.741-.85 1.017-1.17.138-.16.26-.298.362-.413l.015-.017c.456-.52 1-.52 1.456 0l.015.017c.102.115.224.253.362.413.276.32.627.713 1.017 1.17.565.662 1.206 1.444 1.808 2.298C16.606 11.058 18 13.515 18 16c0 3.866-3.134 7-7 7z"/>
  </svg>
);

/* ──────────── Links Config ──────────── */

const LINKS = {
  whatsappIsrael: "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN",
  whatsappThailand: "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j",
  instagram: "https://www.instagram.com/reemdknow?igsh=MWxrNWR5ZHdwazd0dA%3D%3D&utm_source=qr",
  facebook: "https://www.facebook.com/share/1H2sX5ZMoV/?mibextid=wwXIfr",
  tiktok: "https://www.tiktok.com/@reemdknow?_r=1&_t=ZS-93B0gL6bFmK",
};

/* ──────────── Page ──────────── */

const ChannelSelect = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animations after mount
    const timer = setTimeout(() => setMounted(true), 50);

    document.title = "(D)Know - כל הלינקים | דילים מאליאקספרס";

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("og:title", "(D)Know — דילים שווים אחרי סינון קפדני");
    setMeta("og:description", "הצטרפו לקהילת הדילים הגדולה בישראל! מוצרים מאליאקספרס ולאזדה אחרי סינון ידני.");
    setMeta("og:type", "website");

    return () => clearTimeout(timer);
  }, []);

  const handleClick = (platform: string, source: string) => {
    trackEvent(`click_${platform}`, {
      event_category: "engagement",
      event_label: `${platform} - join page`,
      source,
    });
    trackFBLead(`${platform}_join_linktree`);
    trackButtonClick(platform as any, source, "join");
  };

  const anim = (delay: number) =>
    `transition-all duration-700 ease-out ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-6" dir="rtl">
      <FacebookPixel />

      {/* ── Animated background ── */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, hsl(230 30% 6%) 0%, hsl(260 25% 10%) 35%, hsl(280 20% 8%) 65%, hsl(230 30% 6%) 100%)' }} />
        {/* Floating orbs */}
        <div className="absolute top-[10%] right-[15%] w-[300px] h-[300px] rounded-full opacity-15 blur-[100px] animate-pulse" style={{ background: 'hsl(280 60% 50%)' }} />
        <div className="absolute bottom-[20%] left-[10%] w-[250px] h-[250px] rounded-full opacity-10 blur-[80px] animate-pulse" style={{ background: 'hsl(142 70% 45%)', animationDelay: '1.5s' }} />
        <div className="absolute top-[50%] left-[60%] w-[200px] h-[200px] rounded-full opacity-10 blur-[90px] animate-pulse" style={{ background: 'hsl(350 80% 55%)', animationDelay: '3s' }} />
      </div>

      <div className="max-w-[400px] w-full space-y-5">

        {/* ── Profile Section ── */}
        <div
          className={`flex flex-col items-center gap-2.5 ${anim(0)}`}
          style={{ transitionDelay: '0ms' }}
        >
          <div className="relative group">
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-[hsl(280,60%,55%)] via-[hsl(350,80%,55%)] to-[hsl(30,90%,55%)] opacity-80 blur-md group-hover:opacity-100 transition-opacity duration-500" />
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-[hsl(280,60%,55%)] via-[hsl(350,80%,55%)] to-[hsl(30,90%,55%)] opacity-60 animate-spin" style={{ animationDuration: '8s' }} />
            <img
              src={ramProfile}
              alt="ראם - (D)Know"
              loading="eager"
              className="relative w-[76px] h-[76px] rounded-full object-cover ring-[3px] ring-white/10 shadow-2xl"
            />
          </div>
          <div className="text-center space-y-0.5">
            <h1 className="text-[22px] font-extrabold text-white tracking-tight">
              ראם | <span dir="ltr">(D)Know</span>
            </h1>
            <p className="text-[12px] text-white/45 leading-relaxed">
              דילים שווים אחרי סינון קפדני 🔍
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/35">
              <span>ישראל 🇮🇱</span>
              <span>•</span>
              <span>תאילנד 🇹🇭</span>
            </div>
          </div>
        </div>

        {/* ── Divider: Join ── */}
        <div
          className={`flex items-center gap-3 px-1 ${anim(100)}`}
          style={{ transitionDelay: '100ms' }}
        >
          <div className="flex-1 h-px bg-gradient-to-l from-white/15 to-transparent" />
          <span className="text-[10px] text-white/25 font-semibold tracking-[0.15em] uppercase">הצטרפו לקהילה</span>
          <div className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
        </div>

        {/* ── WhatsApp Israel (PRIMARY CTA) ── */}
        <a
          href={LINKS.whatsappIsrael}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick("whatsapp", "join_linktree_israel")}
          className={`group relative flex items-center gap-4 w-full px-5 py-4 rounded-2xl font-semibold transition-all duration-500 hover:scale-[1.03] active:scale-[0.97] ${anim(200)}`}
          style={{
            transitionDelay: '200ms',
            background: 'linear-gradient(135deg, hsl(142 72% 32%) 0%, hsl(142 65% 38%) 50%, hsl(152 60% 35%) 100%)',
            boxShadow: '0 0 25px 3px hsla(142, 70%, 45%, 0.25), 0 8px 30px -5px hsla(142, 70%, 30%, 0.4)',
          }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 rounded-2xl overflow-hidden">
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ background: 'linear-gradient(90deg, transparent 0%, hsla(0,0%,100%,0.08) 50%, transparent 100%)', transform: 'translateX(-100%)', animation: 'shimmer 2s infinite' }}
            />
          </div>
          <style>{`@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>

          <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center bg-white/20 backdrop-blur-sm transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
            <WhatsAppIcon className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-bold text-[16px] leading-tight">וואטסאפ ישראל 🇮🇱</span>
            <span className="text-white/60 text-[12px] font-normal leading-snug mt-0.5">דילים מאליאקספרס אחרי סינון</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-200/90">
              <FireIcon />
              <span>1,200+ חברים בקבוצה</span>
            </span>
          </div>
          <svg className="h-4 w-4 text-white/40 flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>

        {/* ── WhatsApp Thailand ── */}
        <a
          href={LINKS.whatsappThailand}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleClick("whatsapp", "join_linktree_thailand")}
          className={`group relative flex items-center gap-4 w-full px-5 py-3.5 rounded-2xl font-semibold transition-all duration-500 hover:scale-[1.02] active:scale-[0.97] border border-white/[0.06] ${anim(300)}`}
          style={{
            transitionDelay: '300ms',
            background: 'linear-gradient(135deg, hsla(142,60%,35%,0.25) 0%, hsla(142,50%,30%,0.15) 100%)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center bg-[hsl(142,65%,35%)] transition-transform duration-300 group-hover:scale-110">
            <WhatsAppIcon className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-white font-bold text-[15px] leading-tight">וואטסאפ תאילנד 🇹🇭</span>
            <span className="text-white/50 text-[12px] font-normal leading-snug mt-0.5">דילים מלאזדה לגרים בתאילנד</span>
          </div>
          <svg className="h-4 w-4 text-white/25 flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </a>

        {/* ── Divider: Follow ── */}
        <div
          className={`flex items-center gap-3 px-1 ${anim(400)}`}
          style={{ transitionDelay: '400ms' }}
        >
          <div className="flex-1 h-px bg-gradient-to-l from-white/15 to-transparent" />
          <span className="text-[10px] text-white/25 font-semibold tracking-[0.15em] uppercase">עקבו אחריי</span>
          <div className="flex-1 h-px bg-gradient-to-r from-white/15 to-transparent" />
        </div>

        {/* ── Social Icons Row ── */}
        <div
          className={`flex items-center justify-center gap-5 ${anim(500)}`}
          style={{ transitionDelay: '500ms' }}
        >
          {[
            { href: LINKS.instagram, icon: <InstagramIcon className="h-5 w-5 text-white" />, bg: 'linear-gradient(135deg, hsl(280,60%,48%) 0%, hsl(350,80%,52%) 50%, hsl(30,90%,55%) 100%)', label: 'Instagram', platform: 'instagram' },
            { href: LINKS.tiktok, icon: <TikTokIcon className="h-5 w-5 text-white" />, bg: 'hsla(0,0%,100%,0.08)', label: 'TikTok', platform: 'tiktok' },
            { href: LINKS.facebook, icon: <FacebookIcon className="h-5 w-5 text-white" />, bg: 'hsl(220,70%,48%)', label: 'Facebook', platform: 'facebook' },
          ].map(({ href, icon, bg, label, platform }) => (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(platform, "join_linktree")}
              aria-label={label}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-115 hover:shadow-lg active:scale-95 border border-white/[0.06]"
              style={{ background: bg, backdropFilter: 'blur(8px)' }}
            >
              {icon}
            </a>
          ))}
        </div>

        {/* ── Footer ── */}
        <p
          className={`text-center text-[10px] text-white/15 pt-1 ${anim(600)}`}
          style={{ transitionDelay: '600ms' }}
        >
          © (D)Know — אחד שיודע
        </p>
      </div>
    </div>
  );
};

export default ChannelSelect;
