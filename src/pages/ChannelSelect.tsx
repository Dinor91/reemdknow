import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
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

/* ──────────── Links Config ──────────── */

const LINKS = {
  whatsappIsrael: "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN",
  whatsappThailand: "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j",
  instagram: "https://www.instagram.com/reemdknow?igsh=MWxrNWR5ZHdwazd0dA%3D%3D&utm_source=qr",
  facebook: "https://www.facebook.com/share/1H2sX5ZMoV/?mibextid=wwXIfr",
  tiktok: "https://www.tiktok.com/@reemdknow?_r=1&_t=ZS-93B0gL6bFmK",
};

/* ──────────── Staggered animation CSS (injected once) ──────────── */

const animationCSS = `
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 0 0 hsla(142, 70%, 45%, 0.5);
  }
  50% {
    box-shadow: 0 0 18px 4px hsla(142, 70%, 45%, 0.25);
  }
}
.anim-fade-in-up {
  opacity: 0;
  animation: fadeInUp 0.5s ease-out forwards;
}
.anim-pulse-glow {
  animation: pulseGlow 2.4s ease-in-out infinite;
}
`;

/* ──────────── Components ──────────── */

interface LinkItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  badge?: string;
  bgClass: string;
  iconBg: string;
  onClick?: () => void;
  featured?: boolean;
  delay: number;
}

const LinkItem = ({ href, icon, label, sublabel, badge, bgClass, iconBg, onClick, featured, delay }: LinkItemProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={onClick}
    className={`anim-fade-in-up group relative flex items-center gap-4 w-full px-4 py-4 rounded-2xl font-semibold text-[15px] transition-all duration-300 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] ${bgClass} ${featured ? 'anim-pulse-glow ring-2 ring-white/20' : ''}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${iconBg}`}>
      {icon}
    </div>
    <div className="flex flex-col min-w-0 flex-1">
      <span className="text-white font-bold leading-tight">{label}</span>
      {sublabel && <span className="text-white/60 text-[12px] font-normal leading-snug">{sublabel}</span>}
      {badge && (
        <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-200/90">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {badge}
        </span>
      )}
    </div>
    <svg className="h-4 w-4 text-white/30 flex-shrink-0 transition-transform duration-300 group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
    </svg>
  </a>
);

interface SocialIconProps {
  href: string;
  icon: React.ReactNode;
  bgClass: string;
  label: string;
  onClick?: () => void;
  delay: number;
}

const SocialIcon = ({ href, icon, bgClass, label, onClick, delay }: SocialIconProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={onClick}
    aria-label={label}
    className={`anim-fade-in-up w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg active:scale-95 ${bgClass}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    {icon}
  </a>
);

/* ──────────── Page ──────────── */

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "(D)Know - כל הלינקים | דילים מאליאקספרס";

    // OG meta tags
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

    const metaDesc = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (metaDesc) {
      metaDesc.setAttribute("content", "הצטרפו לקהילת הדילים של (D)Know — דילים מאליאקספרס ולאזדה אחרי סינון קפדני.");
    }
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl">
      <FacebookPixel />
      <style>{animationCSS}</style>

      {/* Background */}
      <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(145deg, hsl(220 25% 8%) 0%, hsl(250 20% 12%) 40%, hsl(220 30% 10%) 100%)' }} />
      <div className="fixed inset-0 -z-10 opacity-30" style={{ background: 'radial-gradient(circle at 50% 0%, hsl(260 60% 30%) 0%, transparent 50%)' }} />

      <div className="max-w-md w-full space-y-5">
        {/* ── Profile ── */}
        <div className="anim-fade-in-up flex flex-col items-center gap-3" style={{ animationDelay: '0ms' }}>
          <div className="relative">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[hsl(280,60%,50%)] via-[hsl(350,80%,55%)] to-[hsl(30,90%,55%)] opacity-75 blur-sm animate-pulse" />
            <img
              src={ramProfile}
              alt="ראם - (D)Know"
              loading="eager"
              className="relative w-20 h-20 rounded-full object-cover ring-4 ring-white/10 shadow-2xl"
            />
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              ראם | <span dir="ltr">(D)Know</span>
            </h1>
            <p className="text-[13px] text-white/50 leading-relaxed max-w-[280px]">
              דילים שווים אחרי סינון קפדני 🔍
              <br />
              ישראל 🇮🇱 • תאילנד 🇹🇭
            </p>
          </div>
        </div>

        {/* ── Divider: Join ── */}
        <div className="anim-fade-in-up flex items-center gap-3 px-1" style={{ animationDelay: '100ms' }}>
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-white/30 font-medium tracking-wider uppercase">הצטרפו לקהילה</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* ── WhatsApp CTAs ── */}
        <div className="space-y-3">
          <LinkItem
            href={LINKS.whatsappIsrael}
            icon={<WhatsAppIcon className="h-5 w-5 text-white" />}
            label="וואטסאפ ישראל 🇮🇱"
            sublabel="דילים מאליאקספרס אחרי סינון"
            badge="1,200+ חברים בקבוצה"
            bgClass="bg-[hsl(142,70%,33%)] hover:bg-[hsl(142,70%,38%)]"
            iconBg="bg-white/20"
            featured
            delay={200}
            onClick={() => handleClick("whatsapp", "join_linktree_israel")}
          />

          <LinkItem
            href={LINKS.whatsappThailand}
            icon={<WhatsAppIcon className="h-5 w-5 text-white" />}
            label="וואטסאפ תאילנד 🇹🇭"
            sublabel="דילים מלאזדה לגרים בתאילנד"
            bgClass="bg-[hsl(142,70%,33%)] hover:bg-[hsl(142,70%,38%)]"
            iconBg="bg-white/20"
            delay={300}
            onClick={() => handleClick("whatsapp", "join_linktree_thailand")}
          />
        </div>

        {/* ── Divider: Follow ── */}
        <div className="anim-fade-in-up flex items-center gap-3 px-1" style={{ animationDelay: '400ms' }}>
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] text-white/30 font-medium tracking-wider uppercase">עקבו אחריי</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* ── Social Icons Row ── */}
        <div className="flex items-center justify-center gap-4">
          <SocialIcon
            href={LINKS.instagram}
            icon={<InstagramIcon className="h-5 w-5 text-white" />}
            bgClass="bg-gradient-to-br from-[hsl(280,60%,45%)] via-[hsl(350,80%,50%)] to-[hsl(30,90%,55%)]"
            label="Instagram"
            delay={500}
            onClick={() => handleClick("instagram", "join_linktree")}
          />
          <SocialIcon
            href={LINKS.tiktok}
            icon={<TikTokIcon className="h-5 w-5 text-white" />}
            bgClass="bg-white/10 hover:bg-white/20 backdrop-blur-sm"
            label="TikTok"
            delay={560}
            onClick={() => handleClick("tiktok", "join_linktree")}
          />
          <SocialIcon
            href={LINKS.facebook}
            icon={<FacebookIcon className="h-5 w-5 text-white" />}
            bgClass="bg-[hsl(220,70%,45%)] hover:bg-[hsl(220,70%,52%)]"
            label="Facebook"
            delay={620}
            onClick={() => handleClick("facebook", "join_linktree")}
          />
        </div>

        {/* Footer */}
        <p className="anim-fade-in-up text-center text-[11px] text-white/20 pt-2" style={{ animationDelay: '700ms' }}>
          © (D)Know — אחד שיודע
        </p>
      </div>
    </div>
  );
};

export default ChannelSelect;
