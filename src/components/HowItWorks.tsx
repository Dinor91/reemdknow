import { Search, Star, Heart } from "lucide-react";

export const HowItWorks = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-foreground md:text-4xl">
            איך בוחרים את המוצרים? 🧪
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 rounded-full bg-primary/10 p-3">
                <Heart className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  שימוש אישי
                </h3>
                <p className="text-lg text-muted-foreground">
                  רוב המוצרים שאנחנו משתפים הם דברים שאנחנו באמת קנינו ונהנים מהם. 
                  אם אנחנו ממליצים, זה כי זה עובד.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 rounded-full bg-secondary/10 p-3">
                <Star className="h-7 w-7 text-secondary" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  דירוגים גבוהים
                </h3>
                <p className="text-lg text-muted-foreground">
                  כשאנחנו לא מכירים מוצר באופן אישי, אנחנו בוחרים רק מוצרים עם 
                  ביקורות מצוינות ודירוגים גבוהים מאנשים אחרים.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 rounded-full bg-accent/10 p-3">
                <Search className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-foreground">
                  מחקר ובדיקה
                </h3>
                <p className="text-lg text-muted-foreground">
                  אנחנו לא סתם משתפים קישורים. אנחנו בודקים, משווים ומוודאים 
                  שהמוצר באמת שווה את תשומת הלב.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 rounded-lg bg-primary/5 p-6 border border-primary/20">
            <p className="text-center text-lg text-foreground">
              <span className="font-semibold">בקיצור:</span> אנחנו לא מוכרים, 
              אנחנו ממליצים – כמו שהייתם שואלים חבר טוב ⭐
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
