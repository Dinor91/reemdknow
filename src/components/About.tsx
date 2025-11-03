export const About = () => {
  return <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-8 text-3xl font-bold md:text-4xl">?אז למה אנחנו </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex gap-4 rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="flex-shrink-0 text-3xl">📦</div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                  מוצרים אמיתיים
                </h3>
                <p className="text-muted-foreground">
                  שנבדקו בשימוש אישי או בדירוגים מעולים
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="flex-shrink-0 text-3xl">💬</div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                  קהילה תומכת
                </h3>
                <p className="text-muted-foreground">
                  שתעזור לכם למצוא את הפתרון הנכון
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="flex-shrink-0 text-3xl">🔁</div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                  עדכונים קבועים
                </h3>
                <p className="text-muted-foreground">
                  עם המלצות חדשות, לינקים וקופונים
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="flex-shrink-0 text-3xl">🔍</div>
              <div>
                <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                  חיפוש חכם
                </h3>
                <p className="text-muted-foreground">
                  לפי קטגוריה, צורך, או בקשה אישית
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
};