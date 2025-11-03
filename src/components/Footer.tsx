import { Info } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="bg-muted py-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl">
          <div className="mb-6 rounded-lg bg-card p-6 shadow-sm border border-border">
            <div className="mb-3 flex items-center gap-2 flex-row-reverse justify-center">
              <Info className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold text-card-foreground">
                גילוי נאות
              </h3>
            </div>
            <p className="text-muted-foreground leading-relaxed text-right">
              חלק מהקישורים באתר הם קישורי שותפים. אם תקנו דרכם, נקבל עמלה קטנה – 
              <span className="font-semibold"> ללא תוספת תשלום עבורכם</span>. 
              זה עוזר לנו להמשיך לבדוק ולהמליץ על מוצרים שווים באמת 🙏
            </p>
          </div>

          <div className="text-center">
            <p className="mb-2 text-lg font-semibold text-foreground">
              (D)Know
            </p>
            <p className="text-sm text-muted-foreground">
              קהילה של המלצות אמיתיות על מוצרים שימושיים
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              © 2025 (D)Know. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
