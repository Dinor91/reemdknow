import { FacebookPixel, trackFBLead } from "@/components/FacebookPixel";
import { trackEvent } from "@/lib/analytics";
import { trackButtonClick } from "@/lib/trackClick";
import { useEffect } from "react";
import logo from "@/assets/dknow-logo.png";

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

const LINKS = {
  whatsappIsrael: "https://chat.whatsapp.com/Dfcih86pI6D35dehovi5KN",
  whatsappThailand: "https://chat.whatsapp.com/LcjvMUEqxBqIEfh0bbPT1j",
  instagram: "https://www.instagram.com/reemdknow?igsh=MWxrNWR5ZHdwazd0dA%3D%3D&utm_source=qr",
  facebook: "https://www.facebook.com/share/1H2sX5ZMoV/?mibextid=wwXIfr",
  tiktok: "https://www.tiktok.com/@reemdknow?_r=1&_t=ZS-93B0gL6bFmK",
};

interface LinkItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  bgClass: string;
  onClick?: () => void;
}

const LinkItem = ({ href, icon, label, bgClass, onClick }: LinkItemProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    onClick={onClick}
    className={`flex items-center gap-4 w-full px-5 py-4 rounded-2xl text-white font-semibold text-[16px] transition-all duration-200 hover:scale-[1.03] hover:shadow-lg active:scale-[0.98] ${bgClass}`}
  >
    <span className="flex-shrink-0">{icon}</span>
    <span>{label}</span>
  </a>
);

const ChannelSelect = () => {
  useEffect(() => {
    document.title = "(D)Know - כל הלינקים";
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8" dir="rtl" style={{ background: 'linear-gradient(180deg, hsl(25 20% 10%) 0%, hsl(25 15% 15%) 50%, hsl(25 10% 12%) 100%)' }}>
      <FacebookPixel />

      <div className="max-w-md w-full space-y-5">
        {/* Profile */}
        <div className="flex flex-col items-center gap-3">
          <img 
            src={logo} 
            alt="(D)Know" 
            className="w-20 h-20 rounded-full shadow-lg ring-4 ring-white/20 object-cover" 
          />
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-white">
              (D)Know
            </h1>
            <p className="text-[15px] text-white/60 mt-1">
              דילים שווים אחרי סינון קפדני 🔍
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <LinkItem
            href={LINKS.whatsappIsrael}
            icon={<WhatsAppIcon className="h-6 w-6" />}
            label="קבוצת וואטסאפ ישראל 🇮🇱"
            bgClass="bg-[hsl(142,70%,42%)] hover:bg-[hsl(142,70%,38%)]"
            onClick={() => handleClick("whatsapp", "join_linktree_israel")}
          />

          <LinkItem
            href={LINKS.whatsappThailand}
            icon={<WhatsAppIcon className="h-6 w-6" />}
            label="קבוצת וואטסאפ תאילנד 🇹🇭"
            bgClass="bg-[hsl(142,70%,42%)] hover:bg-[hsl(142,70%,38%)]"
            onClick={() => handleClick("whatsapp", "join_linktree_thailand")}
          />

          <LinkItem
            href={LINKS.instagram}
            icon={<InstagramIcon className="h-6 w-6" />}
            label="Instagram"
            bgClass="bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]"
            onClick={() => handleClick("instagram", "join_linktree")}
          />

          <LinkItem
            href={LINKS.tiktok}
            icon={<TikTokIcon className="h-6 w-6" />}
            label="TikTok"
            bgClass="bg-[hsl(0,0%,10%)] hover:bg-[hsl(0,0%,15%)] ring-1 ring-white/20"
            onClick={() => handleClick("tiktok", "join_linktree")}
          />

          <LinkItem
            href={LINKS.facebook}
            icon={<FacebookIcon className="h-6 w-6" />}
            label="Facebook"
            bgClass="bg-[#1877F2] hover:bg-[#1565C0]"
            onClick={() => handleClick("facebook", "join_linktree")}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/30 pt-2">
          © (D)Know — אחד שיודע
        </p>
      </div>
    </div>
  );
};

export default ChannelSelect;
