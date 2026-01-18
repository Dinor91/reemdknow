import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { trackFBLead } from "./FacebookPixel";
import { trackButtonClick } from "@/lib/trackClick";
import { Share2 } from "lucide-react";

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

interface FloatingWhatsAppButtonProps {
  country: "israel" | "thailand";
}

export const FloatingWhatsAppButton = ({ country }: FloatingWhatsAppButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const instagramLink = "https://www.instagram.com/reemdknow?igsh=MWxrNWR5ZHdwazd0dA%3D%3D&utm_source=qr";
  const facebookLink = "https://www.facebook.com/share/1H2sX5ZMoV/?mibextid=wwXIfr";
  const tiktokLink = "https://www.tiktok.com/@reemdknow?_r=1&_t=ZS-93B0gL6bFmK";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSocialClick = (platform: "instagram" | "facebook" | "tiktok") => {
    trackFBLead(`${platform} Float - ${country}`);
    trackButtonClick(platform, `${country}_floating`, country);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 z-50">
      {/* Menu */}
      <div 
        className={`absolute bottom-[75px] right-0 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden min-w-[200px] transition-all duration-300 ${
          isOpen 
            ? "opacity-100 visible translate-y-0" 
            : "opacity-0 invisible translate-y-2"
        }`}
      >
        <a
          href={instagramLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("instagram")}
          className="flex items-center gap-4 px-5 py-4 text-foreground hover:bg-gradient-to-r hover:from-purple-50 hover:via-pink-50 hover:to-orange-50 dark:hover:from-purple-950/30 dark:hover:via-pink-950/30 dark:hover:to-orange-950/30 transition-all duration-200 border-b border-border group"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <InstagramIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium text-[15px]">Instagram</span>
        </a>
        <a
          href={facebookLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("facebook")}
          className="flex items-center gap-4 px-5 py-4 text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all duration-200 border-b border-border group"
        >
          <div className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <FacebookIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium text-[15px]">Facebook</span>
        </a>
        <a
          href={tiktokLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => handleSocialClick("tiktok")}
          className="flex items-center gap-4 px-5 py-4 text-foreground hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-all duration-200 group"
        >
          <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <TikTokIcon className="h-5 w-5 text-white" />
          </div>
          <span className="font-medium text-[15px]">TikTok</span>
        </a>
      </div>

      {/* Floating Button */}
      <Button
        size="lg"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-[60px] w-[60px] rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:from-[#F77737] hover:via-[#FD1D1D] hover:to-[#833AB4] text-white shadow-[0_4px_12px_rgba(131,58,180,0.4)] hover:shadow-[0_6px_20px_rgba(131,58,180,0.6)] transition-all duration-300 ${
          isOpen ? "scale-100" : "animate-bounce hover:animate-none hover:scale-110"
        }`}
      >
        <Share2 className="h-7 w-7" />
      </Button>
    </div>
  );
};
