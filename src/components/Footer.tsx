import { Info } from "lucide-react";
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
            
            <p className="mt-6 text-xs text-muted-foreground">© 2025 Reem(D)Know. כל הזכויות שמורות.</p>
          </div>
        </div>
      </div>
    </footer>;
};