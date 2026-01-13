export const ThailandHero = () => {
  return (
    <section className="mb-12">
      {/* Orange Gradient Banner */}
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 py-12 md:py-14 text-center border-b-4 border-orange-700">
        <span className="text-5xl md:text-6xl block mb-4 animate-wave">🇹🇭</span>
        <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-md tracking-wide">
          דילים מלאזדה
        </h1>
      </div>

      {/* Quick Badges */}
      <div className="flex justify-center gap-3 md:gap-4 flex-wrap py-8 px-5 bg-gradient-to-br from-orange-50 to-white">
        <div className="inline-flex items-center bg-white border-2 border-orange-400 py-2.5 px-5 rounded-full text-sm md:text-base font-semibold text-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          ✅ נבדק אישית
        </div>
        <div className="inline-flex items-center bg-white border-2 border-orange-400 py-2.5 px-5 rounded-full text-sm md:text-base font-semibold text-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          ✅ תשלום COD
        </div>
        <div className="inline-flex items-center bg-white border-2 border-orange-400 py-2.5 px-5 rounded-full text-sm md:text-base font-semibold text-foreground shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
          ✅ משלוח מהיר
        </div>
      </div>

      {/* Featured Products Title */}
      <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mt-8 mb-10 px-5">
        🔥 הכי פופולרי השבוע
      </h2>
    </section>
  );
};
