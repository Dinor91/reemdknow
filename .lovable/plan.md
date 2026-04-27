# תיקון לוגיקת בחירת מוצרי תאילנד

קובץ יחיד: `supabase/functions/daily-recommendations/index.ts`

## שינוי 1 — העלאת סף מכירות לתאילנד
ב-`getThailandRecommendations`, בקריאה ל-`selectProductForSlot`, לשנות את `minSales` מ-`1` ל-`5`.

```ts
const result = await selectProductForSlot(db, "feed_products", slot, "sales_7d", recentDealIds, {
  salesColumn: "sales_7d",
  minSales: 5,           // היה 1
  priceColumn: "price_thb",
  maxPrice: 2500,
});
```

זה יחיל את `sales_7d >= 5` באופן אוטומטי בשלבים 1 ו-2 (שכבר משתמשים ב-`qualityFilter`).

## שינוי 2 — אכיפת תקרת מחיר בכל השלבים
כיום `baseQuery(false)` (שלב 3 fallback) ו-`baseQuery(true)` בשלב 2 — שלב 2 בסדר, אבל שלב 3 לא מחיל את `maxPrice`. צריך לפצל את ה-quality filter לשני חלקים: סף מכירות (גמיש ב-fallback) וסף מחיר (קשיח תמיד).

עדכון `baseQuery` כך שתקרת המחיר תוחל תמיד אם קיים `qualityFilter`, וסף המכירות יוחל רק כש-`applyQuality=true`:

```ts
const baseQuery = (applyQuality: boolean) => {
  let q = db
    .from(table)
    .select("*")
    .eq("category_name_hebrew", slot.category)
    .eq("out_of_stock", false)
    .not("tracking_link", "is", null)
    .gte("commission_rate", 0.15);

  if (qualityFilter) {
    // תקרת מחיר תמיד נאכפת
    q = q.lte(qualityFilter.priceColumn, qualityFilter.maxPrice);
    if (applyQuality) {
      // סף מכירות רק בשלבים 1+2
      q = q.gte(qualityFilter.salesColumn, qualityFilter.minSales);
    }
  }

  return q
    .order("last_shown", { ascending: true, nullsFirst: true })
    .limit(200);
};
```

## השפעה
- **תאילנד**: רק מוצרים עם ≥5 מכירות ב-7 ימים ומחיר ≤2500 ฿ ייבחרו, גם ב-fallback.
- **ישראל**: ללא שינוי בפועל — `minSales=30` ו-`maxPrice=$40` ימשיכו לפעול כרגיל; תקרת המחיר תיאכף גם בשלב 3 (זה למעשה שיפור עקביות גם לישראל, בהתאם להיגיון של "תקרת מחיר היא קשיחה").

אין שינויים נוספים בקובץ ואין שינויים במקומות אחרים.
