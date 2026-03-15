

## תוכנית — הוספת `isProductRelevantForCategory` + `diversifyProducts`

### שינוי 1: `supabase/functions/_shared/categories.ts`
הוספת שתי פונקציות בסוף הקובץ:

**`isProductRelevantForCategory(productName, category)`** — מריצה `detectCategory` ומשווה לקטגוריה המבוקשת. מחזירה `boolean`.

**`diversifyProducts(products, maxSimilar = 2)`** — מחלצת מילת מפתח מרכזית (המילה הארוכה ביותר בשם, 4+ תווים, לא stopword). מגבילה ל-`maxSimilar` מוצרים עם אותה מילת מפתח. שומרת על סדר המערך המקורי.

### שינוי 2: `telegram-bot-handler/index.ts` — `handleDealCategory` (שורות ~1183-1220)
אחרי `.slice(0, 10)` ולפני `.map(...)`:
1. סינון עם `isProductRelevantForCategory` (לוודא שהמוצר באמת שייך לקטגוריה)
2. גיוון עם `diversifyProducts` (מקסימום 2 מוצרים דומים)

שני הבלוקים (israel + thailand) מקבלים את אותו טיפול.

### שינוי 3: `telegram-bot-handler/index.ts` — `handleDealCategoryHighCommission` (שורות ~1424-1462)
אותו דבר — הוספת `isProductRelevantForCategory` + `diversifyProducts` אחרי `.slice(0, 10)` ולפני `.map(...)`.

### סיכום
- 2 פונקציות חדשות ב-`_shared/categories.ts`
- import חדש ב-`telegram-bot-handler`
- 4 בלוקי שליפה (2 ב-`handleDealCategory` + 2 ב-`handleDealCategoryHighCommission`) מקבלים סינון + גיוון

