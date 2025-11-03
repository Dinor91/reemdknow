import { 
  Home, 
  Baby, 
  Wrench, 
  Sparkles, 
  Hammer, 
  Trees, 
  Tent 
} from "lucide-react";

const categories = [
  { icon: Home, title: "בית", description: "מוצרי חשמל, ריהוט ונוחות" },
  { icon: Baby, title: "ילדים", description: "כל מה שצריך לקטנטנים" },
  { icon: Wrench, title: "תחזוקה והדברה", description: "פתרונות לבית תקין" },
  { icon: Sparkles, title: "ניקיון וכביסה", description: "מוצרים שעושים את העבודה" },
  { icon: Hammer, title: "DIY", description: "כלים ופרויקטים בעצמכם" },
  { icon: Trees, title: "חצר וגינה", description: "הכל לחוץ" },
  { icon: Tent, title: "טיולים", description: "ציוד לטיולים והרפתקאות" },
];

export const Categories = () => {
  return (
    <section className="bg-muted py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl">
          <h2 className="mb-4 text-center text-3xl font-bold text-foreground md:text-4xl">
            הקטגוריות שלנו
          </h2>
          <p className="mb-12 text-center text-lg text-muted-foreground">
            ממוצרי בית ועד ציוד לטיולים – כיסינו הכל
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category, index) => {
              const Icon = category.icon;
              return (
                <div
                  key={index}
                  className="group rounded-lg bg-card p-6 shadow-sm border border-border transition-all hover:shadow-md hover:border-primary/50"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-2 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-card-foreground">
                      {category.title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">
                    {category.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
