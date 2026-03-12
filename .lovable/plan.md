

## תוכנית: יישור קטגוריות ל-8 הקטגוריות האחידות

### שינוי 1 — `src/components/IsraelCategories.tsx`
עדכון מערך `categories` (שורות 32-43) ל-8 הקטגוריות האחידות:

```typescript
const categories: Category[] = [
  { icon: Smartphone, emoji: "📱", title: "גאדג׳טים ובית חכם" },
  { icon: Car, emoji: "🚗", title: "רכב ותחבורה" },
  { icon: Home, emoji: "🏠", title: "בית ומטבח" },
  { icon: Shirt, emoji: "👕", title: "אופנה וסטייל" },
  { icon: Baby, emoji: "👶", title: "ילדים ומשחקים" },
  { icon: Heart, emoji: "❤️", title: "בריאות וספורט" },
  { icon: Wrench, emoji: "🔧", title: "כלי עבודה וציוד" },
  { icon: Package, emoji: "📦", title: "כללי" },
];
```

הסרת imports שלא בשימוש: `HomeIcon`, `Plane`. הוספת `Shirt` אם חסר (כבר קיים).

### שינוי 2 — `src/components/ThailandCategories.tsx`
עדכון מערך `categories` (שורות 29-44) לאותן 8 קטגוריות:

```typescript
const categories: Category[] = [
  { icon: Smartphone, emoji: "📱", title: "גאדג׳טים ובית חכם" },
  { icon: Car, emoji: "🚗", title: "רכב ותחבורה" },
  { icon: Home, emoji: "🏠", title: "בית ומטבח" },
  { icon: Shirt, emoji: "👕", title: "אופנה וסטייל" },
  { icon: Baby, emoji: "👶", title: "ילדים ומשחקים" },
  { icon: Heart, emoji: "💪", title: "בריאות וספורט" },
  { icon: Wrench, emoji: "🔧", title: "כלי עבודה וציוד" },
  { icon: Package, emoji: "📦", title: "כללי" },
];
```

ניקוי imports שלא בשימוש: `Tent`, `Lightbulb`, `ShieldCheck`, `Trees`, `Hammer`, `Utensils`, `Sofa`, `WashingMachine`, `Sparkles`, `Plane`. הוספת `Shirt`.

### שינוי 3 — בדיקה בצד לקוח
ניווט לדף ישראל ובדיקה שהמוצר החדש מופיע תחת "בית ומטבח".

