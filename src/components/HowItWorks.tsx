export const HowItWorks = () => {
  return <section className="py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold md:text-4xl">?איך נבחרים המוצרים 🔍</h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col items-center text-center rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 text-4xl">⭐</div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                נבדק אישי
              </h3>
              <p className="text-muted-foreground">מוצר שנקנה ונמצא פרקטי יעיל</p>
            </div>

            <div className="flex flex-col items-center text-center rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 text-4xl">🧪</div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                מחקר מכוון
              </h3>
              <p className="text-muted-foreground">
                מבוסס חיפוש מעמיק וביקורות
              </p>
            </div>

            <div className="flex flex-col items-center text-center rounded-lg bg-card p-6 shadow-sm border border-border">
              <div className="mb-4 text-4xl">🔥</div>
              <h3 className="mb-2 text-xl font-semibold text-card-foreground">
                להיט בקבוצות
              </h3>
              <p className="text-muted-foreground">
                קיבל המלצות חוזרות מהקהילה
              </p>
            </div>
          </div>

          <div className="mt-12 rounded-lg bg-primary/10 p-6 border border-primary/30">
            <p className="text-center text-lg text-foreground">
              הסינון שלנו מתחחשב במספר פרמטרים כמו דירוג המוצר איכות הביקורות אימנות החנות ומשלוח מהיר
            </p>
          </div>
        </div>
      </div>
    </section>;
};