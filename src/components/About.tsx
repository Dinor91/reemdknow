import { Sparkles, Users, TrendingUp } from "lucide-react";

export const About = () => {
  return (
    <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-3xl font-bold text-foreground md:text-4xl">
            מה זה (D)Know?
          </h2>
          
          <div className="mb-12 text-lg text-muted-foreground">
            <p className="mb-4">
              זו הקהילה שלנו – מקום שבו אנשים אמיתיים משתפים המלצות על מוצרים 
              שהם באמת השתמשו בהם ואהבו.
            </p>
            <p>
              אנחנו לא פה כדי לספר לכם מה לקנות – אנחנו פה כדי לשתף אתכם 
              במה שעובד <span className="text-primary font-semibold">באמת</span>.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                המלצות אמיתיות
              </h3>
              <p className="text-muted-foreground">
                רק מוצרים שבאמת השתמשנו בהם או שקיבלו דירוגים מעולים
              </p>
            </div>

            <div className="rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-secondary/10 p-3">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                קהילה תומכת
              </h3>
              <p className="text-muted-foreground">
                עוזרים אחד לשני למצוא את המוצר הנכון
              </p>
            </div>

            <div className="rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 flex justify-center">
                <div className="rounded-full bg-accent/10 p-3">
                  <TrendingUp className="h-8 w-8 text-accent" />
                </div>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                עדכונים שוטפים
              </h3>
              <p className="text-muted-foreground">
                מוצרים חדשים ומבצעים מעודכנים כל הזמן
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
