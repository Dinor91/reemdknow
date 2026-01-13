import { Check } from "lucide-react";

export const ThailandHero = () => {
  return (
    <section className="bg-gradient-to-br from-orange-50 to-white py-12 md:py-16 border-b-2 border-orange-400">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          {/* Personal Introduction */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
              👋 היי, אני ראם!
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground font-medium mb-4">
              גר בתאילנד כבר 3 שנים | בודק עשרות מוצרים בלאזדה כל שבוע
            </p>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
              אני עובר על מאות מוצרים, בודק ביקורות, משווה מחירים - {" "}
              <strong className="text-orange-500 font-semibold">כדי שאתם לא תצטרכו.</strong>
            </p>
          </div>

          {/* Value Props */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-8 mb-10">
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-xl text-green-500">✅</span>
              <span className="text-base font-medium">משלוח מהיר לכל תאילנד</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-xl text-green-500">✅</span>
              <span className="text-base font-medium">תשלום במזומן בקבלה (COD)</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-xl text-green-500">✅</span>
              <span className="text-base font-medium">כל מוצר נבדק אישית</span>
            </div>
          </div>

          {/* Featured Products Title */}
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            🔥 המוצרים הכי פופולריים השבוע:
          </h2>
        </div>
      </div>
    </section>
  );
};
