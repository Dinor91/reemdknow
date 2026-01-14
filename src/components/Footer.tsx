import { Info } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.jpg";
export const Footer = () => {
  return <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 rounded-lg bg-card p-6 shadow-sm border border-border">
            <div className="mb-3 flex items-center gap-2 flex-row-reverse justify-center">
              <Info className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">
                גילוי נאות
              </h3>
            </div>
            {/* Mobile: Shorter text */}
            <p className="md:hidden text-muted-foreground text-sm text-center">
              קישורי שותפים - אם תקנו דרכי אקבל עמלה קטנה ללא עלות נוספת עבורכם
            </p>
            {/* Desktop: Full text */}
            <p className="hidden md:block text-muted-foreground leading-relaxed text-center">
              חלק מהקישורים באתר הם קישורי שותפים אם תקנו דרכי, אקבל עמלה קטנה - עבורכם זה ללא תוספת תשלום ולי זה עוזר להמשיך לחפש, לבדוק ולהמליץ עבורכם על מוצרים שווים באמת
            </p>
          </div>

          <div className="text-center">
            <div className="flex flex-col md:flex-row items-center md:items-center justify-center gap-4 md:gap-12">
              <div className="space-y-2 md:order-1 text-center md:text-right">
                <p className="text-base font-semibold text-foreground">:למידע נוסף ויצירת קשר</p>
                <p className="text-sm text-muted-foreground" dir="rtl">
                  מייל: <a href="mailto:reemdknow@gmail.com" className="text-primary hover:underline" dir="ltr">reemdknow@gmail.com</a>
                </p>
              <p className="text-sm text-muted-foreground" dir="rtl">
                  טלפון: <a href="tel:+972507818321" className="text-primary hover:underline" dir="ltr">+972-50-781-8321</a>
                </p>
                
                {/* Social Media Links */}
                <div className="flex justify-center items-center gap-5 mt-4">
                  <a 
                    href="https://www.instagram.com/reemdknow?igsh=MWxrNWR5ZHdwazd0dA%3D%3D&utm_source=qr" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Instagram"
                    className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115 hover:-translate-y-0.5"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://www.facebook.com/share/1H2sX5ZMoV/?mibextid=wwXIfr" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="Facebook"
                    className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115 hover:-translate-y-0.5"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </a>
                  <a 
                    href="https://www.tiktok.com/@reemdino?_r=1&_t=ZS-9345BE2lhPc" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label="TikTok"
                    className="text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-115 hover:-translate-y-0.5"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                    </svg>
                  </a>
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-1 md:gap-2 md:order-2">
                <img src={logo} alt="Reem(D)Know Logo" className="w-32 h-32 rounded-full mx-auto" />
                <p className="text-sm text-muted-foreground md:hidden">
                  קהילה של המלצות אמיתיות על מוצרים שימושיים
                </p>
              </div>
              
              <div className="hidden md:flex flex-col items-center gap-2 md:order-3">
                <p className="text-lg font-semibold text-foreground">Reem(D)Know</p>
                <p className="text-sm text-muted-foreground">
                  קהילה של המלצות אמיתיות<br className="hidden md:block" />על מוצרים שימושיים
                </p>
              </div>
            </div>
            
            <Link to="/auth" className="mt-6 text-xs text-muted-foreground hover:text-foreground transition-colors inline-block cursor-pointer">
              © 2025 Reem(D)Know. כל הזכויות שמורות.
            </Link>
          </div>
        </div>
      </div>
    </footer>;
};