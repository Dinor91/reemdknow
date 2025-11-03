import { Info } from "lucide-react";
export const Footer = () => {
  return <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 rounded-lg bg-card p-6 shadow-sm border border-border">
            <div className="mb-3 flex items-center gap-2 flex-row-reverse justify-center">
              <Info className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">
                גילוי נאות
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed text-center">חלק מהקישורים באתר הם קישורי שותפים. אם תקנו דרכם, נקבל עמלה קטנה – עבורכם זה ללא תוספת תשלום. 
זה עוזר לנו להמשיך לחפש, לבדוק ולהמליץ עבורכם על מוצרים שווים באמת</p>
          </div>

          <div className="text-center">
            <p className="mb-2 text-lg font-semibold text-foreground">Reem(D)Know</p>
            <p className="text-sm text-muted-foreground">
              קהילה של המלצות אמיתיות על מוצרים שימושיים
            </p>
            
            <div className="mt-6 space-y-2">
              <p className="text-base font-semibold text-foreground">:מידע נוסף / יצירת קשר</p>
              <p className="text-sm text-muted-foreground" dir="rtl">
                מייל: <a href="mailto:reemdknow@gmail.com" className="text-primary hover:underline" dir="ltr">reemdknow@gmail.com</a>
              </p>
              <p className="text-sm text-muted-foreground" dir="rtl">
                טלפון: <a href="tel:+972507818321" className="text-primary hover:underline" dir="ltr">+972-50-781-8321</a>
              </p>
            </div>
            
            <p className="mt-6 text-xs text-muted-foreground">© 2025 Reem(D)Know. כל הזכויות שמורות.</p>
          </div>
        </div>
      </div>
    </footer>;
};